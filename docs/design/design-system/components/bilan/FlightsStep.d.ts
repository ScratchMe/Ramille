/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « Vols » lit ou écrit. */
export interface FlightsStepAnswers {
  /** Vols sur une année type, un aller-retour comptant pour deux : de 0 à 9 par les puces, et au-delà par le champ qu’ouvre « 10+ » (que le lecteur d’écran dit « 10 vols ou plus ») ; `null` = pas encore répondu — aucune puce n’arrive cochée, et l’étape le réclame. */
  flights_total_per_year: number | null;
  /** Combien sont courts (Europe, moins de 3 h), de 0 au total — des puces jusqu’à dix vols, un champ borné au total au-delà ; `null` = pas encore répondu. Le reste est long-courrier. */
  flights_short_per_year: number | null;
}
/** Étape du questionnaire — le nombre de vols d'une année type, puis la part des courts. */
export interface FlightsStepProps {
  answers: FlightsStepAnswers;
  /** Écrit les réponses touchées ; changer le total ramène les courts sous lui, dans le même appel — et passer de zéro vol à plusieurs repose la question à vide. */
  update: (patch: Partial<FlightsStepAnswers>) => void;
  /** « 10+ » est la réponse, le champ encore vide ou un nombre plus petit tapé dedans ; un total de dix ou plus le dit de lui-même. */
  plafond?: boolean;
  /** « 10+ » touché (`true`), ou une autre puce (`false`) : le dépôt en tient le drapeau hors des colonnes. */
  choisirLePlafond?: (choisi: boolean) => void;
}
export declare function FlightsStep(props: FlightsStepProps): JSX.Element;
