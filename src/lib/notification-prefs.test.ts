// Les deux marques locales des rappels : « la feuille a déjà été proposée » et « le jeton de **cet**
// appareil ».
//
// **Ce module importe `@/lib/supabase`, et il est quand même testé ici** — ce qui demande de dire
// où passe vraiment la ligne. Elle ne passe pas par le nom d'un import : depuis que le client est un
// mandataire, l'importer ne lève plus au chargement, donc il ne fait plus tomber une suite entière.
// Elle passe par ce qu'un test doit **dresser** avant de pouvoir affirmer : une suite de logique
// pure (`src/types/*`) n'installe aucun double, une suite d'entrée-sortie (`src/lib/*`) double
// exactement ce qu'elle éprouve. Ici on double AsyncStorage et on n'éprouve que les fonctions qui ne
// touchent qu'à lui — les trois autres passent par le réseau et appartiennent à un test
// d'intégration que ce dépôt n'a pas encore.
//
// La conséquence à connaître si cette suite tombe un jour avec une erreur de configuration : ce
// n'est pas ce fichier qui aura changé, c'est une de ces fonctions qui aura commencé à toucher le
// client au chargement du module.
import {
  aDejaVuLaFeuilleDeRappel,
  lireLeJetonDeCetAppareil,
  marquerFeuilleDeRappelVue,
  memoriserLeJetonDeCetAppareil,
} from '@/lib/notification-prefs';

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

describe('feuille de proposition des rappels', () => {
  it('ne s’ouvre qu’une fois par appareil', async () => {
    expect(await aDejaVuLaFeuilleDeRappel()).toBe(false);
    await marquerFeuilleDeRappelVue();
    expect(await aDejaVuLaFeuilleDeRappel()).toBe(true);
  });
});

describe('jeton de cet appareil', () => {
  // **La marque locale est la seule chose qui rende vraies deux phrases du produit** : « sur ce
  // téléphone » dans le réglage, et « on ne désactive que le sien » à l'enregistrement. `push_tokens`
  // est owner-scoped, donc une lecture en base rend les jetons de **tous** les appareils de la
  // personne sans dire lequel est celui-ci — et l'écran affirmait « sur ce téléphone » à qui n'avait
  // rien autorisé ici (A9-19).
  it('se relit tel qu’il a été écrit', async () => {
    expect(await lireLeJetonDeCetAppareil()).toBeNull();
    await memoriserLeJetonDeCetAppareil('ExponentPushToken[abc]');
    expect(await lireLeJetonDeCetAppareil()).toBe('ExponentPushToken[abc]');
  });

  it('`null` efface la marque au lieu d’écrire la chaîne « null »', async () => {
    // Le piège que cette assertion garde : `setItem(cle, String(null))` rendrait « null » à la
    // relecture, c'est-à-dire un jeton qui a l'air d'en être un. L'appareil se croirait inscrit.
    await memoriserLeJetonDeCetAppareil('ExponentPushToken[abc]');
    await memoriserLeJetonDeCetAppareil(null);
    expect(await lireLeJetonDeCetAppareil()).toBeNull();
    expect(mockStock.size).toBe(0);
  });

  it('sans marque, la réponse est « non » et jamais « peut-être »', async () => {
    // Un appareil qui n'a rien enregistré, ou qui l'a fait avant que cette marque n'existe : le
    // prochain lancement la posera. Rendre « oui » par défaut ferait promettre une notification que
    // le serveur ne voit pas.
    const stockage = jest.requireMock('@react-native-async-storage/async-storage').default;
    const lecture = jest.spyOn(stockage, 'getItem').mockRejectedValue(new Error('quota'));
    expect(await lireLeJetonDeCetAppareil()).toBeNull();
    expect(await aDejaVuLaFeuilleDeRappel()).toBe(false);
    lecture.mockRestore();
  });
});
