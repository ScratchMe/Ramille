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
--   4. Depuis C3.8, les deux filtres qui manquaient — la **zone** et le **télétravail** — et la
--      branche **voyages**, qui n'était éprouvée nulle part alors qu'elle porte les gains les plus
--      lourds du produit. La règle des deux nouveaux filtres est écrite une fois pour toutes :
--      *une condition qu'on ne peut pas évaluer n'est pas remplie*, donc sans réponse on ne
--      propose pas.
--
-- Les fixtures passent par `recompute_assessment_results` plutôt que par un insert direct
-- dans `assessment_results` : depuis l'étape 6a l'estimateur lit l'instantané par segment, et
-- le reconstituer à la main dans un test reviendrait à réimplémenter le barème du bilan.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-a@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-b@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-c@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-d@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-e@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-est-f@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111112', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111113', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111114', 'a1111111-1111-1111-1111-111111111114', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111115', 'a1111111-1111-1111-1111-111111111115', 'completed', now()),
  ('b1111111-1111-1111-1111-111111111116', 'a1111111-1111-1111-1111-111111111116', 'completed', now());

-- A : urbain dense, bonne desserte, 10 km en voiture. Tout est possible pour lui.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'b1111111-1111-1111-1111-111111111111', true, 5, 10, 'voiture', 'thermique', false, false,
  'rarely', 'urbain_dense', 'bon', '1', 'oui'
);

-- B : même trajet, même voiture, mais rural sans transports en commun. Seul le contexte B4
-- change — c'est ce qui rend la comparaison A/B probante.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'b1111111-1111-1111-1111-111111111112', true, 5, 10, 'voiture', 'thermique', false, false,
  'rarely', 'rural', 'inexistant', '1', 'oui'
);

-- C : 60 km de trajet, urbain dense. Le vélo n'est pas une option, la desserte oui.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'b1111111-1111-1111-1111-111111111113', true, 5, 60, 'voiture', 'thermique', false, false,
  'rarely', 'urbain_dense', 'bon', '1', 'oui'
);

-- D : le profil du constat A8-5 — rural à desserte **limitée**, c'est-à-dire ni « bon » ni
-- « inexistant ». Le filtre ne lisait que la seconde valeur, donc « Passer deux trajets sur cinq en
-- métro ou en tram » arrivait en tête de son plan. Il répond « non » au télétravail : c'est le
-- gros rouleur sans alternative que le libellé seul laissait en tête.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'b1111111-1111-1111-1111-111111111114', true, 5, 10, 'voiture', 'thermique', false, false,
  'rarely', 'rural', 'limite', '1', 'non'
);

-- E : le profil voyages, que rien n'éprouvait — alors que c'est la branche qui porte les gains les
-- plus lourds du produit. Il part déjà à trois sur ses longs trajets, ce qui exerce la garde de
-- C3.8 §4. Sa réponse au télétravail est **absente**, volontairement : il n'a pas de trajet
-- régulier, donc la question ne lui est pas posée.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency,
  flights_total_per_year, flights_short_per_year, car_long_trips_per_year, car_long_trips_engine,
  car_long_trips_occupancy, zone_type, tc_access, household_vehicles
) values (
  'b1111111-1111-1111-1111-111111111115', false, 'rarely', 3, 2, 2, 'thermique',
  3, 'periurbain', 'bon', '1'
);

-- F : deux jours de trajet par semaine, et un « oui » franc au télétravail. C'est le profil que la
-- garde du `remove_day` protège : retirer deux jours à qui en fait deux supprimerait 100 % de son
-- trajet, et le gain annoncé serait celui de ne plus travailler.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'b1111111-1111-1111-1111-111111111116', true, 2, 30, 'voiture', 'thermique', false, false,
  'rarely', 'periurbain', 'limite', '1', 'oui'
);

select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111111');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111112');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111113');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111114');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111115');
select public.recompute_assessment_results('b1111111-1111-1111-1111-111111111116');

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

-- ── 4. C3.8 §1 : la zone, là où la desserte ne suffisait pas ────────────────────────────

-- Le constat A8-5 en une assertion : ce profil a répondu « limité », pas « inexistant », donc
-- `requires_tc` le laissait passer — et le métro arrivait en tête de son plan.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111114')
     where action_text ilike '%métro%' $$,
  'rural à desserte limitée -> plus de métro ni de tram, que `requires_tc` laissait passer'
);

-- **Le filtre retire l'impossible, il n'appauvrit pas le plan**, et c'est la moitié qu'il est le
-- plus facile de casser en « corrigeant » : un TER dessert des communes rurales, donc « train ou
-- RER » garde son seul `requires_tc`. Lui coller la même zone retirerait à ce profil la seule
-- alternative qui lui reste.
select ok(
  exists (
    select 1 from public.estimate_action_savings('b1111111-1111-1111-1111-111111111114')
    where action_text ilike '%train ou en RER%'
  ),
  'rural à desserte limitée -> le train ou RER reste proposé, lui'
);

-- ── 5. C3.8 §2 : le télétravail est demandé, plus présupposé ────────────────────────────

select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111114')
     where action_text ilike '%depuis chez toi%' $$,
  '« non » au télétravail -> l’action n’est plus proposée, et plus formulée comme un manquement'
);

