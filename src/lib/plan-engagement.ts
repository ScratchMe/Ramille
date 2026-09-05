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

export type EngagementResult = { ok: true } | { ok: false; message: string };

export async function commitPlanAction(
  planActionId: string,
  intention: { days: IntentionDay[] } | { timing: IntentionTiming }
): Promise<EngagementResult> {
  const { error } = await supabase.rpc('commit_plan_action', {
    p_plan_action_id: planActionId,
    p_days: 'days' in intention ? intention.days : undefined,
    p_timing: 'timing' in intention ? intention.timing : undefined,
  });

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
