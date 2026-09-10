/** Ramille — la feuille du logo avec un visage calculé. Cinq expressions, aucune négative. */
/**
 * @startingPoint section="Ramille" subtitle="Mascotte · 5 expressions" viewport="360x120"
 */
export interface MascotProps {
  mood?: 'calm' | 'happy' | 'encouraging' | 'thinking' | 'resting';
  /** 42 nominal ; sous 28 la feuille seule est rendue. */
  size?: number;
  /** Inclinaison −12…12°. Penchée elle regarde, droite elle accompagne. */
  tilt?: number;
  animated?: boolean;
  style?: React.CSSProperties;
  /** Accessoire de saison (SVG en unités de viewBox 0 0 100 100), jamais rendu sous 28 px. */
  accessory?: React.ReactNode;
}
export declare function Mascot(props: MascotProps): JSX.Element;
