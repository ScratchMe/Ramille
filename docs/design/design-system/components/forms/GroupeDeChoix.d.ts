/** Conteneur d'une série de choix — `radiogroup` (un seul) ou `group` (cumulables), nommé par sa question. */
export interface GroupeDeChoixProps {
  /** Le nom du groupe : la question telle qu'elle est affichée au-dessus de la série, écrite une fois. */
  question: string;
  /** Vrai quand les choix se cumulent (des `checkbox`) : le groupe n'est alors pas un `radiogroup`. */
  cumulable?: boolean;
  /** Nombre de colonnes d'une grille — au plus : moins quand une cible de 48 n'y tiendrait plus. */
  colonnes?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function GroupeDeChoix(props: GroupeDeChoixProps): JSX.Element;
