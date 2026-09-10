-- Tests pgTAP de la suppression de compte et de l'export (migration 20260905210000).
--
-- La suppression est un **bloqueur Google Play** (T12) et le droit à l'effacement du RGPD
-- (art. 17). Ce qu'il faut défendre n'est pas qu'elle « marche » mais qu'elle soit
-- **complète** : une suppression qui laisserait des lignes orphelines derrière elle serait
-- pire que pas de suppression du tout, puisqu'on l'annonce à l'utilisateur comme définitive.
--
-- Elle repose entièrement sur la chaîne de cascade depuis `auth.users`. C'est un choix : une
-- fonction qui énumérerait les tables une à une deviendrait fausse à la prochaine migration,
-- sans que rien ne le signale. Les assertions ci-dessous vérifient donc la chaîne, table par
-- table, pour qu'un maillon posé un jour en NO ACTION fasse tomber le test.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-suppr-a@test.local', 'x', now(), now()),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-suppr-b@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('91111111-1111-1111-1111-111111111111', '90000000-0000-0000-0000-000000000001', 'completed', now());

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency, zone_type, tc_access, household_vehicles
) values ('91111111-1111-1111-1111-111111111111', true, 5, 20, 'voiture', false, false, 'rarely', 'urbain_dense', 'bon', '1');

select public.recompute_assessment_results('91111111-1111-1111-1111-111111111111');
select public.generate_plan_cycle_for_user('90000000-0000-0000-0000-000000000001');

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response, responded_at)
values ('90000000-0000-0000-0000-000000000001', 'commute', current_date, 'Semaine test', 'Trajet domicile-travail', 'answered', true, now());
insert into public.feedback (user_id, kind, message) values ('90000000-0000-0000-0000-000000000001', 'idee', 'Un retour de test');
insert into public.usage_events (user_id, name, platform) values ('90000000-0000-0000-0000-000000000001', 'app_open', 'web');

-- ── Les droits d'exécution ──────────────────────────────────────────────────────────────
-- `anon` ne doit pas pouvoir appeler ces deux-là : PostgreSQL accorde EXECUTE à PUBLIC à la
-- création, et révoquer les seuls rôles nommés ne retire rien (cf. v1-08 §5.2).

select ok(
  not has_function_privilege('anon', 'public.delete_my_account()', 'execute'),
  'anon ne peut pas appeler delete_my_account'
);
select ok(
  not has_function_privilege('anon', 'public.export_my_data()', 'execute'),
  'anon ne peut pas appeler export_my_data'
);

-- Un appareil enregistré : c'est une table de plus rattachée à `profiles`, donc un niveau
-- de plus dans la chaîne de cascade, et une clé de plus dans l'export.
insert into public.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[pgtap-suppression-0001]', '90000000-0000-0000-0000-000000000001', 'android');

-- Un rappel déjà parti : `notification_outbox` est rattachée à `profiles` comme les autres,
-- donc un niveau de plus dans la cascade et une clé de plus dans l'export (C0.6).
insert into public.notification_outbox (user_id, checkin_id, channel, recipient_email, subject, body, status, sent_at)
select c.user_id, c.id, 'email', 'pgtap-suppr-a@test.local', 'Ton point de la semaine',
       'Bonjour,' || E'\n\n' || 'Une seule question, comme d''habitude.', 'sent', now()
from public.engagement_checkins c
where c.user_id = '90000000-0000-0000-0000-000000000001';

-- ── L'export ────────────────────────────────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '90000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select is(
  jsonb_array_length(public.export_my_data() -> 'bilans'),
  1,
  'l''export contient le bilan de la personne'
);

-- `usage_events` n'a aucune policy de lecture : une fonction en `security invoker` rendrait ici
-- un tableau vide, et l'export serait silencieusement incomplet.
select is(
  jsonb_array_length(public.export_my_data() -> 'reperes_de_parcours'),
  1,
  'l''export contient les repères de parcours, que la RLS rend pourtant illisibles au client'
);

