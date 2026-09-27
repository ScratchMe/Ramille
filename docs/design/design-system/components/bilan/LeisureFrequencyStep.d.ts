/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « fréquence des sorties » lit ou écrit ; `null` = pas encore répondu. */
export interface LeisureFrequencyStepAnswers {
  /** Un trajet régulier ? `false` remplace la ligne d'exemples par le nombre d'étapes du questionnaire. Lue seulement. */
  commute_has_regular_trip: boolean | null;
  /** « Rarement — une fois par mois ou moins », « Une fois par semaine », « Plusieurs fois par semaine ». */
  leisure_frequency: 'rarely' | 'weekly' | 'multiple_weekly' | null;
}
/** Étape du questionnaire — à quelle fréquence on fait des trajets de loisirs le week-end. */
export interface LeisureFrequencyStepProps {
  answers: LeisureFrequencyStepAnswers;
  /** Écrit la réponse ; l'écran du questionnaire efface ensuite ce que « Rarement » rend sans objet. */
  update: (patch: Partial<LeisureFrequencyStepAnswers>) => void;
  /** Le nombre d'étapes visibles du questionnaire — dit seulement quand il n'y a pas de trajet domicile-travail. */
  total: number;
}
export declare function LeisureFrequencyStep(props: LeisureFrequencyStepProps): JSX.Element;
