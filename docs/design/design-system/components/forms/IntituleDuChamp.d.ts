/**
 * L’intitulé d’un champ du questionnaire — une précision, « Lequel ? », un sous-titre d’étape, une question du
 * contexte —, qui passe en `accentText` 600 quand il est **marqué** : au toucher du « Suivant » en attente, quand ce
 * champ est celui qui manque. Mêmes props que `ThemedText`, plus `marque`.
 */
export interface IntituleDuChampProps {
  /** Vrai quand ce champ est celui qui manque, pendant la demande — lu par `useAncreDuChamp`, jamais écrit à la main. */
  marque: boolean;
  /** `small`, ou `subtitle` ramené à 22/28 pour un sous-titre d’étape. */
  type?: string;
  /** La couleur de tous les jours : `textSecondary` (précision), `textTertiary` (« Lequel ? », contexte), rien (`text`) pour un sous-titre. */
  themeColor?: 'text' | 'textSecondary' | 'textTertiary';
  /** La graisse de tous les jours ; marqué, c’est 600. */
  weight?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function IntituleDuChamp(props: IntituleDuChampProps): JSX.Element;

/**
 * Un champ du questionnaire tel qu’une étape peut le réclamer (`ChampDuBilan`, src/types/bilan.ts) : le nom de la
 * colonne, sauf `distance_du_trajet`, qui couvre les kilomètres et la tranche du trajet — l’étape n’en montre qu’une.
 */
export type ChampDuBilan =
  | 'commute_has_regular_trip'
  | 'commute_days_per_week'
  | 'distance_du_trajet'
  | 'commute_mode'
  | 'commute_car_engine'
  | 'commute_two_wheeler_type'
  | 'commute_train_type'
  | 'commute_velo_type'
  | 'commute_carpool_size'
  | 'commute_second_mode_used'
  | 'commute_second_mode'
  | 'commute_second_mode_share'
  | 'leisure_frequency'
  | 'leisure_mode'
  | 'leisure_car_engine'
  | 'leisure_two_wheeler_type'
  | 'leisure_train_type'
  | 'leisure_velo_type'
  | 'leisure_carpool_size'
  | 'leisure_distance_bracket'
  | 'leisure_distance_km'
  | 'flights_total_per_year'
  | 'flights_short_per_year'
  | 'car_long_trips_engine'
  | 'car_long_trips_occupancy'
  | 'zone_type'
  | 'transports_proches'
  | 'household_vehicles'
  | 'teletravail';

/**
 * Enregistre un champ auprès de l’étape qui l’affiche (`StepShell`), et dit si son intitulé est marqué. `bloc` va au
 * conteneur de l’intitulé et de son groupe, ou au champ de saisie (`saisie`). Hors de `StepShell`, inerte.
 *
 * Le dépôt rend aussi `cible`, à passer en `ref` à l’option que désigne `optionCible` ; le kit la retrouve dans le bloc.
 */
export declare function useAncreDuChamp(
  champ: ChampDuBilan,
  options?: { saisie?: boolean }
): { bloc: React.RefObject<HTMLElement>; marque: boolean };

/** L’intitulé de ce champ est-il marqué ? Lu par le titre de l’étape, qui ne l’est jamais (`seMarque`). */
export declare function useMarqueDuChamp(champ: ChampDuBilan | null): boolean;
