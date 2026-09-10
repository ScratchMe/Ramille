/** Ramille et ce qu’elle dit, côte à côte. */
export interface RamilleDitProps {
  /** Une réplique de RAMILLE (src/constants/mascotte.ts). Jamais un chiffre. */
  ligne: string;
  mood?: 'calm' | 'happy' | 'encouraging' | 'thinking' | 'resting';
  size?: number;
  tilt?: number;
  themeColor?: 'text' | 'textSecondary' | 'textTertiary';
  accessory?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function RamilleDit(props: RamilleDitProps): JSX.Element;
