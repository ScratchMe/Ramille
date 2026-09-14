-- Tests pgTAP des trois chantiers de calcul livrés ensemble (C3.4, C3.5, C3.6, migration
-- `20260914123432_calcul_jambes_covoiturage_distances.sql`) : le trajet intermodal compté en
-- entier, le covoiturage des sorties et des longs trajets, la tranche ouverte des loisirs.
--
-- **Un fichier à part plutôt que des assertions ajoutées dans `01`, `05`, `06` et `08`**, et ce
-- n'est pas du confort : ces quatre-là portent la quinzaine d'assertions chiffrées dont CLAUDE.md
-- dit qu'elles ont déjà fait tomber la CI deux fois, parce que beaucoup dérivent d'un facteur sans
-- le nommer. La migration a été écrite pour qu'elles restent **vraies** — chaque colonne ajoutée
-- est nullable et chaque repli reproduit ce que le calcul faisait en dur —, et c'est justement ce
-- qui rend les nouveaux chemins inéprouvables là-bas : un scénario existant ne les emprunte pas.
-- Le dépôt nomme d'ailleurs sa convention : « numérotés, un fichier par sujet ».
--
-- **Les valeurs chiffrées dérivent des facteurs ACV du référentiel**, relevés sur la base :
-- voiture thermique 0,142253 · train (TER) 0,027690. Toucher au référentiel les invalide toutes,
-- y compris celles qui ne nomment aucun facteur — la méthode qui marche est de recalculer chacune
-- par une requête sur la base, jamais à la main.
--
-- **Deux assertions sont écrites en rapport et non en valeur**, et il faut savoir pourquoi avant de
-- les « uniformiser » : le covoiturage et l'occupation énoncent une division, pas un nombre. Un
-- jumeau identique à un champ près, comparé par un facteur trois, survit à une mise à jour du
-- référentiel et dit exactement ce que le chantier promet. Les valeurs absolues qui les
-- accompagnent fixent l'échelle ; elles, elles fixent la règle.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────
-- Sept bilans, par paires là où le chantier est une division : A/B pour la part du second mode,
-- C/F pour le covoiturage des sorties, E/G pour l'occupation des longs trajets. Le second de
-- chaque paire est le même bilan **sans la réponse**, c'est-à-dire le bilan d'avant le chantier.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('c3400000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-part-declaree@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-part-absente@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-sortie-partagee@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-sortie-lointaine@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-long-a-trois@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-sortie-sans-taille@test.local', 'x', now(), now()),
  ('c3400000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-long-seul@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('a3400000-0000-0000-0000-000000000001', 'c3400000-0000-0000-0000-000000000001', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000002', 'c3400000-0000-0000-0000-000000000002', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000003', 'c3400000-0000-0000-0000-000000000003', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000004', 'c3400000-0000-0000-0000-000000000004', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000005', 'c3400000-0000-0000-0000-000000000005', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000006', 'c3400000-0000-0000-0000-000000000006', 'completed', now()),
  ('a3400000-0000-0000-0000-000000000007', 'c3400000-0000-0000-0000-000000000007', 'completed', now());

-- A — 5 jours, 20 km l'aller, voiture thermique puis train, un quart du trajet en train.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_car_engine, commute_is_carpool, commute_second_mode_used, commute_second_mode,
  commute_second_mode_share, leisure_frequency, teletravail
) values (
  'a3400000-0000-0000-0000-000000000001', true, 5, 20, 'voiture', 'thermique', false, true, 'train',
  0.25, 'rarely',
  -- C3.8 : sans cette réponse, les deux gabarits de télétravail ne sont pas proposés — « une
  -- condition qu'on ne peut pas évaluer n'est pas remplie » — et l'assertion qui suit sur le gain
  -- d'une journée de télétravail comparerait `NULL`. La fixture d'un test de calcul doit répondre
  -- ce que le questionnaire exige désormais.
  'oui'
);

-- B — le même bilan sans la part : c'est le bilan d'avant C3.4, et son total ne doit pas bouger.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_car_engine, commute_is_carpool, commute_second_mode_used, commute_second_mode,
  leisure_frequency
) values (
  'a3400000-0000-0000-0000-000000000002', true, 5, 20, 'voiture', 'thermique', false, true, 'train',
  'rarely'
);

