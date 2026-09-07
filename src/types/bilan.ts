// Forme locale du questionnaire — miroir de `assessment_answers` (mêmes noms de colonnes,
// mêmes valeurs de CHECK) pour un mapping direct à l'insert final, cf.
// docs/architecture/v1-05-bilan-v2.md §3.
import type { TransportModeId } from '@/constants/transport-modes';

export type DistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus';
export type LeisureDistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_plus';
export type LeisureFrequency = 'rarely' | 'weekly' | 'multiple_weekly';
export type ZoneType = 'urbain_dense' | 'periurbain' | 'rural';
export type TcAccess = 'bon' | 'limite' | 'inexistant';
export type HouseholdVehicles = '0' | '1' | '2_plus';
// Thermique/électrique change fortement le calcul (facteur ~9x plus faible pour
// l'électrique, cf. migration 20260904*_car_engine.sql) — une seule question de suivi,
// jamais une entrée séparée dans les listes de mode (qui resteraient "Voiture (seul)" /
// "Voiture (covoiturage)"), posée à chaque endroit où "voiture" peut être choisi.
export type CarEngine = 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique';

// Même mécanique pour le deux-roues, et pour une raison plus forte encore : l'écart entre un
// scooter électrique et une grosse cylindrée est d'un facteur 3,6 (0,0593 contre 0,2147), et
// **une grosse moto émet une fois et demie plus qu'une voiture thermique**. Compter les quatre
// au tarif du scooter, comme le produit le faisait, sous-estimait de 64 % l'empreinte d'un
// motard — dans le sens qui fait passer le deux-roues pour vertueux (cf. migration
// 20260905200000_cylindree_deux_roues.sql).
//
// Les libellés ne montrent pas la cylindrée brute : la frontière ADEME est à 250 cm³, mais
// c'est la distinction « petite / grosse cylindrée » que les gens ont en tête.
export type TwoWheelerType = 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse';

export type BilanAnswers = {
  commute_has_regular_trip: boolean | null;
  commute_days_per_week: number | null;
  commute_distance_km: number | null;
  commute_distance_bracket: DistanceBracket | null;
  commute_mode: TransportModeId | null;
  commute_is_carpool: boolean;
  commute_carpool_size: number | null;
  commute_second_mode_used: boolean;
  commute_second_mode: TransportModeId | null;
  // Un seul champ pour les deux jambes (principale/second mode) : elles ne peuvent pas
  // valoir "voiture" toutes les deux à la fois (B1.7 exclut le mode déjà choisi en B1.4),
  // donc au plus une jambe est concernée à un instant donné.
  commute_car_engine: CarEngine | null;
  commute_two_wheeler_type: TwoWheelerType | null;

  leisure_frequency: LeisureFrequency | null;
  leisure_mode: TransportModeId | null;
  leisure_distance_bracket: LeisureDistanceBracket | null;
  leisure_car_engine: CarEngine | null;
  leisure_two_wheeler_type: TwoWheelerType | null;

  flights_total_per_year: number;
  flights_short_per_year: number | null;
  train_long_trips_per_year: number;
  car_long_trips_per_year: number;
  car_long_trips_engine: CarEngine | null;

  zone_type: ZoneType | null;
  tc_access: TcAccess | null;
  household_vehicles: HouseholdVehicles | null;
};

export const EMPTY_BILAN_ANSWERS: BilanAnswers = {
  commute_has_regular_trip: null,
  commute_days_per_week: null,
  commute_distance_km: null,
  commute_distance_bracket: null,
  commute_mode: null,
  commute_is_carpool: false,
  commute_carpool_size: null,
  commute_second_mode_used: false,
  commute_second_mode: null,
  commute_car_engine: null,
  commute_two_wheeler_type: null,

  leisure_frequency: null,
  leisure_mode: null,
  leisure_distance_bracket: null,
  leisure_car_engine: null,
  leisure_two_wheeler_type: null,

  flights_total_per_year: 0,
  flights_short_per_year: null,
  train_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  car_long_trips_engine: null,

  zone_type: null,
  tc_access: null,
  household_vehicles: null,
};

export const BILAN_STEP_ORDER = [
  'commute_has_trip',
  'commute_days_distance',
  'commute_mode',
  'commute_extra',
  'leisure_frequency',
  'leisure_detail',
  'flights',
  'long_trips',
  'context',
] as const;

export type BilanStepId = (typeof BILAN_STEP_ORDER)[number];

export const BILAN_SECTION_LABEL: Record<BilanStepId, string> = {
  commute_has_trip: 'Domicile-travail',
  commute_days_distance: 'Domicile-travail',
  commute_mode: 'Domicile-travail',
  commute_extra: 'Domicile-travail',
  leisure_frequency: 'Weekend et loisirs',
  leisure_detail: 'Weekend et loisirs',
  flights: 'Voyages sur l’année',
  long_trips: 'Voyages sur l’année',
  context: 'Contexte de mobilité',
};

// Un pas n'est affiché que si sa condition d'affichage est vraie — toujours déterminée
// par une réponse à une étape *antérieure*, donc toujours connue au moment d'afficher
// ce pas (cf. discussion increment 7 : permet un recalcul de "Étape N sur M" purement
// dérivé de l'état courant, sans logique de prévision). Question pas encore répondue
// (valeur `null`) => visible par défaut (optimiste), exactement comme B1.1 affiche
// "Étape 1 sur 9" avant même d'avoir répondu — seule une réponse qui déclenche
// explicitement le saut (Non / rarement) exclut le pas.
export function isStepVisible(step: BilanStepId, answers: BilanAnswers): boolean {
  switch (step) {
    case 'commute_days_distance':
    case 'commute_mode':
    case 'commute_extra':
      return answers.commute_has_regular_trip !== false;
    case 'leisure_detail':
      return answers.leisure_frequency !== 'rarely';
    default:
      return true;
  }
}

