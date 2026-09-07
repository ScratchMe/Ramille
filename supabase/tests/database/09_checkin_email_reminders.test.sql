-- Tests pgTAP du canal de rappel par email
-- (docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.1, migration
-- 20260904200000_checkin_email_reminders.sql).
--
-- Ce qui est couvert : qui reçoit un rappel et qui n'en reçoit pas, et la garantie
-- anti-relance. Ce qui ne l'est pas : l'envoi lui-même, qui dépend d'un fournisseur externe
-- — mais le comportement *sans* fournisseur configuré, lui, est testé, parce que c'est
-- l'état du projet tant que la clé n'est pas déposée et qu'aucun rappel ne doit s'y perdre.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- Quatre profils qui couvrent les quatre conditions d'éligibilité.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  -- A : compte rattaché, email confirmé, rappels actifs -> doit recevoir
  ('ba111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-rattache@test.local', 'x', now(), now(), now(), false),
  -- B : email déclaré mais NON confirmé -> on n'écrit jamais à une adresse non vérifiée
  ('ba111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-nonconfirme@test.local', 'x', now(), now(), null, false),
  -- C : session anonyme -> aucune adresse où écrire
  ('ba111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, 'x', now(), now(), null, true),
  -- D : rattaché mais a désactivé les rappels
  ('ba111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-optout@test.local', 'x', now(), now(), now(), false);

-- Le canal à trois valeurs a remplacé le booléen (v1-12 §4.1) : avec deux canaux, le
-- « non » de l'email n'est plus le « non » du rappel.
update public.profiles set reminder_channel = 'none'
where id = 'ba111111-1111-1111-1111-111111111114';

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
select id, 'commute', date_trunc('week', now())::date, 'Semaine du 31/08', 'Trajet domicile-travail (Voiture)'
from auth.users where id::text like 'ba111111%';

select public.enqueue_checkin_reminders();

-- ── Qui reçoit ─────────────────────────────────────────────────────────────────────────

select results_eq(
  $$ select recipient_email from public.notification_outbox order by recipient_email $$,
  $$ values ('pgtap-rattache@test.local'::text) $$,
  'Seul le compte rattaché à un email confirmé, rappels actifs, reçoit un rappel'
);

select is_empty(
  $$ select 1 from public.notification_outbox o
     join auth.users u on u.id = o.user_id
     where u.email_confirmed_at is null $$,
  'Aucun rappel vers une adresse non confirmée — un email seulement déclaré n''est pas une preuve de possession'
);

select is_empty(
  $$ select 1 from public.notification_outbox o
     join auth.users u on u.id = o.user_id where u.is_anonymous $$,
  'Aucun rappel pour une session anonyme'
);

select is_empty(
  $$ select 1 from public.notification_outbox o
     join public.profiles p on p.id = o.user_id
     where p.reminder_channel = 'none' $$,
  'Aucun rappel pour quelqu''un qui les a coupés'
);

-- ── La garantie anti-relance ───────────────────────────────────────────────────────────
-- `unique(checkin_id)` : un check-in ne peut donner lieu qu'à un seul email, quel que soit
-- le nombre de passages du cron. C'est la traduction structurelle du non-goal de la spec §7
-- (« pas de notification insistante ni répétée »), pas une précaution applicative.

select public.enqueue_checkin_reminders();
select public.enqueue_checkin_reminders();

select is(
  (select count(*)::int from public.notification_outbox),
  1,
  'Trois passages de la génération ne produisent qu''un seul rappel'
);

-- ── Sans fournisseur configuré ─────────────────────────────────────────────────────────
-- Rien ne doit être perdu ni consommer une tentative : c'est l'état du projet tant que la
-- clé API n'est pas déposée dans Vault.

select public.send_pending_reminders();

select results_eq(
  $$ select status, attempts::int from public.notification_outbox $$,
  $$ values ('pending'::text, 0) $$,
  'Sans clé API, le rappel reste en attente — ni envoyé, ni en échec, ni une tentative gâchée'
);

-- ── Un check-in qui n'attend plus de réponse ───────────────────────────────────────────

delete from public.notification_outbox;
update public.engagement_checkins set status = 'answered', response = true, responded_at = now()
where user_id = 'ba111111-1111-1111-1111-111111111111';

select public.enqueue_checkin_reminders();

select is(
  (select count(*)::int from public.notification_outbox),
  0,
  'Un check-in déjà répondu ne déclenche pas de rappel'
);

-- ── L'étalement de l'envoi ─────────────────────────────────────────────────────────────
-- Le pic hebdomadaire est nivelé par un décalage stable de 0 à 4 jours dérivé du `user_id`
-- (migration 20260907090000). Deux propriétés comptent : le décalage tient dans la fenêtre,
-- et il est **stable** — un décalage qui changerait d'un passage à l'autre ferait sauter un
-- rappel ou en doublerait un.

-- Un cinquième profil plutôt que de ressusciter A : `prevent_answered_checkin_update`
-- interdit de modifier un check-in déjà répondu, et c'est une bonne règle — une réponse est
-- définitive. Ce trigger n'apparaît qu'en rejouant le fichier **en entier** : la première
-- version de ce bloc remettait A à `pending` et n'a échoué qu'en CI.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('ba111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-etalement@test.local', 'x', now(), now(), now(), false);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
values ('ba111111-1111-1111-1111-111111111115', 'commute', date_trunc('week', now())::date,
        'Semaine du 31/08', 'Trajet domicile-travail (Voiture)');

delete from public.notification_outbox;
select public.enqueue_checkin_reminders();

select ok(
  (select send_after between now() - interval '1 minute' and now() + interval '5 days'
   from public.notification_outbox),
  'Le rappel part dans les cinq jours, jamais au-delà de la semaine qu''il concerne'
);

select is(
  (select date_trunc('day', send_after) from public.notification_outbox),
  (select date_trunc('day', now() + make_interval(days =>
     (('x' || substr(md5('ba111111-1111-1111-1111-111111111115'), 1, 7))::bit(28)::int % 5)))),
  'Le décalage est dérivé du user_id, donc stable d''un passage à l''autre'
);

-- ── Un rappel devenu caduc ─────────────────────────────────────────────────────────────
-- La file est servie à cent par jour : un rappel peut y attendre plusieurs jours. Entre-temps
-- `generate_commute_checkins()` périme les check-ins de la semaine précédente. Poser une
-- question à laquelle on ne peut plus répondre serait le pire email possible pour un produit
-- qui promet de ne jamais insister pour rien.
--
-- Vérifié **sans clé API** : l'annulation est une vérité sur les données, pas une étape
-- d'expédition, et doit donc valoir même quand l'envoi est inactif — l'état du projet tant
-- que la clé n'est pas déposée.

update public.engagement_checkins set status = 'expired'
where user_id = 'ba111111-1111-1111-1111-111111111115';

select public.send_pending_reminders();

select results_eq(
  $$ select status from public.notification_outbox $$,
  $$ values ('cancelled'::text) $$,
  'Un rappel dont le check-in est périmé est annulé, et non envoyé — même sans fournisseur configuré'
);

-- ── Verrouillage ───────────────────────────────────────────────────────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.send_pending_reminders()', 'execute')
    and not has_function_privilege('authenticated', 'public.enqueue_checkin_reminders()', 'execute'),
  'Ni la mise en file ni l''envoi ne sont déclenchables depuis le client'
);

select * from finish();
rollback;
