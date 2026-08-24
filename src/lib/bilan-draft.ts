// Persistance locale du brouillon en cours — permet la promesse déjà faite dans
// l'onboarding ("tu peux t'arrêter et reprendre plus tard, tes réponses sont
// conservées") sans dépendre d'une écriture serveur à chaque étape : le schéma
// `assessment_answers` a des colonnes NOT NULL (ex. `leisure_frequency`) qui ne sont
// renseignées qu'à l'étape 5, donc un upsert serveur partiel n'est possible qu'à partir
// de là — cf. docs/architecture/v1-05-bilan-v2.md. Reprise sur le même appareil
// uniquement (pas cross-device) ; l'écran dédié "Reprise de bilan" (Continuer /
// Recommencer) reste un increment séparé, cf. pending list — ici la reprise est
// silencieuse.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BilanAnswers, BilanStepId } from '@/types/bilan';

const DRAFT_KEY = 'traceverte.bilan_draft.v1';

export type BilanDraft = { step: BilanStepId; answers: BilanAnswers };

export async function loadBilanDraft(): Promise<BilanDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BilanDraft;
  } catch {
    return null;
  }
}

export async function saveBilanDraft(draft: BilanDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
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
