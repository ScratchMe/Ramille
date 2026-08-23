-- Référentiel des modes de transport (V1). Les facteurs d'émission ne sont volontairement
-- PAS seedés ici : ils sont alimentés par le job de synchronisation Impact CO2 / ADEME
-- décrit dans docs/architecture/v1-01-onboarding-bilan.md §2, pour ne jamais coder en dur
-- une valeur qu'on ne maintient pas nous-mêmes.

insert into public.transport_modes (id, label, category) values
  ('voiture_thermique', 'Voiture (thermique)', 'voiture'),
  ('voiture_electrique', 'Voiture (électrique)', 'voiture'),
  ('deux_roues_motorise', 'Deux-roues motorisé', 'deux_roues'),
  ('bus', 'Bus', 'transports_commun'),
  ('train', 'Train', 'train'),
  ('avion_court_moyen_courrier', 'Avion (court/moyen-courrier)', 'avion'),
  ('avion_long_courrier', 'Avion (long-courrier)', 'avion'),
  ('velo_marche', 'Vélo / marche', 'velo_marche');
