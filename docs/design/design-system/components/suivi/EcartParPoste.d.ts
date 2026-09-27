/** Un poste de l'écart entre deux bilans — la forme du dépôt (`EcartDePoste`). */
export interface EcartDePoste {
  poste: 'commute' | 'leisure' | 'travel';
  precedentKg: number;
  courantKg: number;
  /** Le poste dominant du bilan courant, celui du plan — sa barre est en accent. Un seul. */
  dominant: boolean;
}
/** L'écart entre deux bilans, poste par poste : contour = avant, plein = maintenant, échelle commune. */
export interface EcartParPosteProps {
  ecarts: EcartDePoste[];
}
export declare function EcartParPoste(props: EcartParPosteProps): JSX.Element;
