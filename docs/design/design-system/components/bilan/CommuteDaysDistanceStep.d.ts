/** Les champs de `BilanAnswers` (le questionnaire du dépôt, miroir de `assessment_answers`) que l’étape lit ou écrit. */
export interface CommuteDaysDistanceStepAnswers {
  /** B1.2 — le nombre de jours par semaine où le trajet se fait, de 1 à 7, ou `null` sans réponse. */
  commute_days_per_week: number | null;
  /** B1.3 — la distance d’un aller, en kilomètres (décimale permise), ou `null`. Un zéro n’est pas une distance. */
  commute_distance_km: number | null;
  /**
   * B1.3 repli — la tranche choisie après « Je ne sais pas », ou `null`. Jamais en même temps qu’un kilométrage :
   * chaque lien de l’étape efface la réponse de l’autre forme.
   */
  commute_distance_bracket: 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus' | null;
}
/** B1.2 / B1.3 — les jours par semaine, puis la distance d’un aller en kilomètres ou par tranche, posés dans `StepShell`. */
export interface CommuteDaysDistanceStepProps {
  answers: CommuteDaysDistanceStepAnswers;
  /** Écrit la réponse choisie ; l’écran du questionnaire fusionne le fragment puis efface ce qu’il rend impossible. */
  update: (patch: Partial<CommuteDaysDistanceStepAnswers>) => void;
}
export declare function CommuteDaysDistanceStep(props: CommuteDaysDistanceStepProps): JSX.Element;
