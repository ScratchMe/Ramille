/** Rangée de choix exclusif pleine largeur — B1.1, tranches de distance, fréquence des sorties. */
export interface ChoiceRowProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** La surface de la rangée, pour qui doit lui donner le focus (« Il manque encore … », comme `Chip`). Le kit, rendu sous React 18, retrouve la cible dans le DOM. */
  ref?: React.Ref<HTMLElement>;
}
export declare function ChoiceRow(props: ChoiceRowProps): JSX.Element;
