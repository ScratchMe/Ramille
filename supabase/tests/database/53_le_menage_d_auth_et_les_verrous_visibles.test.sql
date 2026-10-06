-- Le ménage d'Auth, et les verrous e-mail rendus visibles (migration
-- 20261006140000_le_menage_d_auth_et_les_verrous_visibles.sql, 06/10/2026).
--
-- Ce que ce fichier garde :
--   * que le ménage efface **ce qu'il doit et rien d'autre** — un jeton révoqué depuis trois jours
--     part, un jeton révoqué depuis une heure et le jeton en cours d'une session restent, comme la
--     session elle-même ; une connexion OAuth de deux jours part, celle d'une heure reste ;
--   * qu'aucun client ne l'appelle, et que la tâche de nuit existe ;
--   * que le relevé de l'alerte compte les demandes d'un e-mail que le produit n'envoie jamais, le
--     plafond du projet atteint et les codes refusés par la limite de Supabase ;
--   * que l'alerte les dit, qu'aucun des trois ne passe le plafond des envois de l'alerte (ce sont des
--     clients qui les provoquent), et que deux codes refusés ne suffisent pas à écrire (le seuil est de
--     trois).
--
-- **Une base vécue ne fausse rien** : le ménage se juge sur les lignes du fichier, jamais sur ses
-- comptes, et le relevé se lit en différence, avant et après les lignes du fichier, comme dans `42`.
-- **Rien n'envoie** : aucune fonction appelée ici ne fait d'appel HTTP (`verifier_les_alertes` n'est
-- pas jouée).
--
-- Éprouvé en le cassant le 06/10/2026 (`TESTING.md` §1.1) — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ── 1. Le ménage : qui l'appelle, et quand ─────────────────────────────────────────────────────

select ok(
  not has_function_privilege('anon', 'public.menage_des_jetons_d_auth()', 'execute')
    and not has_function_privilege('authenticated', 'public.menage_des_jetons_d_auth()', 'execute'),
  'menage_des_jetons_d_auth : aucun client ne l''appelle'
);

select is(
  (select command from cron.job where jobname = 'menage-des-jetons-d-auth'),
  'select public.menage_des_jetons_d_auth()',
  'la tâche de nuit appelle le ménage'
);

