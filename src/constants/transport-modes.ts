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
  train: 'Train',
  metro_tram: 'Métro ou tram',
  velo: 'Vélo',
  marche: 'Marche',
  deux_roues_motorise: 'Deux-roues motorisé',
  trottinette: 'Trottinette ou mobilité douce',
};

// Liste complète pour les pickers "mode principal" (B1.4) / "second mode" (B1.7, le « Lequel ? »
// ouvert par le Oui de B1.6) —
// voiture seul et covoiturage sont deux entrées distinctes dans la maquette (elles ne
// partagent qu'un même `transport_mode_id`, le covoiturage se distingue par
// `commute_is_carpool`).
export type CommuteModeChoice = { key: string; modeId: TransportModeId; carpool: boolean; label: string };

export const COMMUTE_MODE_CHOICES: CommuteModeChoice[] = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
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
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
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
// Quatre motorisations, au même niveau — pas de second « rechargeable ou non ? » imbriqué :
// la profondeur coûte plus cher en abandon qu'une puce de plus, et les deux hybrides sont
// assez éloignées (9,5 %) pour mériter d'être distinguées.
//
// Ordre volontaire, du plus émetteur au moins émetteur en ACV complète — et il n'est pas
// celui qu'on attend : l'hybride non rechargeable (0,146579) émet **plus** que la thermique
// de référence (0,142253), qui est une compacte diesel sobre à l'usage. Cf. migration
// 20260905140000_motorisation_hybride.sql.
// Quatre réponses au même niveau, comme la motorisation voiture — surtout pas un premier
// niveau « scooter ou moto ? » suivi d'un second sur la cylindrée. La frontière ADEME est à
// 250 cm³ ; le libellé garde le vocabulaire courant, la correspondance exacte vit dans
// `emission_factor_sources`.
export const TWO_WHEELER_TYPE_OPTIONS: {
  value: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse';
  label: string;
}[] = [
  { value: 'scooter_thermique', label: 'Scooter thermique' },
  { value: 'scooter_electrique', label: 'Scooter électrique' },
  { value: 'moto_petite', label: 'Moto, petite cylindrée' },
  { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
];

export const CAR_ENGINE_OPTIONS: {
  value: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique';
  label: string;
}[] = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

// Question de suivi affichée dès que « Train » est choisi (B1.4/B1.7/B2.2) — même mécanique que
// la motorisation, et pour un écart plus grand encore : le mode s'appelait « Train ou RER » et
// portait le facteur du **TER**, soit **2,83 fois** celui du RER (0,027690 contre 0,009780). Un
// usager du RER voyait 249,2 kg/an là où 88,0 étaient justes, sur le poste qui décide du plan.
//
// Trois réponses et non une moyenne. `metro_tram` en fait une, légitimement : le métro (0,00444)
// et le tram (0,00428) sont à **3,7 %** l'un de l'autre, donc la moyenne ne coûte rien à personne.
// Le TER vaut **2,83 fois** le RER : moyenner ne réduirait pas l'erreur, il la répartirait sur
// deux populations qui n'ont rien en commun (v1-21 D1).
//
// **Les deux écarts sont mesurés ici plutôt que repris de `v1-21`**, qui les donne « à 2 % » et
// « à 283 % » : le premier est faux (relevé le 21/09/2026 sur l'endpoint ACV, l'écart est de
// 3,7 %) et les deux ne comptent pas dans la même unité — un écart relatif d'un côté, un rapport
// de l'autre. La page de décision est datée, on ne la réécrit pas ; ce commentaire-ci est du code
// vivant, il doit être juste.
export const TRAIN_TYPE_OPTIONS: { value: 'ter' | 'rer' | 'intercites'; label: string }[] = [
  { value: 'ter', label: 'TER ou train régional' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'intercites', label: 'Intercités' },
];

// Et la même sous « Vélo » : l'assistance électrique vaut 0,010950 contre 0,000170, soit 64 fois.
// L'écart absolu est petit, et il faut le dire ainsi — mais il tombe sur le profil sobre, dont le
// total est de l'ordre de la dizaine de kilos, et sur le mode qui remplace une voiture.
//
// **Deux réponses, et la trottinette n'en reçoit aucune** : elle est déjà à 0,0249 et n'a pas de
// variante mécanique crédible — une question dont une seule réponse existe n'est pas une question
// (v1-21 D2).
export const VELO_TYPE_OPTIONS: { value: 'mecanique' | 'electrique'; label: string }[] = [
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'electrique', label: 'À assistance électrique' },
];
