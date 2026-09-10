-- Tests pgTAP du canal de rappel — notification, email, ou rien.
-- (docs/architecture/v1-12-rappels.md §3 et §4, migration 20260907230000_rappels_canal.sql).
--
-- Ce fichier est **la moitié SQL d'une paire** : `src/types/rappels.test.ts` épingle les
-- mêmes six lignes côté client. La règle est écrite deux fois par nécessité — le serveur
-- décide ce qui part, le client affiche ce qui va partir — et c'est cette paire, pas l'un
-- des deux tests, qui empêche les deux implémentations de diverger.
--
-- Piège de méthode, déjà payé une fois sur `usage_events` : remplir `push_tokens` sous
-- `postgres` par commodité puis tester une RPC qui vérifie `auth.uid()`, c'est la tester
-- dans le seul rôle où elle ne sert à rien. Les bascules de `request.jwt.claims` ci-dessous
-- font partie du test, et le fichier doit être rejoué **en entier**.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Six comptes, un par ligne de la table de vérité.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  -- 1 : aucun rappel demandé, alors que tout serait possible
  ('c7111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-canal-none@test.local', 'x', now(), now(), now(), false),
  -- 2 : notification, jeton actif -> push
  ('c7111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-canal-push@test.local', 'x', now(), now(), now(), false),
  -- 3 : notification refusée (aucun jeton) mais compte confirmé -> repli email
  ('c7111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-canal-repli@test.local', 'x', now(), now(), now(), false),
  -- 4 : notification refusée, session anonyme -> rien
  ('c7111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, 'x', now(), now(), null, true),
  -- 5 : email, compte confirmé -> email
  ('c7111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-canal-email@test.local', 'x', now(), now(), now(), false),
  -- 6 : email demandé, adresse jamais confirmée -> rien (on n'écrit pas à une adresse
  --     seulement déclarée, règle héritée de v1-07 §3.1)
  ('c7111111-1111-1111-1111-111111111116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-canal-nonconfirme@test.local', 'x', now(), now(), null, false);

update public.profiles set reminder_channel = 'none'
  where id = 'c7111111-1111-1111-1111-111111111111';
update public.profiles set reminder_channel = 'push'
  where id in ('c7111111-1111-1111-1111-111111111112',
               'c7111111-1111-1111-1111-111111111113',
               'c7111111-1111-1111-1111-111111111114');
update public.profiles set reminder_channel = 'email'
  where id in ('c7111111-1111-1111-1111-111111111115',
               'c7111111-1111-1111-1111-111111111116');

-- Seul le compte 2 a un jeton **actif**. Le compte 1 en a un aussi, pour vérifier qu'un
-- « aucun rappel » ne repart pas tout seul.
insert into public.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[pgtap-canal-0002]', 'c7111111-1111-1111-1111-111111111112', 'android'),
  ('ExponentPushToken[pgtap-canal-0001]', 'c7111111-1111-1111-1111-111111111111', 'android'),
  ('ExponentPushToken[pgtap-canal-0003]', 'c7111111-1111-1111-1111-111111111113', 'android');

-- Le jeton du compte 3 est désactivé : c'est la trace d'un refus système ou d'une
-- désinstallation. Un jeton désactivé ne compte pas.
update public.push_tokens set disabled_at = now(), disabled_reason = 'permission retirée'
where token = 'ExponentPushToken[pgtap-canal-0003]';

-- ── La table de vérité, ligne à ligne ──────────────────────────────────────────────────

select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111111'), 'aucun'), 'aucun',
  'aucun rappel demandé : rien ne part, même avec un jeton et une adresse');
select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111112'), 'aucun'), 'push',
  'notification demandée et jeton actif : la notification part');
select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111113'), 'aucun'), 'email',
  'notification demandée sans jeton actif, mais compte confirmé : l''email prend le relais');
select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111114'), 'aucun'), 'aucun',
  'notification demandée sans jeton ni compte : rien ne part');
select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111115'), 'aucun'), 'email',
  'email demandé et adresse confirmée : l''email part');
select is(coalesce(public.reminder_channel_for('c7111111-1111-1111-1111-111111111116'), 'aucun'), 'aucun',
  'email demandé mais adresse non confirmée : rien ne part');

