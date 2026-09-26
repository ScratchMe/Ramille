/** Pied d’ActionCard : s’engager, choisir l’intention, ou changer d’avis. */
export interface ActionCommitmentProps {
  /** days = domicile-travail (jours) ; timing = autres postes (échéance fermée). */
  kind?: 'days' | 'timing';
  /** Le poste de l'action : il décide des échéances — `travel` a les siennes (« À mon prochain projet de voyage »). */
  poste?: 'commute' | 'leisure' | 'travel';
  state?: 'idle' | 'picking' | 'committed';
  /** De 1 (lundi) à 7 (dimanche), comme `INTENTION_DAYS` (src/types/plan.ts). */
  days?: number[];
  /** Les valeurs du dépôt, que la base enregistre. */
  timing?: 'ce_mois' | 'le_mois_prochain' | 'prochaine_occasion' | 'au_prochain_voyage' | 'avant_le_prochain_bilan' | null;
  otherActionCommitted?: boolean;
  onPick?: () => void;
  onToggleDay?: (jour: number) => void;
  onTiming?: (t: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  onRelease?: () => void;
}
export declare function ActionCommitment(props: ActionCommitmentProps): JSX.Element;
