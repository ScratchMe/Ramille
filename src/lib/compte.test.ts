/**
 * Les deux sorties du compte ferment **cette** session, et seulement elle (29/09/2026).
 *
 * `signOut()` sans argument est en portée globale dans `auth-js` : le serveur ferme alors toutes les
 * sessions du compte. Pour « Me déconnecter de cet appareil », c'était déconnecter aussi le
 * téléphone qu'on n'avait pas touché ; pour la suppression, c'était demander au serveur de fermer
 * les sessions d'un utilisateur qu'il venait d'effacer — un 403 relevé à la recette du 29/09
 * (`v1-13` §16), sans effet visible puisque `auth-js` vide tout de même le stockage.
 *
 * Le test **double** Supabase et AsyncStorage : ce qu'il garde est l'appel, pas le serveur, et c'est
 * `auth-js` qui décide de ce qu'une portée veut dire. Il garde aussi l'ordre de chaque sortie, que
 * `compte.ts` justifie : la suppression efface les marques même si le `signOut` échoue, la
 * déconnexion ne les efface que s'il a abouti.
 *
 * Éprouvé en cassant ce qu'il garde, le 29/09/2026 : `signOut()` remis sans argument dans
 * `seDeconnecterDeCetAppareil` fait tomber le premier test, et lui seul ; dans `deleteMyAccount`,
 * le troisième, et lui seul.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockRpc = jest.fn();
const mockSignOut = jest.fn();
const mockStock = new Map<string, string>();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
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
  });

  it('garde les marques locales quand la déconnexion échoue', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('réseau') });

    const resultat = await seDeconnecterDeCetAppareil();

    expect(resultat.ok).toBe(false);
    expect(await marques()).toEqual(['autre.cle', 'traceverte.a_un_bilan.v1']);
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
