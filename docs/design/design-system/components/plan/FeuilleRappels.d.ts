/** Feuille après « C’est noté » — dialogue nommé « Les rappels », sans en-tête visible ; Ramille explique, puis le choix du canal de rappel. */
export interface FeuilleRappelsProps {
  boucle?: 'hebdo' | 'mensuel';
  /** La permission système de l'appareil : elle écrit le détail de la ligne « notification » et le libellé du bouton. */
  permission?: 'demandable' | 'accordee' | 'fermee';
  /** Les lignes de `lignesDeReglage` ; par défaut, un appareil sans compte. */
  lignes?: { canal: 'push' | 'email' | 'none'; titre: string; detail: string; choisissable?: boolean; lienVersLesReglages?: boolean; porteVersLeCompte?: boolean }[];
  canal?: 'push' | 'email' | 'none';
  onCanal?: (canal: 'push' | 'email' | 'none') => void;
  boutonLabel?: string;
  onValider?: () => void;
  /** Le geste de retour (Échap sur web) : la feuille se referme toujours. */
  onFerme?: () => void;
  erreur?: string | null;
  /** Rendre la feuille dans son voile, vrai par défaut (`FeuilleDuBas`). */
  voile?: boolean;
  /** Style du voile, ou de la feuille quand `voile={false}`. */
  style?: React.CSSProperties;
}
export declare function FeuilleRappels(props: FeuilleRappelsProps): JSX.Element;
