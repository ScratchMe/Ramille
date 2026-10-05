-- Tests pgTAP des plafonds d'e-mails de connexion (migration `20261005100000_les_plafonds_d_e_mail.sql`,
-- plan anti-abus, `v1-27` §12.35) : le hook `envoyer_l_e_mail_d_auth`, ce qu'il compte, ce qu'il tait,
-- ce qu'il refuse, et le corps qui part.
--
-- **Ce que ce fichier ne voit pas : un envoi réussi.** La CI de pgTAP n'a que la base, sans collecteur
-- d'e-mails ni Resend ; chaque cas qui passe les plafonds y bute donc sur le transport, et c'est ce
-- butoir qui prouve qu'aucun plafond ne l'a arrêté. L'envoi lui-même — Supabase qui appelle le hook,
-- le code reçu, puis vérifié — est joué de bout en bout par `scripts/verifier-code-de-connexion.mjs`
-- contre la stack locale, où le hook est allumé (`supabase/config.toml`).
--
-- **Éprouvé en le cassant, le 05/10/2026** (TESTING.md §1.1) : chaque mutation appliquée à la base
-- locale dans une transaction annulée, ce fichier rejoué dedans, et ce qu'elle fait tomber :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | le plafond du projet retiré | 4, 5 et 6 |
--   | le plafond du compte retiré | 8, 10 et 11 |
--   | le plafond de l'adresse retiré | 12 et 13 |
--   | toutes les issues comptées, pas seulement les envois partis | 14, 15 et 20 |
--   | la reconnexion refuse en 429 au lieu de se taire | 5, 6, 10 et 11 |
--   | le plafond de l'adresse refuse en 429 au lieu de se taire | 12 et 13 |
--   | l'empreinte sans minuscules ni espaces retirés | 12 et 13 |
--   | la fenêtre du jour portée à 48 heures | 7 |
--   | la fenêtre de l'heure portée à deux heures | 9 |
--   | un envoi qui échoue consigné comme parti | 16 et 20 |
--   | un type inconnu refusé en erreur au lieu d'être ignoré | 1 |
--   | l'adresse non échappée dans le corps | 17 |
--   | le hook exécutable par `authenticated` | 19 |
--   | l'export qui rend l'empreinte de l'adresse | 20 |
--
-- (Les numéros sont ceux des libellés.) Témoin sans mutation : aucun écart.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Trois comptes : A demande des rattachements, B est visé par des reconnexions, C a déjà une adresse.
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, now(), now()),
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@exemple.fr', false, now(), now()),
  ('50000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@exemple.fr', false, now(), now());

-- Aucun transport : ni clé Resend, ni collecteur. Un cas qui passe les plafonds rend donc ce refus-là.
delete from vault.secrets where name in ('resend_api_key_connexion', 'boite_d_essai_des_e_mails');

-- Les événements tels que Supabase les forme (relevés sur la stack locale le 05/10/2026).
create function pg_temp.rattachement(p_user uuid, p_adresse text) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', jsonb_build_object('id', p_user, 'email', '', 'new_email', p_adresse, 'is_anonymous', true),
    'email_data', jsonb_build_object('email_action_type', 'email_change', 'token', '12345678', 'token_new', '',
                                     'token_hash', 'abc', 'token_hash_new', ''));
$$;
create function pg_temp.reconnexion(p_user uuid, p_adresse text) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', jsonb_build_object('id', p_user, 'email', p_adresse, 'is_anonymous', false),
    'email_data', jsonb_build_object('email_action_type', 'magiclink', 'token', '87654321', 'token_new', '',
                                     'token_hash', 'def', 'token_hash_new', ''));
$$;
create function pg_temp.empreinte(p_adresse text) returns bytea language sql as $$
  select sha256(convert_to(lower(btrim(p_adresse)), 'UTF8'));
$$;
create function pg_temp.envoye(p_user uuid, p_adresse text, p_quand timestamptz) returns void language sql as $$
  insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, cree_le)
  values (p_user, pg_temp.empreinte(p_adresse), 'email_change', 'envoye', 200, p_quand);
