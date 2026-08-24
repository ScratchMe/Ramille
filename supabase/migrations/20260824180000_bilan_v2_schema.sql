-- TraceVerte V1 — increment 6 : réalignement du schéma bilan sur la spec fonctionnelle
-- Brique 2 mise à jour (champs B1.1→B4.3, logique conditionnelle, calcul détaillé).
-- Réf. docs/design/spec-fonctionnelle-app-carbone-transport-v1.md (v2)
--
-- Remplace le modèle "liste de trajets génériques" (increment 1) par un modèle
-- correspondant exactement aux 3 postes fixes de la spec (domicile-travail / loisirs /
-- voyages), chacun calculé à partir de champs structurés plutôt que d'une liste
-- ouverte de trajets. L'ex-aequo n'est plus un cas UI : la spec le résout par une
-- règle de départage déterministe (poste le plus régulier), donc pas de modélisation
-- "user_overridden" à prévoir.

-- ── Nettoyage des colonnes dépendantes avant suppression des tables ────────

alter table public.assessment_results drop column dominant_trip_id;
alter table public.assessment_results drop column dominant_trip_co2_kg_year;
alter table public.monthly_checkins drop column dominant_trip_id;
alter table public.plan_cycles drop column dominant_trip_id;

drop table public.assessment_trip_modes;
drop table public.assessment_trips;

-- ── Référentiel transport_modes : aligné sur les 9 modes B1.4/B2.2 ─────────
-- (+ avion court/long, utilisés uniquement dans le calcul voyages, jamais proposés
-- comme "mode" sélectionnable). Remplace l'ancien référentiel à 8 lignes/6 modes
-- distincts (pas de distinction thermique/électrique voiture dans la nouvelle spec,
-- vélo et marche désormais séparés, métro/tram et trottinette ajoutés).

delete from public.emission_factors;
delete from public.transport_modes;

insert into public.transport_modes (id, label, category) values
  ('voiture', 'Voiture', 'voiture'),
  ('bus', 'Bus', 'transports_commun'),
  ('train', 'Train ou RER', 'train'),
  ('metro_tram', 'Métro ou tram', 'transports_commun'),
  ('velo', 'Vélo', 'velo_marche'),
  ('marche', 'Marche', 'velo_marche'),
  ('deux_roues_motorise', 'Deux-roues motorisé', 'deux_roues'),
  ('trottinette', 'Trottinette ou mobilité douce', 'velo_marche'),
  ('avion_court_moyen_courrier', 'Avion (court/moyen-courrier)', 'avion'),
  ('avion_long_courrier', 'Avion (long-courrier)', 'avion');

-- Valeurs réelles ADEME (API Impact CO2, requête du 23/08/2026 — cf. increment 5).
-- metro_tram = moyenne Métro (0,0042) / Tramway (0,0038). Le covoiturage n'a pas de
-- ligne dédiée : la spec applique la division par nb_personnes directement dans la
-- formule de calcul (cf. compute_assessment_results ci-dessous), pas via un facteur
-- séparé — cohérent avec la méthode Impact CO2 elle-même (covoiturage = solo ÷ n).
insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('voiture', 0.11056, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:4 Voiture thermique', current_date),
  ('bus', 0.1135, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:9 Bus thermique', current_date),
  ('train', 0.0229, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:15 TER', current_date),
  ('metro_tram', 0.004, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:11 Métro / 10 Tramway (moyenne)', current_date),
  ('velo', 0, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:7 Vélo mécanique', current_date),
  ('marche', 0, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:30 Marche', current_date),
  ('deux_roues_motorise', 0.0604, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:12 Scooter thermique', current_date),
  ('trottinette', 0.002, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:17 Trottinette à assistance électrique', current_date),
  ('avion_court_moyen_courrier', 0.2242, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:1 Avion trajet court', current_date),
  ('avion_long_courrier', 0.2242, 'ADEME Base Empreinte (via API Impact CO2) — valeur court-courrier réutilisée, pas de distinction disponible côté API', 'impactco2:1 Avion trajet court', current_date);

-- action_templates référencait l'ancien mode "voiture_thermique" implicitement via
-- category — la category reste la même liste de 6 valeurs, donc pas de migration
-- nécessaire sur action_templates (aucune ligne ne référence un transport_mode_id).
