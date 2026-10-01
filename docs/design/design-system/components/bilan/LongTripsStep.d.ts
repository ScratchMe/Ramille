/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « trajets de plus de 300 km » lit ou écrit. `null` = pas encore répondu. */
export interface LongTripsStepAnswers {
  /** Trajets en train sur une année type : 0 à 10, la dernière puce affichant « 10+ », que le lecteur d’écran dit « 10 trajets ou plus » ; `null` tant que rien n’est coché — une série laissée vide sous « Oui » vaut zéro. */
  train_long_trips_per_year: number | null;
  /** Trajets en autocar, même plage ; pas de question de suivi. */
  coach_long_trips_per_year: number | null;
  /** Trajets en voiture, même plage ; à partir d'un, la motorisation et le nombre de personnes se demandent. */
  car_long_trips_per_year: number | null;
  /** « Quelle motorisation ? » ; remis à `null` quand les trajets en voiture repassent à 0. */
  car_long_trips_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  /** « Vous êtes combien dans la voiture ? » : 1 à 5, la dernière puce affichant « 5+ », que le lecteur d’écran dit « 5 personnes ou plus » ; `null` = pas encore répondu. */
  car_long_trips_occupancy: number | null;
}
/** Étape du questionnaire — « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? », puis, sous « Oui », les trajets en train, en autocar et en voiture. */
export interface LongTripsStepProps {
  answers: LongTripsStepAnswers;
  /** Écrit les réponses touchées. */
  update: (patch: Partial<LongTripsStepAnswers>) => void;
  /** La réponse au Oui / Non : `true`, `false`, ou `null` tant qu’elle n’est pas donnée — rien n’est coché d’avance. L’écran du questionnaire la dérive des compteurs (`reponseAuxLongsTrajets`). */
  reponse: boolean | null;
  /** « Oui » ou « Non » touché : « Non » met les trois compteurs à 0, « Oui » les vide pour qu’aucune puce n’arrive cochée (`compteursApresLaReponse`). */
  repondre: (oui: boolean) => void;
}
export declare function LongTripsStep(props: LongTripsStepProps): JSX.Element;
