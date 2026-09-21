-- Tests pgTAP de la cylindrée du deux-roues (migration 20260905200000).
--
-- Ce que ce fichier défend : que les quatre deux-roues cessent d'être comptés au même tarif, et
-- que l'ordre entre eux reste celui de l'ADEME. Cet ordre est contre-intuitif dans un cas
-- précis — **une grosse moto émet plus qu'une voiture thermique** — et c'est justement le
-- constat que le produit existe pour rendre visible. Une future « correction » de bon sens qui
-- rangerait le deux-roues du côté des modes sobres doit faire tomber un test.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ── L'ordre des facteurs ────────────────────────────────────────────────────────────────

select is(
  (select kg_co2_per_km from public.emission_factors
   where transport_mode_id = 'deux_roues_scooter_electrique' order by valid_from desc limit 1),
  0.059300::numeric,
  'scooter électrique : 0,059300 (ADEME, ACV complète)'
);

select is(
  (select kg_co2_per_km from public.emission_factors
   where transport_mode_id = 'deux_roues_scooter_thermique' order by valid_from desc limit 1),
  0.076300::numeric,
  'scooter thermique : 0,076300 — la valeur que tous les deux-roues portaient avant'
);

select is(
  (select kg_co2_per_km from public.emission_factors
   where transport_mode_id = 'deux_roues_moto_petite' order by valid_from desc limit 1),
  0.087200::numeric,
  'moto de petite cylindrée : 0,087200'
);

select is(
  (select kg_co2_per_km from public.emission_factors
   where transport_mode_id = 'deux_roues_moto_grosse' order by valid_from desc limit 1),
  0.214700::numeric,
  'moto de grosse cylindrée : 0,214700'
);

-- Le résultat contre-intuitif, épinglé pour qu'il ne soit pas « corrigé » par réflexe.
select ok(
  public.emission_factor('deux_roues_moto_grosse', current_date)
    > public.emission_factor('voiture_thermique', current_date),
  'une grosse moto émet plus qu''une voiture thermique — ce n''est pas une erreur de saisie'
);

-- ── La résolution ───────────────────────────────────────────────────────────────────────

select is(
  public.resolve_two_wheeler_mode('deux_roues_motorise', 'moto_grosse'),
  'deux_roues_moto_grosse',
  'le type choisi résout vers le mode correspondant'
);

-- Le repli est la garantie de non-régression des bilans déjà soumis : ils n'ont pas de type,
-- et doivent continuer à valoir exactement ce qu'ils valaient.
select is(
  public.resolve_two_wheeler_mode('deux_roues_motorise', null),
  'deux_roues_motorise',
  'un type non renseigné retombe sur le générique (bilans antérieurs à la migration)'
);

select is(
  public.resolve_two_wheeler_mode('voiture', 'moto_grosse'),
  'voiture',
  'un mode qui n''est pas un deux-roues n''est jamais affecté'
);

