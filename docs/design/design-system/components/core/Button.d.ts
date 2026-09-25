/** Bouton pleine largeur 54/27 — primaire accent, secondaire sur surface élément. */
/**
 * @startingPoint section="Ramille" subtitle="Bouton 54 · rayon 27" viewport="360x120"
 */
export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Prend la largeur restante d'une rangée (Retour + Suivant). */
  flex?: boolean;
  /**
   * Le bouton est posé sur une surface grise ou teintée (la carte du point) : un secondaire y prend
   * le fond de l'écran et un filet `border`, au lieu du gris des panneaux. Sans effet sur le principal.
   */
  onPanel?: boolean;
  /** Précision annoncée après le titre sur Android (« Répondre oui pour ton trajet domicile-travail »). Sans effet sur web. */
  accessibilityHint?: string;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
