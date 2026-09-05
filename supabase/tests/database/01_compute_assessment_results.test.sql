-- Tests pgTAP de `compute_assessment_results` (docs/architecture/v1-05-bilan-v2.md §"Logique
-- de calcul") — le calcul qui produit le chiffre affiché à l'utilisateur. Les valeurs
-- attendues ci-dessous ont été vérifiées à la main (formules de la spec) puis recoupées en
-- conditions réelles contre le projet Supabase distant (facteurs d'émission actuels : voiture
-- 0,1106 · train 0,0229 · bus 0,1135 kg CO2/km) avant d'être figées ici.
--
-- Chaque scénario simule une requête authentifiée via request.jwt.claims (comme le ferait
-- PostgREST) plutôt que d'appeler la fonction en tant que postgres, pour exercer la garde
-- `auth.uid() = assessments.user_id` telle qu'elle sera réellement invoquée en prod.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ── Fixtures : 4 utilisateurs, 1 bilan chacun ───────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-commute@test.local', 'x', now(), now()),
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-carpool@test.local', 'x', now(), now()),
  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-travel@test.local', 'x', now(), now()),
  ('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-leisure@test.local', 'x', now(), now()),
  ('11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-other@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'completed', now()),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111112', 'completed', now()),
  ('23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111113', 'completed', now()),
  ('24444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111114', 'completed', now());

-- Scénario 1 : trajet domicile-travail simple, un seul mode, pas de covoiturage.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  '21111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', false, false, 'rarely'
);

-- Scénario 2 : covoiturage (division par la taille du groupe) + intermodalité (distance
-- répartie 50/50 entre les deux modes, cf. compute_assessment_results).
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_carpool_size, commute_second_mode_used, commute_second_mode, leisure_frequency
) values (
  '22222222-2222-2222-2222-222222222222', true, 4, 20, 'voiture', true, 4, true, 'train', 'rarely'
);

-- Scénario 3 : pas de trajet domicile-travail, loisirs "rarement" (contribution résiduelle
-- par défaut), voyages en voiture dominants.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, car_long_trips_per_year
) values (
  '23333333-3333-3333-3333-333333333333', false, 'rarely', 5
);

-- Scénario 4 : loisirs fréquents et dominants (aucun trajet régulier, aucun voyage).
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode, leisure_distance_bracket
) values (
  '24444444-4444-4444-4444-444444444444', false, 'multiple_weekly', 'bus', '30_plus'
);

-- ── Scénario 1 ───────────────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select public.compute_assessment_results('21111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = '21111111-1111-1111-1111-111111111111' $$,
  $$ values ('commute'::text, 'voiture'::text, 'Trajet domicile-travail (Voiture)'::text) $$,
  'scénario 1 : trajet domicile-travail simple -> poste dominant = commute'
);

select is(
  (select round(total_co2_kg_year::numeric, 3) from public.assessment_results where assessment_id = '21111111-1111-1111-1111-111111111111'),
  540.834::numeric,
  'scénario 1 : total = commute (4 500 km/an à 0,1106) + loisirs par défaut'
);

