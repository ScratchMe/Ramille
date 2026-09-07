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

select plan(17);

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

select * from finish();
rollback;
