import { supabase } from '@/lib/supabase';
import { type BilanAnswers, STATUT_DE_BILAN } from '@/types/bilan';
import {
  lireLeContexte,
  type ChoixDeContexte,
  type ContexteEnregistrable,
} from '@/types/contexte';

/**
 * Lire et corriger les quatre réponses de contexte B4, hors questionnaire (C6.4, `v1-19` D5).
 *
 * **Pourquoi un RPC alors que la RLS autorise déjà l'écriture.** `assessment_answers` porte une
 * policy `UPDATE` owner-scoped et `authenticated` a le privilège : ce n'est pas une question de
 * permission, et le dire évite qu'un prochain passage retire le RPC en croyant simplifier. Ce sont
 * deux autres choses — l'**atomicité** (écrire les réponses, recalculer le résultat et régénérer le
 * plan doivent réussir ensemble, sinon une coupure laisse des réponses neuves sous un plan périmé)
 * et le **bornage des colonnes** (la RLS filtre des lignes, jamais des colonnes : un `update`
 * client sur cette table atteint les distances et les modes, donc le chiffre).
 */

/** Ce que l'écran a besoin de savoir, en une lecture. */
export type ContexteCourant = {
  choix: ChoixDeContexte;
  /** Les deux colonnes dont dépend la question du télétravail, passées telles quelles. */
  trajet: Pick<BilanAnswers, 'commute_has_regular_trip' | 'commute_days_per_week'>;
  /** Ce qui décide si `household_vehicles` entre dans le calcul (`phraseDuCalculDuContexte`). */
  leisure_frequency: string | null;
};

export type LectureDuContexte =
  | { etat: 'ok'; contexte: ContexteCourant }
  /** Aucun bilan complété : il n'y a pas de contexte à corriger, et ce n'est pas une panne. */
  | { etat: 'sans_bilan' }
  | { etat: 'erreur' };

export async function lireLeContexteCourant(): Promise<LectureDuContexte> {
  const { data: bilan, error: erreurBilan } = await supabase
    .from('assessments')
    .select('id')
    .eq('status', STATUT_DE_BILAN.complete)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erreurBilan) return { etat: 'erreur' };
  if (!bilan) return { etat: 'sans_bilan' };

  const { data: reponses, error: erreurReponses } = await supabase
    .from('assessment_answers')
    .select(
      'zone_type, tc_access, household_vehicles, teletravail, leisure_frequency, commute_has_regular_trip, commute_days_per_week'
    )
    .eq('assessment_id', bilan.id)
    .maybeSingle();

  if (erreurReponses) return { etat: 'erreur' };
  // Un bilan `completed` porte toujours ses réponses depuis C1.1 — la soumission écrit
  // `in_progress` d'abord, précisément pour que cet état n'existe plus. Le repli reste, parce
  // qu'une lecture vide n'est pas une lecture en échec et qu'on ne veut pas lever ici.
  if (!reponses) return { etat: 'sans_bilan' };

  return {
    etat: 'ok',
    contexte: {
      choix: lireLeContexte(reponses),
      trajet: {
        commute_has_regular_trip: reponses.commute_has_regular_trip,
        commute_days_per_week: reponses.commute_days_per_week,
      },
      leisure_frequency: reponses.leisure_frequency,
    },
  };
}

export type EcritureDuContexte = { ok: true } | { ok: false; message: string };

/**
 * Enregistrer les quatre réponses.
 *
 * **Le RPC refuse les trois premières à `null`** (`RM003`) et l'écran désactive le bouton avant
 * d'en arriver là (`contexteEstComplet`) : la garde est doublée parce que les deux moitiés ne
 * protègent pas la même chose — l'écran évite une requête qui ne peut qu'échouer, le serveur rend
 * impossible d'appauvrir un plan en vidant une réponse depuis n'importe quel appel.
 */
export async function enregistrerLeContexte(
  choix: ContexteEnregistrable
): Promise<EcritureDuContexte> {
  const { error } = await supabase.rpc('mettre_a_jour_le_contexte', {
    p_zone_type: choix.zone_type,
    p_tc_access: choix.tc_access,
    p_household_vehicles: choix.household_vehicles,
    p_teletravail: choix.teletravail,
  });

  if (error) {
    return {
      ok: false,
      message: 'Tes réponses ne sont pas enregistrées. Vérifie ta connexion et réessaie.',
    };
  }

  return { ok: true };
}
