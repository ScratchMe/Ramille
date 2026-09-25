/** Puce de choix — pickers numériques, tranches, jours de la semaine, Oui/Non, échéances. */
export interface ChipProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /**
   * Obligatoire : `radio` pour une puce d'un groupe à choix unique (la majorité du questionnaire),
   * `checkbox` pour une puce qui se cumule avec ses voisines (les jours de l'engagement). Jamais
   * `button` : une action est un `Button` ou un `TextLink`.
   */
  role: 'radio' | 'checkbox';
  /** Équirépartie dans sa rangée (Oui/Non, taille de covoiturage) ; sinon largeur naturelle, en pilule. */
  flex?: boolean;
  /** solid = accent plein + onAccent (nombres, tranches, jours) ; outline = teinte + bordure accent (Oui/Non, échéances). */
  selectedStyle?: 'solid' | 'outline';
  /** 22 par défaut, la pilule (total des vols, tranches des sorties) ; `Radius.chip` = 14 pour les autres séries de chiffres et les jours ; 16 pour les Oui/Non et les échéances. */
  radius?: number;
  /** Posée dans un encart teinté (`backgroundElement`) : le fond non choisi reprend celui de la page. */
  nestedBackground?: boolean;
  /** Quand le libellé visible est une abréviation ambiguë — deux jours portent l'initiale « M » — le mot entier. */
  accessibilityLabel?: string;
}
export declare function Chip(props: ChipProps): JSX.Element;
