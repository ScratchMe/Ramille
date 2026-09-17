// Les marques locales du premier parcours (C5.6).
//
// Ce que ce test garde n'est pas la clé pour elle-même : c'est que la marque du premier plan soit
// **booléenne**, là où sa voisine `saison-prefs` porte l'identifiant d'un cycle. Les deux formes se
// ressemblent assez pour qu'on recopie la mauvaise, et le prix n'est pas le même dans les deux
// sens — une marque par cycle ferait revoir l'explication à chaque saison, à quelqu'un qui n'a plus
// rien à apprendre.
import { aVuLePremierPlan, marquerLePremierPlanVu } from '@/lib/premier-parcours';

const mockStock = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (cle: string) => mockStock.get(cle) ?? null,
    setItem: async (cle: string, valeur: string) => {
      mockStock.set(cle, valeur);
    },
    removeItem: async (cle: string) => {
      mockStock.delete(cle);
    },
  },
}));

beforeEach(() => mockStock.clear());

describe('la carte du premier plan', () => {
  it('n’a rien vu tant que rien n’a été fermé', async () => {
    expect(await aVuLePremierPlan()).toBe(false);
  });

  it('reste fermée une fois refermée', async () => {
    await marquerLePremierPlanVu();
    expect(await aVuLePremierPlan()).toBe(true);
  });

  // Le préfixe est ce par quoi `src/lib/compte.ts` balaie les marques locales depuis ses deux
  // sorties, suppression de compte et déconnexion de l'appareil. Une clé qui ne le porterait pas
  // survivrait à une suppression de compte, en silence.
  it('porte le préfixe historique par lequel la suppression de compte balaie', async () => {
    await marquerLePremierPlanVu();
    expect([...mockStock.keys()]).toEqual(['traceverte.premier_plan_vu.v1']);
  });

  it('un stockage qui refuse fait revoir la carte, jamais l’inverse', async () => {
    // Le bon côté sur lequel échouer : la carte réapparaît, et le premier engagement la referme
    // pour de bon par le signal lui-même. L'autre côté serait de ne jamais la montrer.
    const stockage = jest.requireMock('@react-native-async-storage/async-storage').default;
    const lecture = jest.spyOn(stockage, 'getItem').mockRejectedValue(new Error('quota'));
    expect(await aVuLePremierPlan()).toBe(false);
    lecture.mockRestore();

    const ecriture = jest.spyOn(stockage, 'setItem').mockRejectedValue(new Error('quota'));
    await expect(marquerLePremierPlanVu()).resolves.toBeUndefined();
    ecriture.mockRestore();
  });
});
