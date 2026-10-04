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
import { messageDEcriture } from '@/types/ecriture-en-echec';
import { genreDeLEchec } from '@/types/lecture-en-echec';
import type { IntentionDay, IntentionTiming } from '@/types/plan';

export type EngagementResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /**
       * L'écran doit relire le plan : ce qu'il affiche ne correspond plus à l'état du serveur.
       *
       * Deux cas le lèvent : le refus de `commit_plan_action` quand une autre action est engagée
       * alors que l'écran ne le savait pas (C4.6), et, depuis le 04/10/2026, une action que le serveur
       * ne trouve plus sur le plan en cours (`PLAN_CHANGE`). Dire « vérifie ta connexion » serait
       * faux, et ne rien faire laisserait la personne devant un plan qui ne dit pas la vérité.
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

/**
 * **Le SQLSTATE d'une action que le serveur ne trouve plus sur le plan en cours** (`no_data_found`,
 * 04/10/2026, `v1-27` §12.36).
 *
 * Les deux RPC n'agissent que sur le dernier cycle du compte (`20261004194921`) : un écran resté
 * ouvert pendant le passage nocturne d'un changement de saison, ou un plan refait sur un autre
 * appareil, montre des actions qui ne sont plus celles du plan. Chaque nouvel essai échouait de la
 * même façon, sous un message de panne, jusqu'à ce que la personne quitte l'écran. On relit le plan
 * et on le dit — phrase choisie par la personne qui pilote le 04/10/2026.
 */
const PLAN_CHANGE = 'P0002';

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
  const { error, status } = await supabase.rpc('commit_plan_action', {
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

  if (error?.code === PLAN_CHANGE) {
    return {
      ok: false,
      message: 'Ton choix n’a pas été enregistré : ton plan a changé entre-temps. Il vient d’être relu.',
      rechargerLePlan: true,
    };
  }

  if (error) {
    // **La connexion n'est nommée que hors ligne** (`v1-33` §9, 02/10/2026) : la phrase disait
    // « Vérifie ta connexion » à toute erreur, y compris une réponse du serveur.
    return { ok: false, message: messageDEcriture('Ton choix n’a pas été enregistré.', genreDeLEchec(status)) };
  }
  return { ok: true };
}

export async function clearPlanActionCommitment(planActionId: string): Promise<EngagementResult> {
  const { error, status } = await supabase.rpc('clear_plan_action_commitment', {
    p_plan_action_id: planActionId,
  });

  if (error?.code === PLAN_CHANGE) {
    // Le même plan périmé, côté « Ne plus suivre » : la phrase garde le mot de ce geste-ci.
    return {
      ok: false,
      message: 'Le changement n’a pas été enregistré : ton plan a changé entre-temps. Il vient d’être relu.',
      rechargerLePlan: true,
    };
  }

  if (error) {
    // L'inverse de `commitPlanAction` jusqu'au 02/10/2026 : « Réessaie dans un instant » à toute
    // erreur, hors ligne compris — vrai, mais muet sur la seule chose à vérifier. Même règle des deux côtés.
    return { ok: false, message: messageDEcriture('Le changement n’a pas été enregistré.', genreDeLEchec(status)) };
  }
  return { ok: true };
}
