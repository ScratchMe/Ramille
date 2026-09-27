/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « trajets de plus de 300 km » lit ou écrit. */
export interface LongTripsStepAnswers {
  /** Trajets en train sur une année type : 0 à 10, la dernière puce affichant « 10+ », que le lecteur d’écran dit « 10 trajets ou plus ». */
  train_long_trips_per_year: number;
  /** Trajets en autocar, même plage ; pas de question de suivi. */
  coach_long_trips_per_year: number;
  /** Trajets en voiture, même plage ; à partir d'un, la motorisation et le nombre de personnes se demandent. */
  car_long_trips_per_year: number;
  /** « Quelle motorisation ? » ; remis à `null` quand les trajets en voiture repassent à 0. */
  car_long_trips_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  /** « Vous êtes combien dans la voiture ? » : 1 à 5, la dernière puce affichant « 5+ », que le lecteur d’écran dit « 5 personnes ou plus » ; `null` = pas encore répondu. */
  car_long_trips_occupancy: number | null;
}
/** Étape du questionnaire — les trajets de plus de 300 km hors avion, en train, en autocar et en voiture. */
export interface LongTripsStepProps {
  answers: LongTripsStepAnswers;
  /** Écrit les réponses touchées. */
  update: (patch: Partial<LongTripsStepAnswers>) => void;
}
export declare function LongTripsStep(props: LongTripsStepProps): JSX.Element;