-- La préférence ne se dégrade jamais d'elle-même : c'est ce qui fait que rouvrir les
-- notifications dans les réglages du téléphone suffit à faire repartir le push.
select is(
  (select reminder_channel from public.profiles where id = 'c7111111-1111-1111-1111-111111111113'),
  'push',
  'un repli sur l''email ne réécrit pas la préférence en base'
);

-- ── La mise en file : une ligne par point, le canal en colonne ─────────────────────────

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
select id, 'commute', date_trunc('week', now())::date, 'Semaine du 07/09', 'tes trajets domicile-travail'
from auth.users where id::text like 'c7111111%';

select public.enqueue_checkin_reminders();

-- Borné aux comptes de ce fichier : la file peut déjà contenir des rappels, et un test qui
-- balaie la table entière mesure autre chose que ce qu'il annonce — invisible en CI, où la
-- base part vide.
select results_eq(
  $$ select channel, count(*)::int from public.notification_outbox
     where user_id::text like 'c7111111%' group by channel order by channel $$,
  $$ values ('email'::text, 2), ('push'::text, 1) $$,
  'Trois messages pour six personnes : un push, deux emails, rien pour les trois autres'
);

select is(
  (select push_body from public.notification_outbox where channel = 'push' and user_id::text like 'c7111111%'),
  'As-tu changé de mode de transport au moins une fois cette semaine pour tes trajets domicile-travail ?',
  'La notification porte la question seule — Android replie le corps à deux lignes'
);

select is(
  (select subject from public.notification_outbox where channel = 'push' and user_id::text like 'c7111111%'),
  'Ton point de la semaine',
  'Le titre de la notification est celui de l''email : un seul message, deux transports'
);

-- Le push part le matin même où la question s'ouvre : c'est ce qui autorise Ramille à dire
-- « lundi » et à tenir parole. L'étalement sur cinq jours ne concerne que l'email, et il
-- existe pour ménager le plafond de l'expéditeur, pas par choix produit.
select ok(
  (select send_after <= now() + interval '1 minute' from public.notification_outbox where channel = 'push' and user_id::text like 'c7111111%'),
  'Le push n''est pas étalé : il part le jour où la question s''ouvre'
);

-- Une ligne push porte quand même l'adresse quand elle existe : c'est ce qui rend le repli
-- possible sans relire `auth.users` au moment de l'envoi.
select is(
  (select recipient_email from public.notification_outbox where channel = 'push' and user_id::text like 'c7111111%'),
  'pgtap-canal-push@test.local',
  'La ligne push garde l''adresse de repli quand il y en a une'
);

-- ── Le repli, sur la **même ligne** ────────────────────────────────────────────────────
-- La garantie anti-relance de la spec §7 est indépendante du transport : `unique(checkin_id)`
-- interdit une seconde ligne, donc le repli doit être une mise à jour. C'est le point le
-- plus facile à casser en croyant bien faire.

select public.replier_rappel_sur_email(
  (select id from public.notification_outbox where channel = 'push' and user_id::text like 'c7111111%'),
  'test'
);

select results_eq(
  $$ select channel, status from public.notification_outbox
     where user_id = 'c7111111-1111-1111-1111-111111111112' $$,
  $$ values ('email'::text, 'pending'::text) $$,
  'Le repli bascule la ligne sur l''email au lieu d''en créer une seconde'
);

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c7111111-1111-1111-1111-111111111112'),
  1,
  'Un point, un message : le repli n''en ajoute pas un'
);

-- ── Le repli, dans la même passe ───────────────────────────────────────────────────────
-- Constat A9-12 (chantier C0.5). La branche push tourne **avant** la branche email dans une
-- passe d'envoi : une ligne qui ne trouve plus d'appareil joignable devient une ligne email due
-- immédiatement, et part dans le même passage. Avant, la boucle avait déjà lu son jeu de lignes
-- et faisait `continue` : le rappel attendait le cron du lendemain — un septième de la fenêtre
-- perdu pour un point hebdomadaire, et précisément pour la personne à qui l'app promet que
-- « l'email prend le relais tout seul ».
--
-- Sans clé API, rien ne part d'ici : ce qui est éprouvé est que la branche email **voit** la
-- ligne repliée du même passage. C'est le `skipped` et le compte du `detail` qui le disent — la
-- ligne de journal du canal email existe de toute façon, même sans rien en attente (elle sortirait
-- alors en `success`, compteurs à zéro) : un repli remis au lendemain laisserait donc ici une
-- ligne `success` sans rappel à compter, pas l'absence de ligne.