$$;

-- ── 1. Ce qui ne part jamais ──────────────────────────────────────────────────────────────────

select is(
  public.envoyer_l_e_mail_d_auth(jsonb_build_object(
    'user', jsonb_build_object('id', '50000000-0000-0000-0000-00000000000c', 'email', 'c@exemple.fr'),
    'email_data', jsonb_build_object('email_action_type', 'recovery', 'token', '11112222'))),
  '{}'::jsonb,
  '1. un type que le produit n''emprunte pas (réinitialisation) : aucune erreur, qui dirait que l''adresse a un compte'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where type = 'recovery'),
  'type_ignore',
  '2. et il est consigné comme ignoré, sans compter parmi les envois'
);

select is(
  public.envoyer_l_e_mail_d_auth(jsonb_build_object(
    'user', jsonb_build_object('id', '50000000-0000-0000-0000-00000000000c', 'email', 'c@exemple.fr', 'new_email', 'c2@exemple.fr'),
    'email_data', jsonb_build_object('email_action_type', 'email_change', 'token', '11112222', 'token_new', '33334444'))) -> 'error' ->> 'http_code',
  '400',
  '3. un changement d''adresse à deux codes (un compte qui a déjà une adresse) est refusé, pas envoyé à moitié'
);

-- ── 2. Le plafond du projet : 60 envois sur vingt-quatre heures ───────────────────────────────

select pg_temp.envoye(null, 'filler' || g || '@exemple.fr', now() - interval '23 hours') from generate_series(1, 60) as g;

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')) -> 'error',
  jsonb_build_object('http_code', 429, 'message', 'Trop de demandes pour le moment.'),
  '4. au-delà de 60 envois en vingt-quatre heures, un rattachement est refusé en 429'
);

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.reconnexion('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr')),
  '{}'::jsonb,
  '5. et une reconnexion se tait : l''écran dit « envoyé », comme pour une adresse inconnue'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where type = 'magiclink' order by id desc limit 1),
  'plafond_projet',
  '6. la reconnexion tue est consignée sous son plafond'
);

update public.envois_d_e_mails_d_auth set cree_le = now() - interval '25 hours' where issue = 'envoye';

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')) -> 'error' ->> 'message',
  'Aucun moyen d''envoi : il manque le secret Vault resend_api_key_connexion.',
  '7. des envois vieux de plus de vingt-quatre heures ne comptent plus : la demande passe, jusqu''au transport'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 3. Le plafond du compte : 5 par heure ─────────────────────────────────────────────────────

select pg_temp.envoye('50000000-0000-0000-0000-00000000000a', 'cible' || g || '@exemple.fr', now() - interval '50 minutes')
from generate_series(1, 5) as g;

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible6@exemple.fr')) -> 'error' ->> 'http_code',
  '429',
  '8. au-delà de 5 rattachements dans l''heure, le compte qui demande est refusé — rien n''y parle d''une adresse'
);

update public.envois_d_e_mails_d_auth set cree_le = now() - interval '61 minutes';

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible6@exemple.fr')) -> 'error' ->> 'http_code',
  '500',
  '9. une heure plus tard, le même compte passe (jusqu''au transport)'
);

delete from public.envois_d_e_mails_d_auth;

select pg_temp.envoye('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr', now() - interval '10 minutes')
from generate_series(1, 5);
-- Ces cinq envois-là ont aussi rempli le plafond de l'adresse : on les répartit sur d'autres
-- empreintes pour que seul celui du compte soit atteint.
update public.envois_d_e_mails_d_auth set adresse_empreinte = pg_temp.empreinte('autre' || id || '@exemple.fr');

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.reconnexion('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr')),
  '{}'::jsonb,
  '10. pour une reconnexion, le compte compté est celui de l''adresse visée : son plafond se tait aussi'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where type = 'magiclink' order by id desc limit 1),
  'plafond_compte',
  '11. et il est consigné sous le plafond du compte'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 4. Le plafond de l'adresse : 3 par heure, toujours muet ───────────────────────────────────