-- C — sorties hebdomadaires en voiture thermique, tranche 15-30 km, partagées à trois.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode, leisure_car_engine,
  leisure_distance_bracket, leisure_is_carpool, leisure_carpool_size
) values (
  'a3400000-0000-0000-0000-000000000003', false, 'weekly', 'voiture', 'thermique', '15_30', true, 3
);

-- F — le jumeau de C avec le drapeau mais sans la taille. Sert deux fois : il éprouve la condition
-- (« un drapeau seul ne dit pas par combien », donc on ne divise pas) et il est le terme de
-- comparaison non divisé de C.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode, leisure_car_engine,
  leisure_distance_bracket, leisure_is_carpool
) values (
  'a3400000-0000-0000-0000-000000000006', false, 'weekly', 'voiture', 'thermique', '15_30', true
);

-- D — sorties hebdomadaires de 120 km sous la tranche ouverte, qui valait 40 km pour tout le monde.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode, leisure_car_engine,
  leisure_distance_bracket, leisure_distance_km
) values (
  'a3400000-0000-0000-0000-000000000004', false, 'weekly', 'voiture', 'thermique', '30_plus', 120
);

-- E / G — deux longs trajets en voiture thermique, à trois puis sans réponse.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, car_long_trips_per_year,
  car_long_trips_engine, car_long_trips_occupancy
) values (
  'a3400000-0000-0000-0000-000000000005', false, 'rarely', 2, 'thermique', 3
);

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, car_long_trips_per_year,
  car_long_trips_engine
) values (
  'a3400000-0000-0000-0000-000000000007', false, 'rarely', 2, 'thermique'
);

select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000001');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000002');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000003');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000004');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000005');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000006');
select public.recompute_assessment_results('a3400000-0000-0000-0000-000000000007');

-- ── C3.4 · le trajet intermodal ──────────────────────────────────────────────────────────
-- 20 km l'aller × 2 × 5 jours × 45 semaines = 9 000 km/an, dont un quart en train.

select results_eq(
  $$ select commute_main_leg_km_year::numeric, commute_second_leg_km_year::numeric
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000001' $$,
  $$ values (6750::numeric, 2250::numeric) $$,
  'C3.4 : les deux jambes se partagent le trajet dans la proportion déclarée, pas en deux moitiés'
);

