-- Tests pgTAP de `resolve_car_mode` et de son intégration dans `compute_assessment_results`
-- (docs/architecture — increment 04/09/2026, migration 20260904090000_car_engine.sql) :
-- "voiture (seul)"/"voiture (covoiturage)" ne précisaient jamais si le véhicule est
-- thermique ou électrique, alors que le facteur d'émission diffère d'un facteur ~9
-- (0,1106 vs 0,0121 kgCO2/km). Une question de suivi ("Thermique ou électrique ?")
-- s'affiche désormais dès que "voiture" est choisi, dans 3 contextes indépendants
-- (commute_car_engine, leisure_car_engine, car_long_trips_engine) — jamais une entrée de
-- plus dans les listes de mode (B1.4/B1.7/B2.2), qui restent inchangées.
--
-- Chaque scénario simule une requête authentifiée via request.jwt.claims, comme
-- 01_compute_assessment_results.test.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- ── Fixtures : 5 utilisateurs, 1 bilan chacun ───────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-a@test.local', 'x', now(), now()),
  ('c1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-b@test.local', 'x', now(), now()),
  ('c1111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-c@test.local', 'x', now(), now()),
  ('c1111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-d@test.local', 'x', now(), now()),
  ('c1111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-e@test.local', 'x', now(), now()),
  ('c1111111-1111-1111-1111-111111111116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-engine-f@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'completed', now()),
  ('d1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'completed', now()),
  ('d1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111113', 'completed', now()),
  ('d1111111-1111-1111-1111-111111111114', 'c1111111-1111-1111-1111-111111111114', 'completed', now()),
  ('d1111111-1111-1111-1111-111111111115', 'c1111111-1111-1111-1111-111111111115', 'completed', now()),
  ('d1111111-1111-1111-1111-111111111116', 'c1111111-1111-1111-1111-111111111116', 'completed', now());

-- A : commute voiture électrique, seul (pas d'intermodalité).
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, commute_car_engine, leisure_frequency
) values (
  'd1111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', false, false, 'electrique', 'rarely'
);

-- B : commute voiture SANS moteur renseigné (bilan soumis avant cette migration, ou champ
-- resté vide) -> repli sur le facteur générique 'voiture', comportement identique à avant.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  'd1111111-1111-1111-1111-111111111112', true, 5, 10, 'voiture', false, false, 'rarely'
);

-- C : intermodal train (mode principal) + voiture thermique (second mode) — vérifie que
-- commute_car_engine s'applique bien à la bonne jambe quand ce n'est pas la principale.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, commute_second_mode, commute_car_engine, leisure_frequency
) values (
  'd1111111-1111-1111-1111-111111111113', true, 5, 20, 'train', false, true, 'voiture', 'thermique', 'rarely'
);

-- D : loisirs en voiture électrique, fréquents -> poste dominant.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode, leisure_distance_bracket, leisure_car_engine
) values (
  'd1111111-1111-1111-1111-111111111114', false, 'multiple_weekly', 'voiture', '30_plus', 'electrique'
);

-- F : commute en hybride non rechargeable — la motorisation ajoutée le 05/09/2026, qui
-- n'existait pas dans le questionnaire et forçait ces personnes à répondre « thermique ».
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, commute_car_engine, leisure_frequency
) values (
  'd1111111-1111-1111-1111-111111111116', true, 5, 10, 'voiture', false, false, 'hybride', 'rarely'
);

-- E : voyages longue distance en voiture thermique -> poste dominant.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, car_long_trips_per_year, car_long_trips_engine
) values (
  'd1111111-1111-1111-1111-111111111115', false, 'rarely', 5, 'thermique'
);

-- ── Scénario A ───────────────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select round(commute_co2_kg_year::numeric, 3), dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111111' $$,
  $$ values (303.143::numeric, 'voiture_electrique'::text, 'Trajet domicile-travail (Voiture électrique)'::text) $$,
  -- 4500 km × 0,067365. L'écart avec le thermique (0,142253) est de 2,1x et non de 9x comme
  -- l'affirmait cette assertion : la version précédente comparait deux facteurs d'usage seul,
  -- qui effaçaient la fabrication de la batterie. Cf. v1-07 §1.5.
  'A : commute voiture électrique -> facteur ACV 0,067365 (2,1x plus faible que thermique), libellé précis'
);

