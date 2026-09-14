// Les marques locales de la connexion et du plan — ce que l'appareil retient d'une **nouvelle
// déjà annoncée**, pour ne pas la réannoncer.
//
// **Pourquoi ce fichier est dans `src/lib` et pas dans `src/types`.** La ligne de partage du dépôt
// est celle de ce qu'un test doit dresser avant de pouvoir affirmer quoi que ce soit : `src/types/*`
// n'importe rien de la plateforme et se teste sans un seul double ; `src/lib/*` fait de
// l'entrée-sortie, et c'est **elle** qu'on éprouve ici, donc le double d'AsyncStorage n'est pas un
// contournement de la règle, c'est le sujet. Même arbitrage que `bilan-draft.test.ts`.
//
// Ce que ces quatre marques ont en commun, et ce qui se casse quand elles se cassent : chacune
// transforme une **nouvelle** en **état**. Sans elles, la proposition de connexion réinterrompt à
// chaque retour sur la restitution, le rattachement confirmé ne se dit jamais, l'adresse du lien
// est à retaper au moment précis où le lien vient d'expirer, et l'encart de l'engagement emporté par
// un re-bilan devient un reproche permanent en tête du plan.
import {
  aVuEngagementOrphelin,
  aVuRattachementAnnonce,
  hasSeenConnexionProposal,
  lireAdresseDuLien,
  markConnexionProposalSeen,
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

describe('proposition de connexion', () => {
  it('ne se souvient de rien tant que rien n’a été vu', async () => {
    expect(await hasSeenConnexionProposal()).toBe(false);
  });

  it('retient qu’elle a été vue, sous la clé historique', async () => {
    await markConnexionProposalSeen();
    expect(await hasSeenConnexionProposal()).toBe(true);
    // Le préfixe `traceverte.` est conservé au renommage du produit, et c'est par lui que
    // `src/lib/compte.ts` balaie les marques à la suppression de compte : une clé qui sortirait
    // du préfixe survivrait à la suppression.
    expect([...mockStock.keys()]).toEqual(['traceverte.connexion_proposal_seen.v1']);
  });
});

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
  it('rend l’état par défaut et n’interrompt rien', async () => {
    const stockage = jest.requireMock('@react-native-async-storage/async-storage').default;
    const lecture = jest.spyOn(stockage, 'getItem').mockRejectedValue(new Error('quota'));
    const ecriture = jest.spyOn(stockage, 'setItem').mockRejectedValue(new Error('quota'));

    expect(await hasSeenConnexionProposal()).toBe(false);
    expect(await lireAdresseDuLien()).toBeNull();
    expect(await aVuEngagementOrphelin('archive-1')).toBe(false);
    await expect(markConnexionProposalSeen()).resolves.toBeUndefined();
    await expect(memoriserAdresseDuLien('a@b.fr')).resolves.toBeUndefined();

    lecture.mockRestore();
    ecriture.mockRestore();
  });
});
