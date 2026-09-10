/** Pied d’ActionCard : s’engager, choisir l’intention, ou changer d’avis. */
export interface ActionCommitmentProps {
  /** days = domicile-travail (jours) ; timing = autres postes (échéance fermée). */
  kind?: 'days' | 'timing';
  state?: 'idle' | 'picking' | 'committed';
  /** Indices 0 (lundi) … 6. */
  days?: number[];
  timing?: 'ce_mois' | 'mois_prochain' | 'occasion' | null;
  otherActionCommitted?: boolean;
  onPick?: () => void;
  onToggleDay?: (i: number) => void;
  onTiming?: (t: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  onRelease?: () => void;
}
export declare function ActionCommitment(props: ActionCommitmentProps): JSX.Element;
