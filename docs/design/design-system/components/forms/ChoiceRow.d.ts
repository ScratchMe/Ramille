/** Rangée de choix exclusif pleine largeur — B1.1, tranches, fréquence, canal de rappel. */
export interface ChoiceRowProps {
  label: string;
  /** Seconde ligne (canal de rappel : « Une notification sur ce téléphone »). */
  detail?: string;
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
}
export declare function ChoiceRow(props: ChoiceRowProps): JSX.Element;
