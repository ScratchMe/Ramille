/**
 * Le cadre des deux piles d'onglet — la zone sûre du haut et la bande haute, posées une fois par le layout de la
 * pile, autour de tous ses écrans (`v1-33` T-13). Dans le dépôt, la zone sûre est une `SafeAreaView` sans bord bas ;
 * le kit n'a pas d'encoche.
 */
export interface CadreDOngletProps {
  /** L'écran de la pile — le plan, les pistes, le suivi ou une restitution —, dans n'importe lequel de ses états. */
  children?: React.ReactNode;
  /** Kit seulement : le toucher de l'icône du compte, transmis à la bande. */
  onCompte?: () => void;
}
export declare function CadreDOnglet(props: CadreDOngletProps): JSX.Element;
