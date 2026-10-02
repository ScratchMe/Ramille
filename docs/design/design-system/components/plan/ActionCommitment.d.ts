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
  /**
   * Ouvert **sur la question** d'emblée (« Toutes les pistes », `v1-32`) : `state` vaut alors `picking` même s'il est
   * laissé à `idle` — rien de coché, aucune valeur par défaut. Le plan ne le passe pas.
   */
  surLeChoix?: boolean;
  /** « Annuler » rend la main à l'appelant (la liste : la carte redevient sa ligne) — il passe devant `onCancel`. */
  onAnnuler?: () => void;
  /**
   * « C’est noté » a abouti, l’écran relit le plan : le sélecteur reste tel quel, « C’est noté » inactif (01/10/2026,
   * audit P-1). Dans le dépôt, `lectures` — les lectures terminées de l’écran — dit quand il se referme ou redevient
   * actif.
   */
  relecture?: boolean;
  /**
   * « C’est noté » a été touché sur une intention incomplète (01/10/2026, D13 de `v1-33`) : il est **en attente**, pas
   * inactif, et sous les choix apparaît ce qui manque — « Choisis au moins un jour. » ou « Choisis une échéance. ». Dans
   * le dépôt, c'est l'état de la demande, posé au toucher, retombé dès que l'intention est complète.
   */
  demande?: boolean;
  onPick?: () => void;
  onToggleDay?: (jour: number) => void;
  onTiming?: (t: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  onRelease?: () => void;
  /**
   * « Modifier les jours » / « Modifier l'échéance » (`v1-33` D15, 02/10/2026) : rouvre le sélecteur prérempli, sans
   * libérer l'action. Dans le dépôt, une échéance relative s'y précoche au mois qu'elle vise (`engageeLe`,
   * `echeanceARecocher`) ; « C'est noté » rappelle le même RPC, qui archive l'intention remplacée, et l'écran rend le
   * focus à la carte relue (`onModifie`).
   */
  onModify?: () => void;
}
export declare function ActionCommitment(props: ActionCommitmentProps): JSX.Element;
