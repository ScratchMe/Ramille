/** Texte cliquable — le libellé accessible EST le texte ; cible 44 px. */
export interface TextLinkProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  type?: 'default' | 'small' | 'link' | 'linkPrimary' | 'body' | 'code';
  themeColor?: 'text' | 'textSecondary' | 'textTertiary' | 'accentText';
  weight?: 400 | 500 | 600 | 700;
  underline?: boolean;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}
export declare function TextLink(props: TextLinkProps): JSX.Element;
