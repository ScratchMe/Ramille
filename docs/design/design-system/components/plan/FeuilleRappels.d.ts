/** Feuille après « C’est noté » — Ramille explique, puis le choix du canal de rappel. */
export interface FeuilleRappelsProps {
  boucle?: 'hebdo' | 'mensuel';
  lignes?: { canal: string; titre: string; detail: string; choisissable?: boolean }[];
  canal: string;
  onCanal?: (canal: string) => void;
  boutonLabel?: string;
  onValider?: () => void;
  erreur?: string | null;
  style?: React.CSSProperties;
}
export declare function FeuilleRappels(props: FeuilleRappelsProps): JSX.Element;
