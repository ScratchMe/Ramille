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
import type { BilanValide } from '@/types/suivi';

/**
 * Les bilans valides, **du plus récent au plus ancien** — l'ordre que lit `placeDuBilan`, et celui
 * dans lequel `generate_plan_cycle_for_user` choisit le bilan qui porte le plan (`submitted_at`
 * décroissant). Un bilan complété porte toujours sa date (trigger `stamp_assessment_submitted_at`),
 * donc la place des nuls — en tête pour PostgREST, en queue pour la fonction SQL — ne départage
 * jamais rien ici.
 *
 * `{ ok: false }` sur un échec, jamais une liste vide : une liste vide dirait « aucun bilan valide »,
 * donc une place fausse, donc une confirmation fausse (`FRONT.md` §1.2).
 *
 * **Une lecture pour deux décisions depuis le 01/10/2026** (audit R-4). La restitution lisait ici les
 * seuls identifiants, pour la place du bilan, puis relisait la même liste — mêmes bilans, même ordre —
 * avec la date et le total pour trouver le bilan précédent, après coup : la barre « Ton bilan
 * précédent » s'insérait au-dessus de « Toi » une fois l'écran rendu. La date et le total viennent
 * donc avec l'identifiant, et `precedentDeLaRestitution` (`src/types/suivi.ts`) choisit le précédent
 * dans cette liste.
 *
 * **Pas de `limit`, et c'est la place qui l'exige** : un bilan ancien, relu depuis le suivi, doit
 * figurer dans la liste, sans quoi `placeDuBilan` rend `null` et le lien du retrait ne se rend pas.
 * La borne de dix que portait la lecture du précédent vit désormais dans la recherche elle-même
 * (`BILANS_PARCOURUS_POUR_LE_PRECEDENT`).
 */
export async function lireLesBilansValides(): Promise<Lecture<BilanValide[]>> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, submitted_at, assessment_results(total_co2_kg_year)')
    .eq('status', STATUT_DE_BILAN.complete)
    .order('submitted_at', { ascending: false });

  if (error || !data) return { ok: false };
  return {
    ok: true,
    data: data.map((bilan) => {
      // `assessment_results` est en 1:1 avec `assessments`, et PostgREST rend tantôt un objet, tantôt
      // un tableau d'un élément selon la relation — la lecture du suivi tolère les deux, celle-ci aussi.
      const resultat = Array.isArray(bilan.assessment_results)
        ? bilan.assessment_results[0]
        : bilan.assessment_results;
      return {
        id: bilan.id,
        submittedAt: bilan.submitted_at,
        totalKg: resultat?.total_co2_kg_year ?? null,
      };
    }),
  };
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
