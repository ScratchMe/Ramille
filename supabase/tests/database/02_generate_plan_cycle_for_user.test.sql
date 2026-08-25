-- Tests pgTAP de `generate_plan_cycle_for_user` (docs/architecture/v1-03-plan-reduction.md) —
-- la génération du plan de réduction, appelée à la fois immédiatement après un bilan (cf.
-- 20260824190000_plan_cycle_on_submit.sql) et chaque nuit par le cron `generate_plan_cycles()`.
-- Contrairement à `compute_assessment_results`, cette fonction ne lit pas `auth.uid()` — les
-- scénarios n'ont donc pas besoin de simuler une requête authentifiée (`request.jwt.claims`),
-- mais RESTE volontairement inexécutable par un client (`revoke ... from authenticated`,
-- vérifié en fin de fichier) : seule une autre fonction security definer peut l'appeler.
--
-- Les bornes de période (period_start/period_end) ne sont pas re-vérifiées ici dans le détail
-- — c'est le rôle de 00_period_bounds.test.sql — seulement comparées à un appel frais de
-- `season_bounds`/`rolling_quarter_bounds` pris comme oracle, pour vérifier que cette fonction
-- choisit la bonne branche selon `profiles.cadence_type` et lui transmet les bons arguments.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- ── Scénario A : cadence saisonnière par défaut, mode dominant avec 2 templates ─────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-a@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('41111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'completed', now());

-- Résultat inséré directement (pas via compute_assessment_results) : cette fonction consomme
-- assessment_results en lecture seule, pas besoin de rejouer tout le calcul du bilan ici.
insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label
) values (
  '41111111-1111-1111-1111-111111111111', 500, 500, 0, 0, 'commute', 500, 'voiture', 'Trajet domicile-travail (Voiture)'
);

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select cadence_type, period_start, trip_label, baseline_co2_kg_year, target_reduction_pct
     from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111111' $$,
  $$ select 'season'::text, (select period_start from public.season_bounds(current_date)), 'Trajet domicile-travail (Voiture)'::text, 500::numeric, 20::numeric $$,
  'cadence saisonnière par défaut : champs propagés depuis assessment_results et le profil'
);

select is(
  (select count(*) from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id where pc.user_id = '31111111-1111-1111-1111-111111111111')::int,
  2,
  '2 actions générées pour la catégorie voiture (2 templates seedés, cf. 20260823110000_plan_reduction.sql)'
);

-- Idempotence : un second appel sur la même période (même unique(user_id, period_start))
-- ne doit ni dupliquer le cycle ni ses actions.
select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111111');

select is(
  (select count(*) from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111111')::int,
  1,
  'idempotence : un second appel sur la même période ne crée pas de second cycle'
);

-- ── Scénario B : cadence trimestre glissant, ancrée sur la date du bilan ────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-c@test.local', 'x', now(), now());

update public.profiles set cadence_type = 'rolling_quarter' where id = '31111111-1111-1111-1111-111111111113';

insert into public.assessments (id, user_id, status, submitted_at) values
  ('41111111-1111-1111-1111-111111111113', '31111111-1111-1111-1111-111111111113', 'completed', '2026-01-10T09:00:00Z');

insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label
) values (
  '41111111-1111-1111-1111-111111111113', 400, 400, 0, 0, 'commute', 400, 'voiture', 'Trajet domicile-travail (Voiture)'
);

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111113');

select results_eq(
  $$ select cadence_type, period_start from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111113' $$,
  $$ select 'rolling_quarter'::text, (select period_start from public.rolling_quarter_bounds('2026-01-10'::date, current_date)) $$,
  'profiles.cadence_type = rolling_quarter -> bornes ancrées sur la date du bilan, pas les saisons'
);

-- ── Scénario C : aucun bilan complété -> rien à générer ─────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-d@test.local', 'x', now(), now());

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111114');

select is(
  (select count(*) from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111114')::int,
  0,
  'aucun bilan complété -> aucun cycle créé (return anticipé, pas d''erreur)'
);

-- ── Scénario D : mode dominant dont la catégorie n'a qu'un seul template ────────────────
-- (transports_commun n'a qu'une action seedée -> limit 2 ne doit pas planter sur un manque)

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-e@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('41111111-1111-1111-1111-111111111115', '31111111-1111-1111-1111-111111111115', 'completed', now());

insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label
) values (
  '41111111-1111-1111-1111-111111111115', 300, 300, 0, 0, 'commute', 300, 'bus', 'Trajet domicile-travail (Bus)'
);

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111115');

select is(
  (select count(*) from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id where pc.user_id = '31111111-1111-1111-1111-111111111115')::int,
  1,
  'catégorie transports_commun n''a qu''un seul template -> 1 action, pas 2'
);

-- ── Garde de privilège ───────────────────────────────────────────────────────────────────
-- Régression sur l'intention documentée dans la migration : cette fonction ne doit être
-- appelable que depuis une autre fonction security definer, jamais directement par un client.

select ok(
  not has_function_privilege('authenticated', 'public.generate_plan_cycle_for_user(uuid)', 'execute'),
  'authenticated ne doit jamais pouvoir exécuter generate_plan_cycle_for_user directement'
);

select * from finish();
rollback;