-- Une file remise à plat et remplie à la main : `enqueue_checkin_reminders()` est éprouvée
-- juste au-dessus, et une ligne de journal décrit **tout** ce que le passage avait à faire —
-- ce fichier doit donc être seul dans la file pour que les comptes mesurent ce qu'ils annoncent.
delete from public.notification_outbox;
delete from public.reminder_send_runs;

insert into public.notification_outbox (user_id, checkin_id, channel, recipient_email, subject, body, push_body, send_after)
select c.user_id, c.id, 'push', 'pgtap-canal-push@test.local', 'Ton point de la semaine',
       'Bonjour, une seule question.', 'As-tu changé de mode de transport ?', now()
from public.engagement_checkins c
where c.user_id = 'c7111111-1111-1111-1111-111111111112';

-- L'appareil se tait après la mise en file : c'est exactement quelqu'un qui coupe les
-- notifications dans les réglages de son téléphone.
update public.push_tokens set disabled_at = now(), disabled_reason = 'permission retirée'
where user_id = 'c7111111-1111-1111-1111-111111111112';

select public.send_pending_reminders();

select results_eq(
  $$ select channel, status, attempts::int, send_after <= now() from public.notification_outbox $$,
  $$ values ('email'::text, 'pending'::text, 0, true) $$,
  'Le repli rend la ligne due immédiatement, et sans consommer de tentative — aucun appel n''a eu lieu'
);

select results_eq(
  $$ select canal, status, traites from public.reminder_send_runs order by canal $$,
  $$ values ('email'::text, 'skipped'::text, 0), ('push'::text, 'success'::text, 1) $$,
  'Le passage journalise ses deux canaux : le push a traité son message, l''email était là pour le reprendre'
);

select ok(
  (select detail like '%1 rappel(s) en attente%' from public.reminder_send_runs where canal = 'email'),
  'La branche email du même passage compte la ligne repliée : un repli ne perd plus une journée'
);

-- ── Les jetons : le RPC, et rien que le RPC ────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'c7111111-1111-1111-1111-111111111114', 'role', 'authenticated')::text, true);

-- Le cas de v1-10 §3.4 : la session anonyme 4 reprend le jeton du compte 2. Sur un nouvel
-- appareil, c'est exactement ce qui arrive quand le lien de connexion remplace la session
-- anonyme — une policy owner-scoped l'interdirait, et les rappels partiraient vers un
-- utilisateur fantôme.
select public.register_push_token('ExponentPushToken[pgtap-canal-0002]', 'android');

select is(
  (select user_id::text from public.push_tokens where token = 'ExponentPushToken[pgtap-canal-0002]'),
  'c7111111-1111-1111-1111-111111111114',
  'Le jeton suit la personne connectée sur l''appareil, et change de propriétaire'
);

select throws_ok(
  $$ insert into public.push_tokens (token, user_id, platform)
     values ('ExponentPushToken[pgtap-intrus]', 'c7111111-1111-1111-1111-111111111114', 'android') $$,
  '42501',
  null,
  'Un insert direct dans push_tokens est refusé : tout passe par le RPC'
);

select is_empty(
  $$ select token from public.push_tokens where user_id = 'c7111111-1111-1111-1111-111111111111' $$,
  'Un tiers ne voit pas les appareils de quelqu''un d''autre'
);

select public.unregister_push_token('ExponentPushToken[pgtap-canal-0002]');

select ok(
  (select disabled_at is not null from public.push_tokens where token = 'ExponentPushToken[pgtap-canal-0002]'),
  'Retirer la permission désactive le jeton sans le supprimer'
);

-- ── Verrouillage ───────────────────────────────────────────────────────────────────────

select set_config('role', 'postgres', true);

select ok(
  not has_function_privilege('authenticated', 'public.reminder_channel_for(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.replier_rappel_sur_email(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.collect_push_receipts()', 'execute'),
  'La résolution du canal, le repli et les reçus ne sont pas appelables depuis le client'
);

select * from finish();
rollback;
