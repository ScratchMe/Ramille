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

select plan(8);

-- ── Scénario A : cadence saisonnière par défaut, mode dominant à plusieurs gabarits ────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-a@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('41111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'completed', now());

-- Les réponses sont nécessaires depuis l'étape 6a : l'estimateur de gains lit le contexte B4
-- et les compteurs de trajets, pas seulement le résultat agrégé.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_is_carpool, commute_second_mode_used, leisure_frequency,
  zone_type, tc_access, household_vehicles
) values (
  '41111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', false, false, 'rarely',
  'urbain_dense', 'bon', '1'
);

-- Résultat inséré directement (pas via compute_assessment_results) : cette fonction consomme
-- assessment_results en lecture seule, pas besoin de rejouer tout le calcul du bilan ici.
-- L'instantané par segment est en revanche obligatoire — c'est ce que lit l'estimateur.
--
-- Les valeurs sont **dérivées du facteur** plutôt qu'écrites en dur : un test qui fige
-- 640.1385 tombe à la prochaine révision ADEME sans rien apprendre à personne. C'est la
-- leçon des deux CI rouges du 04 et du 05/09/2026 (cf. CLAUDE.md, section Tests).
insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
  commute_main_leg_km_year, commute_main_leg_co2_kg_year, commute_trip_distance_km,
  leisure_km_year, mobility_constrained
)
select
  '41111111-1111-1111-1111-111111111111', f.co2, f.co2, 0, 0,
  'commute', f.co2, 'voiture', 'Trajet domicile-travail (Voiture)',
  4500, f.co2, 10, 0, false
from (select 4500 * public.emission_factor('voiture', current_date) as co2) f;

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select cadence_type, period_start, trip_label, baseline_co2_kg_year, target_reduction_pct
     from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111111' $$,
  $$ select 'season'::text, (select period_start from public.season_bounds(current_date)),
            'Trajet domicile-travail (Voiture)'::text,
            (select 4500 * public.emission_factor('voiture', current_date)), 20::numeric $$,
  'cadence saisonnière par défaut : champs propagés depuis assessment_results et le profil'
);

-- **Le plan retient TOUTES les actions dont le gain atteint le seuil** (C4.6), et chacune porte son
-- gain chiffré (T10, §3.3). L'assertion attendait exactement 2 : c'était le `limit 2` que le SQL
-- portait, un choix d'écran écrit au mauvais endroit, qui jetait les autres leviers avant même de les
-- écrire (A13-18). Ce qui compte ici n'est plus le nombre mais l'égalité avec ce que l'estimateur
-- propose — le nombre, lui, dépend du profil de la fixture et ne dit rien.
select results_eq(
  $$ select count(*)::int, bool_and(saving_kg_year > 0), bool_and(detail_text is not null),
            bool_and(pa.first_step = tpl.first_step)
     from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     join public.action_templates tpl on tpl.id = pa.action_template_id
     where pc.user_id = '31111111-1111-1111-1111-111111111111' $$,
  $$ select count(*)::int, true, true, true from public.estimate_action_savings(
       (select id from public.assessments where user_id = '31111111-1111-1111-1111-111111111111'
        and status = 'completed' order by submitted_at desc limit 1)) $$,
  'toutes les actions proposées sont retenues, chiffrées, détaillées, et portent LE premier pas de leur gabarit'
);

-- **L'ordre n'est pas décoratif : depuis que C4.6 a retiré le `limit 2`, c'est `rank` qui décide de
-- ce que l'écran met en avant** (`pistesDuPlan` prend les deux premiers rangs en cartes pleines).
-- L'assertion d'origine ne comparait que le rang 1 au rang 2 : elle était complète quand le plan
-- portait exactement deux actions, et elle a cessé de l'être sans être reprise. On balaie donc la
-- suite entière, comme les autres gardes de C4.6 — un rang ajouté demain la traverse.
select ok(
  (select bool_and(precedent is null or saving_kg_year <= precedent) from (
     select saving_kg_year, lag(saving_kg_year) over (order by rank) as precedent
     from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     where pc.user_id = '31111111-1111-1111-1111-111111111111') suite),
  'les actions sont classées par gain décroissant, sur toute la suite des rangs'
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

-- **La date de soumission se pose en deux temps depuis C2.2**, et il ne faut pas la remettre dans
-- l'`insert` : un trigger `before insert or update` la remplace par `now()` au passage en
-- `completed`, puisqu'elle venait jusque-là de l'horloge du téléphone (A4-20). Le second ordre la
-- fixe — `old.status` et `new.status` valant tous deux `completed`, le trigger ne réécrit rien.
-- Ce scénario a besoin d'une date choisie : c'est elle qui ancre le trimestre glissant.
insert into public.assessments (id, user_id, status) values
  ('41111111-1111-1111-1111-111111111113', '31111111-1111-1111-1111-111111111113', 'completed');
update public.assessments set submitted_at = '2026-01-10T09:00:00Z'
where id = '41111111-1111-1111-1111-111111111113';

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

-- ── Scénario D : quelqu'un qui fait déjà tout bien ──────────────────────────────────────
-- Trajet domicile-travail à vélo, rien d'autre. Aucune substitution ne peut lui faire gagner
-- quoi que ce soit, et c'est le cas qu'il ne faut surtout pas traiter par une erreur : le plan
-- se crée quand même, simplement sans action. `/plan` doit alors féliciter, pas afficher un
-- écran cassé — c'est le même profil que le T8 de l'audit (division par zéro sur la
-- restitution), et le pire accueil possible pour la personne la plus vertueuse du produit.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('31111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-plan-e@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('41111111-1111-1111-1111-111111111115', '31111111-1111-1111-1111-111111111115', 'completed', now());

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_is_carpool, commute_second_mode_used, leisure_frequency,
  zone_type, tc_access, household_vehicles
) values (
  '41111111-1111-1111-1111-111111111115', true, 5, 6, 'velo', false, false, 'rarely',
  'urbain_dense', 'bon', '0'
);

insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
  commute_main_leg_km_year, commute_main_leg_co2_kg_year, commute_trip_distance_km,
  leisure_km_year, mobility_constrained
)
select
  '41111111-1111-1111-1111-111111111115', f.co2, f.co2, 0, 0,
  'commute', f.co2, 'velo', 'Trajet domicile-travail (Vélo)',
  2700, f.co2, 6, 0, false
from (select 2700 * public.emission_factor('velo', current_date) as co2) f;

select public.generate_plan_cycle_for_user('31111111-1111-1111-1111-111111111115');

select results_eq(
  $$ select (select count(*)::int from public.plan_cycles where user_id = '31111111-1111-1111-1111-111111111115'),
            (select count(*)::int from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
             where pc.user_id = '31111111-1111-1111-1111-111111111115') $$,
  $$ values (1, 0) $$,
  'profil déjà vertueux : le cycle est bien créé, sans action — aucune action au gain nul ou négatif n''est proposée'
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
