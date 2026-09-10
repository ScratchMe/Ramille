/** Item des listes de modes de transport — rayon 14. */
export interface ModeListItemProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** Dans un encart déjà teinté (PrecisionMode, « Lequel ? ») : fond blanc quand non sélectionné. */
  nestedBackground?: boolean;
}
export declare function ModeListItem(props: ModeListItemProps): JSX.Element;
