/** La sortie d'un écran qui se consulte — en haut à gauche, au-dessus du titre, un chevron et son libellé, en gris. */
export interface SortieDuDetourProps {
  /** « Retour », « Retour au plan », « Revenir à mon suivi » : le libellé dit où l'on va quand ce n'est pas d'où l'on vient. */
  label: string;
  /** Dans le dépôt : `revenirOu(repli)` pour un retour, une destination nommée quand le libellé en nomme une. */
  onPress?: () => void;
}
export declare function SortieDuDetour(props: SortieDuDetourProps): JSX.Element;
