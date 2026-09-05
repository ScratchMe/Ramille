-- Tests pgTAP de `estimate_action_savings` — le chiffrage des actions du plan (étape 6a de
-- l'audit v1-07, §3.3). Trois propriétés y sont vérifiées, dans l'ordre de ce qui casserait
-- le produit si elles tombaient :
--
--   1. Aucune action au gain nul ou négatif n'est jamais proposée. C'est la raison d'être du
--      chiffrage : aux facteurs ACV, substituer un mode par un autre à peine meilleur ne fait
--      rien gagner, et un texte générique ne peut pas le voir.
--   2. Le contexte B4 filtre l'impossible (T9). Proposer les transports en commun à quelqu'un
--      qui vient de répondre qu'il n'y en a pas est exactement ce que la spec §5 interdit.
--   3. Les gardes de plausibilité tiennent : pas de vélo sur 60 km.
--
-- Les fixtures passent par `recompute_assessment_results` plutôt que par un insert direct
-- dans `assessment_results` : depuis l'étape 6a l'estimateur lit l'instantané par segment, et
-- le reconstituer à la main dans un test reviendrait à réimplémenter le barème du bilan.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-a@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-b@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-c@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111112', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111113', 'completed', now());

-- A : urbain dense, bonne desserte, 10 km en voiture. Tout est possible pour lui.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles
) values (
  'b1111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', 'thermique', false, false,
  'rarely', 'urbain_dense', 'bon', '1'
);

-- B : même trajet, même voiture, mais rural sans transports en commun. Seul le contexte B4
-- change — c'est ce qui rend la comparaison A/B probante.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles
) values (
  'b1111111-1111-1111-1111-111111111112', true, 5, 10, 'voiture', 'thermique', false, false,
  'rarely', 'rural', 'inexistant', '1'
);

-- C : 60 km de trajet, urbain dense. Le vélo n'est pas une option, la desserte oui.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles
) values (
  'b1111111-1111-1111-1111-111111111113', true, 5, 60, 'voiture', 'thermique', false, false,
  'rarely', 'urbain_dense', 'bon', '1'
);

select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111111');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111112');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111113');

-- ── 1. Aucun gain nul ou négatif, jamais ────────────────────────────────────────────────

select ok(
  (select bool_and(saving_kg_year > 0) from public.estimate_action_savings('b1111111-1111-1111-1111-111111111111')),
  'aucune action proposée n''a un gain nul ou négatif'
);

-- ── 2. Contexte B4 : les transports en commun ne sont pas proposés là où il n'y en a pas ──

select ok(
  exists (
    select 1 from public.estimate_action_savings('b1111111-1111-1111-1111-111111111111')
    where action_text ilike '%métro%' or action_text ilike '%train ou en RER%'
  ),
  'desserte correcte -> les actions en transports en commun sont bien proposées'
);

select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111112')
     where action_text ilike '%métro%' or action_text ilike '%train ou en RER%' $$,
  'tc_access = inexistant -> aucune action en transports en commun (T9, spec §5)'
);

-- Le filtre retire l'impossible, il n'appauvrit pas le plan : il reste des leviers réels.
select ok(
  (select count(*) from public.estimate_action_savings('b1111111-1111-1111-1111-111111111112')) > 0,
  'profil rural sans desserte -> le plan reste alimenté (covoiturage, télétravail), jamais vide'
);

-- ── 3. Gardes de plausibilité ───────────────────────────────────────────────────────────

-- La garde porte sur le POSTE concerné, pas sur le mot « vélo ». Un trajet domicile-travail de
-- 60 km exclut le vélo pour ce trajet-là — mais les sorties de loisir de la même personne font
-- 15 km et restent tout à fait cyclables. Filtrer sur le libellé seul confondrait les deux, et
-- c'est ce qu'a montré la vérification en base avant que ce test ne soit figé.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111113')
     where poste = 'commute' and (action_text ilike '%vélo%' or action_text ilike '%à pied%') $$,
  'trajet domicile-travail de 60 km -> ni vélo ni marche proposés sur ce poste'
);

select ok(
  exists (
    select 1 from public.estimate_action_savings('b1111111-1111-1111-1111-111111111111')
    where poste = 'commute' and action_text ilike '%vélo%'
  ),
  'trajet domicile-travail de 10 km -> le vélo reste proposé, la garde ne bloque pas tout'
);

select * from finish();
rollback;
