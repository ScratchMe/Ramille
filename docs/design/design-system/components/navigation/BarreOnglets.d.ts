/** Barre à deux onglets, Plan et Suivi — composition du layout des onglets du dépôt (`src/app/(tabs)/_layout.tsx`). */
export interface BarreOngletsProps {
  actif: 'plan' | 'suivi';
  onChange?: (onglet: 'plan' | 'suivi') => void;
  /** Encoche basse de l'appareil, ajoutée à la hauteur et à la marge basse. */
  insetBottom?: number;
}
export declare function BarreOnglets(props: BarreOngletsProps): JSX.Element;
