/** Trois apparences, et pas une de plus (`v1-33` T-5) — le corps est `small` partout. */
export type ApparenceDuLien = 'action' | 'discret' | 'souligne';

/**
 * Texte cliquable — le libellé accessible EST le texte ; cible de 48 px de haut.
 *
 * Dans le dépôt, il prend aussi `ref`, transmise à sa cible : pour y rendre le focus après un geste qui l'avait fait
 * disparaître — « Annuler » d'une modification rend le focus à « Modifier les jours » (`v1-33` D15). Le kit ne dessine
 * pas le focus, donc ne la déclare pas.
 */
export interface TextLinkProps {
  label: string;
  /** `action` : accentText 600 · `discret` : textTertiary · `souligne` : textTertiary, souligné au repos. */
  apparence: ApparenceDuLien;
  onPress?: () => void;
  disabled?: boolean;
  /** `link` pour une navigation (« Voir toutes les pistes »), `button` pour une action dans l'écran courant. */
  role?: 'button' | 'link';
  /** Précision annoncée après le libellé sur Android. Sans effet sur web. */
  hint?: string;
  /** Le lien ouvre et referme un contenu, et voici s'il est ouvert. Laisser `undefined` sur un lien qui n'ouvre rien. */
  expanded?: boolean;
  /** L'alignement du texte, et rien d'autre — `{ textAlign: 'center' }` pour un lien centré. */
  style?: Pick<React.CSSProperties, 'textAlign'>;
  /** Style de la cible (alignement, marge) — le texte, lui, ne bouge pas. */
  containerStyle?: React.CSSProperties;
  /** @deprecated Absent du dépôt, qui centre par `style` ; gardé parce que `ui_kits/ramille/` s'en sert. */
  align?: 'left' | 'center';
}
export declare function TextLink(props: TextLinkProps): JSX.Element;