-- ── Scénario B : repli générique (non-régression) ───────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111112');

select results_eq(
  $$ select round(commute_co2_kg_year::numeric, 3), dominant_poste_mode from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111112' $$,
  $$ values (640.139::numeric, 'voiture'::text) $$,  -- 4500 km × 0,142253
  'B : commute voiture sans moteur renseigné -> repli sur le facteur générique voiture (0,142253), comportement inchangé'
);

-- ── Scénario C : intermodalité, moteur sur la jambe secondaire ─────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111113', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111113');

select is(
  (select round(commute_co2_kg_year::numeric, 3) from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111113'),
  764.744::numeric,  -- 4500 × 0,027690 (train) + 4500 × 0,142253 (voiture thermique)
  'C : intermodal train + voiture thermique (second mode) -> la moitié voiture utilise le facteur thermique, pas le générique'
);

-- ── Scénario D : loisirs voiture électrique dominants ───────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111114', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111114');

select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111114' $$,
  $$ values ('leisure'::text, 'voiture_electrique'::text, 'Loisirs du week-end (Voiture électrique)'::text) $$,
  'D : loisirs voiture électrique dominants -> mode et libellé résolus précisément'
);

-- ── Scénario E : voyages longue distance voiture thermique dominants ───────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111115', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111115');

select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111115' $$,
  $$ values ('travel'::text, 'voiture_thermique'::text, 'Voyages longue distance (Voiture thermique)'::text) $$,
  'E : voyages longue distance voiture thermique dominants -> mode et libellé résolus précisément'
);

-- ── Scénario F : hybride non rechargeable ───────────────────────────────────────────────

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111116', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('d1111111-1111-1111-1111-111111111116');

select results_eq(
  $$ select round(commute_co2_kg_year::numeric, 3), dominant_poste_mode, dominant_poste_label from public.assessment_results where assessment_id = 'd1111111-1111-1111-1111-111111111116' $$,
  $$ select round((4500 * public.emission_factor('voiture_hybride', current_date))::numeric, 3),
            'voiture_hybride'::text, 'Trajet domicile-travail (Voiture hybride)'::text $$,
  'F : commute hybride -> facteur et libellé propres à cette motorisation, plus de repli sur thermique'
);

-- **Invariant contre-intuitif, à ne surtout pas « corriger ».** En ACV complète, l'hybride non
-- rechargeable émet PLUS que la thermique de référence : celle-ci est une compacte diesel,
-- sobre à l'usage, tandis que l'hybride ajoute une batterie à fabriquer sans jamais la
-- recharger sur le réseau. Le rechargeable, lui, passe bien en dessous. Quelqu'un qui range
-- « hybride » du côté de l'électrique par réflexe casserait ce test — c'est son rôle.
select ok(
  public.emission_factor('voiture_hybride', current_date) > public.emission_factor('voiture_thermique', current_date)
    and public.emission_factor('voiture_hybride_rechargeable', current_date) < public.emission_factor('voiture_thermique', current_date)
    and public.emission_factor('voiture_electrique', current_date) < public.emission_factor('voiture_hybride_rechargeable', current_date),
  'ordre des motorisations en ACV : hybride > thermique > hybride rechargeable > électrique'
);

-- ── resolve_car_mode : garde de non-régression directe sur la fonction pure ────────────

select is(public.resolve_car_mode('voiture', 'electrique'), 'voiture_electrique', 'resolve_car_mode : voiture + électrique -> voiture_electrique');
select is(public.resolve_car_mode('voiture', 'thermique'), 'voiture_thermique', 'resolve_car_mode : voiture + thermique -> voiture_thermique');
select is(public.resolve_car_mode('voiture', 'hybride'), 'voiture_hybride', 'resolve_car_mode : voiture + hybride -> voiture_hybride');
select is(public.resolve_car_mode('voiture', 'hybride_rechargeable'), 'voiture_hybride_rechargeable', 'resolve_car_mode : voiture + hybride rechargeable -> voiture_hybride_rechargeable');
select is(public.resolve_car_mode('voiture', null), 'voiture', 'resolve_car_mode : voiture + moteur non renseigné -> repli générique');
select is(public.resolve_car_mode('bus', 'electrique'), 'bus', 'resolve_car_mode : un mode non-voiture n''est jamais affecté par le moteur');

select * from finish();
rollback;