-- Le jeton lui-même n'est **pas** exporté : c'est l'adresse du téléphone, pas une donnée
-- sur la personne — quiconque l'a peut lui envoyer une notification. On rend de quoi
-- reconnaître l'appareil, jamais de quoi le joindre (v1-12 §9).
select is(
  jsonb_array_length(public.export_my_data() -> 'appareils_pour_les_rappels'),
  1,
  'l''export nomme les appareils qui reçoivent les rappels'
);

select is(
  public.export_my_data() #>> '{appareils_pour_les_rappels,0,jeton_derniers_caracteres}',
  '-0001]',
  'l''export ne rend que la fin du jeton, jamais le jeton entier'
);

select is_empty(
  $$ select 1 where public.export_my_data()::text like '%ExponentPushToken[pgtap-suppression-0001]%' $$,
  'le jeton complet n''apparaît nulle part dans l''export'
);

-- Même raison que les appareils : la table n'est lisible par aucun client (RLS sans policy),
-- donc seule l'énumération de l'export peut la rendre — et une table oubliée là rend un export
-- silencieusement incomplet (RGPD art. 15).
select is(
  jsonb_array_length(public.export_my_data() -> 'rappels_envoyes'),
  1,
  'l''export nomme les rappels déjà envoyés'
);

select is(
  public.export_my_data() #>> '{rappels_envoyes,0,canal}',
  'email',
  'l''export dit par quel canal chaque rappel est parti'
);

select is(
  public.export_my_data() #>> '{compte,identifiant}',
  '90000000-0000-0000-0000-000000000001',
  'l''export porte bien sur la personne connectée'
);

-- ── Isolation ───────────────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '90000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select is(
  jsonb_array_length(public.export_my_data() -> 'bilans'),
  0,
  'un tiers n''obtient jamais les bilans de quelqu''un d''autre'
);

-- ── La suppression ──────────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '90000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select public.delete_my_account();
select set_config('role', 'postgres', true);

select is_empty(
  $$ select id from auth.users where id = '90000000-0000-0000-0000-000000000001' $$,
  'la ligne d''authentification est supprimée'
);

-- Chaque niveau de la cascade, séparément : c'est ce qui rend le test utile le jour où
-- quelqu'un ajoute une table rattachée à `profiles` avec une clé étrangère en NO ACTION.
select is_empty(
  $$ select id from public.profiles where id = '90000000-0000-0000-0000-000000000001' $$,
  'le profil suit'
);
select is_empty(
  $$ select assessment_id from public.assessment_answers where assessment_id = '91111111-1111-1111-1111-111111111111'
     union all select assessment_id from public.assessment_results where assessment_id = '91111111-1111-1111-1111-111111111111' $$,
  'les réponses et les résultats du bilan suivent (deuxième niveau de cascade)'
);
select is_empty(
  $$ select pa.id from public.plan_actions pa
     where not exists (select 1 from public.plan_cycles pc where pc.id = pa.plan_cycle_id) $$,
  'aucune action de plan orpheline'
);
select is_empty(
  $$ select id from public.engagement_checkins where user_id = '90000000-0000-0000-0000-000000000001'
     union all select id from public.feedback where user_id = '90000000-0000-0000-0000-000000000001' $$,
  'les points de suivi et les retours suivent'
);
select is_empty(
  $$ select token from public.push_tokens where user_id = '90000000-0000-0000-0000-000000000001' $$,
  'les jetons d''appareil suivent — sinon un rappel partirait vers un compte supprimé'
);
select is(
  (select count(*) from public.usage_events where user_id = '90000000-0000-0000-0000-000000000001')::int,
  0,
  'les repères de parcours suivent'
);

select is(
  (select count(*) from auth.users where id = '90000000-0000-0000-0000-000000000002')::int,
  1,
  'le compte d''un tiers n''est pas touché'
);

