/** Bande haute des deux onglets — nom centré (un repère, pas un titre), icône compte à droite, créneau gauche réservé. */
export interface BandeHauteProps {
  /** Pour les kits : le dépôt n'a pas de prop, l'icône mène elle-même à « Toi ». */
  onCompte?: () => void;
}
export declare function BandeHaute(props: BandeHauteProps): JSX.Element;