-- **Le CO2 de la seconde jambe était calculé puis jeté**, et c'est la moitié du chantier : la
-- variable existait dans le corps de la fonction et entrait dans le total, mais n'était persistée
-- nulle part. Tout ce qui lit `assessment_results` — le plan en premier — ne voyait donc que la
-- jambe principale.
select is(
  (select round(commute_second_leg_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000001'),
  62.302500::numeric,  -- 2 250 km × 0,027690
  'C3.4 : le CO2 de la seconde jambe est persisté, et non plus calculé puis jeté'
);

select is(
  (select round(commute_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000001'),
  1022.510250::numeric,  -- 6 750 × 0,142253 + 2 250 × 0,027690
  'C3.4 : le poste domicile-travail est la somme des deux jambes'
);

select ok(
  (select commute_main_leg_co2_kg_year + commute_second_leg_co2_kg_year = commute_co2_kg_year
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000001'),
  'C3.4 : les deux jambes persistées se rendent exactement le poste, sans reste'
);

-- La promesse qui rend cette migration sûre : un bilan déjà soumis, recalculé après elle, rend
-- exactement ce qu'il rendait. C'est ce qui autorise à ne pas réécrire les assertions chiffrées
-- des quatre autres fichiers.
select results_eq(
  $$ select commute_main_leg_km_year::numeric, commute_second_leg_km_year::numeric
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000002' $$,
  $$ values (4500::numeric, 4500::numeric) $$,
  'C3.4 : sans réponse, la moitié — le repli reproduit ce que le calcul faisait en dur'
);

select isnt(
  (select round(commute_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000001'),
  (select round(commute_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000002'),
  'C3.4 : la part déclarée change le chiffre — sans quoi la question ne servirait à rien'
);

-- **Le plan comptait la moitié du trajet.** Toutes les actions domicile-travail se calculaient sur
-- `commute_main_leg_co2_kg_year` : « Travailler depuis chez toi un jour » supprime les deux jambes
-- et n'en comptait qu'une — 205 kg réels sur ce bilan-là contre 128 annoncés —, et le seuil de
-- 5 kg/an écartait des actions qui le franchissaient en comptant le trajet entier.
--
-- Le gain rendu est **arrondi à l'unité** par `estimate_action_savings` (`round(v_saving)`), qui
-- est la forme sous laquelle il est figé sur `plan_actions` puis affiché : l'assertion porte donc
-- sur le nombre que la personne lit, et non sur une décimale que rien ne montre.
select is(
  -- `is` est polymorphe : sans le cast des deux côtés, la résolution échoue en
  -- `function is(numeric, integer) does not exist` plutôt que de comparer.
  (select saving_kg_year::numeric from public.estimate_action_savings('a3400000-0000-0000-0000-000000000001')
     where action_text = 'Travailler depuis chez toi un jour par semaine'),
  205::numeric,  -- (1 / 5) × (960,20775 + 62,3025) = 204,50205 ; avant C3.4 : (1 / 5) × 640,1385 = 128
  'C3.4 : une journée de télétravail en moins retire les DEUX jambes, pas la principale seule'
);

-- Et la substitution reste sur la jambe principale, elle : on remplace le mode qu'on a nommé, pas
-- le train de la seconde jambe. L'inverse serait un gain juste sur un mode qu'on ne change pas —
-- et il se verrait, puisqu'il vaudrait 329 kg au lieu de 309 sur ce même bilan.
--
-- Le gabarit vélo ne convient pas pour l'éprouver et c'est structurel : il porte
-- `max_distance_km = 10`, et ce trajet fait 20 km l'aller. Les deux gabarits sans borne haute
-- demandent des transports en commun, que ce bilan ne déclare pas inexistants.
select is(
  (select saving_kg_year::numeric from public.estimate_action_savings('a3400000-0000-0000-0000-000000000001')
     where action_text = 'Passer deux trajets sur cinq en train ou en RER'),
  309::numeric,  -- 0,40 × 960,20775 × (1 − 0,027690 / 0,142253) = 309,3201 ; sur les deux jambes : 329,39
  'C3.4 : une substitution porte sur la jambe principale, et sur elle seule'
);

-- **Et le détail le dit**, ce qui est la moitié la moins évidente de la règle : laisser implicite
-- qu'une substitution ne porte que sur une partie du trajet serait pire qu'avant C3.4 — le gain
-- serait juste, et la phrase laisserait croire qu'il porte sur le trajet entier. Le télétravail,
-- lui, retire bien les deux jambes et ne porte donc pas la mention : les deux moitiés de
-- l'assertion se gardent l'une l'autre.
select ok(
  (select detail_text like '%Sur la partie en%de ton trajet.'
     from public.estimate_action_savings('a3400000-0000-0000-0000-000000000001')
    where action_text = 'Passer deux trajets sur cinq en train ou en RER')
  and (select detail_text not like '%Sur la partie en%'
     from public.estimate_action_savings('a3400000-0000-0000-0000-000000000001')
    where action_text = 'Travailler depuis chez toi un jour par semaine'),
  'C3.4 : le détail dit qu’une substitution ne porte que sur une partie du trajet, et le télétravail ne le dit pas'
);

-- ── C3.5 · le covoiturage des sorties ────────────────────────────────────────────────────
-- 22,5 km (milieu de la tranche 15-30) × 2 × 1 sortie × 52 semaines = 2 340 km/an.

select is(
  (select round(leisure_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000003'),
  110.957340::numeric,  -- 2 340 × 0,142253 / 3
  'C3.5 : une sortie à trois dans la même voiture ne compte plus trois fois'
);

-- Écrite en **rapport** et non en valeur : ce que le chantier promet est une division, et cette
-- forme-là survit à une mise à jour du référentiel ADEME.
select ok(
  (select l3.leisure_co2_kg_year * 3 = l1.leisure_co2_kg_year
     from public.assessment_results l3, public.assessment_results l1
    where l3.assessment_id = 'a3400000-0000-0000-0000-000000000003'
      and l1.assessment_id = 'a3400000-0000-0000-0000-000000000006'),
  'C3.5 : partager à trois divise le poste par trois, quel que soit le facteur'
);

-- La condition documentée : un drapeau sans taille ne dit pas par combien, donc on ne divise pas.
-- C'est aussi ce que `normaliserReponses` garantit côté client en rendant la taille obligatoire —
-- deux gardes, parce qu'un bilan écrit avant elles peut porter cet état.
select is(
  (select round(leisure_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000006'),
  332.872020::numeric,  -- 2 340 × 0,142253, non divisé
  'C3.5 : un covoiturage sans taille déclarée ne divise rien, plutôt que de deviner'
);

-- ── C3.6 · la tranche ouverte des loisirs ────────────────────────────────────────────────
-- « Plus de 30 km » valait 40 km pour tout le monde : une sortie de 120 km comptait pour un tiers
-- d'elle-même, sur un poste qui peut être dominant.

select is(
  (select leisure_km_year::numeric
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000004'),
  12480::numeric,  -- 120 × 2 × 1 × 52, et non 40 × 2 × 1 × 52 = 4 160
  'C3.6 : la distance déclarée l’emporte sur le milieu de la tranche ouverte'
);

-- Persistée, parce que c'est ce que lit la restitution — et ce sur quoi l'estimateur d'actions
-- compare sa distance maximale.
select is(
  (select leisure_trip_distance_km::numeric
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000004'),
  120::numeric,
  'C3.6 : la distance retenue est celle qu’on affiche, pas celle de la tranche'
);

-- ── C3.5 · l'occupation d'un long trajet ─────────────────────────────────────────────────
-- 2 trajets × 700 km, en voiture thermique.

select is(
  (select round(travel_car_co2_kg_year::numeric, 3)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000005'),
  66.385::numeric,  -- 1 400 × 0,142253 / 3
  'C3.5 : partir à trois sur 700 km divise le poste voiture par trois'
);

select is(
  (select round(travel_car_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'a3400000-0000-0000-0000-000000000007'),
  199.154200::numeric,  -- 1 400 × 0,142253, soit une personne
  'C3.5 : sans réponse, une personne dans la voiture — ce que le calcul supposait sans le dire'
);

-- ── Les bornes du schéma ─────────────────────────────────────────────────────────────────
-- Elles sont le seul endroit qui empêche une valeur absurde d'atteindre le calcul, et l'écran en
-- est le miroir : `PARTS_DU_SECOND_MODE`, `TAILLES_DE_COVOITURAGE` et `OCCUPATIONS_LONG_TRAJET`
-- tiennent dedans. Rien ne peut lire ces bornes depuis TypeScript — d'où l'épinglage des deux côtés.
--
-- En dernier dans le fichier, et sans conséquence sur ce qui précède : les quatre ordres lèvent,
-- donc aucun n'écrit.

select throws_ok(
  $stmt$ update public.assessment_answers set commute_second_mode_share = 0
           where assessment_id = 'a3400000-0000-0000-0000-000000000001' $stmt$,
  '23514',
  'new row for relation "assessment_answers" violates check constraint "assessment_answers_commute_second_mode_share_check"',
  'une part nulle est refusée : à 0 il n’y a pas de second mode, c’est `commute_second_mode_used`'
);

select throws_ok(
  $stmt$ update public.assessment_answers set commute_second_mode_share = 1
           where assessment_id = 'a3400000-0000-0000-0000-000000000001' $stmt$,
  '23514',
  'new row for relation "assessment_answers" violates check constraint "assessment_answers_commute_second_mode_share_check"',
  'une part entière est refusée : à 1 il n’y a plus de mode principal'
);

select throws_ok(
  $stmt$ update public.assessment_answers set leisure_distance_km = 0
           where assessment_id = 'a3400000-0000-0000-0000-000000000004' $stmt$,
  '23514',
  'new row for relation "assessment_answers" violates check constraint "assessment_answers_leisure_distance_km_check"',
  'un « 0 » saisi n’est pas une distance de sortie, comme il n’en est pas une côté domicile-travail'
);

select throws_ok(
  $stmt$ update public.assessment_answers set leisure_carpool_size = 1
           where assessment_id = 'a3400000-0000-0000-0000-000000000004' $stmt$,
  '23514',
  'new row for relation "assessment_answers" violates check constraint "assessment_answers_leisure_carpool_size_check"',
  'un covoiturage à une personne n’en est pas un : la borne basse est 2, comme au quotidien'
);

select throws_ok(
  $stmt$ update public.assessment_answers set car_long_trips_occupancy = 6
           where assessment_id = 'a3400000-0000-0000-0000-000000000005' $stmt$,
  '23514',
  'new row for relation "assessment_answers" violates check constraint "assessment_answers_car_long_trips_occupancy_check"',
  'un long trajet se fait en voiture familiale : l’occupation s’arrête à 5, là où le covoiturage quotidien va à 6'
);

select * from finish();
rollback;
