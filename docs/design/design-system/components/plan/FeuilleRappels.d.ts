/** Feuille après « C’est noté » — dialogue nommé « Les rappels », sans en-tête visible ; Ramille explique, puis le choix du canal de rappel. */
export interface FeuilleRappelsProps {
  boucle?: 'hebdo' | 'mensuel';
  /**
   * Boucle mensuelle, action choisie pour « Le mois prochain » : le mois du premier point qui l'interroge,
   * en minuscules (« décembre »). Ramille dit alors « Début décembre, … » au lieu de « Au début du mois
   * prochain, … » (`v1-33` D14, 02/10/2026).
   */
  moisNomme?: string | null;
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
  /**
   * L'étape rendue : le choix du canal, ou le mot de la veille (C4.2) — la seconde étape après la notification
   * choisie et reçue, ou la seule quand la feuille se rouvre une fois au premier engagement de trajet où
   * elle peut être posée.
   */
  etape?: 'canal' | 'veille';
  /** La ligne du produit sous la question de la veille, avec sa date (`affichageDeLaVeille`). */
  detailVeille?: string;
  /** « Oui, la veille aussi » ou « Non merci » : chacun enregistre une réponse. */
  onRepondreALaVeille?: (reponse: 'oui' | 'refuse') => void;
}
export declare function FeuilleRappels(props: FeuilleRappelsProps): JSX.Element;
