/** Le dernier filet quand un écran lève — le fait, la cause technique à recopier, « Réessayer ». */
export interface ErreurInattendueProps {
  /** Ce qui a été levé : une erreur (« TypeError : … »), un texte, ou tout autre valeur, rendue en JSON. */
  erreur: unknown;
  reessayer?: () => void;
}
export declare function ErreurInattendue(props: ErreurInattendueProps): JSX.Element;