-- Le profil voyages n'a **pas de réponse** : il n'a pas de trajet régulier, donc la question ne lui
-- est pas posée. La règle des deux filtres de C3.8 s'y lit d'elle-même — sans réponse, on ne
-- propose pas — mais elle est ici doublée par la garde de poste, et c'est voulu : les deux gardes
-- disent la même chose et aucune ne dépend de l'autre.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111115')
     where action_text ilike '%depuis chez toi%' $$,
  'pas de réponse sur le télétravail -> aucune action de télétravail'
);

-- La garde du second jour. Elle se dérive du gabarit (`commute_days_per_week <= t.trips`) et non
-- d'un 2 écrit en dur, qui était celui d'un unique gabarit à `trips = 1`.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111116')
     where action_text = 'Travailler depuis chez toi deux jours par semaine' $$,
  'deux jours de trajet par semaine -> le gabarit à deux jours est écarté, il retirerait 100 %'
);

select ok(
  exists (
    select 1 from public.estimate_action_savings('b1111111-1111-1111-1111-111111111116')
    where action_text = 'Travailler depuis chez toi un jour par semaine'
  ),
  'deux jours de trajet par semaine -> celui à un jour reste, la garde ne bloque pas tout'
);

-- ── 6. C3.8 §4 : la branche voyages, et le covoiturage qu'on ne propose pas deux fois ───

-- Partir déjà à trois est une réponse que C3.5 vient de rendre disponible. Sans cette garde, le
-- gabarit serait proposé à qui l'a déjà fait, et son gain calculé sur une empreinte déjà divisée.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b1111111-1111-1111-1111-111111111115')
     where action_text ilike '%Partager un de tes longs trajets%' $$,
  'longs trajets déjà partagés à trois -> on ne propose pas de les partager'
);

-- Les deux actions du vol court coexistent, et c'est voulu : renoncer retire 100 % du vol,
-- substituer en retire la part que le train ne consomme pas. Ce ne sont pas des doublons — le
-- second suppose une ligne de train qu'aucune réponse ne nous dit exister — et depuis C4.6 le plan
-- montre toutes les pistes, donc la personne choisit celle qui la concerne.
select results_eq(
  $$ select round(saving_kg_year::numeric) from public.estimate_action_savings('b1111111-1111-1111-1111-111111111115')
     where action_text in (
       'Renoncer à un vol court ou moyen-courrier cette année',
       'Remplacer un aller-retour en avion par le train'
     ) order by 1 desc $$,
  $$ values (277::numeric), (273::numeric) $$,
  -- 2 vols courts déclarés, donc 1 500 km chacun : renoncer retire 1 500 × 0,184661 = 277,
  -- remplacer par le train en retire ce que le TGV consomme, soit 1 500 × 0,002930 de moins.
  -- Les deux valeurs ont été recalculées par une requête sur la base, pas à la main.
  'branche voyages : renoncer à un vol court rapporte plus que le remplacer par le train'
);

-- ── 7. Les deux gardes de référentiel ───────────────────────────────────────────────────

-- **Aucun gain sous le seuil**, sur tous les profils à la fois. Le seuil existe parce qu'aux
-- facteurs ACV une substitution à peine meilleure ne fait rien gagner : substituer une voiture par
-- un bus urbain ne gagne que 14 %, contre 33 fois pour le métro.
select ok(
  (select bool_and(saving_kg_year >= 5) from (
     select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111111')
     union all select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111112')
     union all select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111113')
     union all select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111114')
     union all select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111115')
     union all select saving_kg_year from public.estimate_action_savings('b1111111-1111-1111-1111-111111111116')
   ) tout),
  'aucune action sous les 5 kg/an, sur aucun des six profils'
);

-- **Et aucun gabarit ne propose le bus**, ce qui est une décision et non un oubli : à 0,1224 kg/km
-- le bus thermique ne vaut que 14 % de moins qu'une voiture thermique en ACV, donc la substitution
-- ne franchirait pas le seuil sur la plupart des trajets. Un balayage du référentiel plutôt qu'une
-- assertion sur un profil : ce qu'on garde, c'est qu'on n'en réintroduise pas un.
select is_empty(
  $$ select action_text from public.action_templates where substitute_mode_id = 'bus' $$,
  'aucun gabarit ne substitue le bus : invisible sans le calcul, et c’est pour ça qu’on l’épingle'
);

-- ── 8. Les valeurs exactes de `remove_day` et `share_vehicle` ───────────────────────────
-- Sur le profil A : 10 km l'aller × 2 × 5 jours × 45 semaines = 4 500 km/an, à 0,142253.

select results_eq(
  $$ select round(saving_kg_year::numeric) from public.estimate_action_savings('b1111111-1111-1111-1111-111111111111')
     where action_text in (
       'Travailler depuis chez toi un jour par semaine',
       'Faire ce trajet à deux au moins un jour sur deux'
     ) order by 1 desc $$,
  $$ values (160::numeric), (128::numeric) $$,
  'remove_day et share_vehicle : (1/5) × 640,1385 = 128 et 0,50 × 640,1385 × 0,5 = 160'
);

select * from finish();
rollback;
