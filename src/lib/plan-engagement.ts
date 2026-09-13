// Engagement sur une action du plan (étape 6b) — RPC `commit_plan_action` /
// `clear_plan_action_commitment`.
// Réf. migration `supabase/migrations/20260905190000_engagement_action.sql`.
//
// Pourquoi un RPC et pas un `update` : `plan_actions` porte des chiffres figés à la génération
// (`saving_kg_year`, `saving_share_percent`). Ouvrir une policy UPDATE les aurait rendus
// réinscriptibles par le client — la RLS filtre des lignes, jamais des colonnes. La table
// reste donc en écriture serveur uniquement, et la seule mutation possible est celle que la
// fonction autorise, après vérification de propriété.
import { supabase } from '@/lib/supabase';
import type { IntentionDay, IntentionTiming } from '@/types/plan';

export type EngagementResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /**
       * L'écran doit relire le plan : ce qu'il affiche ne correspond plus à l'état du serveur.
       *
       * Un seul cas le lève — le refus de `commit_plan_action` quand une autre action est engagée
       * alors que l'écran ne le savait pas (C4.6). Dire « vérifie ta connexion » serait faux, et ne
       * rien faire laisserait la personne devant un plan qui ne dit pas la vérité.
       */
      rechargerLePlan?: boolean;
    };

/**
 * **Le SQLSTATE que `commit_plan_action` lève quand il refuse de remplacer** (C4.6).
 *
 * Classe `R`, réservée aux conditions définies par l'utilisateur : Postgres ne l'emploie pour rien,
 * donc il ne peut pas se confondre avec une erreur de transport ou de contrainte. C'est le seul
 * moyen de distinguer ce refus d'une panne — `message` est du texte, et le comparer serait le lier
 * à une phrase qu'une migration peut reformuler (la leçon de `over_email_send_rate_limit`, où c'est
 * le **code** qui reconnaît la limite d'envoi et jamais le message).
 */
const AUTRE_ACTION_ENGAGEE = 'RM001';

export async function commitPlanAction(
  planActionId: string,
  intention: { days: IntentionDay[] } | { timing: IntentionTiming },
  /**
   * `true` quand la personne a choisi de **remplacer** l'engagement en cours.
   *
   * Le défaut `false` est ce qui rend le geste explicite : `commit_plan_action` libère et archive
   * l'engagement précédent, c'est-à-dire qu'il efface le seul choix personnel que le produit
   * demande, et il le faisait sans condition depuis n'importe quel appel. L'écran qui propose
   * « Choisir celle-ci à la place » le dit ; un appel écrit par inadvertance ne le dira pas.
   */
  remplace = false
): Promise<EngagementResult> {
  const { error } = await supabase.rpc('commit_plan_action', {
    p_plan_action_id: planActionId,
    p_days: 'days' in intention ? intention.days : undefined,
    p_timing: 'timing' in intention ? intention.timing : undefined,
    p_replace: remplace,
  });

  if (error?.code === AUTRE_ACTION_ENGAGEE) {
    // L'état a changé depuis l'affichage — un autre appareil, ou un onglet laissé ouvert. On le dit
    // et on relit : c'est la seule issue qui ne demande pas à la personne de devenir devin.
    return {
      ok: false,
      message: 'Une autre action est engagée sur cette période. Ton plan vient d’être relu.',
      rechargerLePlan: true,
    };
  }

  if (error) {
    return { ok: false, message: 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.' };
  }
  return { ok: true };
}

export async function clearPlanActionCommitment(planActionId: string): Promise<EngagementResult> {
  const { error } = await supabase.rpc('clear_plan_action_commitment', {
    p_plan_action_id: planActionId,
  });

  if (error) {
    return { ok: false, message: 'Le changement n’a pas été enregistré. Réessaie dans un instant.' };
  }
  return { ok: true };
}
