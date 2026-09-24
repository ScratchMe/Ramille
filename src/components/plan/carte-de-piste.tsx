import { ActionCard } from '@/components/plan/action-card';
import { ActionCommitment } from '@/components/plan/action-commitment';
import { formatIntention } from '@/types/plan';

/**
 * Ce qu'une carte de piste lit d'une ligne `plan_actions`.
 *
 * Déclaré ici et non dans un écran depuis C5.2 : deux écrans rendent cette carte — le plan et
 * « Toutes les pistes » — et une forme recopiée d'un côté divergerait au premier champ ajouté.
 * C'est exactement ce qui est arrivé à `first_step`, qui manquait d'un côté au premier essai.
 */
export type PisteDuPlan = {
  id: string;
  saving_kg_year: number | null;
  saving_share_percent: number | null;
  detail_text: string | null;
  /** Le premier pas du gabarit, figé à la génération (C4.6) — affiché une fois l'action engagée. */
  first_step: string | null;
  rank: number | null;
  committed_at: string | null;
  intention_days: number[] | null;
  intention_timing: string | null;
  /** Le cycle d'où l'engagement a été reconduit (C2.2) — ce qui porte « · RECONDUIT ». */
  carried_over_from: string | null;
  action_templates: { action_text: string; poste: string | null } | null;
};

type Props = {
  action: PisteDuPlan;
  /**
   * L'action engagée du cycle, s'il y en a une : elle décide de l'estompage des autres — et elle
   * seule depuis le 24/09/2026 (`v1-29`). Une prop `estompeeParLeRang` estompait « malgré tout, le
   * rang le demande sur certains écrans » ; aucun écran ne la passait plus depuis que C5.2 a sorti
   * les rangs du plan, et une branche que rien n'exerce se lit comme une règle en vigueur.
   */
  committedActionId: string | null;
  /** Appelée quand un engagement vient d'être pris, avec le poste de l'action (C2.1). */
  onEngage: (poste: string | null) => void;
  /** Appelée après toute écriture réussie : l'écran relit. */
  onChanged: () => void;
  /** Le refus `RM001` de `commit_plan_action` — l'état a changé depuis l'affichage (C4.6). */
  onRefus: (message: string | null) => void;
};

/**
 * Une piste du plan, carte et engagement.
 *
 * **Une seule implémentation pour les deux écrans** (C5.2). Elle vivait en fabrique dans l'écran du
 * plan, ce qui suffisait tant qu'il était seul à la rendre ; depuis que « Toutes les pistes » a son
 * écran, la recopier serait garantir qu'elles divergent — et la divergence porterait sur le geste le
 * plus irréversible du produit, l'engagement.
 */
export function CarteDePiste({ action, committedActionId, onEngage, onChanged, onRefus }: Props) {
  const uneAutreEstEngagee = committedActionId !== null && committedActionId !== action.id;

  return (
    <ActionCard
      titre={action.action_templates?.action_text ?? 'Action à préciser.'}
      gainKg={action.saving_kg_year}
      partPercent={action.saving_share_percent}
      detail={action.detail_text}
      intention={formatIntention(action.intention_days, action.intention_timing)}
      premierPas={action.first_step}
      engagee={action.committed_at !== null}
      reconduite={action.carried_over_from !== null}
      estompee={uneAutreEstEngagee}
    >
      {/* Étape 6b : choisir une action et y attacher une intention. Une seule à la fois par
          cycle — s'engager sur les deux revient à ne s'engager sur aucune, et la base le
          garantit par un index unique partiel. */}
      <ActionCommitment
        onEngage={onEngage}
        actionId={action.id}
        poste={action.action_templates?.poste ?? null}
        committed={action.committed_at !== null}
        intentionDays={action.intention_days}
        intentionTiming={action.intention_timing}
        otherActionCommitted={uneAutreEstEngagee}
        onChanged={onChanged}
        onRefus={onRefus}
      />
    </ActionCard>
  );
}
