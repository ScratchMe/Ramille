/** Item des listes de modes de transport — rayon `Radius.chip` (14). */
export interface ModeListItemProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** Dans un encart déjà teinté (PrecisionMode, « Lequel ? ») : fond de la page quand non sélectionné. */
  nestedBackground?: boolean;
}
export declare function ModeListItem(props: ModeListItemProps): JSX.Element;
