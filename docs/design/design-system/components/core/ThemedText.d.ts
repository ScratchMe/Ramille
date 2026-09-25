/** Texte typé de Ramille — chaque `type` porte taille, interligne et poids ; les titres sont des en-têtes, avec leur niveau. */
export interface ThemedTextProps {
  type?: 'default' | 'small' | 'smallBold' | 'title' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'screenTitle' | 'salient' | 'cardTitle' | 'body' | 'display';
  themeColor?: 'text' | 'textSecondary' | 'textTertiary' | 'accent' | 'accentText';
  weight?: 400 | 500 | 600 | 700;
  /**
   * Niveau d'en-tête, quand celui que le type en déduit ne convient pas — un `subtitle` qui est le
   * seul titre de son écran, par exemple. Par défaut : 1 pour `title`, `screenTitle` et `display`
   * (le titre d'un écran), 2 pour `subtitle` et tout texte déclaré `accessibilityRole="header"`.
   */
  headingLevel?: 1 | 2 | 3;
  /** `'header'` fait d'un texte d'un autre type un en-tête de section (niveau 2) — « Mes données ». */
  accessibilityRole?: 'header' | string;
  /** @deprecated Absent du dépôt ; gardé parce que `ui_kits/ramille/` s'en sert. Passer par le type, `headingLevel` ou `accessibilityRole`. */
  as?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function ThemedText(props: ThemedTextProps): JSX.Element;
