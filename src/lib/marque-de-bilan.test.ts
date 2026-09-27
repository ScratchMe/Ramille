// La marque locale « cet appareil a vu un bilan complété » (C4.5).
//
// Le test **double** AsyncStorage, parce que c'est l'entrée-sortie elle-même qu'il éprouve — même
// motif que `bilan-draft.test.ts` et `saison-prefs.test.ts` (cf. §Tests de CLAUDE.md).
//
// Ce qu'il garde n'est pas la lecture-écriture pour elle-même, qui est triviale : c'est le **préfixe
// de la clé**, dont dépend l'effacement de la marque à la suppression de compte et à la déconnexion
// de l'appareil. Une marque qui survivrait à l'un des deux promettrait un plan à quelqu'un qui vient
// de tout effacer.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { aDejaVuUnBilan, effacerLaMarqueDeBilan, marquerQuIlYAUnBilan } from '@/lib/marque-de-bilan';

const mockStock = new Map<string, string>();
let mockLectureLeve = false;
let mockEcritureLeve = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (cle: string) => {
      if (mockLectureLeve) throw new Error('stockage indisponible');
      return mockStock.get(cle) ?? null;
    },
    setItem: async (cle: string, valeur: string) => {
      if (mockEcritureLeve) throw new Error('stockage indisponible');
      mockStock.set(cle, valeur);
    },
    removeItem: async (cle: string) => {
      if (mockEcritureLeve) throw new Error('stockage indisponible');
      mockStock.delete(cle);
    },
    getAllKeys: async () => [...mockStock.keys()],
    multiRemove: async (cles: string[]) => {
      cles.forEach((cle) => mockStock.delete(cle));
    },
  },
}));

beforeEach(() => {
  mockStock.clear();
  mockLectureLeve = false;
  mockEcritureLeve = false;
});

describe('marque de bilan', () => {
  it('absente au départ, présente après avoir été posée', async () => {
    await expect(aDejaVuUnBilan()).resolves.toBe(false);
    await marquerQuIlYAUnBilan();
    await expect(aDejaVuUnBilan()).resolves.toBe(true);
  });

  it('reste posée d’un lancement à l’autre', async () => {
    await marquerQuIlYAUnBilan();
    // Deux lectures successives : la marque n'est pas consommée.
    await expect(aDejaVuUnBilan()).resolves.toBe(true);
    await expect(aDejaVuUnBilan()).resolves.toBe(true);
  });

  /**
   * **Le garde de ce fichier.** `src/lib/compte.ts` efface les marques locales en balayant les clés
   * qui commencent par `traceverte.`, depuis ses deux sorties : la suppression de compte **et** la
   * déconnexion de l'appareil. Le balayage est reproduit ici à l'identique — `getAllKeys`, filtre par
   * préfixe, `multiRemove` — parce que le sien n'est pas exporté et que l'importer tirerait
   * `react-native`, ce que ce dépôt évite dans une suite de logique.
   *
   * Ce que cette assertion prouve : la clé de cette marque **tombe** sous un balayage par ce
   * préfixe. Ce qu'elle ne prouve pas : que `compte.ts` fait bien ce balayage — ça, c'est son propre
   * code, et il est commenté là-bas. Si quelqu'un renomme cette clé sans son préfixe historique, ce
   * test tombe, et c'est exactement le défaut qu'on veut voir tomber.
   */
  it('le balayage par préfixe de la suppression de compte l’emporte', async () => {
    await marquerQuIlYAUnBilan();
    await expect(aDejaVuUnBilan()).resolves.toBe(true);

    const cles = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(cles.filter((cle) => cle.startsWith('traceverte.')));

    await expect(aDejaVuUnBilan()).resolves.toBe(false);
  });

  /**
   * Un stockage indisponible rend `false`, et c'est le bon défaut : on retombe sur le comportement
   * d'un appareil neuf — l'onboarding, qui marche hors ligne — jamais sur une promesse qu'on ne peut
   * pas tenir. Rendre `true` enverrait vers un plan qu'on ne saurait pas relire.
   */
  it('un stockage illisible ne promet rien', async () => {
    await marquerQuIlYAUnBilan();
    mockLectureLeve = true;
    await expect(aDejaVuUnBilan()).resolves.toBe(false);
  });

  /**
   * Et une écriture qui échoue ne fait pas échouer le démarrage : elle est best-effort, comme celle
   * du brouillon. Au pire, la prochaine ouverture hors ligne retombe sur l'onboarding.
   */
  it('une écriture en échec ne lève pas', async () => {
    mockEcritureLeve = true;
    await expect(marquerQuIlYAUnBilan()).resolves.toBeUndefined();
  });

  /**
   * **Le retrait du dernier bilan valide l'efface, et elle seule** (C4.7, D3 de `v1-22`). Sans ça,
   * une réouverture hors ligne enverrait au plan quelqu'un qui n'a plus de bilan. Le reste du stockage
   * n'est pas touché : le compte n'est pas quitté, et un brouillon commencé reste le sien.
   */
  it('s’efface seule, sans emporter le reste du stockage', async () => {
    await marquerQuIlYAUnBilan();
    mockStock.set('traceverte.bilan_draft.v1', '{}');

    await effacerLaMarqueDeBilan();

    await expect(aDejaVuUnBilan()).resolves.toBe(false);
    expect(mockStock.get('traceverte.bilan_draft.v1')).toBe('{}');
  });

  // Le retrait a déjà eu lieu côté serveur : un stockage indisponible ne doit pas le faire passer
  // pour un échec.
  it('un effacement en échec ne lève pas', async () => {
    await marquerQuIlYAUnBilan();
    mockEcritureLeve = true;
    await expect(effacerLaMarqueDeBilan()).resolves.toBeUndefined();
  });
});
