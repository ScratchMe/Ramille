/**
 * La boîte qui s’ouvre sous un choix pour le préciser — sous un mode, sous le « Oui » d’un second mode qui a un type,
 * sous les puces de la voiture des longs trajets. Elle porte une précision, ou deux quand le choix en ouvre deux ;
 * elle ne pose aucun rôle : chaque précision garde son propre groupe.
 */
export interface BoiteDePrecisionProps {
  /** Un `PrecisionMode` ou un `PrecisionChiffres`, ou les deux dans l’ordre de l’écran (motorisation, puis combien vous êtes ; type, puis part du trajet). */
  children: React.ReactNode;
}
export declare function BoiteDePrecision(props: BoiteDePrecisionProps): JSX.Element;
