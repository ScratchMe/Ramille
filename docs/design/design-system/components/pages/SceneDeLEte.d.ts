/** La scène de l'été, en tête de la page d'accueil du web — deux personnes qui ont trop chaud, un soleil qui chauffe. */
export interface SceneDeLEteProps {
  /**
   * `posee` sous « réduire les animations » (rien ne se lance), `depart` tant que la scène n'a pas paru, `animee` une
   * fois parue : le mouvement se joue une fois et s'arrête de lui-même avant cinq secondes.
   */
  etat?: 'posee' | 'depart' | 'animee';
}
export declare function SceneDeLEte(props: SceneDeLEteProps): JSX.Element;
