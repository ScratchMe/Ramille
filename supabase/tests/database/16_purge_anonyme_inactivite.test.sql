-- Tests pgTAP de la purge des sessions anonymes
-- (migration 20260907093000_purge_anonyme_sur_inactivite.sql, plan v1-10 §2.B).
--
-- Ce que ces tests protègent : la purge doit se déclencher sur l'**inactivité**, jamais sur
-- l'âge du compte. La version précédente supprimait `where created_at < now() - 90 jours`,
-- ce qui effaçait un visiteur anonyme fidèle depuis trois mois exactement comme un abandon —
-- bilans, plan et check-ins compris, par cascade, et sans qu'aucun écran ne le dise.
--
-- Le piège que le premier test épingle : `auth.users.last_sign_in_at` a l'air fait pour
-- mesurer l'activité et ne bouge jamais pour une session anonyme (`ensureSession()` ne
-- rappelle `signInAnonymously` que s'il n'y a pas de session, et le rafraîchissement de jeton
-- n'y touche pas). S'en servir reproduirait le bug en ayant l'air de le corriger.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- Cinq sessions anonymes, toutes créées il y a cent jours sauf la dernière : seule
-- l'activité les distingue.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, last_sign_in_at) values
  -- A : muette depuis toujours -> doit partir
  ('c6111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '100 days', now(), now() - interval '100 days'),
  -- B : a ouvert l'app il y a trois jours -> reste
  ('c6111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '100 days', now(), now() - interval '100 days'),
  -- C : un bilan commencé il y a dix jours, aucun événement d'usage -> reste
  ('c6111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '100 days', now(), now() - interval '100 days'),
  -- D : un check-in répondu il y a vingt jours -> reste
  ('c6111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '100 days', now(), now() - interval '100 days'),
  -- E : créée avant-hier, rien fait encore -> reste, `created_at` sert de plancher
  ('c6111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '2 days', now(), now() - interval '2 days');

insert into public.usage_events (user_id, name, platform, occurred_at)
values ('c6111111-1111-1111-1111-111111111112', 'app_open', 'web', now() - interval '3 days');

insert into public.assessments (user_id, status, created_at)
values ('c6111111-1111-1111-1111-111111111113', 'in_progress', now() - interval '10 days');

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response, responded_at)
values ('c6111111-1111-1111-1111-111111111114', 'commute', (now() - interval '20 days')::date,
        'Semaine test', 'Trajet domicile-travail', 'answered', true, now() - interval '20 days');

-- Toutes les vieilles sessions ont un `last_sign_in_at` de cent jours : si la purge s'y
-- fiait, elle les emporterait toutes les quatre.
select is(
  (select count(*)::int from auth.users
   where id::text like 'c6111111%' and is_anonymous
     and last_sign_in_at < now() - interval '90 days'),
  4,
  'Les quatre vieilles sessions ont toutes un last_sign_in_at périmé — s''y fier les supprimerait toutes'
);

select public.purge_stale_anonymous_accounts();

select is_empty(
  $$ select 1 from auth.users where id = 'c6111111-1111-1111-1111-111111111111' $$,
  'La session muette depuis cent jours est supprimée'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6111111-1111-1111-1111-111111111112' $$,
  'Une ouverture d''app récente suffit à garder la session, malgré son âge'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6111111-1111-1111-1111-111111111113' $$,
  'Un bilan commencé compte comme activité, même sans aucun événement d''usage'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6111111-1111-1111-1111-111111111114' $$,
  'Un check-in répondu compte comme activité'
);

-- La fonction tourne sous `pg_cron`, jamais depuis un client : elle supprime des comptes.
-- `revoke ... from anon, authenticated` seul ne révoque rien — PostgreSQL accorde EXECUTE à
-- PUBLIC à la création et les deux rôles en héritent.
select ok(
  not has_function_privilege('authenticated', 'public.purge_stale_anonymous_accounts()', 'execute')
    and not has_function_privilege('anon', 'public.purge_stale_anonymous_accounts()', 'execute'),
  'La purge n''est déclenchable ni par anon ni par authenticated'
);

select * from finish();
rollback;
