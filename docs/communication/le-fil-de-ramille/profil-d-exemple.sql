-- Le profil d'exemple du film « Le fil de Ramille », passé par le vrai calcul.
--
--   docker exec -i supabase_db_ramille psql -U postgres -d postgres -f - < docs/communication/le-fil-de-ramille/profil-d-exemple.sql
--
-- Sur la stack locale (`supabase db start`, migrations appliquées), jamais sur le projet distant :
-- tout se passe dans une transaction annulée, mais il n'y a aucune raison d'écrire, même pour
-- l'annuler, sur la production.
--
-- **Pourquoi** : la fiche Google Play pose qu'aucune capture ne montre un chiffre inventé
-- (`docs/exploitation/fiche-google-play.md` §2.3), et le film y va. Décidé le 03/10/2026 : le
-- profil d'exemple reste, ses chiffres sont ceux que l'app rendrait. Ce script les rend — le total,
-- la répartition, le cap de la saison, les actions mises en avant et leurs gains — et le film les
-- recopie. **Quand le calcul change, on le rejoue, et le film suit.**
--
-- Les réponses que le film montre sont les quatre premières ci-dessous ; les autres ne s'y voient
-- pas, et ont été choisies pour un profil ordinaire de périurbain qui va au travail en voiture.
-- **Chaque réponse que le questionnaire réclame pour ce profil y est** : vérifié le 03/10/2026 par
-- `visibleSteps` et `manqueDeLEtape` (`src/types/bilan.ts`) — neuf étapes, aucune réponse manquante.
-- Sans cela, le calcul comble les trous par ses replis, et le script rendrait un jour des chiffres
-- qu'aucun écran ne montre : la motorisation et l'occupation des longs trajets manquaient à la
-- première version, et « à deux » au lieu de « seul » donnait 2,0 t au lieu de 2,1 (contre-lecture).
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('f11f11f1-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profil-d-exemple@film.local', 'x', now(), now());

insert into public.assessments (id, user_id, status) values
  ('f11f11f1-0000-4000-8000-000000000002', 'f11f11f1-0000-4000-8000-000000000001', 'in_progress');

insert into public.assessment_answers (
  assessment_id,
  -- Ce que le film montre, étape par étape.
  commute_has_regular_trip,           -- « As-tu un trajet régulier… ? » — Oui
  commute_mode, commute_is_carpool,   -- « Voiture (seul) »
  leisure_frequency,                  -- « Une fois par semaine »
  flights_total_per_year,             -- « Combien de vols… ? » — 1
  -- Ce qu'il ne montre pas.
  commute_second_mode_used,
  commute_days_per_week, commute_distance_km, commute_car_engine, teletravail,
  leisure_mode, leisure_distance_bracket, leisure_car_engine,
  flights_short_per_year, train_long_trips_per_year, car_long_trips_per_year, coach_long_trips_per_year,
  car_long_trips_engine, car_long_trips_occupancy,
  zone_type, transports_proches, household_vehicles
) values (
  'f11f11f1-0000-4000-8000-000000000002',
  true,
  'voiture', false,
  'weekly',
  1,
  false,
  5, 20, 'thermique', 'aucun',
  'voiture', '15_30', 'thermique',
  1, 0, 2, 0,
  'thermique', 1,
  'periurbain', array['train', 'bus'], '1'
);

-- La soumission, comme l'app la fait (BILAN.md §3) : le bilan passe en complété, puis le calcul — que
-- l'app appelle par `compute_assessment_results`, qui délègue à `recompute_assessment_results` — génère
-- lui-même le plan, dans une sous-transaction.
update public.assessments set status = 'completed', submitted_at = now() where id = 'f11f11f1-0000-4000-8000-000000000002';
select public.recompute_assessment_results('f11f11f1-0000-4000-8000-000000000002');

\echo '— Le bilan (kg CO2e par an)'
select round(total_co2_kg_year) as total, round(commute_co2_kg_year) as domicile_travail,
       round(leisure_co2_kg_year) as loisirs, round(travel_co2_kg_year) as voyages,
       dominant_poste, dominant_poste_mode
from public.assessment_results where assessment_id = 'f11f11f1-0000-4000-8000-000000000002';

\echo '— Le cap de la saison : le palier vaut le total moins ce cap'
select round(baseline_co2_kg_year) as base_du_poste, target_reduction_pct as pct,
       round(baseline_co2_kg_year * target_reduction_pct / 100) as cap_kg, poste
from public.plan_cycles where user_id = 'f11f11f1-0000-4000-8000-000000000001';

\echo '— Ce que la restitution en dérive, pour ce profil (suivi/bilan.tsx) : le palier, et les barres'
\echo '  Répartition : part du total, 3 % au moins. « Où tu te situes » : rapportées au plus grand de'
\echo '  « Toi », de la moyenne (2,8 t, montrée hors mobilité contrainte) et du repère 2050 (0,6 t, montré'
\echo '  sous la moyenne), divisé par 0,85. Les deux repères sont ceux de src/constants/carbon-reference.ts.'
select round(r.total_co2_kg_year - c.baseline_co2_kg_year * c.target_reduction_pct / 100) as palier_kg,
       r.mobility_constrained as mobilite_contrainte,
       round(greatest(r.commute_co2_kg_year / r.total_co2_kg_year * 100, 3), 2) as barre_domicile_travail,
       round(greatest(r.leisure_co2_kg_year / r.total_co2_kg_year * 100, 3), 2) as barre_loisirs,
       round(greatest(r.travel_co2_kg_year / r.total_co2_kg_year * 100, 3), 2) as barre_voyages,
       round(r.total_co2_kg_year / 1000 / d.domaine * 100, 2) as barre_toi,
       round((r.total_co2_kg_year - c.baseline_co2_kg_year * c.target_reduction_pct / 100) / 1000 / d.domaine * 100, 2) as barre_palier,
       round(2.8 / d.domaine * 100, 2) as barre_moyenne,
       round(0.6 / d.domaine * 100, 2) as barre_repere_2050
from public.assessment_results r
join public.plan_cycles c on c.user_id = 'f11f11f1-0000-4000-8000-000000000001'
cross join lateral (select greatest(r.total_co2_kg_year / 1000, 2.8, 0.6) / 0.85 as domaine) d
where r.assessment_id = 'f11f11f1-0000-4000-8000-000000000002';

\echo '— Les actions, dans l''ordre du plan (les deux premières sont mises en avant)'
select pa.rank, t.action_text, round(pa.saving_kg_year) as gain_kg, pa.saving_share_percent as part_pct
from public.plan_actions pa
join public.plan_cycles c on c.id = pa.plan_cycle_id
join public.action_templates t on t.id = pa.action_template_id
where c.user_id = 'f11f11f1-0000-4000-8000-000000000001'
order by pa.rank;

rollback;