-- ── La rétention (C0.6) ─────────────────────────────────────────────────────────────────
-- `purge_notification_outbox()` tourne chaque nuit et touche deux tables. Ce que ces
-- assertions défendent n'est pas qu'elle supprime, mais **ce qu'elle ne supprime pas** : une
-- ligne `pending` peut attendre des mois (les secrets d'envoi absents suffisent, v1-07 §3.1)
-- et `unique(checkin_id)` interdit de la remettre en file — la supprimer ferait disparaître un
-- rappel sans laisser de trace.
--
-- Le scénario tourne sur le compte du tiers, le seul encore debout après la suppression
-- ci-dessus, et sous `postgres` : la fonction est révoquée de `public`, `anon` et
-- `authenticated`, c'est le cron qui l'appelle.

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status)
values
  ('90000000-0000-0000-0000-000000000002', 'commute', current_date - 400, 'Semaine très ancienne', 'Trajet domicile-travail', 'pending'),
  ('90000000-0000-0000-0000-000000000002', 'commute', current_date - 393, 'Semaine ancienne', 'Trajet domicile-travail', 'pending'),
  ('90000000-0000-0000-0000-000000000002', 'commute', current_date - 386, 'Autre semaine ancienne', 'Trajet domicile-travail', 'pending'),
  ('90000000-0000-0000-0000-000000000002', 'commute', current_date - 379, 'Semaine ancienne en attente', 'Trajet domicile-travail', 'pending'),
  ('90000000-0000-0000-0000-000000000002', 'commute', current_date - 7, 'Semaine dernière', 'Trajet domicile-travail', 'pending');

-- Quatre lignes de plus de six mois — une par statut — et une récente. La dernière des quatre
-- est en attente : c'est celle qui doit survivre.
insert into public.notification_outbox (user_id, checkin_id, channel, subject, body, status, created_at, sent_at)
select c.user_id, c.id, 'email', 'Ton point de la semaine', 'Bonjour, une seule question.',
       case c.period_label
         when 'Semaine très ancienne' then 'sent'
         when 'Semaine ancienne' then 'cancelled'
         when 'Autre semaine ancienne' then 'failed'
         when 'Semaine ancienne en attente' then 'pending'
         else 'sent'
       end,
       case when c.period_label = 'Semaine dernière' then now() - interval '7 days'
            else now() - interval '8 months' end,
       case c.period_label
         when 'Semaine très ancienne' then now() - interval '8 months'
         when 'Semaine dernière' then now() - interval '7 days'
         else null
       end
from public.engagement_checkins c
where c.user_id = '90000000-0000-0000-0000-000000000002';

-- Deux appareils : l'un a coupé les notifications il y a 91 jours, l'autre répond toujours.
insert into public.push_tokens (token, user_id, platform, disabled_at, disabled_reason) values
  ('ExponentPushToken[pgtap-retention-vieux]', '90000000-0000-0000-0000-000000000002', 'android', now() - interval '91 days', 'permission retirée'),
  ('ExponentPushToken[pgtap-retention-actif]', '90000000-0000-0000-0000-000000000002', 'android', null, null);

select public.purge_notification_outbox();

select is(
  (select count(*) from public.notification_outbox o
   join public.engagement_checkins c on c.id = o.checkin_id
   where o.status = 'pending' and c.period_label = 'Semaine ancienne en attente')::int,
  1,
  'un rappel en attente depuis huit mois reste en file — la purge n''y touche jamais'
);

select is_empty(
  $$ select o.id from public.notification_outbox o
     join public.engagement_checkins c on c.id = o.checkin_id
     where c.period_label in ('Semaine très ancienne', 'Semaine ancienne', 'Autre semaine ancienne') $$,
  'les rappels envoyés, annulés et en échec de plus de six mois sont supprimés'
);

select is(
  (select count(*) from public.notification_outbox o
   join public.engagement_checkins c on c.id = o.checkin_id
   where c.period_label = 'Semaine dernière')::int,
  1,
  'un rappel envoyé la semaine dernière reste — la rétention est de six mois, pas de six jours'
);

select is_empty(
  $$ select token from public.push_tokens where token = 'ExponentPushToken[pgtap-retention-vieux]' $$,
  'un jeton désactivé depuis 91 jours est supprimé — ce que /confidentialite annonce'
);

select is(
  (select count(*) from public.push_tokens where token = 'ExponentPushToken[pgtap-retention-actif]')::int,
  1,
  'un jeton actif n''est jamais touché par la purge'
);

select * from finish();
rollback;
