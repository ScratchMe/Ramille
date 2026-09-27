// L'engagement de la période courante, lu pour être **annoncé avant** un geste qui peut l'emporter —
// un nouveau bilan (C6.2, la feuille « Nouveau bilan ») ou le retrait du bilan qui porte le plan
// (C4.7, la confirmation du retrait). La dérivation est pure et testée (`engagementDeLaPeriodeCourante`,
// `src/types/rebilan.ts`) ; ici, seulement la lecture, écrite une fois pour que les deux écrans ne
// lisent pas le cycle chacun à sa façon.
import type { Lecture } from '@/lib/bilan-history';
import { supabase } from '@/lib/supabase';
import {
  dateCalendaire,
  engagementDeLaPeriodeCourante,
  type EngagementEnCours,
} from '@/types/rebilan';

/**
 * L'engagement du cycle le plus récent, s'il couvre aujourd'hui — `{ ok: true, data: null }` quand il
 * n'y en a pas, `{ ok: false }` quand la lecture a échoué. Les deux appelants tolèrent l'échec de la
 * même façon : ils ne disent rien de l'engagement plutôt que de retenir le geste.
 */
export async function lireLEngagementEnCours(
  maintenant: Date = new Date()
): Promise<Lecture<EngagementEnCours | null>> {
  const { data, error } = await supabase
    .from('plan_cycles')
    // Même chaîne d'un seul tenant que les deux écrans du plan, et **le nom de la clé étrangère est
    // obligatoire** : `carried_over_from` en est une seconde vers `plan_cycles`, donc sans lui
    // PostgREST refuse la requête entière (C2.2).
    .select(
      'period_start, period_end, plan_actions!plan_actions_plan_cycle_id_fkey(committed_at, intention_days, intention_timing, action_templates(action_text))'
    )
    .order('period_start', { ascending: false })
    .limit(1);
  if (error) return { ok: false };

  const cycle = data?.[0];
  if (!cycle) return { ok: true, data: null };

  return {
    ok: true,
    data: engagementDeLaPeriodeCourante(
      { period_start: cycle.period_start, period_end: cycle.period_end, actions: cycle.plan_actions },
      dateCalendaire(maintenant)
    ),
  };
}
