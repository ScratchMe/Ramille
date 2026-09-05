-- Tests pgTAP des policies RLS (supabase/migrations/20260823094900_rls_policies.sql et
-- suivantes) — l'isolation stricte par utilisateur qui protège tout le bilan, le plan de
-- réduction et la boucle d'engagement. `compute_assessment_results` et
-- `generate_plan_cycle_for_user` (01/02) exercent déjà une partie de ces policies en creux ;
-- ce fichier les teste directement, table par table, y compris les tables que ces deux
-- fonctions ne touchent jamais (profiles, engagement_checkins).
--
-- Quatre catégories de garde-fous couverts :
--   A. Lecture (SELECT) : un tiers ne doit jamais voir la ligne d'un autre utilisateur.
--   B. Écriture croisée : ni INSERT falsifié (user_id d'un tiers), ni UPDATE sur la ligne
--      d'un tiers (silencieusement sans effet, RLS filtre la ligne cible avant l'UPDATE).
--   C. Verrouillage serveur-only : assessment_results/plan_cycles/plan_actions n'ont aucune
--      policy insert pour `authenticated` (écriture réservée aux fonctions security definer) ;
--      engagement_checkins va plus loin avec un `revoke insert` explicite.
--   D. Référentiels publics : transport_modes/emission_factors/action_templates restent
--      lisibles même sans authentification (anon), cf. 20260823095200_public_reference_data.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- ── Fixtures : deux utilisateurs, un seul (A) possède des données ──────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('51111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-rls-a@test.local', 'x', now(), now()),
  ('51111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-rls-b@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('61111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'completed', now()),
  -- second bilan sans réponses : cible neutre pour le test d'INSERT falsifié (§B) sans
  -- collision de clé primaire avec les réponses du premier bilan.
  ('62222222-2222-2222-2222-222222222222', '51111111-1111-1111-1111-111111111111', 'in_progress', null);

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  '61111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', false, false, 'rarely'
);

-- L'instantané par segment est obligatoire depuis l'étape 6a : sans lui,
-- `estimate_action_savings` ne rend aucune action et le cycle généré plus bas serait vide —
-- il n'y aurait alors rien à protéger, et l'assertion RLS sur `plan_actions` passerait pour
-- une mauvaise raison. Valeurs dérivées du facteur, jamais écrites en dur (cf. CLAUDE.md).
insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
  commute_main_leg_km_year, commute_main_leg_co2_kg_year, commute_trip_distance_km,
  leisure_km_year, mobility_constrained
)
select
  '61111111-1111-1111-1111-111111111111', f.co2, f.co2, 0, 0,
  'commute', f.co2, 'voiture', 'Trajet domicile-travail (Voiture)',
  4500, f.co2, 10, 0, false
from (select 4500 * public.emission_factor('voiture', current_date) as co2) f;

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status) values
  ('51111111-1111-1111-1111-111111111111', 'commute', date_trunc('week', now())::date, 'Semaine du test', 'Trajet domicile-travail (Voiture)', 'pending');

-- Génère un vrai plan_cycle + ses actions via la fonction serveur (comme en prod), plutôt
-- qu'un insert direct — exerce le même chemin que compute_assessment_results en production.
select public.generate_plan_cycle_for_user('51111111-1111-1111-1111-111111111111');

-- ── Section A : isolation en lecture (SELECT) ───────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '51111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

select is((select count(*) from public.profiles where id = '51111111-1111-1111-1111-111111111111')::int, 1, 'profiles: le propriétaire voit sa propre ligne');
select is((select count(*) from public.assessments where id = '61111111-1111-1111-1111-111111111111')::int, 1, 'assessments: le propriétaire voit son bilan');
select is((select count(*) from public.assessment_answers where assessment_id = '61111111-1111-1111-1111-111111111111')::int, 1, 'assessment_answers: le propriétaire voit ses réponses');
select is((select count(*) from public.assessment_results where assessment_id = '61111111-1111-1111-1111-111111111111')::int, 1, 'assessment_results: le propriétaire voit son résultat');
select is((select count(*) from public.engagement_checkins where user_id = '51111111-1111-1111-1111-111111111111')::int, 1, 'engagement_checkins: le propriétaire voit son check-in');
select is((select count(*) from public.plan_cycles where user_id = '51111111-1111-1111-1111-111111111111')::int, 1, 'plan_cycles: le propriétaire voit son cycle');
select is((select count(*) from public.plan_actions where plan_cycle_id in (select id from public.plan_cycles where user_id = '51111111-1111-1111-1111-111111111111'))::int > 0, true, 'plan_actions: le propriétaire voit les actions de son cycle');

