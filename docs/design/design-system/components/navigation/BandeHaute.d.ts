/** Bande haute des deux onglets — nom centré, icône compte à droite, créneau gauche réservé. */
export interface BandeHauteProps {
  onCompte?: () => void;
  nom?: string;
}
export declare function BandeHaute(props: BandeHauteProps): JSX.Element;
