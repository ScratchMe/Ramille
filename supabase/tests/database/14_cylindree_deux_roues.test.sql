-- Tests pgTAP de la cylindrée du deux-roues (migration 20260905200000).
--
-- Ce que ce fichier défend : que les quatre deux-roues cessent d'être comptés au même tarif, et
-- que l'ordre entre eux reste celui de l'ADEME. Cet ordre est contre-intuitif dans un cas
-- précis — **une grosse moto émet plus qu'une voiture thermique** — et c'est justement le
-- constat que le produit existe pour rendre visible. Une future « correction » de bon sens qui
-- rangerait le deux-roues du côté des modes sobres doit faire tomber un test.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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
-- six appels imbriqués `resolve_two_wheeler_mode(resolve_car_mode(...))` auraient fini par en
-- laisser un de côté, et l'oubli serait silencieux — le mode générique existe, son facteur
-- existe, le calcul rendrait un nombre.
select results_eq(
  $$ select public.resolve_mode('voiture', 'electrique', null),
            public.resolve_mode('deux_roues_motorise', null, 'moto_petite'),
            public.resolve_mode('velo', 'thermique', 'moto_grosse') $$,
  $$ values ('voiture_electrique'::text, 'deux_roues_moto_petite'::text, 'velo'::text) $$,
  'resolve_mode compose les deux résolutions sans interférence entre elles'
);

select * from finish();
rollback;
