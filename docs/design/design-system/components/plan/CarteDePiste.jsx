import React from 'react';
import { ActionCard } from './ActionCard.jsx';
import { ActionCommitment } from './ActionCommitment.jsx';
// Source : src/components/plan/carte-de-piste.tsx — une piste du plan, carte et engagement, lue d'une ligne
// `plan_actions` (`PisteDuPlan`). Une seule implémentation pour ses deux écrans, le plan et « Toutes les pistes » :
// la recopier garantirait qu'elles divergent, sur le geste le plus irréversible du produit.
//
// L'estompage vient de l'action engagée du cycle : une autre est engagée → celle-ci recule, sur le plan. **Jamais
// sur la liste** (`surLeChoix`, 29/09/2026, `v1-32`) : ouverte sur le choix, la carte reculerait au moment même où
// on la regarde. « Une autre est engagée » se lit comme `etatDeLaPiste` (src/types/plan.ts) : jamais vrai d'une
// ligne engagée elle-même, quel que soit `committedActionId`.

// `formatIntention` (src/types/plan.ts), recopiée : les jours de 1 à 7 avec l'article répété, sinon l'échéance en
// minuscules. Le kit ne lit rien de `src/`.
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const ECHEANCES = {
  ce_mois: 'ce mois-ci', le_mois_prochain: 'le mois prochain', prochaine_occasion: 'à ma prochaine occasion',
  au_prochain_voyage: 'à mon prochain projet de voyage', avant_le_prochain_bilan: 'avant mon prochain bilan',
};
const formatIntention = (jours, echeance) => {
  if (jours && jours.length > 0) {
    const noms = [...jours].sort((a, b) => a - b).map((j) => JOURS[j - 1]).filter(Boolean);
    if (noms.length === 7) return 'tous les jours';
    const avecArticle = noms.map((n) => 'le ' + n);
    return avecArticle.length === 1 ? avecArticle[0] : avecArticle.slice(0, -1).join(', ') + ' et ' + avecArticle[avecArticle.length - 1];
  }
  return ECHEANCES[echeance] || null;
};

export function CarteDePiste({ action, committedActionId = null, surLeChoix = false, choixOuvert = false, joursChoisis = [], echeanceChoisie = null, onChoisir, onToggleDay, onTiming, onAnnuler, onValider, onLiberer }) {
  const engagee = action.committed_at !== null && action.committed_at !== undefined;
  const uneAutreEstEngagee = !engagee && committedActionId !== null && committedActionId !== action.id;
  const poste = action.action_templates ? action.action_templates.poste : null;
  return (
    <ActionCard
      titre={(action.action_templates && action.action_templates.action_text) || 'Action à préciser.'}
      gainKg={action.saving_kg_year}
      partPercent={action.saving_share_percent}
      detail={action.detail_text}
      intention={formatIntention(action.intention_days, action.intention_timing)}
      premierPas={action.first_step}
      engagee={engagee}
      reconduite={action.carried_over_from !== null && action.carried_over_from !== undefined}
      estompee={uneAutreEstEngagee && !surLeChoix}
    >
      {/* Une seule action engagée par cycle : s'engager sur deux revient à ne s'engager sur aucune. Le poste décide de
          la forme de l'intention — des jours pour le domicile-travail, une échéance fermée ailleurs. */}
      <ActionCommitment
        kind={poste === 'commute' ? 'days' : 'timing'}
        poste={poste || 'leisure'}
        state={engagee ? 'committed' : choixOuvert || surLeChoix ? 'picking' : 'idle'}
        days={joursChoisis}
        timing={echeanceChoisie}
        otherActionCommitted={uneAutreEstEngagee}
        onPick={onChoisir}
        onToggleDay={onToggleDay}
        onTiming={onTiming}
        onCancel={onAnnuler}
        onSubmit={onValider}
        onRelease={onLiberer}
      />
    </ActionCard>
  );
}
