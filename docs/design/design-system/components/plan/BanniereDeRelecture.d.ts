/** La ligne qui dit que le plan affiché date — une relecture en échec, ou un choix refusé. Rien à dire : rien de rendu. */
export interface BanniereDeRelectureProps {
  /** Le genre de l'échec de la dernière relecture (D19), ou `null` : la connexion ne se nomme qu'hors ligne. */
  relectureEnEchec: 'horsLigne' | 'serveur' | null;
  /** Le refus qui demande une relecture, dit tel quel — ou `null`. */
  refusDeRemplacement: string | null;
  /** Une relance demandée tourne encore : « Réessayer » reste inactif, et dit occupé. */
  relectureDemandee: boolean;
  onRelire: () => void;
  /** Au-dessus d'un écran centré, elle se centre et prend son air dessous. */
  centree?: boolean;
}
export declare function BanniereDeRelecture(props: BanniereDeRelectureProps): JSX.Element | null;
