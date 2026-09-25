/** Texte cliquable — le libellé accessible EST le texte ; cible de 48 px de haut. */
export interface TextLinkProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** `link` pour une navigation (« Voir toutes les pistes »), `button` pour une action dans l'écran courant. */
  role?: 'button' | 'link';
  /** Précision annoncée après le libellé sur Android. Sans effet sur web. */
  hint?: string;
  /** Le lien ouvre et referme un contenu, et voici s'il est ouvert. Laisser `undefined` sur un lien qui n'ouvre rien. */
  expanded?: boolean;
  type?: 'default' | 'small' | 'link' | 'linkPrimary' | 'body' | 'code';
  themeColor?: 'text' | 'textSecondary' | 'textTertiary' | 'accentText';
  weight?: 400 | 500 | 600 | 700;
  /** Style du texte — `{ textDecoration: 'underline' }` pour un lien souligné, `{ textAlign: 'center' }` pour un lien centré. */
  style?: React.CSSProperties;
  /** Style de la cible (alignement, marge) — le texte, lui, ne bouge pas. */
  containerStyle?: React.CSSProperties;
  /** @deprecated Absent du dépôt, qui centre par `style` ; gardé parce que `ui_kits/ramille/` s'en sert. */
  align?: 'left' | 'center';
}
export declare function TextLink(props: TextLinkProps): JSX.Element;
