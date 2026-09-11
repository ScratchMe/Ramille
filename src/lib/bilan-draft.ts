// Persistance locale du brouillon en cours — permet la promesse déjà faite dans
// l'onboarding ("tu peux t'arrêter et reprendre plus tard, tes réponses sont
// conservées") sans dépendre d'une écriture serveur à chaque étape : le schéma
// `assessment_answers` a des colonnes NOT NULL (ex. `leisure_frequency`) qui ne sont
// renseignées qu'à l'étape 5, donc un upsert serveur partiel n'est possible qu'à partir
// de là — cf. docs/architecture/v1-05-bilan-v2.md. Reprise sur le même appareil
// uniquement (pas cross-device).
//
// Ce module ne fait que l'entrée-sortie : la forme du brouillon, sa validation à la
// relecture et son âge vivent dans `src/types/bilan.ts` (module pur, testé).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { lireBrouillonBilan, type BilanDraft } from '@/types/bilan';

// Préfixe historique conservé au renommage en Ramille : la clé est invisible, et la changer
// effacerait le brouillon de quiconque en a un (cf. src/constants/produit.ts). Elle reste en
// `v1` malgré les champs ajoutés depuis à `BilanAnswers` : un brouillon d'une version
// antérieure se normalise à la relecture, il ne se jette pas.
const DRAFT_KEY = 'traceverte.bilan_draft.v1';

export async function loadBilanDraft(): Promise<BilanDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return lireBrouillonBilan(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Écrit le brouillon et l'horodate lui-même — l'appelant ne peut pas l'oublier, et deux
 * appelants ne peuvent pas horodater différemment. C'est cet horodatage qui permet de
 * proposer un choix sur un brouillon vieux de plusieurs semaines au lieu de le rouvrir comme
 * s'il datait de la minute précédente.
 *
 * `savedAt` ne se passe que pour **reconduire** celui d'un brouillon relu : une écriture qui
 * ne fait que suivre l'étape courante ne rajeunit pas le brouillon. Sans ce paramètre, ouvrir
 * le questionnaire suffisait à effacer l'âge de ce qu'on vient d'y lire — l'écran de reprise
 * s'affichait une fois, puis plus jamais, et le brouillon périmé se rouvrait en silence.
 */
export async function saveBilanDraft(
  brouillon: Omit<BilanDraft, 'savedAt'>,
  savedAt?: string | null
): Promise<void> {
  try {
    const aEcrire: BilanDraft = { ...brouillon, savedAt: savedAt ?? new Date().toISOString() };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(aEcrire));
  } catch {
    // Best-effort : une écriture locale ratée ne doit jamais bloquer le questionnaire.
  }
}

export async function clearBilanDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // idem
  }
}
