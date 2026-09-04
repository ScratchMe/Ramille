-- Tests pgTAP des corrections de facteurs d'émission de l'audit du 04/09/2026
-- (docs/architecture/v1-07-audit-facteurs-et-suivi.md §1, migration
-- 20260904140000_fix_flight_and_long_distance_train_factors.sql) :
--
--   1. L'avion long-courrier portait la valeur court-courrier (0,2242) parce que le seed
--      initial n'avait relevé l'API Impact CO2 qu'à km=100, sans voir que le mode avion est
--      le seul dont la valeur dépend du paramètre `km`. Court/moyen et long sont désormais
--      relevés aux distances de référence du produit (1500 et 9000 km).
--   2. Le poste voyages en train (B3.3, « > 300 km ») était calculé au facteur TER (0,0229)
--      au lieu du TGV (0,0023) : facteur 10 d'erreur. Un mode dédié `train_longue_distance`
--      porte désormais ce cas, le mode générique `train` restant le TER du trajet quotidien.
--   3. Le covoiturage divisait le CO2 de TOUT le trajet domicile-travail, y compris la jambe
--      intermodale (train, vélo…) qui n'est évidemment pas covoiturée.
--   4. `emission_factor()` centralise le lookup et le borne à la date du bilan, condition
--      pour que la synchronisation ADEME à venir ne fasse pas dériver les bilans passés.
--
-- Chaque scénario simule une requête authentifiée via request.jwt.claims, comme
-- 01_compute_assessment_results.test.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- ── Fixtures : 5 utilisateurs, 1 bilan chacun ───────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-facteurs-a@test.local', 'x', now(), now()),
  ('e1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-facteurs-b@test.local', 'x', now(), now()),
  ('e1111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-facteurs-c@test.local', 'x', now(), now()),
  ('e1111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-facteurs-d@test.local', 'x', now(), now()),
  ('e1111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-facteurs-e@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'completed', now()),
  ('f1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111112', 'completed', now()),
  ('f1111111-1111-1111-1111-111111111113', 'e1111111-1111-1111-1111-111111111113', 'completed', now()),
  ('f1111111-1111-1111-1111-111111111114', 'e1111111-1111-1111-1111-111111111114', 'completed', now()),
  ('f1111111-1111-1111-1111-111111111115', 'e1111111-1111-1111-1111-111111111115', 'completed', now());

-- A : 1 vol long-courrier et rien d'autre côté voyages.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, flights_total_per_year, flights_short_per_year
) values (
  'f1111111-1111-1111-1111-111111111111', false, 'rarely', 1, 0
);

-- B : 1 vol court/moyen-courrier.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, flights_total_per_year, flights_short_per_year
) values (
  'f1111111-1111-1111-1111-111111111112', false, 'rarely', 1, 1
);

-- C : 5 trajets longue distance en train, aucun vol.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, train_long_trips_per_year
) values (
  'f1111111-1111-1111-1111-111111111113', false, 'rarely', 5
);

-- D : trajet domicile-travail quotidien en train (B1.4 « Train ou RER ») — doit rester
-- au facteur TER, la correction ne concerne que la longue distance.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  'f1111111-1111-1111-1111-111111111114', true, 5, 10, 'train', false, false, 'rarely'
);

-- E : covoiturage à 3 en voiture + jambe intermodale en train.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_carpool_size, commute_second_mode_used, commute_second_mode, leisure_frequency
) values (
  'f1111111-1111-1111-1111-111111111115', true, 5, 20, 'voiture', true, 3, true, 'train', 'rarely'
);

-- ── Scénario A : vol long-courrier ──────────────────────────────────────────────────────
-- 1 vol × 9000 km × 0,1776 = 1598,4 kg. Avec l'ancienne valeur (0,2242, recopiée du
-- court-courrier), on affichait 2017,8 kg — soit 26 % de trop sur le poste le plus lourd
-- des profils « voyages ».

select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select public.compute_assessment_results('f1111111-1111-1111-1111-111111111111');

