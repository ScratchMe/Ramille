// La lecture et la réponse du point par le jeton d'un e-mail — étape 6b de `v1-35` (24/10/2026).
//
// **Module à part**, pour la raison de `src/lib/desinscription.ts` : ce chemin s'exerce dans un
// navigateur, sans session, chez quelqu'un qui n'a peut-être pas l'app, et n'a besoin ni de
// `expo-notifications` ni de la lecture du plan. Le jeton du lien porte à lui seul l'autorisation.
import { supabase } from '@/lib/supabase';
import type { ReponseDuPoint } from '@/types/checkin';
import { genreDeLEchec } from '@/types/lecture-en-echec';
import type { LectureDuPoint } from '@/types/reponse-par-le-lien';

export async function lireLePointDuLien(jeton: string): Promise<LectureDuPoint> {
  const { data, error, status } = await supabase.rpc('le_point_du_lien', { p_jeton: jeton });
  if (error) return { ok: false, genre: genreDeLEchec(status) };

  const ligne = data?.[0];
  if (!ligne) return { ok: true, point: null };
  // La colonne n'accepte que ces deux valeurs (`check` de `engagement_checkins.loop_type`) : une autre
  // serait une base qui a changé d'avis, et la page n'aurait pas de quoi composer la carte. Elle le dit
  // comme une panne du serveur, jamais comme un lien abîmé.
  if (ligne.loop_type !== 'commute' && ligne.loop_type !== 'extras') return { ok: false, genre: 'serveur' };
  return { ok: true, point: { ...ligne, loop_type: ligne.loop_type } };
}

/**
 * La réponse par le jeton. Elle rend la réponse brute du RPC, comme l'appel par défaut de la carte : les
 * refus (`22023`, point clos ou lien inconnu) et les pannes s'y lisent de la même façon
 * (`CheckinCard`, `repondre`).
 */
export function repondreParLeLien(jeton: string, reponse: ReponseDuPoint) {
  return supabase.rpc('repondre_par_le_lien', { p_jeton: jeton, p_reponse: reponse });
}
