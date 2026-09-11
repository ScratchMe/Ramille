// Aller-retour réel du brouillon : la clé de stockage, l'horodatage que `saveBilanDraft` pose
// lui-même, et une valeur illisible qui doit rendre `null` sans lever. La forme du brouillon et
// sa validation sont testées à part (`src/types/bilan.test.ts`, module pur) — ce qui reste ici
// est l'entrée-sortie, donc il faut un AsyncStorage.
//
// Rien de `@/lib/supabase` n'est importé, même indirectement : son constructeur lèverait sans
// variables d'environnement et ferait échouer toute la suite.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearBilanDraft, loadBilanDraft, saveBilanDraft } from '@/lib/bilan-draft';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

// Le double tient son stockage dans la fabrique elle-même : `jest.mock` est remonté au-dessus
// des imports, une variable du fichier n'y serait pas encore initialisée au moment où le module
// est demandé.
jest.mock('@react-native-async-storage/async-storage', () => {
  const valeurs = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (cle: string) => valeurs.get(cle) ?? null,
      setItem: async (cle: string, valeur: string) => {
        valeurs.set(cle, valeur);
      },
      removeItem: async (cle: string) => {
        valeurs.delete(cle);
      },
    },
  };
});

// Écrite ici en clair, et c'est le but : la clé reste `traceverte.bilan_draft.v1` malgré le
// renommage du produit et les champs ajoutés depuis à `BilanAnswers` — la changer effacerait le
// brouillon de quiconque en a un. Si elle bouge dans `bilan-draft.ts`, ce test tombe.
const CLE = 'traceverte.bilan_draft.v1';

beforeEach(async () => {
  await clearBilanDraft();
});

describe('brouillon de bilan', () => {
  it('relit les réponses et l’étape telles qu’elles ont été écrites', async () => {
    const reponses: BilanAnswers = {
      ...EMPTY_BILAN_ANSWERS,
      commute_has_regular_trip: true,
      commute_days_per_week: 4,
      commute_distance_km: 12,
      commute_mode: 'voiture',
      commute_car_engine: 'electrique',
      leisure_frequency: 'weekly',
    };

    await saveBilanDraft({ step: 'leisure_frequency', answers: reponses });

    const relu = await loadBilanDraft();
    expect(relu?.step).toBe('leisure_frequency');
    expect(relu?.answers).toEqual(reponses);
  });

  it('horodate l’écriture lui-même, et reconduit l’horodatage qu’on lui passe', async () => {
    const avant = Date.now();
    await saveBilanDraft({ step: 'commute_has_trip', answers: EMPTY_BILAN_ANSWERS });

    const brut = await AsyncStorage.getItem(CLE);
    expect(brut).not.toBeNull();
    const ecrit = JSON.parse(brut ?? '{}') as { savedAt?: unknown };
    expect(typeof ecrit.savedAt).toBe('string');
    const horodatage = Date.parse(String(ecrit.savedAt));
    expect(Number.isNaN(horodatage)).toBe(false);
    expect(horodatage).toBeGreaterThanOrEqual(avant - 1000);

    // Une écriture qui ne fait que suivre l'étape courante reconduit l'horodatage relu : sans
    // ce second paramètre, ouvrir le questionnaire suffisait à redater le brouillon, et un
    // brouillon de plusieurs semaines n'était proposé au choix qu'une fois.
    const ancien = '2026-08-01T09:00:00.000Z';
    await saveBilanDraft({ step: 'commute_mode', answers: EMPTY_BILAN_ANSWERS }, ancien);
    expect((await loadBilanDraft())?.savedAt).toBe(ancien);
  });

  it('rend null sur une valeur illisible, une étape inconnue ou une absence de brouillon', async () => {
    await AsyncStorage.setItem(CLE, 'ceci n’est pas du JSON');
    await expect(loadBilanDraft()).resolves.toBeNull();

    await AsyncStorage.setItem(
      CLE,
      JSON.stringify({ step: 'etape_qui_n_existe_plus', answers: {}, savedAt: null })
    );
    await expect(loadBilanDraft()).resolves.toBeNull();

    await clearBilanDraft();
    await expect(loadBilanDraft()).resolves.toBeNull();
  });
});
