import type { Ref } from 'react';
import type { View } from 'react-native';

import { ActionCard } from '@/components/plan/action-card';
import { ActionCommitment } from '@/components/plan/action-commitment';
import { etatDeLaPiste, formatIntention } from '@/types/plan';
import type { EngagementPris } from '@/types/rappels';

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
   * L'action engagée du cycle, s'il y en a une : elle décide si une **autre** l'est
   * (`etatDeLaPiste`), donc du remplacement demandé au serveur et, sur le plan, de l'estompage —
   * jamais sur la liste, ouverte sur le choix (`surLeChoix`, `v1-32`). Une prop `estompeeParLeRang`
   * estompait « malgré tout, le rang le demande sur certains écrans » ; aucun écran ne la passait
   * plus depuis que C5.2 a sorti les rangs du plan, et une branche que rien n'exerce se lit comme
   * une règle en vigueur (24/09/2026, `v1-29`).
   */
  committedActionId: string | null;
  /** Appelée quand un engagement vient d'être pris, avec le poste de l'action (C2.1) et son échéance (D14). */
  onEngage: (engagement: EngagementPris) => void;
  /** Appelée après toute écriture réussie : l'écran relit. */
  onChanged: () => void;
  /** Le refus `RM001` de `commit_plan_action` — l'état a changé depuis l'affichage (C4.6). */
  onRefus: (message: string | null) => void;
  /**
   * Ouverte **sur le choix** : le sélecteur d'intention d'emblée, sans « Je m'y engage » — l'écran
   * des pistes, où la pastille « Choisir » vient de le dire (`v1-32` §4.3). Le plan ne le passe pas.
   */
  surLeChoix?: boolean;
  /** « Annuler » rend la carte à sa ligne — l'écran des pistes. Sans lui, le plan. */
  onAnnuler?: () => void;
  /**
   * Le sélecteur vient de s'ouvrir sous le doigt — le plan y fait défiler juste assez pour montrer
   * « C'est noté » (audit P-2, 01/10/2026). La liste ne le passe pas : elle s'ouvre sur le choix.
   */
  onOuvert?: () => void;
  /**
   * Les lectures terminées de l'écran : un engagement pris ici attend la suivante pour se refermer
   * (audit P-1, `ActionCommitment`). Le plan le passe ; la liste part vers le plan.
   */
  lectures?: number;
  /**
   * Le bloc qui annonce la carte — « Action engagée : … » une fois engagée —, pour que l'écran lui
   * rende le focus après la relecture d'un engagement (audit P-1, `ActionCard`).
   */
  refDuBloc?: Ref<View>;
};

/**
 * Une piste du plan, carte et engagement.
 *
 * **Une seule implémentation pour les deux écrans** (C5.2). Elle vivait en fabrique dans l'écran du
 * plan, ce qui suffisait tant qu'il était seul à la rendre ; depuis que « Toutes les pistes » a son
 * écran, la recopier serait garantir qu'elles divergent — et la divergence porterait sur le geste le
 * plus irréversible du produit, l'engagement.
 */
export function CarteDePiste({
  action,
  committedActionId,
  onEngage,
  onChanged,
  onRefus,
  surLeChoix = false,
  onAnnuler,
  onOuvert,
  lectures,
  refDuBloc,
}: Props) {
  // **Une seule source pour « une autre est engagée »** (`etatDeLaPiste`, `v1-32` §4.1) : c'est ce
  // que la pastille de la liste dit (« Choisir à la place ») et ce qu'on demande au serveur
  // (`p_replace`). Lus à deux endroits, ils pouvaient se contredire — un libellé qui annonce un
  // remplacement sur un appel parti sans lui est refusé en `RM001`.
  const uneAutreEstEngagee = etatDeLaPiste(action, committedActionId) === 'aLaPlace';

  return (
    <ActionCard
      titre={action.action_templates?.action_text ?? 'Action à préciser.'}
      gainKg={action.saving_kg_year}
      partPercent={action.saving_share_percent}
      detail={action.detail_text}
      intention={formatIntention(action.intention_days, action.intention_timing, action.committed_at)}
      premierPas={action.first_step}
      engagee={action.committed_at !== null}
      reconduite={action.carried_over_from !== null}
      // **L'estompage est un fait du plan** : la seconde carte recule derrière l'engagée. Sur la
      // liste, ouverte sur le choix, il ferait reculer la carte au moment même où on la regarde —
      // donc jamais là (HANDOFF du canvas `v1-30`, planche B3).
      estompee={uneAutreEstEngagee && !surLeChoix}
      refDuBloc={refDuBloc}
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
        surLeChoix={surLeChoix}
        onAnnuler={onAnnuler}
        onOuvert={onOuvert}
        lectures={lectures}
      />
    </ActionCard>
  );
}
