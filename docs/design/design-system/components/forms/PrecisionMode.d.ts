/** Encart de précision (motorisation, type de deux-roues) rendu juste sous l’item sélectionné. */
export interface PrecisionModeProps {
  question: string;
  /** Des identifiants (`'hybride'`) ou des nombres (`0.25`, la part du second mode) : le dépôt accepte les deux. */
  options: { value: string | number; label: string }[];
  valeur: string | number | null;
  onChange?: (valeur: string | number) => void;
}
export declare function PrecisionMode(props: PrecisionModeProps): JSX.Element;
