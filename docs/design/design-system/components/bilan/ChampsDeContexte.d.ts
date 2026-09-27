/** Ce que les quatre questions écrivent — `ChoixDeContexte` (src/types/contexte.ts) ; `null` = pas encore répondu. */
export interface ChoixDeContexte {
  /** « Type de zone » : Urbain dense, Périurbain, Rural. */
  zone_type: 'urbain_dense' | 'periurbain' | 'rural' | null;
  /** « Accès aux transports en commun » : Bon, Limité, Inexistant. */
  tc_access: 'bon' | 'limite' | 'inexistant' | null;
  /** « Véhicules motorisés dans le foyer » : 0, 1, 2 ou plus. */
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
