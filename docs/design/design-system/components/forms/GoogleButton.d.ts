/** Bouton Google — placeholder neutre ; l’implémentation utilise le composant officiel. */
export interface GoogleButtonProps {
  onPress?: () => void;
  loading?: boolean;
  label?: string;
}
export declare function GoogleButton(props: GoogleButtonProps): JSX.Element;
