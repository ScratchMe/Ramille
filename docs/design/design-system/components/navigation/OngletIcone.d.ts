/** Les deux icônes d’onglet, avec la pastille pleine de l'onglet actif. */
export interface OngletIconeProps {
  nom: 'plan' | 'suivi';
  focused: boolean;
  /** Teinte du trait de l'onglet inactif (`textTertiary`) ; l'actif est toujours en `onAccent` sur sa pastille. */
  color?: string;
}
export declare function OngletIcone(props: OngletIconeProps): JSX.Element;
