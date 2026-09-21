// Les marques locales de la connexion et du plan — ce que l'appareil retient d'une **nouvelle
// déjà annoncée**, pour ne pas la réannoncer.
//
// **Pourquoi ce fichier est dans `src/lib` et pas dans `src/types`.** La ligne de partage du dépôt
// est celle de ce qu'un test doit dresser avant de pouvoir affirmer quoi que ce soit : `src/types/*`
// n'importe rien de la plateforme et se teste sans un seul double ; `src/lib/*` fait de
// l'entrée-sortie, et c'est **elle** qu'on éprouve ici, donc le double d'AsyncStorage n'est pas un
// contournement de la règle, c'est le sujet. Même arbitrage que `bilan-draft.test.ts`.
//
// Ce que ces **trois** marques ont en commun, et ce qui se casse quand elles se cassent : chacune
// transforme une **nouvelle** en **état**. Sans elles, le rattachement confirmé ne se dit jamais,
// l'adresse tapée est à retaper au moment précis où l'on revient saisir son code, et l'encart de
// l'engagement emporté par un re-bilan devient un reproche permanent en tête du plan.
//
// **Il y en avait une quatrième, « proposition de connexion vue »**, retirée le 20/09/2026 avec
// l'interstitiel : plus rien ne compte les passages, donc plus rien à retenir. Son bloc de test est
// parti avec elle — et il a emporté au passage celui de la dégradation du stockage, qui couvrait les
// trois autres : relevé en revue le 21/09/2026, deux `describe` étaient restés **vides**, ce que
// Jest ne signale pas (il compte zéro test et passe).
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  aVuEngagementOrphelin,
  aVuRattachementAnnonce,
  lireAdresseDuLien,
  marquerEngagementOrphelinVu,
  marquerRattachementAnnonce,
  memoriserAdresseDuLien,
} from '@/lib/connexion-prefs';

// Le double tient son stockage dans la fabrique : `jest.mock` est remonté au-dessus des imports,
// donc une variable du fichier n'y serait pas encore initialisée. `stock` est exposé pour que les
// assertions puissent lire la **clé**, qui est la moitié qui compte — la renommer effacerait les
// marques de tout le monde, en silence.
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

describe('annonce du rattachement', () => {
  it('se dit une fois, puis se tait', async () => {
    expect(await aVuRattachementAnnonce()).toBe(false);
    await marquerRattachementAnnonce();
    expect(await aVuRattachementAnnonce()).toBe(true);
  });
});

describe('adresse du dernier lien', () => {
  it('rend null plutôt qu’une chaîne vide quand rien n’a été tapé', async () => {
    // La distinction n'est pas décorative : l'écran prérenseigne son champ avec cette valeur, et
    // une chaîne vide y passerait pour une adresse mémorisée.
    expect(await lireAdresseDuLien()).toBeNull();
  });

  it('mémorise l’adresse en retirant les blancs autour', async () => {
    await memoriserAdresseDuLien('  quelquun@example.fr  ');
    expect(await lireAdresseDuLien()).toBe('quelquun@example.fr');
  });
});

describe('engagement emporté par un re-bilan', () => {
  it('porte l’identifiant de l’archive, jamais un simple « vu »', async () => {
    // C'est toute la différence : un second re-bilan qui relâche un second engagement doit pouvoir
    // le dire à son tour. Une marque booléenne rendrait le premier muet pour toujours.
    await marquerEngagementOrphelinVu('archive-1');
    expect(await aVuEngagementOrphelin('archive-1')).toBe(true);
    expect(await aVuEngagementOrphelin('archive-2')).toBe(false);

    await marquerEngagementOrphelinVu('archive-2');
    expect(await aVuEngagementOrphelin('archive-2')).toBe(true);
  });
});

describe('quand le stockage refuse', () => {
  // Un stockage plein, un navigateur privé, un quota atteint : la lecture doit rendre « pas encore
  // vu » et l'écriture ne doit rien casser. Au pire la nouvelle se redit une fois — ce qui est le
  // bon côté sur lequel échouer, l'autre étant de ne jamais l'annoncer.
  //
  // **Ce bloc était vide**, vidé par le retrait de la quatrième marque : les `it` qui restaient
  // citaient tous la marque disparue, et les retirer a emporté la seule couverture de la
  // dégradation pour les trois autres. Rien n'épinglait plus leurs `try/catch`, donc les retirer
  // passait la CI — et `lireAdresseDuLien` qui lèverait au lieu de rendre `null` casse en silence
  // la reprise de la saisie du code depuis « Toi ».
  beforeEach(() => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('stockage indisponible'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('stockage plein'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('une lecture qui refuse se lit « pas encore vu », jamais une exception', async () => {
    await expect(aVuRattachementAnnonce()).resolves.toBe(false);
    await expect(aVuEngagementOrphelin('archive-1')).resolves.toBe(false);
  });

  it('l’adresse tapée rend null plutôt que de lever — c’est ce qui garde la reprise du code', async () => {
    await expect(lireAdresseDuLien()).resolves.toBeNull();
  });

  it('une écriture qui refuse ne casse rien : au pire la nouvelle se redit', async () => {
    await expect(marquerRattachementAnnonce()).resolves.toBeUndefined();
    await expect(memoriserAdresseDuLien('camille@exemple.fr')).resolves.toBeUndefined();
    await expect(marquerEngagementOrphelinVu('archive-1')).resolves.toBeUndefined();
  });
});
