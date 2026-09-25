/** Accès au compte — une icône, pas un onglet. Cible ronde de 48. */
export interface CompteBoutonProps {
  /** Pour les kits : le dépôt n'a pas de prop, le bouton mène lui-même à « Toi » (`/compte`). */
  onPress?: () => void;
}
export declare function CompteBouton(props: CompteBoutonProps): JSX.Element;
