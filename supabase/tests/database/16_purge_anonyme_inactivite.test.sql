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
--
-- La seconde moitié du fichier couvre la garde de volume ajoutée par la migration
-- 20260910100000 (chantier C0.2) : au-delà de son seuil, un passage ne supprime **rien** et
-- laisse une ligne dans `public.purge_runs`. Ce que ces deux scénarios épinglent, c'est la
-- frontière : le seuil porte un plancher absolu, sans quoi il bloquerait la purge normale d'une
-- base de quelques dizaines de comptes — une garde qui mord tout le temps finit désactivée.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

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

-- A porte un jeton d'appareil : le push n'a pas besoin de compte, donc une session anonyme
-- peut en avoir un. Il doit partir avec elle, sinon un rappel continuerait d'être poussé
-- vers un téléphone dont le compte n'existe plus (v1-12 §4.2).
insert into public.push_tokens (token, user_id, platform)
values ('ExponentPushToken[pgtap-purge-anonyme]', 'c6111111-1111-1111-1111-111111111111', 'android');

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

select is_empty(
  $$ select token from public.push_tokens where token = 'ExponentPushToken[pgtap-purge-anonyme]' $$,
  'le jeton d''appareil d''une session purgée part avec elle'
);

-- ── La garde de volume ─────────────────────────────────────────────────────────────────

-- Le journal ne s'adresse qu'au serveur : RLS activée sans aucune policy, et les privilèges de
-- table révoqués explicitement (le chantier C0.3 retire `auto_expose_new_tables`, donc aucune
-- table ne doit plus compter sur un grant implicite).
select ok(
  not has_table_privilege('authenticated', 'public.purge_runs', 'select')
    and not has_table_privilege('anon', 'public.purge_runs', 'select')
    and not has_table_privilege('authenticated', 'public.purge_runs', 'insert'),
  'Le journal des purges n''est ni lisible ni écrivable par anon ou authenticated'
);

-- Soixante sessions anonymes muettes depuis cent jours. Les quatre sessions actives plus haut
-- restent en base : soixante candidats sur soixante-quatre comptes, soit bien au-delà du seuil
-- (20 %, plancher 50 comptes).
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, last_sign_in_at)
select ('c6222222-2222-2222-2222-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
       now() - interval '100 days', now(), now() - interval '100 days'
from generate_series(1, 60) as g(i);

select public.purge_stale_anonymous_accounts();

select is(
  (select count(*)::int from auth.users where id::text like 'c6222222%'),
  60,
  'Au-delà du seuil, la purge ne supprime aucun compte'
);

select isnt_empty(
  $$ select 1 from public.purge_runs
     where status = 'blocked' and candidates = 60 and deleted = 0 $$,
  'Le passage bloqué laisse une ligne de journal qui dit combien de comptes étaient en jeu'
);

-- Même prédicat, volume ramené sous le plancher : quinze candidats. Ils représentent toujours
-- une forte proportion des comptes restants — c'est précisément ce que le plancher autorise,
-- pour qu'une base minuscule ne soit pas gelée par sa propre garde.
delete from auth.users u
where u.id in (
  select ('c6222222-2222-2222-2222-' || lpad(i::text, 12, '0'))::uuid
  from generate_series(16, 60) as g(i)
);

select public.purge_stale_anonymous_accounts();

select is_empty(
  $$ select 1 from auth.users where id::text like 'c6222222%' $$,
  'Sous le seuil, la purge supprime les sessions muettes comme avant la garde'
);

select isnt_empty(
  $$ select 1 from public.purge_runs
     where status = 'applied' and candidates = 15 and deleted = 15 $$,
  'Un passage appliqué est journalisé lui aussi : sans ligne, on ne distingue pas « rien à purger » de « cron à l''arrêt »'
);

select * from finish();
rollback;
