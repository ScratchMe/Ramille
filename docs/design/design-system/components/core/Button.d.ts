/** Bouton pleine largeur 54/27 — primaire accent, secondaire sur surface élément. */
/**
 * @startingPoint section="Ramille" subtitle="Bouton 54 · rayon 27" viewport="360x120"
 */
export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Prend la largeur restante d'une rangée (Retour + Suivant). */
  flex?: boolean;
  /**
   * Le bouton est posé sur une surface grise ou teintée (la carte du point) : un secondaire y prend
   * le fond de l'écran et un filet `border`, au lieu du gris des panneaux. Sans effet sur le principal.
   */
  onPanel?: boolean;
  /** Précision annoncée après le titre sur Android (« Répondre oui pour ton trajet domicile-travail »). Sans effet sur web. */
  accessibilityHint?: string;
  /**
   * Le bouton agit, mais l’action qu’il porte attend encore quelque chose : le « Suivant » d’une étape incomplète du
   * questionnaire, qui mène à ce qui manque au lieu d’avancer. L’apparence du désactivé — fond `backgroundElement`,
   * texte `textTertiary` — et rien d’autre : ni `disabled`, ni `aria-disabled`, le nom ne change pas. Sous le doigt,
   * `backgroundPressed` et non `accentPressed`.
   */
  enAttente?: boolean;
  /**
   * La surface du bouton, pour lui rendre le focus (« Je m’y engage » qui réapparaît sous le doigt après « Annuler »).
   * Une prop comme une autre depuis React 19 ; le kit, rendu sous React 18, ne la transmet pas.
   */
  ref?: React.Ref<HTMLButtonElement>;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
