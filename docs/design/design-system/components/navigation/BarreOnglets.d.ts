/** Barre à deux onglets, Plan et Suivi — composition du layout des onglets du dépôt. */
export interface BarreOngletsProps {
  actif: 'plan' | 'suivi';
  onChange?: (onglet: 'plan' | 'suivi') => void;
  /** Encoche basse de l'appareil, ajoutée à la hauteur. */
  insetBottom?: number;
}
export declare function BarreOnglets(props: BarreOngletsProps): JSX.Element;
