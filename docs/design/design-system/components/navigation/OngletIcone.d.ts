/** Les deux icônes d’onglet, avec la pastille de sélection. */
export interface OngletIconeProps {
  nom: 'plan' | 'suivi';
  focused: boolean;
  color?: string;
}
export declare function OngletIcone(props: OngletIconeProps): JSX.Element;
