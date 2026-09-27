/** Un poste de l'écart entre deux bilans — la forme du dépôt (`EcartDePoste`). */
export interface EcartDePoste {
  poste: 'commute' | 'leisure' | 'travel';
  precedentKg: number;
  courantKg: number;
  /** Le poste dominant du bilan courant, ton poste principal — sa barre est en accent. Un seul. */
  dominant: boolean;
}
/** L'écart entre deux bilans, poste par poste : contour = avant, plein = maintenant, échelle commune. */
export interface EcartParPosteProps {
  ecarts: EcartDePoste[];
  /** Les loisirs du bilan courant sont le résiduel des sorties rares (« rarement ») : ils s'appellent « Loisirs occasionnels ». Faux par défaut. */
  loisirsOccasionnels?: boolean;
}
export declare function EcartParPoste(props: EcartParPosteProps): JSX.Element;
