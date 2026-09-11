-- Tests pgTAP du canal de rappel par email
-- (docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.1, migration
-- 20260904200000_checkin_email_reminders.sql).
--
-- Ce qui est couvert : qui reçoit un rappel et qui n'en reçoit pas, la garantie anti-relance,
-- et le journal des passages (chantier C0.5). Ce qui ne l'est pas : l'envoi lui-même, qui
-- dépend d'un fournisseur externe — mais le comportement *sans* fournisseur configuré, lui,
-- est testé, parce que c'est l'état du projet tant que la clé n'est pas déposée, qu'aucun
-- rappel ne doit s'y perdre, et que ce passage-là doit quand même laisser une trace.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

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
update public.engagement_checkins set status = 'answered', response_kind = 'oui', response = true, responded_at = now()
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

-- ── Le lien du corps de l'email (C2.11) ────────────────────────────────────────────────
-- **La marque `?rappel=1` est tout l'objet du chantier**, et rien ne l'épinglait. Sans elle, le
-- lien de l'email ouvert sur un ordinateur ou un téléphone neuf tombe sur la session anonyme vide
-- que l'app vient de créer, et le plan répond « Ton bilan n'est pas encore fait » à quelqu'un qui a
-- un bilan, un plan et des points — avec pour seul bouton « Faire mon bilan ». Elle ne se voit pas
-- en lisant un email reçu : c'est le genre de détail qui se perd à la première réécriture du corps.
--
-- Le **chemin**, lui, ne doit pas bouger : `assetlinks.json` ne revendique que `/plan`, donc une
-- autre route ferait ouvrir le lien dans le navigateur sur Android, en silence. Les deux assertions
-- vont ensemble — la seconde est celle qui tomberait si quelqu'un « rangeait » le paramètre dans un
-- segment de chemin.
--
-- **La place de ce bloc compte, et elle a déjà été fausse une fois.** Il lit le corps de la ligne
-- que `enqueue_checkin_reminders()` vient d'écrire juste au-dessus, donc il doit rester entre cette
-- mise en file et la prochaine qui vide la table. Posé en fin de fichier, il tombait sur la ligne
-- **écrite à la main** par la section du journal — un corps que nulle mise en file n'a produit : la
-- première assertion échouait et la seconde passait sans rien éprouver. C'est le piège que
-- CLAUDE.md décrit (rejouer la séquence entière du fichier, pas l'assertion seule), et il s'est
-- refermé exactement là.
--
-- Portée aux lignes de ce fichier : un `bool_and` nu porterait sur toute la table, donc sur des
-- lignes écrites avant cette migration dès qu'on rejoue le fichier sur une base peuplée — il
-- passerait en CI (base vierge) en ne vérifiant rien là où on le lit. Même précaution que
-- l'assertion de `13_engagement_action` qui porte la même remarque.
select ok(
  (select bool_and(o.body like '%/plan?rappel=1%') from public.notification_outbox o
   where o.user_id::text like 'ba111111%'),
  'Le lien de l''email porte ?rappel=1 — sans quoi il dit « ton bilan n''est pas encore fait » à qui en a un'
);

select ok(
  (select bool_and(o.body not like '%/plan/%') from public.notification_outbox o
   where o.user_id::text like 'ba111111%'),
  'Et il reste sur /plan : assetlinks.json ne revendique que ce chemin, un autre retomberait dans le navigateur'
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

-- ── Le journal des passages ────────────────────────────────────────────────────────────
-- Constats A9-1 et A9-4 (chantier C0.5). Trois propriétés :
--   * un passage qui ne fait rien faute de secret **le dit**. C'était un `continue` muet, et
--     c'est la seule façon de distinguer « personne n'attend de rappel » de « l'envoi est
--     éteint » — si la clé de l'expéditeur expire, le seul autre symptôme est une baisse des
--     réponses aux points de suivi, indiscernable d'un désintérêt.
--   * **chaque passage laisse une ligne par canal, même sans rien à envoyer.** C'est ce qui fait
--     du journal un battement de cœur plutôt qu'une trace : zéro ligne doit vouloir dire « le
--     passage n'a pas eu lieu » — le cron désinscrit, le job en erreur — et jamais « il n'y avait
--     rien à faire ». Un journal qui ne s'écrivait que lorsqu'il avait du travail ne pouvait pas
--     trancher la question pour laquelle il existe.
--   * une ligne déjà partie n'est jamais reprise. Le statut est posé **avant** l'appel, et la
--     sélection d'envoi ne regarde que les lignes `pending` : mieux vaut un rappel perdu qu'un
--     rappel envoyé deux fois, pour un produit qui promet de ne jamais insister.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('ba111111-1111-1111-1111-111111111116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-journal@test.local', 'x', now(), now(), now(), false);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
values ('ba111111-1111-1111-1111-111111111116', 'commute', date_trunc('week', now())::date,
        'Semaine du 31/08', 'Trajet domicile-travail (Voiture)');

delete from public.notification_outbox;
delete from public.reminder_send_runs;

-- Mise en file écrite à la main plutôt que par `enqueue_checkin_reminders()`, qui est déjà
-- éprouvée plus haut : une ligne de journal décrit **tout** ce que le passage avait à faire,
-- donc ce fichier doit être seul dans la file pour que le compte ci-dessous mesure ce qu'il
-- annonce. Et `send_after = now()`, sinon l'envoi n'a rien à regarder (l'étalement est éprouvé
-- juste au-dessus).
insert into public.notification_outbox (user_id, checkin_id, channel, recipient_email, subject, body, send_after)
select c.user_id, c.id, 'email', 'pgtap-journal@test.local', 'Ton point de la semaine',
       'Bonjour,' || E'\n\n' || 'Une seule question, comme d''habitude.', now()
from public.engagement_checkins c
where c.user_id = 'ba111111-1111-1111-1111-111111111116';

select public.send_pending_reminders();

-- Les deux canaux, même si un seul avait du travail : le push n'avait rien en attente et le dit
-- avec des compteurs à zéro, l'email avait un rappel et n'a pas de clé pour l'envoyer.
select results_eq(
  $$ select canal, status, traites, envoyes, echecs from public.reminder_send_runs order by canal $$,
  $$ values ('email'::text, 'skipped'::text, 0, 0, 0), ('push'::text, 'success'::text, 0, 0, 0) $$,
  'Sans clé API, le passage laisse une trace par canal : rien tenté, rien envoyé, rien en échec'
);

select ok(
  (select detail like '%resend_api_key%' and detail like '%1 rappel(s) en attente%'
   from public.reminder_send_runs where canal = 'email'),
  'La trace nomme le secret qui manque et ce qui attend — sinon elle ne servirait à personne'
);

-- Une ligne `sent` : partie, ou laissée ainsi par un passage interrompu. Dans les deux cas
-- elle n'est plus candidate.
update public.notification_outbox set status = 'sent', sent_at = now(), attempts = 1;

select public.send_pending_reminders();
select public.send_pending_reminders();

select results_eq(
  $$ select status, attempts::int from public.notification_outbox $$,
  $$ values ('sent'::text, 1) $$,
  'Une ligne déjà partie n''est jamais reprise : ni seconde tentative, ni second envoi'
);

-- Trois passages, deux canaux : six lignes. Les deux derniers passages n'avaient rien à faire du
-- tout et s'écrivent quand même — c'est ce qui permet de dire « le cron tourne » une nuit sans
-- rappel, au lieu de confondre un cron mort avec une nuit tranquille.
select is(
  (select count(*)::int from public.reminder_send_runs),
  6,
  'Chaque passage laisse une ligne par canal — c''est ce qui permet de dire que le cron tourne, même une nuit sans rien à envoyer'
);

-- ── Verrouillage ───────────────────────────────────────────────────────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.send_pending_reminders()', 'execute')
    and not has_function_privilege('authenticated', 'public.enqueue_checkin_reminders()', 'execute'),
  'Ni la mise en file ni l''envoi ne sont déclenchables depuis le client'
);

select * from finish();
rollback;
