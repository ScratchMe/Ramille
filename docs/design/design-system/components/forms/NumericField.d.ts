/** Champ numérique du questionnaire (distance) — 64 px, contour au repos, accent une fois un nombre saisi. */
export interface NumericFieldProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  unit: string;
  /** Ce que le champ demande — « km » seul n'est pas un libellé. */
  label: string;
}
export declare function NumericField(props: NumericFieldProps): JSX.Element;
