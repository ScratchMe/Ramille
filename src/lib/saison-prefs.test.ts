// La marque « l'ouverture de cette saison a été vue » (C2.8).
//
// **Une seule clé, qui porte l'identifiant du cycle**, et c'est l'écart au canvas qu'il faut
// éprouver : `v1-14` §4.5 décrivait une clé par saison (`…-vue:<plan_cycle_id>`), donc quatre
// entrées par an, conservées à jamais et jamais relues, sur un stockage dont rien ne fait le
// ménage. Un seul cycle peut être en ouverture à un instant donné, donc « la carte du cycle X a été
// vue » se dit exactement par « la dernière ouverture vue est X ».
//
// Ce que ce test garde, ce n'est pas la clé pour elle-même : c'est que la marque **change de
// saison**. Une marque booléenne ferait voir la carte d'ouverture une fois dans la vie du compte, et
// l'effet « nouveau départ » — la raison d'être de C2.8 — serait perdu trois fois par an.
import { aVuLouvertureDeSaison, marquerLouvertureDeSaisonVue } from '@/lib/saison-prefs';

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

describe('ouverture de saison', () => {
  it('n’a rien vu tant que rien n’a été fermé', async () => {
    expect(await aVuLouvertureDeSaison('cycle-1')).toBe(false);
  });

  it('la carte de la saison suivante se rouvre', async () => {
    await marquerLouvertureDeSaisonVue('cycle-1');
    expect(await aVuLouvertureDeSaison('cycle-1')).toBe(true);
    expect(await aVuLouvertureDeSaison('cycle-2')).toBe(false);
  });

  it('n’accumule pas une entrée par saison', async () => {
    await marquerLouvertureDeSaisonVue('cycle-1');
    await marquerLouvertureDeSaisonVue('cycle-2');
    await marquerLouvertureDeSaisonVue('cycle-3');
    expect([...mockStock.keys()]).toEqual(['traceverte.saison_ouverture_vue.v1']);
    // Et l'ancienne saison n'est plus marquée vue : c'est le prix assumé de la clé unique, sans
    // conséquence puisqu'une seule ouverture est en cours à la fois.
    expect(await aVuLouvertureDeSaison('cycle-1')).toBe(false);
  });

  it('un stockage qui refuse fait revoir la carte, jamais l’inverse', async () => {
    // Le bon côté sur lequel échouer : la carte réapparaît, et sa fenêtre de deux semaines la
    // referme d'elle-même. L'autre côté serait de ne jamais la montrer.
    const stockage = jest.requireMock('@react-native-async-storage/async-storage').default;
    const lecture = jest.spyOn(stockage, 'getItem').mockRejectedValue(new Error('quota'));
    expect(await aVuLouvertureDeSaison('cycle-1')).toBe(false);
    lecture.mockRestore();
  });
});
