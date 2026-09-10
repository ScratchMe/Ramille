/** Encart de précision (motorisation, type de deux-roues) rendu juste sous l’item sélectionné. */
export interface PrecisionModeProps {
  question: string;
  options: { value: string; label: string }[];
  valeur: string | null;
  onChange?: (valeur: string) => void;
}
export declare function PrecisionMode(props: PrecisionModeProps): JSX.Element;