select pg_temp.envoye(null, 'cible@exemple.fr', now() - interval '30 minutes') from generate_series(1, 3);

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', '  Cible@Exemple.FR ')),
  '{}'::jsonb,
  '12. au-delà de 3 codes dans l''heure vers une adresse — casse et espaces mis à part —, le rattachement se tait'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where user_id = '50000000-0000-0000-0000-00000000000a'),
  'plafond_adresse',
  '13. et il est consigné sous le plafond de l''adresse, empreinte comprise, jamais l''adresse'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 5. Seuls les envois partis comptent ───────────────────────────────────────────────────────

insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
select null, pg_temp.empreinte('cible@exemple.fr'), 'email_change', 'plafond_adresse' from generate_series(1, 10);

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')) -> 'error' ->> 'http_code',
  '500',
  '14. dix demandes tues ne remplissent aucun plafond : la onzième va jusqu''au transport'
);

-- Un transport qui échoue : rien n'est consigné comme parti, donc rien n'est compté.
select vault.create_secret('http://127.0.0.1:9/', 'boite_d_essai_des_e_mails');

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')) -> 'error',
  jsonb_build_object('http_code', 500, 'message', 'L''envoi de l''e-mail a échoué.'),
  '15. un envoi qui échoue rend un 500 — l''app y lit une panne de transport, et c''en est une'
);

select is(
  (select count(*)::int from public.envois_d_e_mails_d_auth where issue = 'envoye'),
  0,
  '16. et il ne compte pas parmi les envois'
);

-- ── 6. Le corps qui part ──────────────────────────────────────────────────────────────────────

select ok(
  (select position('a&amp;b&lt;c@exemple.fr' in html) > 0 and position('12345678' in html) > 0
          and position('{{' in html) = 0 and sujet = 'Cette adresse vient d''être saisie dans Ramille'
     from public.rendre_l_e_mail_d_auth('email_change', '12345678', 'a&b<c@exemple.fr')),
  '17. rattachement : le code et l''adresse remplacés, l''adresse échappée, aucune balise de gabarit restante'
);

select ok(
  (select r.html = replace(g.html, '{{ .Token }}', '87654321') and r.sujet = 'Ton code pour retrouver ton compte'
     from public.rendre_l_e_mail_d_auth('magiclink', '87654321', 'b@exemple.fr') r,
          public.gabarit_d_e_mail_d_auth('magiclink') g),
  '18. reconnexion : le gabarit tel quel, code compris'
);

-- ── 7. Qui peut appeler, qui peut lire ────────────────────────────────────────────────────────

select ok(
  has_function_privilege('supabase_auth_admin', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.rendre_l_e_mail_d_auth(text, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.gabarit_d_e_mail_d_auth(text)', 'execute')
    and not has_table_privilege('authenticated', 'public.envois_d_e_mails_d_auth', 'select')
    and not has_table_privilege('anon', 'public.envois_d_e_mails_d_auth', 'select'),
  '19. le hook n''est appelable que par Supabase Auth, et le journal n''est lisible par aucun client'
);

-- ── 8. L'export ───────────────────────────────────────────────────────────────────────────────

select pg_temp.envoye('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr', now());
select set_config('request.jwt.claims',
  json_build_object('sub', '50000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);

select ok(
  (select jsonb_array_length(e -> 'codes_de_connexion_envoyes') = 1
          and (e -> 'codes_de_connexion_envoyes' -> 0) ? 'issue'
          and not (e -> 'codes_de_connexion_envoyes' -> 0) ? 'adresse_empreinte'
     from (select public.export_my_data() as e) x),
  '20. l''export rend les codes envoyés au compte — type, issue, date —, sans l''empreinte de l''adresse'
);

reset role;

select * from finish();
rollback;