-- ── 2. Le ménage efface ce qu'il doit, et rien d'autre ─────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('a5300000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-menage@test.local', '', now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('a5300000-0000-0000-0000-0000000000a1', 'a5300000-0000-0000-0000-000000000001', now() - interval '5 days', now() - interval '3 days');

-- Trois jetons de la même session : un révoqué depuis trois jours (part), un révoqué depuis une heure
-- (reste : GoTrue relit un jeton révoqué juste après sa révocation), et le jeton en cours, non révoqué
-- et vieux de trois jours lui aussi (reste : c'est la session).
insert into auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id) values
  ('00000000-0000-0000-0000-000000000000', 'pgtap-menage-revoque-vieux', 'a5300000-0000-0000-0000-000000000001', true,
   now() - interval '4 days', now() - interval '3 days', 'a5300000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000000', 'pgtap-menage-revoque-recent', 'a5300000-0000-0000-0000-000000000001', true,
   now() - interval '4 days', now() - interval '1 hour', 'a5300000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000000', 'pgtap-menage-en-cours', 'a5300000-0000-0000-0000-000000000001', false,
   now() - interval '4 days', now() - interval '3 days', 'a5300000-0000-0000-0000-0000000000a1');

insert into auth.flow_state (id, provider_type, authentication_method, provider_access_token, created_at, updated_at) values
  ('a5300000-0000-0000-0000-0000000000f1', 'google', 'oauth', 'pgtap-jeton-du-fournisseur', now() - interval '2 days', now() - interval '2 days'),
  ('a5300000-0000-0000-0000-0000000000f2', 'google', 'oauth', 'pgtap-jeton-du-fournisseur', now() - interval '1 hour', now() - interval '1 hour');

create temporary table menage on commit drop as select public.menage_des_jetons_d_auth() as r;

select ok(
  (select (r ->> 'jetons_revoques')::int >= 1 and (r ->> 'connexions_abandonnees')::int >= 1 from menage),
  'le ménage rend ce qu''il a supprimé'
);

select is(
  (select count(*)::int from auth.refresh_tokens where token = 'pgtap-menage-revoque-vieux'),
  0,
  'un jeton révoqué depuis trois jours part'
);

select is(
  (select count(*)::int from auth.refresh_tokens where token = 'pgtap-menage-revoque-recent'),
  1,
  'un jeton révoqué depuis une heure reste'
);

select is(
  (select count(*)::int from auth.refresh_tokens where token = 'pgtap-menage-en-cours'),
  1,
  'le jeton en cours d''une session reste, même vieux de trois jours'
);

select is(
  (select count(*)::int from auth.sessions where id = 'a5300000-0000-0000-0000-0000000000a1'),
  1,
  'la session n''est pas touchée'
);

select is(
  (select count(*)::int from auth.flow_state where id = 'a5300000-0000-0000-0000-0000000000f1'),
  0,
  'une connexion OAuth de deux jours part, avec le jeton du fournisseur qu''elle gardait'
);

select is(
  (select count(*)::int from auth.flow_state where id = 'a5300000-0000-0000-0000-0000000000f2'),
  1,
  'une connexion OAuth d''une heure reste'
);

-- ── 3. Le relevé compte les trois signaux ──────────────────────────────────────────────────────

create temporary table avant on commit drop as
  select public.releve_des_alertes(now() - interval '1 minute') as r;

-- Deux demandes de récupération sur une même adresse, une sur une autre ; un plafond du projet ; trois
-- codes refusés par la limite de Supabase. Les empreintes sont fabriquées : le relevé ne lit jamais
-- l'adresse.
insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue) values
  ('a5300000-0000-0000-0000-000000000001', sha256('pgtap-adresse-une'::bytea), 'recovery', 'type_ignore'),
  ('a5300000-0000-0000-0000-000000000001', sha256('pgtap-adresse-une'::bytea), 'recovery', 'type_ignore'),
  (null, sha256('pgtap-adresse-deux'::bytea), 'recovery', 'type_ignore'),
  (null, sha256('pgtap-adresse-trois'::bytea), 'magiclink', 'plafond_projet'),
  (null, sha256('pgtap-adresse-quatre'::bytea), 'magiclink', 'envoye');

insert into public.usage_events (user_id, name, props, platform) values
  ('a5300000-0000-0000-0000-000000000001', 'connexion_limite', '{"ecran":"email"}', 'web'),
  ('a5300000-0000-0000-0000-000000000001', 'connexion_limite', '{"ecran":"renvoi"}', 'web'),
  ('a5300000-0000-0000-0000-000000000001', 'connexion_limite', '{"ecran":"retrouver"}', 'android');

create temporary table apres on commit drop as
  select public.releve_des_alertes(now() - interval '1 minute') as r;

select is(
  (select (a.r ->> 'demandes_ignorees')::int - (v.r ->> 'demandes_ignorees')::int from apres a, avant v),
  3,
  'le relevé compte les demandes d''un e-mail que le produit n''envoie jamais'
);

select is(
  (select (a.r ->> 'demandes_ignorees_adresses')::int - (v.r ->> 'demandes_ignorees_adresses')::int from apres a, avant v),
  2,
  'et les adresses distinctes qu''elles visent'
);

select is(
  (select (a.r ->> 'plafond_du_projet_atteint')::int - (v.r ->> 'plafond_du_projet_atteint')::int from apres a, avant v),
  1,
  'le relevé compte le plafond quotidien du projet atteint, et pas un envoi'
);

select is(
  (select (a.r ->> 'codes_refuses_par_la_limite')::int - (v.r ->> 'codes_refuses_par_la_limite')::int from apres a, avant v),
  3,
  'le relevé compte les codes refusés par la limite de Supabase'
);

