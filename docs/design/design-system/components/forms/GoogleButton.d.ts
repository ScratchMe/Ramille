/** Bouton Google — libellé fixe « Se connecter avec Google », le libellé annoncé est le texte affiché. */
export interface GoogleButtonProps {
  onPress?: () => void;
  loading?: boolean;
}
export declare function GoogleButton(props: GoogleButtonProps): JSX.Element;
