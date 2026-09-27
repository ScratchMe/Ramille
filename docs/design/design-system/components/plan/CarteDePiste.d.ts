/** Ce qu'une carte de piste lit d'une ligne `plan_actions` — la forme du dépôt (`PisteDuPlan`). */
export interface PisteDuPlan {
  id: string;
  saving_kg_year: number | null;
  saving_share_percent: number | null;
  detail_text: string | null;
  /** Le premier pas, figé à la génération — affiché une fois l'action engagée. */
  first_step: string | null;
  rank?: number | null;
  committed_at: string | null;
  /** De 1 (lundi) à 7 (dimanche). */
  intention_days: number[] | null;
  intention_timing: string | null;
  /** Le cycle d'où l'engagement a été reconduit — ce qui porte « · RECONDUIT ». */
  carried_over_from: string | null;
  action_templates: { action_text: string; poste: 'commute' | 'leisure' | 'travel' | null } | null;
}
/** Une piste du plan, carte et engagement — la même sur le plan et sur « Toutes les pistes ». */
export interface CarteDePisteProps {
  action: PisteDuPlan;
  /** L'action engagée du cycle : elle seule décide de l'estompage des autres. */
  committedActionId?: string | null;
  /** Le sélecteur d'intention est ouvert (le dépôt tient cet état dans `ActionCommitment`). */
  choixOuvert?: boolean;
  joursChoisis?: number[];
  echeanceChoisie?: string | null;
  /** « Je m’y engage » ou « Choisir celle-ci à la place » : ouvre le choix de l'intention. (Dans le dépôt, `onEngage` suit un engagement déjà pris — ce n'est pas ce geste-ci.) */
  onChoisir?: () => void;
  onToggleDay?: (jour: number) => void;
  onTiming?: (echeance: string) => void;
  onAnnuler?: () => void;
  onValider?: () => void;
  onLiberer?: () => void;
}
export declare function CarteDePiste(props: CarteDePisteProps): JSX.Element;
