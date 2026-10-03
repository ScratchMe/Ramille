/** Puce de choix — pickers numériques, tranches, jours de la semaine, Oui/Non, échéances. */
export interface ChipProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /**
   * Obligatoire : `radio` pour une puce d'un groupe à choix unique (la majorité du questionnaire),
   * `checkbox` pour une puce qui se cumule avec ses voisines (les jours de l'engagement, ce qui passe
   * près de chez soi) — elle porte alors une case, vide ou cochée (03/10/2026). Jamais `button` : une
   * action est un `Button` ou un `TextLink`.
   */
  role: 'radio' | 'checkbox';
  /** Équirépartie dans sa rangée (Oui/Non, taille de covoiturage), ou sa largeur venue d'une cellule (les jours de l'engagement) ; sinon largeur naturelle, en pilule. */
  flex?: boolean;
  /** solid = accent plein + onAccent (nombres, tranches, jours) ; outline = teinte + bordure accent (Oui/Non, échéances). */
  selectedStyle?: 'solid' | 'outline';
  /** 22 par défaut, la pilule (les nombres de vols, total et courts, et les tranches des sorties) ; `Radius.chip` = 14 pour les jours, les compteurs de longs trajets et les précisions ; `Radius.field` = 16 pour les Oui/Non, les échéances et les types de retour, en `outline`. */
  radius?: number;
  /** Posée dans un encart teinté (`backgroundElement`) : le fond non choisi reprend celui de la page. */
  nestedBackground?: boolean;
  /** Quand le libellé visible est une abréviation ambiguë — deux jours portent l'initiale « M » — le mot entier. */
  accessibilityLabel?: string;
  /**
   * La surface de la puce, pour qui doit lui donner le focus : « Il manque encore … » le pose sur l’option cochée d’un
   * groupe, ou sa première. Une prop comme une autre depuis React 19 ; le kit, rendu sous React 18, retrouve la cible
   * dans le DOM.
   */
  ref?: React.Ref<HTMLElement>;
}
export declare function Chip(props: ChipProps): JSX.Element;
