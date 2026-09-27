/** Le bilan précédent en barre de contour — accentMuted 1,5 px, sans rail, sous ou à côté de la barre pleine du bilan courant. */
export interface BarreContourProps {
  /** De 0 à 100, sur l'échelle commune à toutes les barres du bloc. */
  percent: number;
  /** 10 dans l'écart par poste (six barres), 14 sur la restitution (trois barres). */
  hauteur?: number;
}
export declare function BarreContour(props: BarreContourProps): JSX.Element;
