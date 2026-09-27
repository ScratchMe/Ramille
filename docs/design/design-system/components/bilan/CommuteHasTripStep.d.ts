/** Les champs de `BilanAnswers` (le questionnaire du dépôt, miroir de `assessment_answers`) que l’étape lit ou écrit. */
export interface CommuteHasTripStepAnswers {
  /** B1.1 — un trajet régulier pour le travail ou les études : `true`, `false`, ou `null` tant que la personne n’a pas répondu. */
  commute_has_regular_trip: boolean | null;
}
/** B1.1 — « As-tu un trajet régulier pour le travail ou les études ? », la première étape du questionnaire, posée dans `StepShell`. */
export interface CommuteHasTripStepProps {
  answers: CommuteHasTripStepAnswers;
  /**
   * Écrit la réponse choisie, rien d’autre. L’écran du questionnaire fusionne le fragment puis efface ce qu’il rend
   * impossible — sur « Non », toute la section domicile-travail.
   */
  update: (patch: Partial<CommuteHasTripStepAnswers>) => void;
}
export declare function CommuteHasTripStep(props: CommuteHasTripStepProps): JSX.Element;
