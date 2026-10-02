/** Champ numérique du questionnaire (distance) — 64 px, contour au repos, accent une fois un nombre saisi. */
export interface NumericFieldProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  unit: string;
  /** Ce que le champ demande — « km » seul n'est pas un libellé. */
  label: string;
  /**
   * Le champ de saisie lui-même, pas son cadre : c’est à lui qu’« Il manque encore la distance » donne le focus — sur
   * web, un `focus()` sur le cadre échouerait sans bruit ; sur l’appareil, c’est son `focus()` qui ouvre le clavier. Le
   * kit, rendu sous React 18, retrouve le champ dans le DOM.
   */
  ref?: React.Ref<HTMLInputElement>;
  /**
   * Un compte et non une mesure (`v1-33` §6, 02/10/2026) : clavier sans décimale, partie entière de ce qui est tapé
   * (« 12,5 » vaut 12, jamais 125), et le libellé annoncé seul — l'unité est le nom compté (`ChampDuPlafond`).
   */
  entier?: boolean;
}
export declare function NumericField(props: NumericFieldProps): JSX.Element;
