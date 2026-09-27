// Retirer un bilan (C4.7, `docs/architecture/v1-22-retirer-un-bilan.md`) — les deux appels au
// serveur. Ce qu'on en dit et ce qu'on en décide vit dans `src/types/retrait-du-bilan.ts`, pur et
// testé ; ici, seulement l'entrée-sortie.
//
// **Pourquoi un RPC et pas un `update`**, alors que le client a le droit d'écrire `status` (la
// soumission en a besoin, privilège de colonne de `20260920160000`) : retirer le bilan qui porte le
// plan doit reconstruire le plan **dans la même transaction**, sans quoi le cycle resterait bâti sur
// un bilan que plus rien ne lit. La base refuse d'ailleurs l'écriture directe (`RM007`, trigger
// `refuser_le_retour_en_arriere_du_bilan`) : un appel écrit par inadvertance ne passerait pas.
import type { Lecture } from '@/lib/bilan-history';
import { supabase } from '@/lib/supabase';
import { STATUT_DE_BILAN } from '@/types/bilan';
import { issueDuRetrait, type IssueDuRetrait } from '@/types/retrait-du-bilan';

/**
 * Les identifiants des bilans valides, **du plus récent au plus ancien** — l'ordre que lit
 * `placeDuBilan`, et celui dans lequel `generate_plan_cycle_for_user` choisit le bilan qui porte le
 * plan (`submitted_at` décroissant). Un bilan complété porte toujours sa date (trigger
 * `stamp_assessment_submitted_at`), donc la place des nuls — en tête pour PostgREST, en queue pour la
 * fonction SQL — ne départage jamais rien ici.
 *
 * `{ ok: false }` sur un échec, jamais une liste vide : une liste vide dirait « aucun bilan valide »,
 * donc une place fausse, donc une confirmation fausse (`FRONT.md` §1.2).
 */
export async function lireLesBilansValides(): Promise<Lecture<string[]>> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id')
    .eq('status', STATUT_DE_BILAN.complete)
    .order('submitted_at', { ascending: false });

  if (error || !data) return { ok: false };
  return { ok: true, data: data.map((bilan) => bilan.id) };
}

/**
 * Retire le bilan. Le serveur vérifie la propriété, refuse un bilan en cours ou déjà retiré
 * (`RM006`), reconstruit le plan s'il le faut, et rend le nombre de bilans valides qui restent.
 */
export async function retirerLeBilan(assessmentId: string): Promise<IssueDuRetrait> {
  const { data, error } = await supabase.rpc('retirer_le_bilan', { p_assessment_id: assessmentId });
  if (error) console.error('Le bilan n’a pas pu être retiré :', error);
  return issueDuRetrait({ erreur: error, donnees: data });
}
