/** Le champ qu'ouvre la puce « 10+ » d'un compte (vols, longs trajets) — réclamé, entier, relu au-delà de cinquante. */
export interface ChampDuPlafondProps {
  /** L'intitulé est-il celui qui manque (« Il manque encore le nombre de vols ») ? Passe en `accentText` 600. */
  marque?: boolean;
  /** Le nombre saisi ; `null` = champ vide, que l'étape réclame. */
  valeur?: number | null;
  onChange?: (valeur: number | null) => void;
  /** Le nom compté, affiché à droite : « vols » ou « trajets ». */
  unite?: string;
  /** Ce que le champ compte, pour le lecteur d'écran : « Nombre de trajets en voiture sur une année ». Annoncé seul. */
  label?: string;
}
export declare function ChampDuPlafond(props: ChampDuPlafondProps): JSX.Element;
