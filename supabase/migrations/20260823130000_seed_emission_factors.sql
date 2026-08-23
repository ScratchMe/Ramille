-- TraceVerte V1 — seed initial de emission_factors avec des valeurs réelles
-- Réf. docs/architecture/v1-01-onboarding-bilan.md §2
--
-- Source : API Impact CO2 (impactco2.fr/api/v1/transport), backée par l'ADEME Base
-- Empreinte. Requête km=100&displayAll=1 le 23/08/2026 (136 modes disponibles),
-- unité confirmée : value / km_demandé = kg CO2/km.
--
-- Notre référentiel V1 (8 catégories) est plus grossier que les 136 modes exposés par
-- l'API (variantes par gabarit/motorisation/covoiturage) — mapping vers un mode
-- représentatif par catégorie, documenté ci-dessous. Rien n'est codé en dur côté app,
-- uniquement dans cette seed, remplaçable par le job de sync automatisé (increment
-- futur, nécessite une Edge Function pour l'appel HTTP externe).
--
-- Cas particulier : l'API n'expose qu'UN seul facteur avion ("Avion trajet court"),
-- pas de distinction court/moyen vs long-courrier. avion_long_courrier réutilise donc
-- la même valeur que avion_court_moyen_courrier pour cette V1 — simplification connue,
-- à corriger si une source distincte est trouvée plus tard.

insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('voiture_thermique', 0.11056, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:4 Voiture thermique', current_date),
  ('voiture_electrique', 0.01209, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:5 Voiture électrique', current_date),
  ('deux_roues_motorise', 0.0604, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:12 Scooter thermique', current_date),
  ('bus', 0.1135, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:9 Bus thermique', current_date),
  ('train', 0.0229, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:15 TER', current_date),
  ('avion_court_moyen_courrier', 0.2242, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:1 Avion trajet court', current_date),
  ('avion_long_courrier', 0.2242, 'ADEME Base Empreinte (via API Impact CO2) — valeur court-courrier réutilisée, pas de distinction disponible côté API', 'impactco2:1 Avion trajet court', current_date),
  ('velo_marche', 0, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:30 Marche / 7 Vélo mécanique', current_date);
