/** Texte typé de Ramille — chaque `type` porte taille, interligne et poids ; les titres sont des en-têtes. */
export interface ThemedTextProps {
  type?: 'default' | 'small' | 'smallBold' | 'title' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'screenTitle' | 'salient' | 'cardTitle' | 'body';
  themeColor?: 'text' | 'textSecondary' | 'textTertiary' | 'accent' | 'accentText';
  weight?: 400 | 500 | 600 | 700;
  /** Balise HTML (h1, p, span…). Par défaut h2 pour title/subtitle/screenTitle, span sinon. */
  as?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function ThemedText(props: ThemedTextProps): JSX.Element;