-- ── La composition ──────────────────────────────────────────────────────────────────────
-- `resolve_mode` existe pour qu'il n'y ait **qu'un seul** point de résolution dans le calcul :
-- des appels imbriqués `resolve_two_wheeler_mode(resolve_car_mode(...))` écrits à chaque endroit
-- auraient fini par en laisser un de côté, et l'oubli serait silencieux — le mode générique
-- existe, son facteur existe, le calcul rendrait un nombre.
--
-- **Ils sont quatre depuis C4.4** (le train et le vélo s'ajoutent), et l'assertion porte sur ce
-- qui compte : chaque résolveur ne répond qu'à son mode, et les réponses des autres postes
-- traversent sans rien changer. La dernière ligne le dit en donnant au vélo une motorisation, une
-- cylindrée et un type de train : il reste un vélo mécanique.
select results_eq(
  $$ select public.resolve_mode('voiture', 'electrique', null, 'rer', 'electrique'),
            public.resolve_mode('deux_roues_motorise', null, 'moto_petite', 'rer', 'electrique'),
            public.resolve_mode('train', 'electrique', 'moto_grosse', 'rer', 'electrique'),
            public.resolve_mode('velo', 'thermique', 'moto_grosse', 'rer', null) $$,
  $$ values ('voiture_electrique'::text, 'deux_roues_moto_petite'::text, 'train_rer'::text, 'velo'::text) $$,
  'resolve_mode compose les quatre résolutions sans interférence entre elles'
);

-- Le repli, et c'est lui qui garde les bilans déjà en base : une réponse absente ou inconnue rend
-- le mode générique, jamais nul — un `null` ici ferait lever `emission_factor` et emporterait le
-- bilan entier.
select results_eq(
  $$ select public.resolve_mode('train', null, null, null, null),
            public.resolve_mode('train', null, null, 'aubrac', null),
            public.resolve_mode('velo', null, null, null, 'mecanique') $$,
  $$ values ('train'::text, 'train'::text, 'velo'::text) $$,
  'une réponse absente ou inconnue retombe sur le mode générique, jamais sur rien'
);

-- ── Le chemin complet, de la réponse au chiffre ─────────────────────────────────────────
--
-- **Tout ce qui précède éprouve des maillons ; rien n'éprouvait la chaîne** (C3.12 §2). Les
-- facteurs sont épinglés un par un, `resolve_mode` est épinglée seule — mais qu'un bilan qui
-- *répond* « moto de grosse cylindrée » finisse par être *facturé* à ce tarif-là, personne ne le
-- vérifiait. C'est pourtant là que l'erreur se produirait : `recompute_assessment_results` appelle
-- `resolve_mode` à chaque poste, et un oubli y serait **silencieux** — le mode générique existe,
-- son facteur existe, le calcul rendrait un nombre parfaitement plausible et 2,8 fois trop bas.
--
-- **Les valeurs attendues sont dérivées de `public.emission_factor(...)`, pas écrites en clair**,
-- et c'est un choix contraire à celui des fichiers 01, 05 et 06. La raison tient à ce que chaque
-- forme éprouve : un littéral éprouve *la valeur du facteur*, et elle l'est déjà vingt lignes plus
-- haut ; ce qui manque ici est *le chemin*, et une expression dérivée le tient sans se périmer à la
-- prochaine synchronisation ADEME. Elle échoue du bon côté : si la résolution retombe sur le mode
-- générique, les deux membres divergent.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('d1400000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-moto@test.local', 'x', now(), now()),
  ('d1400000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-scooter@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('d1400000-0000-0000-0000-000000000011', 'd1400000-0000-0000-0000-000000000001', 'completed', now()),
  ('d1400000-0000-0000-0000-000000000012', 'd1400000-0000-0000-0000-000000000002', 'completed', now());

-- 20 km l'aller × 2 × 5 jours × 45 semaines = 9 000 km/an, en grosse moto.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_two_wheeler_type, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values (
  'd1400000-0000-0000-0000-000000000011', true, 5, 20, 'deux_roues_motorise', 'moto_grosse',
  false, false, 'rarely', 'periurbain', 'limite', '1', 'aucun'
);

-- 22,5 km (milieu de la tranche 15-30) × 2 × 1 sortie × 52 semaines = 2 340 km/an, en scooter
-- électrique. Pas de trajet régulier : le poste des sorties est seul à porter le chiffre.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, leisure_mode,
  leisure_two_wheeler_type, leisure_distance_bracket, zone_type, tc_access, household_vehicles
) values (
  'd1400000-0000-0000-0000-000000000012', false, 'weekly', 'deux_roues_motorise',
  'scooter_electrique', '15_30', 'urbain_dense', 'bon', '1'
);

select public.recompute_assessment_results('d1400000-0000-0000-0000-000000000011');
select public.recompute_assessment_results('d1400000-0000-0000-0000-000000000012');

select is(
  (select round(commute_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'd1400000-0000-0000-0000-000000000011'),
  round((9000 * public.emission_factor('deux_roues_moto_grosse', current_date))::numeric, 6),
  'bout en bout : un trajet déclaré en grosse moto est facturé au tarif de la grosse moto'
);

-- **Le garde qui compte vraiment**, et il ne se lit pas dans l'assertion précédente : si la
-- résolution retombait sur le générique, le total resterait un nombre et le test précédent
-- tomberait sans dire pourquoi. Celui-ci nomme l'erreur — 2,8 fois trop bas, dans le sens qui fait
-- passer le deux-roues pour vertueux.
select isnt(
  (select round(commute_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'd1400000-0000-0000-0000-000000000011'),
  round((9000 * public.emission_factor('deux_roues_motorise', current_date))::numeric, 6),
  'bout en bout : ce n’est pas le tarif du deux-roues générique, qui vaut celui du scooter'
);

select is(
  (select round(leisure_co2_kg_year::numeric, 6)
     from public.assessment_results where assessment_id = 'd1400000-0000-0000-0000-000000000012'),
  round((2340 * public.emission_factor('deux_roues_scooter_electrique', current_date))::numeric, 6),
  'bout en bout : une sortie déclarée en scooter électrique est facturée à ce tarif-là'
);

-- **Le mode résolu est persisté, et c'est la seule façon dont la restitution le connaît.** Ces
-- quatre identifiants ne traversent aucun fichier TypeScript — ajouter un deux-roues au produit est
-- une migration SQL — donc `MODE_PREPOSITION` (`src/types/resultat.ts`) est un miroir tenu à la
-- main de cette colonne. C'est par ce chemin que les quatre deux-roues motorisés sont restés sans
-- préposition alors qu'ils peuvent parfaitement être le poste dominant.
select results_eq(
  $$ select commute_poste_mode, dominant_poste_mode
     from public.assessment_results where assessment_id = 'd1400000-0000-0000-0000-000000000011' $$,
  $$ values ('deux_roues_moto_grosse'::text, 'deux_roues_moto_grosse'::text) $$,
  'bout en bout : le mode résolu est persisté, pas le mode générique que la personne a coché'
);

select * from finish();
rollback;
