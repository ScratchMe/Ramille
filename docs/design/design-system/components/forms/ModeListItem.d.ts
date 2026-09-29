/** Item des listes de modes de transport et des réponses d’une précision — 48 de haut au moins, rayon `Radius.chip` (14). */
export interface ModeListItemProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** Dans un encart déjà teinté (`BoiteDePrecision`, « Lequel ? ») : fond de la page quand non sélectionné. */
  nestedBackground?: boolean;
  /**
   * La surface de l’item, pour qui doit lui donner le focus : « Voir les autres modes » le pose sur le premier mode
   * révélé, « Il manque encore … » sur l’option cochée d’un groupe, ou sa première. Une prop comme une autre depuis
   * React 19 ; le kit, rendu sous React 18, retrouve la cible dans le DOM.
   */
  ref?: React.Ref<HTMLElement>;
}
export declare function ModeListItem(props: ModeListItemProps): JSX.Element;
