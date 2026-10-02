/** Ce que les quatre questions écrivent — `ChoixDeContexte` (src/types/contexte.ts) ; `null` = pas encore répondu. */
export interface ChoixDeContexte {
  /** « Dans quel type de zone vis-tu ? » : Urbain dense, Périurbain, Rural — avec une ligne d'aide qui les définit. */
  zone_type: 'urbain_dense' | 'periurbain' | 'rural' | null;
  /**
   * « Près de chez toi, qu’est-ce que tu pourrais prendre ? » (`v1-34`) : à cocher — Métro ou tram, RER ou
   * Transilien, Train (TER, Intercités), Bus — ou « Rien de tout ça » seul. Rangée dans cet ordre ; `null` sans réponse.
   */
  transports_proches: ('metro_tram' | 'rer' | 'train' | 'bus' | 'aucun')[] | null;
  /** « Combien de véhicules motorisés dans ton foyer ? » : 0, 1, 2 ou plus. */
  household_vehicles: '0' | '1' | '2_plus' | null;
  /** Les jours qu'on pourrait travailler depuis chez soi : Aucun, Un jour, Deux ou plus — seulement quand la question se pose. */
  teletravail: 'aucun' | 'un_jour' | 'deux_ou_plus' | null;
}
/** Ce dont dépend la question du télétravail, et rien de plus : deux réponses du trajet domicile-travail, lues seulement. */
export interface TrajetDuContexte {
  /** Un trajet régulier ? `false` ôte la question du télétravail. */
  commute_has_regular_trip: boolean | null;
  /** Jours de trajet par semaine : la question les nomme, et ne se pose qu'à partir de deux. */
  commute_days_per_week: number | null;
}
/** Les quatre questions du contexte de mobilité, partagées par la dernière étape du questionnaire et l'écran `/contexte`. */
export interface ChampsDeContexteProps {
  /** Les réponses affichées : celles du questionnaire, ou celles qu'on est en train de corriger. */
  choix: ChoixDeContexte;
  trajet: TrajetDuContexte;
  /** Écrit la réponse qu'on vient de toucher. */
  update: (patch: Partial<ChoixDeContexte>) => void;
}
export declare function ChampsDeContexte(props: ChampsDeContexteProps): JSX.Element;
