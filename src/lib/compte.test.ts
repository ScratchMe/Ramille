/**
 * Les deux sorties du compte ferment **cette** session, et seulement elle (29/09/2026).
 *
 * `signOut()` sans argument est en portée globale dans `auth-js` : le serveur ferme alors toutes les
 * sessions du compte. Pour « Me déconnecter de cet appareil », c'était déconnecter aussi le
 * téléphone qu'on n'avait pas touché. Pour la suppression, la portée ne change rien au serveur :
 * `auth-js` appelle `/logout` dans les deux cas, avec le jeton d'un utilisateur effacé, et le 403
 * relevé à la recette du 29/09 (`v1-13` §16) reste — sans effet visible, `auth-js` l'avale et vide
 * le stockage. La locale y est gardée pour que les deux sorties disent la même chose.
 *
 * Le test **double** Supabase et AsyncStorage : ce qu'il garde est l'appel, pas le serveur, et c'est
 * `auth-js` qui décide de ce qu'une portée veut dire. Il garde aussi l'ordre de chaque sortie, que
 * `compte.ts` justifie : la suppression efface les marques même si le `signOut` échoue, la
 * déconnexion ne les efface que si la session est partie — ce qu'`auth-js` fait même en erreur,
 * quand le serveur ne répond pas (contre-lecture du 30/09/2026).
 *
 * Éprouvé en cassant ce qu'il garde, le 29/09/2026 : `signOut()` remis sans argument dans
 * `seDeconnecterDeCetAppareil` fait tomber le premier test, et lui seul ; dans `deleteMyAccount`,
 * le quatrième, et lui seul. Le 30/09/2026, les quatre rejouées : la relecture de `getSession()`
 * retirée après une erreur fait tomber le troisième, et lui seul ; une erreur toujours prise pour une
 * sortie, le deuxième, et lui seul.
 *
 * **Et le 02/10/2026, les deux départs déclarés** (`v1-27` §12.27) : une session retirée sans départ
 * déclaré se lit comme un refus, et ouvre l'écran de reconnexion. Le double de
 * `pendantUnDepartVolontaire` lève un indicateur pendant l'action, et chaque appel au serveur note s'il
 * l'a trouvé levé. Éprouvé : l'enveloppe retirée de `seDeconnecterDeCetAppareil` → « ne ferme que la
 * session… », seul ; de `deleteMyAccount` → « ferme la session de cet appareil… », seul (la contre-lecture
 * de la PR #315 relevait que rien ne gardait ces deux appels).
 *
 * **Et le 04/10/2026, le jeton de notification avant la session** : l'appel retiré de
 * `seDeconnecterDeCetAppareil` fait tomber « désactive le jeton… », seul ; placé après le `signOut`, le
 * même, seul.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockRpc = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
// Un départ est-il déclaré au moment de l'appel ? Chaque appel au serveur le note.
let mockDepartDeclare = false;
const mockDeclare: { appel: string; declare: boolean }[] = [];
const mockStock = new Map<string, string>();

jest.mock('@/lib/supabase', () => ({
  // Le départ volontaire se déclare autour de l'appel : l'indicateur est levé pendant l'action.
  pendantUnDepartVolontaire: async <T,>(action: () => Promise<T>) => {
    mockDepartDeclare = true;
    try {
      return await action();
    } finally {
      mockDepartDeclare = false;
    }
  },
  supabase: {
    rpc: (...args: unknown[]) => {
      mockDeclare.push({ appel: 'rpc', declare: mockDepartDeclare });
      return mockRpc(...args);
    },
    auth: {
      signOut: (...args: unknown[]) => {
        mockDeclare.push({ appel: 'signOut', declare: mockDepartDeclare });
        return mockSignOut(...args);
      },
      getSession: () => mockGetSession(),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (cle: string) => mockStock.get(cle) ?? null,
    removeItem: async (cle: string) => {
      mockStock.delete(cle);
    },
    getAllKeys: async () => [...mockStock.keys()],
    multiRemove: async (cles: string[]) => {
      cles.forEach((cle) => mockStock.delete(cle));
    },
  },
}));

// Chargé après les doubles : `compte.ts` lit `@/lib/supabase` à l'import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteMyAccount, seDeconnecterDeCetAppareil } = require('./compte') as typeof import('./compte');

beforeEach(() => {
  mockRpc.mockReset();
  mockSignOut.mockReset();
  mockDeclare.length = 0;
  mockGetSession.mockReset();
  mockStock.clear();
  mockStock.set('traceverte.a_un_bilan.v1', '1');
  mockStock.set('autre.cle', 'garde');
});

async function marques(): Promise<string[]> {
  return [...(await AsyncStorage.getAllKeys())].sort();
}

describe('seDeconnecterDeCetAppareil', () => {
  it('ne ferme que la session de cet appareil', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat).toEqual({ ok: true });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await marques()).toEqual(['autre.cle']);
    // Un départ déclaré : la session retirée n'est pas un refus.
    expect(mockDeclare).toEqual([{ appel: 'signOut', declare: true }]);
  });

  // Le jeton de notification part **avant** la session (04/10/2026) : après, plus rien ne peut le
  // désactiver, et un compte dont la permission est coupée ne retombait jamais sur l'e-mail.
  it('désactive le jeton de cet appareil avant de fermer la session', async () => {
    mockStock.set('traceverte.jeton_appareil.v1', 'ExponentPushToken[abc]');
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('unregister_push_token', { p_token: 'ExponentPushToken[abc]' });
    expect(mockDeclare.map((d) => d.appel)).toEqual(['rpc', 'signOut']);
    expect(await marques()).toEqual(['autre.cle']);
  });

  it('se déconnecte quand même si le jeton n’a pas pu être désactivé', async () => {
    mockStock.set('traceverte.jeton_appareil.v1', 'ExponentPushToken[abc]');
    mockRpc.mockResolvedValue({ error: { message: 'réseau' } });
    mockSignOut.mockResolvedValue({ error: null });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat).toEqual({ ok: true });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('garde les marques locales quand la déconnexion échoue et que la session est encore là', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('réseau') });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton' } }, error: null });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat.ok).toBe(false);
    expect(await marques()).toEqual(['autre.cle', 'traceverte.a_un_bilan.v1']);
  });

  it('annonce la sortie quand `auth-js` a fermé la session malgré l’erreur du serveur', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('réseau') });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat).toEqual({ ok: true });
    expect(await marques()).toEqual(['autre.cle']);
  });
});

describe('deleteMyAccount', () => {
  it('ferme la session de cet appareil, sans rien demander au serveur sur les autres', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });

    const resultat = await deleteMyAccount();

    expect(resultat).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('delete_my_account');
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await marques()).toEqual(['autre.cle']);
    // Tout le départ est déclaré, l'effacement du compte compris — pas seulement le `signOut`.
    expect(mockDeclare).toEqual([
      { appel: 'rpc', declare: true },
      { appel: 'signOut', declare: true },
    ]);
  });

  it('annonce la suppression même si la déconnexion échoue : le compte, lui, est parti', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockRejectedValue(new Error('réseau'));

    const resultat = await deleteMyAccount();

    expect(resultat).toEqual({ ok: true });
    expect(await marques()).toEqual(['autre.cle']);
  });

  it('ne déconnecte rien et garde les marques quand la suppression échoue', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'refus' } });

    const resultat = await deleteMyAccount();

    expect(resultat.ok).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(await marques()).toEqual(['autre.cle', 'traceverte.a_un_bilan.v1']);
  });
});
