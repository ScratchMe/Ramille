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
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
