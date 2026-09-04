// Référentiel statique des 9 modes sélectionnables (B1.4/B2.2), aligné sur
// `transport_modes` en base (docs/architecture/v1-05-bilan-v2.md §2). En dur plutôt que
// fetché : ce sont des libellés d'UI stables, pas une donnée qui varie par utilisateur —
// évite une dépendance réseau bloquante pour afficher le questionnaire.
export type TransportModeId =
  | 'voiture'
  | 'bus'
  | 'train'
  | 'metro_tram'
  | 'velo'
  | 'marche'
  | 'deux_roues_motorise'
  | 'trottinette';

export const TRANSPORT_MODE_LABELS: Record<TransportModeId, string> = {
  voiture: 'Voiture',
  bus: 'Bus',
  train: 'Train ou RER',
  metro_tram: 'Métro ou tram',
  velo: 'Vélo',
  marche: 'Marche',
  deux_roues_motorise: 'Deux-roues motorisé',
  trottinette: 'Trottinette ou mobilité douce',
};

// Liste complète pour les pickers "mode principal" (B1.4) / "second mode" (B1.6) —
// voiture seul et covoiturage sont deux entrées distinctes dans la maquette (elles ne
// partagent qu'un même `transport_mode_id`, le covoiturage se distingue par
// `commute_is_carpool`).
export type CommuteModeChoice = { key: string; modeId: TransportModeId; carpool: boolean; label: string };

export const COMMUTE_MODE_CHOICES: CommuteModeChoice[] = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train ou RER' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];

// Loisirs (B2.2) : 4 modes en avant + "Voir les autres modes" pour le reste — même
// choix voiture seul/covoiturage que B1.4 pour la cohérence de copy, mais sans effet de
// calcul différencié (le schéma n'a pas de `leisure_carpool_size`, cf. v1-05 §2).
export const LEISURE_MODE_CHOICES_PRIMARY: CommuteModeChoice[] = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train ou RER' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
];

export const LEISURE_MODE_CHOICES_MORE: CommuteModeChoice[] = [
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];

// Question de suivi affichée dès que "voiture" est choisi (B1.4/B1.7/B2.2/B3.4) — jamais
// une entrée de plus dans les listes ci-dessus, cf. types/bilan.ts CarEngine.
export const CAR_ENGINE_OPTIONS: { value: 'thermique' | 'electrique'; label: string }[] = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'electrique', label: 'Électrique' },
];
