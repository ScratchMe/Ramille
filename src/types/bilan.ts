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

  leisure_frequency: LeisureFrequency | null;
  leisure_mode: TransportModeId | null;
  leisure_distance_bracket: LeisureDistanceBracket | null;

  flights_total_per_year: number;
  flights_short_per_year: number | null;
  train_long_trips_per_year: number;
  car_long_trips_per_year: number;

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

  leisure_frequency: null,
  leisure_mode: null,
  leisure_distance_bracket: null,

  flights_total_per_year: 0,
  flights_short_per_year: null,
  train_long_trips_per_year: 0,
  car_long_trips_per_year: 0,

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
export function isStepComplete(step: BilanStepId, answers: BilanAnswers): boolean {
  switch (step) {
    case 'commute_has_trip':
      return answers.commute_has_regular_trip !== null;
    case 'commute_days_distance':
      return (
        answers.commute_days_per_week !== null &&
        (answers.commute_distance_km !== null || answers.commute_distance_bracket !== null)
      );
    case 'commute_mode':
      return answers.commute_mode !== null;
    case 'commute_extra':
      if (answers.commute_is_carpool && answers.commute_carpool_size === null) return false;
      if (answers.commute_second_mode_used && answers.commute_second_mode === null) return false;
      return true;
    case 'leisure_frequency':
      return answers.leisure_frequency !== null;
    case 'leisure_detail':
      return answers.leisure_mode !== null && answers.leisure_distance_bracket !== null;
    case 'flights':
      if (answers.flights_total_per_year > 0) return answers.flights_short_per_year !== null;
      return true;
    case 'long_trips':
      return true;
    case 'context':
      return answers.zone_type !== null && answers.tc_access !== null && answers.household_vehicles !== null;
  }
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
