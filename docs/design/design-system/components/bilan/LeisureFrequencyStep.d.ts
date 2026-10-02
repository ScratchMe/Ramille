/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « fréquence des sorties » lit ou écrit ; `null` = pas encore répondu. */
export interface LeisureFrequencyStepAnswers {
  /** « Rarement — une fois par mois ou moins », « Deux ou trois fois par mois », « Une fois par semaine », « Plusieurs fois par semaine ». */
  leisure_frequency: 'rarely' | 'multiple_monthly' | 'weekly' | 'multiple_weekly' | null;
}
/** Étape du questionnaire — à quelle fréquence on fait des trajets de loisirs le week-end. */
export interface LeisureFrequencyStepProps {
  answers: LeisureFrequencyStepAnswers;
  /** Écrit la réponse ; l'écran du questionnaire efface ensuite ce que « Rarement » rend sans objet. */
  update: (patch: Partial<LeisureFrequencyStepAnswers>) => void;
}
export declare function LeisureFrequencyStep(props: LeisureFrequencyStepProps): JSX.Element;