-- Libellés par poste (increment 11, boucles hebdo/mensuelle) : persistés indépendamment de
-- la décision dominante globale, cf. migration 20260827090000_engagement_checkins.sql.
-- Libellés précis ("Loisirs du week-end"/"Voyages longue distance", pas juste "Trajets
-- loisirs"/"Voyages") depuis 20260903120000_precise_poste_labels.sql.
select results_eq(
  $$ select commute_poste_label, extras_poste_label from public.assessment_results where assessment_id = '21111111-1111-1111-1111-111111111111' $$,
  $$ values ('Trajet domicile-travail (Voiture)'::text, 'Loisirs du week-end (Voiture)'::text) $$,
  'scénario 1 : libellés commute/extras persistés indépendamment du poste dominant'
);

-- ── Scénario 2 : covoiturage + intermodalité ────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('22222222-2222-2222-2222-222222222222');

-- Valeur attendue révisée le 04/09/2026 (v1-07 T13, migration 20260904140000) : le
-- covoiturage ne divise plus que la jambe voiture. Cette assertion figeait l'ancien
-- comportement, qui divisait le CO2 de TOUT le trajet — donc aussi la jambe en train, que
-- les 4 passagers ne partagent évidemment pas. B1.5 (« combien de personnes partagez-vous
-- ce trajet ? ») porte sur la voiture de B1.4, pas sur le second mode intermodal.
--
--   km_année = 20 × 2 × 4 j × 45 sem = 7200, réparti 50/50 entre les deux modes
--   jambe voiture : 3600 × 0,142253 = 512,1108, covoiturée à 4 -> 128,0277
--   jambe train   : 3600 × 0,027690 =  99,684,  jamais covoiturée
--   total = 227,712
--
-- Facteurs révisés le 05/09/2026 (v1-07 §1.5, migration 20260905100000) : ils portent
-- désormais l'ACV complète et non la seule phase d'usage. Les valeurs précédentes de cette
-- assertion (0,1106 et 0,0229, total 181,98) étaient les composantes d'usage seules.
select is(
  (select round(commute_co2_kg_year::numeric, 3) from public.assessment_results where assessment_id = '22222222-2222-2222-2222-222222222222'),
  227.712::numeric,
  'scénario 2 : distance moitié voiture/moitié train, le covoiturage ne divisant que la jambe voiture'
);

select is(
  (select dominant_poste_mode from public.assessment_results where assessment_id = '22222222-2222-2222-2222-222222222222'),
  'voiture',
  'scénario 2 : le mode dominant affiché reste le mode primaire, pas le second mode'
);

select is(
  (select commute_poste_label from public.assessment_results where assessment_id = '22222222-2222-2222-2222-222222222222'),
  'Trajet domicile-travail (Voiture)',
  'scénario 2 : le libellé commute utilise aussi le mode primaire, pas le second mode'
);

-- Idempotence : rappeler la fonction met à jour la ligne existante (on conflict do update),
-- ne la duplique jamais — cf. unique(assessment_id) sur assessment_results.
select public.compute_assessment_results('22222222-2222-2222-2222-222222222222');

select is(
  (select count(*) from public.assessment_results where assessment_id = '22222222-2222-2222-2222-222222222222')::int,
  1,
  'idempotence : deux appels sur le même bilan ne laissent qu''une seule ligne de résultat'
);

-- ── Scénario 3 : voyages dominants ──────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111113', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('23333333-3333-3333-3333-333333333333');

select results_eq(
  $$ select commute_co2_kg_year, dominant_poste, dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = '23333333-3333-3333-3333-333333333333' $$,
  $$ values (0::numeric, 'travel'::text, 'voiture'::text, 'Voyages longue distance (Voiture)'::text) $$,
  'scénario 3 : sans trajet domicile-travail, 5 longs trajets voiture/an dominent'
);

select results_eq(
  $$ select commute_poste_label, extras_poste_label from public.assessment_results where assessment_id = '23333333-3333-3333-3333-333333333333' $$,
  $$ values (null::text, 'Voyages longue distance (Voiture)'::text) $$,
  'scénario 3 : pas de trajet domicile-travail -> commute_poste_label reste null ; extras = voyages (dominant du duo loisirs/voyages)'
);

-- ── Scénario 4 : loisirs dominants ──────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111114', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('24444444-4444-4444-4444-444444444444');

select results_eq(
  $$ select commute_co2_kg_year, travel_co2_kg_year, dominant_poste, dominant_poste_mode from public.assessment_results where assessment_id = '24444444-4444-4444-4444-444444444444' $$,
  $$ values (0::numeric, 0::numeric, 'leisure'::text, 'bus'::text) $$,
  'scénario 4 : loisirs "plusieurs fois par semaine" en bus -> poste dominant = leisure'
);

select is(
  (select round(leisure_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = '24444444-4444-4444-4444-444444444444'),
  1416.48::numeric,
  'scénario 4 : 40 km, 2 trajets, 3x/semaine, 52 semaines, bus à 0,1135'
);

select results_eq(
  $$ select commute_poste_label, extras_poste_label from public.assessment_results where assessment_id = '24444444-4444-4444-4444-444444444444' $$,
  $$ values (null::text, 'Loisirs du week-end (Bus)'::text) $$,
  'scénario 4 : loisirs dominants -> extras_poste_label reflète loisirs même sans voyages concurrents'
);

-- ── Garde d'accès ────────────────────────────────────────────────────────────────────────
-- Un utilisateur authentifié ne doit jamais pouvoir déclencher le calcul du bilan d'un tiers
-- (cf. `if v_owner_id is null or v_owner_id <> auth.uid() then raise exception`).

select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111115', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.compute_assessment_results('21111111-1111-1111-1111-111111111111') $$,
  'P0001',
  'compute_assessment_results: bilan introuvable ou accès refusé',
  'un utilisateur ne peut pas calculer le bilan d''un autre utilisateur'
);

select throws_ok(
  $$ select public.compute_assessment_results(gen_random_uuid()) $$,
  'P0001',
  'compute_assessment_results: bilan introuvable ou accès refusé',
  'un id de bilan inexistant lève la même erreur générique (pas d''énumération)'
);

select * from finish();
rollback;
