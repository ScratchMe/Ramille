-- Tests pgTAP des plafonds pour tout le projet et de la purge qui tient (migration
-- `20261004210000_les_plafonds_globaux.sql`, plan anti-abus, `v1-27` §12.35). Les plafonds de chaque compte sont gardés par `11`
-- et `12` ; la garde de volume des comptes qui portent quelque chose, par `16` et `36`.
--
-- **Éprouvé en le cassant, le 04/10/2026** (TESTING.md §1.1) : chaque mutation appliquée à la base
-- locale dans une transaction annulée, ce fichier rejoué dedans, et ce qu'elle fait tomber :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | le plafond des événements pour tout le projet retiré | 1 |
--   | le plafond des pannes retiré | 2 |
--   | le plafond des retours pour tout le projet retiré | 4 |
--   | `enforce_feedback_rate_limit` sans `security definer` | 4 — le compte ne voit plus que ses propres retours |
--   | la garde qui compte tous les candidats, vides compris | 6, 9 et 10 (la 5 passe : les vides partent quand même) |
--   | un passage retenu qui ne supprime rien | 7, 8 et 9 |
--
-- Témoin sans mutation : aucun écart.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- ── 1. Les événements d'usage : 6 000 par heure pour tout le projet, dont 300 pannes ───────────
--
-- Quinze comptes à 400 événements chacun, sous leur plafond de 500 par jour : la base en reçoit
-- 6 000 dans l'heure, et le compte suivant, neuf, bute sur le plafond de tous.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select ('49000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from generate_series(1, 80) as g(i);

-- Ce qui est déjà en base dans l'heure compte aussi : on complète jusqu'au plafond, pas au-delà.
insert into public.usage_events (user_id, name, props, platform)
select ('49000000-0000-0000-0000-' || lpad(((n - 1) / 400 + 1)::text, 12, '0'))::uuid, 'app_open', '{}'::jsonb, 'web'
from generate_series(1, 6000 - (select count(*)::int from public.usage_events where occurred_at > now() - interval '1 hour')) as g(n);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '49000000-0000-0000-0000-000000000080', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('49000000-0000-0000-0000-000000000080', 'app_open', '{}'::jsonb, 'web') $$,
  '23514', 'Trop d''événements d''usage pour tout le projet sur une heure.',
  '1. au-delà de 6 000 événements dans l''heure, un compte neuf, sous son propre plafond, est refusé'
);

reset role;
delete from public.usage_events where user_id::text like '49000000-%';

-- Les pannes : 300 dans l'heure, puis la suivante est refusée, alors qu'un autre événement passe.
insert into public.usage_events (user_id, name, props, platform)
select ('49000000-0000-0000-0000-' || lpad(((n - 1) / 100 + 1)::text, 12, '0'))::uuid, 'app_error',
       '{"category": "rendu", "route": "/plan"}'::jsonb, 'web'
from generate_series(1, 300 - (select count(*)::int from public.usage_events where name = 'app_error' and occurred_at > now() - interval '1 hour')) as g(n);

select set_config('role', 'authenticated', true);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('49000000-0000-0000-0000-000000000080', 'app_error', '{"category": "rendu", "route": "/plan"}'::jsonb, 'web') $$,
  '23514', 'Trop de pannes remontées pour tout le projet sur une heure.',
  '2. au-delà de 300 pannes dans l''heure, la suivante est refusée'
);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('49000000-0000-0000-0000-000000000080', 'app_open', '{}'::jsonb, 'web') $$,
  '3. et un autre événement passe : le plafond des pannes n''arrête que les pannes'
);

-- ── 2. Les retours : 60 par heure pour tout le projet ────────────────────────────────────────

reset role;
insert into public.feedback (user_id, kind, message)
select ('49000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'idee', 'pgtap 49'
from generate_series(1, 60 - (select count(*)::int from public.feedback where created_at > now() - interval '1 hour')) as g(n);

select set_config('role', 'authenticated', true);

select throws_ok(
  $$ insert into public.feedback (user_id, kind, message)
     values ('49000000-0000-0000-0000-000000000080', 'idee', 'un de trop') $$,
  'RM002', 'Beaucoup de retours arrivent en ce moment. Réessaie un peu plus tard : on les lit tous.',
  '4. au-delà de 60 retours dans l''heure, un compte qui n''en a écrit aucun est refusé, avec une phrase pour lui'
);

reset role;

-- ── 3. La purge : les comptes vides partent, garde ou pas ─────────────────────────────────────
--
-- Soixante sessions vides, muettes depuis cent jours : au-delà du seuil (plancher 50), elles ne
-- retiennent plus rien, puisqu'elles ne portent rien.
delete from public.feedback where user_id::text like '49000000-%';
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select ('49111111-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
       now() - interval '100 days', now()
from generate_series(1, 60) as g(i);

select public.purge_stale_anonymous_accounts();

select is(
  (select count(*)::int from auth.users where id::text like '49111111-%'),
  0,
  '5. soixante comptes vides et muets partent, au-delà du seuil : ils ne font plus tomber la garde'
);

-- Le journal se désigne par son statut, jamais par `ran_at` : dans la transaction du test, tous les
-- passages portent la même heure (`TESTING-PGTAP.md` §2.4).
select is(
  (select count(*)::int from public.purge_runs where status = 'blocked'),
  0,
  '6. et le passage est appliqué, pas retenu'
);

-- Soixante comptes muets qui portent un bilan, et dix vides : la garde retient les premiers, et
-- les seconds partent quand même.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select ('49222222-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
       now() - interval '100 days', now()
from generate_series(1, 70) as g(i);

insert into public.assessments (user_id, status, created_at)
select ('49222222-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'in_progress', now() - interval '100 days'
from generate_series(1, 60) as g(i);

select public.purge_stale_anonymous_accounts();

select is(
  (select count(*)::int from auth.users where id::text like '49222222-%'),
  60,
  '7. au-delà du seuil, les comptes qui portent un bilan restent'
);

select is(
  (select count(*)::int from auth.users
    where id::text like '49222222-%'
      and not exists (select 1 from public.assessments a where a.user_id = auth.users.id)),
  0,
  '8. et les comptes vides du même passage sont partis'
);

select results_eq(
  $$ select status, deleted from public.purge_runs where status = 'blocked' $$,
  $$ values ('blocked'::text, 10) $$,
  '9. le journal dit `blocked`, ce qui alerte, avec les dix comptes vides partis'
);

select ok(
  (select detail from public.purge_runs where status = 'blocked') like '%60 comptes anonymes porteurs%',
  '10. et il dit combien de comptes porteurs la garde a retenus'
);

select * from finish();
rollback;