-- ── 4. L'alerte les dit ────────────────────────────────────────────────────────────────────────
--
-- Sur des relevés fabriqués : `alerte_a_dire`, `alerte_du_serveur` et le texte ne lisent que leur
-- argument, et un relevé fabriqué ne dépend pas de ce que la base a vécu.

create temporary table calme on commit drop as
  select jsonb_build_object(
    'pannes', 0, 'pannes_detail', '[]'::jsonb, 'soumissions_en_echec', 0, 'taches_en_echec', '[]'::jsonb,
    'envois_en_echec', 0, 'synchronisations_en_echec', 0, 'purges_bloquees', 0, 'plans_en_echec', 0,
    'taille_de_la_base_mo', 10, 'rappels_bloques', 0, 'demandes_ignorees', 0,
    'demandes_ignorees_adresses', 0, 'plafond_du_projet_atteint', 0, 'codes_refuses_par_la_limite', 0
  ) as r;

select ok(
  (select not public.alerte_a_dire(r || '{"codes_refuses_par_la_limite": 2}', 0)
      and public.alerte_a_dire(r || '{"codes_refuses_par_la_limite": 3}', 0)
      and public.alerte_a_dire(r || '{"demandes_ignorees": 1, "demandes_ignorees_adresses": 1}', 0)
   from calme),
  'deux codes refusés se taisent, trois se disent, une demande ignorée se dit'
);

select ok(
  (select public.alerte_a_dire(r || '{"plafond_du_projet_atteint": 1}', 0)
      and not public.alerte_du_serveur(
        r || '{"plafond_du_projet_atteint": 1, "demandes_ignorees": 5, "codes_refuses_par_la_limite": 9}', 0)
   from calme),
  'le plafond du projet se dit, mais aucun des trois signaux ne passe le plafond de l''alerte : des clients les provoquent'
);

select ok(
  (select t like '%Plafond quotidien des rattachements par e-mail atteint (1 demandes retenues)%'
      and t like '%Ramille n''envoie jamais (récupération de mot de passe…) : 3, sur 2 adresse(s)%'
      and t like '%Codes de connexion refusés par la limite d''envoi de Supabase (connexion_limite) : 3%'
   from (select public.texte_de_l_alerte(
           r || '{"plafond_du_projet_atteint": 1, "demandes_ignorees": 3, "demandes_ignorees_adresses": 2, "codes_refuses_par_la_limite": 3}',
           now(), 0) as t from calme) x),
  'le texte de l''alerte dit les trois signaux'
);

select * from finish();
rollback;

-- ── Relevé des mutations (06/10/2026) ──────────────────────────────────────────────────────────
--
-- Chaque mutation jouée sur la migration en transaction (le fichier rejoué après elle), remise en
-- place avant la suivante :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | le ménage oublie `revoked` (tout jeton de deux jours part) | 6 |
--   | la fenêtre des jetons ramenée à trente minutes | 5 |
--   | la fenêtre des connexions OAuth portée à trois jours | 3 et 8 (le ménage n'en rend plus aucune) |
--   | le relevé des demandes compte toutes les issues, pas seulement `type_ignore` | 10 |
--   | le plafond du projet ajouté aux signaux du serveur (`alerte_du_serveur`) | 15 |
--   | le seuil des codes refusés ramené à un | 14 |
--   | la ligne des demandes retirée du texte | 16 |
--   | le ménage accordé à `authenticated` | 1 |
--   | la tâche planifiée sous un autre nom | 2 |
--
-- Ce que le fichier ne voit pas : que GoTrue de la production écrive ces tables comme celui de la
-- stack locale (la tâche échouerait alors, et l'alerte la nommerait), et que l'app émette
-- `connexion_limite` — c'est `src/tests/ecrans/saisie-du-code.test.tsx` pour le renvoi, et le
-- typecheck pour les trois autres écrans.
