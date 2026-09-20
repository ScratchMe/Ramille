-- Tests pgTAP des trois gardes de la revue de sécurité du 20/09/2026
-- (migration 20260920190000_trois_gardes_qui_manquaient_sous_les_gardes.sql).
--
-- Les trois corrigent la même forme de défaut : **une garde qui tenait sur le chemin qu'on avait
-- regardé, et qu'un second chemin contournait sans rien lever.** C'est ce que ce fichier éprouve —
-- pas que la garde existe, mais que le second chemin est fermé.
--
-- **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — trois mutations, appliquées à la
-- base puis retirées par l'opération inverse, et ce que chacune fait tomber :
--   - `alter default privileges in schema public grant all on tables to anon, authenticated`
--     (le retour à l'état d'avant) → les trois assertions de la section A ;
--   - le trigger `stamp_feedback_created_at` retiré → les assertions **5 et 7**, jamais la 4 :
--     l'ordre continue de passer, c'est la date relue puis le plafond qui tombent. La 6 (« dix
--     retours passent ») reste verte — c'est la moitié positive, et elle doit l'être ;
--   - le trigger `refuser_le_retour_en_arriere_du_bilan` retiré → les assertions **9 et 10**, et
--     **aucune** des trois moitiés positives (8, 11, 12) — un refus qui casserait la soumission
--     ou le re-bilan serait pire que le trou qu'il ferme.
--
-- Et un passage qui doit rester **vert** : la moitié positive de chaque section — dix retours
-- acceptés, la soumission qui bascule, et un second bilan créable pour le même compte.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-gardes@test.local', 'x', now(), now());

-- ── Section A : les privilèges par défaut du schéma `public` ─────────────────────────────────
--
-- `CLAUDE.md` affirmait qu'une table neuve est « invisible pour l'app, en silence » faute de
-- `grant`. C'était l'inverse : `pg_default_acl` accordait `arwdDxtm` à `anon` et à
-- `authenticated`, RLS inactive. Aucune table existante n'était concernée — le danger était la
-- **prochaine**, écrite par quelqu'un qui croit la règle. La table ci-dessous est celle-là.

create table public.table_de_demain (id int primary key, secret text);

select ok(
  not has_table_privilege('anon', 'public.table_de_demain', 'select'),
  'une table neuve ne se lit pas depuis `anon` — la règle de CLAUDE.md est enfin vraie'
);

select ok(
  not has_table_privilege('authenticated', 'public.table_de_demain', 'delete'),
  'et elle ne s’efface pas depuis `authenticated` : c’est `delete` que le défaut accordait aussi'
);

-- Le fait, lu sur le catalogue plutôt que sur ses conséquences : une ligne absente est le bon
-- état (Postgres la retire quand il ne reste que le défaut), une ligne qui nomme encore anon ne
-- l'est pas.
select ok(
  not exists (
    select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
     where n.nspname = 'public' and d.defaclobjtype = 'r'
       and pg_get_userbyid(d.defaclrole) = 'postgres'
       and (d.defaclacl::text like '%anon=%' or d.defaclacl::text like '%authenticated=%')
  ),
  'et le catalogue le dit : les privilèges par défaut de `public` ne nomment plus anon ni authenticated'
);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '31000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

-- ── Section B : `feedback` — le plafond comptait une date que le client posait ────────────────
--
-- Le trigger de volume compte les lignes dont `created_at` est récente ; `grant insert` portant
-- sur toutes les colonnes, il suffisait d'antidater pour que le compteur ne trouve jamais rien.
-- Mesuré avant correctif : 500 lignes de 2 000 caractères acceptées d'affilée.

select lives_ok(
  $$ insert into public.feedback (user_id, kind, message, created_at)
     values ('31000000-0000-0000-0000-000000000001', 'idee', 'Antidaté', now() - interval '25 hours') $$,
  'l’ordre ne lève pas : la colonne reste acceptée, c’est sa valeur qui est reprise'
);

select is(
  (select created_at > now() - interval '1 minute' from public.feedback
    where user_id = '31000000-0000-0000-0000-000000000001'),
  true,
  'et la date écrite est celle du serveur, pas celle de l’ordre — le refus est muet, il se relit'
);

-- Le cœur : avec neuf antidatés de plus, le onzième doit tomber. Avant le correctif, aucun ne
-- tombait, jamais.
select lives_ok(
  $$ insert into public.feedback (user_id, kind, message, created_at)
     select '31000000-0000-0000-0000-000000000001', 'idee', 'Antidaté ' || g, now() - interval '25 hours'
       from generate_series(2, 10) g $$,
  'dix retours passent : le quota nominal n’a pas bougé'
);

select throws_ok(
  $$ insert into public.feedback (user_id, kind, message, created_at)
     values ('31000000-0000-0000-0000-000000000001', 'idee', 'Le onzieme', now() - interval '25 hours') $$,
  'RM002',
  null,
  'le onzième est refusé malgré l’antidatage : le plafond compte enfin ce qu’il croyait compter'
);

-- ── Section C : `assessments` — la transition arrière ────────────────────────────────────────
--
-- Le bornage de C6.4 tient en direct et se franchissait en trois ordres : rouvrir, réécrire,
-- refermer. Le troisième ordre repose en plus `submitted_at` par le trigger d'estampille, donc
-- libère l'action engagée que C2.2 existe pour protéger.

select set_config('role', 'postgres', true);
insert into public.assessments (id, user_id, status) values
  ('31000000-0000-0000-0000-0000000000a1', '31000000-0000-0000-0000-000000000001', 'in_progress');
select set_config('role', 'authenticated', true);

select lives_ok(
  $$ update public.assessments set status = 'completed'
      where id = '31000000-0000-0000-0000-0000000000a1' $$,
  'la soumission bascule toujours `in_progress` → `completed` : le questionnaire n’est pas cassé'
);

select throws_ok(
  $$ update public.assessments set status = 'in_progress'
      where id = '31000000-0000-0000-0000-0000000000a1' $$,
  'RM005',
  null,
  'mais l’inverse est refusé — le premier des trois ordres qui franchissaient le bornage de C6.4'
);

select is(
  (select status from public.assessments where id = '31000000-0000-0000-0000-0000000000a1'),
  'completed',
  'et le statut n’a pas bougé : le refus est arrivé avant l’écriture'
);

select lives_ok(
  $$ update public.assessments set status = 'completed'
      where id = '31000000-0000-0000-0000-0000000000a1' $$,
  'réécrire `completed` sur un bilan déjà complété passe — le refus porte sur la transition, pas sur la colonne'
);

-- **La moitié qui compte le plus** : le refus ne doit rien coûter au re-bilan, qui est le chemin
-- par lequel quelqu'un corrige ses réponses. Il crée une **nouvelle** ligne, il ne rouvre pas
-- l'ancienne — c'est exactement ce que le message d'erreur dit.
select lives_ok(
  $$ insert into public.assessments (id, user_id, status)
     values ('31000000-0000-0000-0000-0000000000a2', '31000000-0000-0000-0000-000000000001', 'in_progress') $$,
  'et un re-bilan reste possible : une nouvelle ligne, jamais l’ancienne rouverte'
);

select set_config('request.jwt.claims', ''::text, true);
reset role;

select * from finish();
rollback;
