/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « Contexte » lit ou écrit ; `null` = pas encore répondu. */
export interface ContextStepAnswers {
  /** Un trajet régulier ? `false` ôte la question du télétravail. Lue seulement. */
  commute_has_regular_trip: boolean | null;
  /** Jours de trajet par semaine : la question du télétravail les nomme, et ne se pose qu'à partir de deux. Lue seulement. */
  commute_days_per_week: number | null;
  /** Fréquence des sorties du week-end : « rarement » change la seconde phrase de l'introduction. Lue seulement. */
  leisure_frequency: 'rarely' | 'multiple_monthly' | 'weekly' | 'multiple_weekly' | null;
  /** « Dans quel type de zone vis-tu ? » : Urbain dense, Périurbain, Rural. */
  zone_type: 'urbain_dense' | 'periurbain' | 'rural' | null;
  /** « Comment sont les transports en commun près de chez toi ? » : Bon, Limité, Inexistant. */
  tc_access: 'bon' | 'limite' | 'inexistant' | null;
  /** « Combien de véhicules motorisés dans ton foyer ? » : 0, 1, 2 ou plus. */
  household_vehicles: '0' | '1' | '2_plus' | null;
  /** Les jours qu'on pourrait travailler depuis chez soi : Aucun, Un jour, Deux ou plus — seulement quand la question se pose. */
  teletravail: 'aucun' | 'un_jour' | 'deux_ou_plus' | null;
}
/** La dernière étape du questionnaire — son introduction, puis les quatre questions de `ChampsDeContexte`. */
export interface ContextStepProps {
  answers: ContextStepAnswers;
  /** Écrit les réponses touchées ; l'écran du questionnaire les normalise ensuite. */
  update: (patch: Partial<ContextStepAnswers>) => void;
}
export declare function ContextStep(props: ContextStepProps): JSX.Element;
