/** Encart de précision chiffrée (combien vous êtes dans la voiture) rendu juste sous l’option qui la déclenche — des puces, là où `PrecisionMode` a des rangées. */
export interface PrecisionChiffresProps {
  /** La question, écrite une fois : le texte en tête de l’encart et le nom du groupe. */
  question: string;
  /**
   * Les réponses, dans l’ordre. `accessibilityLabel` quand le chiffre seul ne dit pas ce qu’il compte :
   * « 6+ » s’annonce « 6 personnes ou plus », « 3 » s’annonce « 3 personnes ».
   */
  options: readonly { value: number; label: string; accessibilityLabel?: string }[];
  /** La réponse choisie, ou `null` tant qu’il n’y en a pas. */
  valeur: number | null;
  onChange: (valeur: number) => void;
}
export declare function PrecisionChiffres(props: PrecisionChiffresProps): JSX.Element;