select set_config('request.jwt.claims', json_build_object('sub', '51111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);

select is((select count(*) from public.profiles where id = '51111111-1111-1111-1111-111111111111')::int, 0, 'profiles: un tiers ne voit pas le profil du propriétaire');
select is((select count(*) from public.assessments where id = '61111111-1111-1111-1111-111111111111')::int, 0, 'assessments: un tiers ne voit pas le bilan du propriétaire');
select is((select count(*) from public.assessment_answers where assessment_id = '61111111-1111-1111-1111-111111111111')::int, 0, 'assessment_answers: un tiers ne voit pas les réponses du propriétaire');
select is((select count(*) from public.assessment_results where assessment_id = '61111111-1111-1111-1111-111111111111')::int, 0, 'assessment_results: un tiers ne voit pas le résultat du propriétaire');
select is((select count(*) from public.engagement_checkins where user_id = '51111111-1111-1111-1111-111111111111')::int, 0, 'engagement_checkins: un tiers ne voit pas le check-in du propriétaire');
select is((select count(*) from public.plan_cycles where user_id = '51111111-1111-1111-1111-111111111111')::int, 0, 'plan_cycles: un tiers ne voit pas le cycle du propriétaire');
select is((select count(*) from public.plan_actions where plan_cycle_id in (select id from public.plan_cycles where user_id = '51111111-1111-1111-1111-111111111111'))::int, 0, 'plan_actions: un tiers ne voit pas les actions du cycle du propriétaire');

-- ── Section B : isolation en écriture (INSERT falsifié / UPDATE croisé) ────────────────
-- Toujours en tant que B (le tiers) pour les deux INSERT et les quatre UPDATE.

select throws_ok(
  $stmt$ insert into public.assessments (user_id, status) values ('51111111-1111-1111-1111-111111111111', 'in_progress') $stmt$,
  '42501',
  'new row violates row-level security policy for table "assessments"',
  'assessments: impossible d''insérer un bilan pour un autre user_id que le sien'
);
select throws_ok(
  $stmt$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency) values ('62222222-2222-2222-2222-222222222222', false, 'rarely') $stmt$,
  '42501',
  'new row violates row-level security policy for table "assessment_answers"',
  'assessment_answers: impossible d''insérer des réponses sur le bilan d''un tiers'
);

-- Ces UPDATE ciblent la ligne du propriétaire (A) mais s'exécutent avec le contexte de B :
-- la clause USING de la policy filtre la ligne cible avant même d'atteindre l'UPDATE, donc
-- 0 ligne affectée plutôt qu'une erreur — vérifié ci-dessous en repassant en contexte A.
update public.assessments set status = 'in_progress' where id = '61111111-1111-1111-1111-111111111111';
update public.assessment_answers set commute_days_per_week = 1 where assessment_id = '61111111-1111-1111-1111-111111111111';
update public.engagement_checkins set status = 'answered', response = true where user_id = '51111111-1111-1111-1111-111111111111';
update public.profiles set cadence_type = 'rolling_quarter' where id = '51111111-1111-1111-1111-111111111111';

select set_config('request.jwt.claims', json_build_object('sub', '51111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

select is((select status from public.assessments where id = '61111111-1111-1111-1111-111111111111'), 'completed', 'assessments: l''UPDATE d''un tiers sur le bilan du propriétaire est sans effet');
select is((select commute_days_per_week from public.assessment_answers where assessment_id = '61111111-1111-1111-1111-111111111111'), 5::smallint, 'assessment_answers: l''UPDATE d''un tiers sur les réponses du propriétaire est sans effet');
select is((select status from public.engagement_checkins where user_id = '51111111-1111-1111-1111-111111111111'), 'pending', 'engagement_checkins: l''UPDATE d''un tiers sur le check-in du propriétaire est sans effet');
-- `cadence_type` plutôt qu'une colonne nullable : sa valeur par défaut est 'season', donc
-- l'assertion distingue « l'UPDATE n'a rien fait » de « la colonne n'a jamais rien contenu ».
-- La version précédente vérifiait que `profiles.zone_type` restait NULL — une colonne qui
-- était nulle pour tout le monde, et qui a depuis été supprimée comme colonne morte
-- (cf. 20260905180000).
select is((select cadence_type from public.profiles where id = '51111111-1111-1111-1111-111111111111'), 'season', 'profiles: l''UPDATE d''un tiers sur le profil du propriétaire est sans effet');

-- ── Section C : verrouillage écriture serveur-only (aucune policy insert) ──────────────
-- Toujours en tant que A (le propriétaire lui-même) : ces tables ne sont jamais écrites
-- directement par un client, seulement par des fonctions security definer.

select throws_ok(
  $stmt$ insert into public.assessment_results (assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year, dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label) values (gen_random_uuid(), 1, 1, 0, 0, 'commute', 1, 'voiture', 'x') $stmt$,
  '42501',
  'new row violates row-level security policy for table "assessment_results"',
  'assessment_results: authenticated ne peut pas insérer directement (calcul serveur uniquement)'
);
select throws_ok(
  $stmt$ insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, target_reduction_pct) values ('51111111-1111-1111-1111-111111111111', 'season', 'x', current_date, current_date, 'x', 20) $stmt$,
  '42501',
  'new row violates row-level security policy for table "plan_cycles"',
  'plan_cycles: authenticated ne peut pas insérer directement (génération serveur uniquement)'
);
select throws_ok(
  format(
    $stmt$ insert into public.plan_actions (plan_cycle_id, action_template_id) values (%L, (select id from public.action_templates limit 1)) $stmt$,
    (select id from public.plan_cycles where user_id = '51111111-1111-1111-1111-111111111111')
  ),
  '42501',
  'new row violates row-level security policy for table "plan_actions"',
  'plan_actions: authenticated ne peut pas insérer directement (génération serveur uniquement)'
);
select throws_ok(
  $stmt$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label) values ('51111111-1111-1111-1111-111111111111', 'commute', current_date, 'x', 'x') $stmt$,
  '42501',
  'permission denied for table engagement_checkins',
  'engagement_checkins: authenticated ne peut pas insérer directement (revoke insert explicite, cf. migration)'
);

-- ── Section D : référentiels publics, lisibles même sans authentification ──────────────

select set_config('role', 'anon', true);
select set_config('request.jwt.claims', ''::text, true);

select is((select count(*) > 0 from public.transport_modes), true, 'transport_modes: lisible par anon (référentiel non sensible)');
select is((select count(*) > 0 from public.emission_factors), true, 'emission_factors: lisible par anon (référentiel non sensible)');
select is((select count(*) > 0 from public.action_templates), true, 'action_templates: lisible par anon (référentiel non sensible)');

reset role;
select * from finish();
rollback;
