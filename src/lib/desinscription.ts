// L'appel qui coupe les rappels depuis le lien d'un email — C2.9.
//
// **Module à part, et séparé de `src/lib/rappels.ts` exprès.** Celui-là tire
// `expo-notifications`, `expo-device` et la permission de l'appareil : tout ce dont ce chemin-ci
// n'a surtout pas besoin, puisqu'il s'exerce dans un navigateur, sans session, chez quelqu'un qui
// a peut-être désinstallé l'app. Le jeton du lien porte à lui seul l'autorisation.
import { supabase } from '@/lib/supabase';
import type { ReponseDesinscription } from '@/types/desinscription';

export async function couperLesRappels(jeton: string): Promise<ReponseDesinscription> {
  const { data, error } = await supabase.rpc('desinscrire_des_rappels', { p_jeton: jeton });

  // L'erreur et le `false` ne disent pas la même chose, et les confondre ferait perdre le geste
  // de quelqu'un dont le réseau a coupé (cf. `etatApres`).
  if (error) return { ok: false };
  return { ok: true, coupes: data === true };
}
