/** Une précision en rangées (motorisation, type de deux-roues, de train, de vélo, part du trajet), posée dans `BoiteDePrecision` sous le choix qui la déclenche. */
export interface PrecisionModeProps {
  /** Le champ qu’elle renseigne (`commute_car_engine`, `leisure_train_type`…) : « Il manque encore … » y mène et en marque l’intitulé. */
  champ: string;
  /** La question, écrite une fois : l’intitulé et le nom du groupe. */
  question: string;
  /** Des identifiants (`'hybride'`) ou des nombres (`0.25`, la part du second mode) : le dépôt accepte les deux. */
  options: readonly { value: string | number; label: string }[];
  valeur: string | number | null;
  onChange?: (valeur: string | number) => void;
}
export declare function PrecisionMode(props: PrecisionModeProps): JSX.Element;
