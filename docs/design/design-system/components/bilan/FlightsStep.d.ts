/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « Vols » lit ou écrit. */
export interface FlightsStepAnswers {
  /** Vols sur une année type, un aller-retour comptant pour deux : 0 à 10, la dernière puce affichant « 10+ », que le lecteur d’écran dit « 10 vols ou plus ». */
  flights_total_per_year: number;
  /** Combien sont courts (Europe, moins de 3 h), de 0 au total ; `null` = pas encore répondu. Le reste est long-courrier. */
  flights_short_per_year: number | null;
}
/** Étape du questionnaire — le nombre de vols d'une année type, puis la part des courts. */
export interface FlightsStepProps {
  answers: FlightsStepAnswers;
  /** Écrit les réponses touchées ; changer le total ramène les courts sous lui, dans le même appel. */
  update: (patch: Partial<FlightsStepAnswers>) => void;
}
export declare function FlightsStep(props: FlightsStepProps): JSX.Element;
