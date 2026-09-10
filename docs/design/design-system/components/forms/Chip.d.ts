/** Puce de choix — pickers numériques, tranches, jours de la semaine, Oui/Non. */
export interface ChipProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** Équirépartie dans sa rangée (Oui/Non, jours). */
  flex?: boolean;
  /** solid = accent plein + blanc (nombres, tranches) ; outline = teinte + bordure accent. */
  selectedStyle?: 'solid' | 'outline';
  radius?: number;
  ariaLabel?: string;
}
export declare function Chip(props: ChipProps): JSX.Element;