select is(
  (select round(travel_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = 'f1111111-1111-1111-1111-111111111111'),
  1598.40::numeric,
  'A : 1 vol long-courrier -> 9000 km au facteur long (0,1776), plus la valeur court-courrier'
);

-- ── Scénario B : vol court/moyen-courrier ───────────────────────────────────────────────
-- 1 vol × 1500 km × 0,1843 = 276,45 kg. Le produit modélise ces vols à 1500 km, distance à
-- laquelle l'ADEME retient 0,1843 et non le 0,2242 relevé à km=100.

select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('f1111111-1111-1111-1111-111111111112');

select is(
  (select round(travel_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = 'f1111111-1111-1111-1111-111111111112'),
  276.45::numeric,
  'B : 1 vol court/moyen-courrier -> facteur relevé à la distance de référence du poste (1500 km)'
);

-- ── Scénario C : train longue distance ──────────────────────────────────────────────────
-- 5 trajets × 800 km × 0,0023 = 9,2 kg. Au facteur TER, le même poste pesait 91,6 kg —
-- dix fois trop, précisément là où le produit veut faire percevoir l'écart avec l'avion.

select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111113', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('f1111111-1111-1111-1111-111111111113');

select is(
  (select round(travel_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = 'f1111111-1111-1111-1111-111111111113'),
  9.20::numeric,
  'C : 5 trajets longue distance en train -> facteur TGV (0,0023), plus le TER'
);

-- ── Scénario D : le train quotidien reste au TER (non-régression) ──────────────────────
-- 10 km × 2 × 5 j × 45 sem = 4500 km × 0,0229 = 103,05 kg.

select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111114', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('f1111111-1111-1111-1111-111111111114');

select is(
  (select round(commute_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = 'f1111111-1111-1111-1111-111111111114'),
  103.05::numeric,
  'D : trajet domicile-travail en train -> reste au facteur TER, la correction ne touche que la longue distance'
);

-- ── Scénario E : le covoiturage ne divise que la jambe voiture ─────────────────────────
-- km_année = 20 × 2 × 5 × 45 = 9000, réparti 50/50 entre les deux modes.
--   jambe voiture : 4500 × 0,1106 = 497,70, covoiturée à 3 -> 165,90
--   jambe train   : 4500 × 0,0229 = 103,05, jamais covoiturée
--   total = 268,95   (avant correction : (497,70 + 103,05) / 3 = 200,25)

select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111115', 'role', 'authenticated')::text, true);
select public.compute_assessment_results('f1111111-1111-1111-1111-111111111115');

select is(
  (select round(commute_co2_kg_year::numeric, 2) from public.assessment_results where assessment_id = 'f1111111-1111-1111-1111-111111111115'),
  268.95::numeric,
  'E : covoiturage + intermodalité -> la division par le nombre de personnes ne porte que sur la jambe voiture'
);

-- ── Gardes de non-régression directes sur le référentiel ───────────────────────────────

select isnt(
  (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_long_courrier' order by valid_from desc limit 1),
  (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_court_moyen_courrier' order by valid_from desc limit 1),
  'Référentiel : le facteur long-courrier n''est plus une copie du court-courrier'
);

select cmp_ok(
  (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'train_longue_distance' order by valid_from desc limit 1),
  '<',
  (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'train' order by valid_from desc limit 1),
  'Référentiel : le TGV longue distance est bien plus bas que le TER du trajet quotidien'
);

-- ── emission_factor() : borne à la date du bilan ───────────────────────────────────────
-- Sans cette borne, la première synchronisation ADEME ferait dériver silencieusement tous
-- les bilans passés au moindre recalcul (v1-01 §3 promet l'inverse).

insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from)
values ('voiture', 0.9999, 'test', 'pgtap', current_date + 1);

select is(
  public.emission_factor('voiture', current_date),
  0.1106::numeric,
  'emission_factor : un facteur postérieur à la date du bilan est ignoré'
);

select is(
  public.emission_factor('voiture', current_date + 1),
  0.9999::numeric,
  'emission_factor : le facteur en vigueur à la date demandée est bien celui retenu'
);

select is(
  public.emission_factor('voiture', current_date - 3650),
  0.1106::numeric,
  'emission_factor : bilan antérieur à toute version connue -> repli sur la plus ancienne, jamais NULL'
);

select throws_ok(
  $$ select public.emission_factor('mode_inexistant', current_date) $$,
  'emission_factor: aucun facteur d''émission connu pour le mode mode_inexistant',
  'emission_factor : un mode sans aucun facteur lève une erreur explicite plutôt que de renvoyer NULL'
);

select * from finish();
rollback;
