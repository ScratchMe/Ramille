/** Une ligne du choix du canal de rappel — `radio`, titre et détail, pour « Toi » et la feuille des rappels. */
export interface LigneDeCanalProps {
  /** Une ligne de `lignesDeReglage` : `choisi` est la préférence, `choisissable` faux pour l'email sans compte. */
  ligne: { canal: 'push' | 'email' | 'none'; titre: string; detail: string; choisi?: boolean; choisissable?: boolean };
  onChoisir?: (canal: 'push' | 'email' | 'none') => void;
  /** Un enregistrement est en cours : aucune ligne ne se choisit, sans rien changer à l'aspect. */
  occupe?: boolean;
}
export declare function LigneDeCanal(props: LigneDeCanalProps): JSX.Element;
