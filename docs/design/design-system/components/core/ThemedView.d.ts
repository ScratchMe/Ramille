/** Surface dont le fond est un jeton du thème (`background` par défaut) — colonne flexible, comme un `View`. */
export interface ThemedViewProps {
  /** Le jeton de fond : `background`, `backgroundElement`, `backgroundSelected`, `backgroundTinted`… */
  type?: 'background' | 'backgroundElement' | 'backgroundSelected' | 'backgroundTinted' | 'canvas';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function ThemedView(props: ThemedViewProps): JSX.Element;
