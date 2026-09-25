/** Rangée de choix exclusif pleine largeur — B1.1, tranches de distance, fréquence des sorties. */
export interface ChoiceRowProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
}
export declare function ChoiceRow(props: ChoiceRowProps): JSX.Element;