export function visibleSteps(answers: BilanAnswers): BilanStepId[] {
  return BILAN_STEP_ORDER.filter((step) => isStepVisible(step, answers));
}

export function nextStep(current: BilanStepId, answers: BilanAnswers): BilanStepId | null {
  const idx = BILAN_STEP_ORDER.indexOf(current);
  for (let i = idx + 1; i < BILAN_STEP_ORDER.length; i++) {
    if (isStepVisible(BILAN_STEP_ORDER[i], answers)) return BILAN_STEP_ORDER[i];
  }
  return null;
}

export function previousStep(current: BilanStepId, answers: BilanAnswers): BilanStepId | null {
  const idx = BILAN_STEP_ORDER.indexOf(current);
  for (let i = idx - 1; i >= 0; i--) {
    if (isStepVisible(BILAN_STEP_ORDER[i], answers)) return BILAN_STEP_ORDER[i];
  }
  return null;
}

// Conditionne l'activation du bouton "Suivant" — un pas est complet quand tous les
// champs qu'il affiche (compte tenu de ses propres sous-conditions internes) sont
// renseignés.
/**
 * Ce qui manque encore à une étape, nommé — ou `null` si elle est complète.
 *
 * Existe parce qu'un bouton grisé ne dit pas pourquoi. Sur l'étape loisirs, choisir
 * « Voiture » déplie la question de motorisation, qui repousse la tranche de distance sous la
 * ligne de flottaison : « Suivant » reste inactif, la personne voit une étape qu'elle croit
 * finie, et rien n'indique qu'il reste un champ plus bas (retour d'appareil du 07/09/2026).
 * Le même défaut guette partout où une étape porte plusieurs champs.
 *
 * **`isStepComplete` en dérive**, et ce n'est pas un raffinement : deux listes de conditions
 * tenues en parallèle finiraient par diverger, et l'écart serait silencieux — un bouton actif
 * sur une étape incomplète, ou un message qui réclame un champ déjà rempli.
 */
export function manqueDeLEtape(step: BilanStepId, answers: BilanAnswers): string | null {
  switch (step) {
    case 'commute_has_trip':
      return answers.commute_has_regular_trip === null ? 'une réponse' : null;
    case 'commute_days_distance':
      if (answers.commute_days_per_week === null) return 'le nombre de jours par semaine';
      if (answers.commute_distance_km === null && answers.commute_distance_bracket === null)
        return 'la distance';
      return null;
    case 'commute_mode':
      if (answers.commute_mode === null) return 'ton mode de transport';
      if (answers.commute_mode === 'voiture' && answers.commute_car_engine === null)
        return 'la motorisation';
      if (answers.commute_mode === 'deux_roues_motorise' && answers.commute_two_wheeler_type === null)
        return 'le type de deux-roues';
      return null;
    case 'commute_extra':
      if (answers.commute_is_carpool && answers.commute_carpool_size === null)
        return 'le nombre de personnes dans la voiture';
      if (answers.commute_second_mode_used && answers.commute_second_mode === null)
        return 'le second mode';
      if (answers.commute_second_mode === 'voiture' && answers.commute_car_engine === null)
        return 'la motorisation';
      if (
        answers.commute_second_mode === 'deux_roues_motorise' &&
        answers.commute_two_wheeler_type === null
      )
        return 'le type de deux-roues';
      return null;
    case 'leisure_frequency':
      return answers.leisure_frequency === null ? 'ta fréquence' : null;
    case 'leisure_detail':
      if (answers.leisure_mode === null) return 'ton mode de transport';
      if (answers.leisure_mode === 'voiture' && answers.leisure_car_engine === null)
        return 'la motorisation';
      if (answers.leisure_mode === 'deux_roues_motorise' && answers.leisure_two_wheeler_type === null)
        return 'le type de deux-roues';
      // En dernier, et c'est voulu : la distance est plus bas dans la page que la précision
      // du mode, donc on ne l'annonce qu'une fois le reste rempli — on nomme ce qu'il reste
      // à faire, dans l'ordre où on le rencontre.
      if (answers.leisure_distance_bracket === null) return 'la distance habituelle';
      return null;
    case 'flights':
      if (answers.flights_total_per_year > 0 && answers.flights_short_per_year === null)
        return 'la part de vols courts';
      return null;
    case 'long_trips':
      if (answers.car_long_trips_per_year > 0 && answers.car_long_trips_engine === null)
        return 'la motorisation';
      return null;
    case 'context':
      if (answers.zone_type === null) return 'ton type de zone';
      if (answers.tc_access === null) return 'l’accès aux transports en commun';
      if (answers.household_vehicles === null) return 'le nombre de véhicules du foyer';
      return null;
  }
}

// Dérivé, jamais réécrit — cf. `manqueDeLEtape`.
export function isStepComplete(step: BilanStepId, answers: BilanAnswers): boolean {
  return manqueDeLEtape(step, answers) === null;
}

export function distanceBracketMidpointKm(bracket: DistanceBracket): number {
  switch (bracket) {
    case 'lt_5':
      return 2.5;
    case '5_15':
      return 10;
    case '15_30':
      return 22.5;
    case '30_50':
      return 40;
    case '50_plus':
      return 60;
  }
}
