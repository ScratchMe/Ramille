/**
 * **Un jeton refusé au démarrage ne donne pas un compte vide** (`v1-27` §12.27, corrigé le 02/10/2026).
 *
 * C2.11 voulait que `ensureSession()` reconnaisse un jeton refusé et n'ouvre pas de session anonyme
 * à sa place. Il le lisait dans l'erreur de `getSession()`, et la version installée d'`auth-js` (2.116)
 * ne la rend plus là : au démarrage, sur un jeton d'accès déjà expiré dont le rafraîchissement est
 * refusé, c'est **l'initialisation du client** qui retire la session (`_callRefreshToken`, puis
 * `_removeSession`), avant toute lecture de l'app. `getSession()` voyait ensuite « pas de session,
 * pas d'erreur » — une première ouverture —, et l'app créait une session anonyme vide à quelqu'un qui
 * a un compte. Mesuré sur l'export par la vague `v1-33`, jamais obtenu autrement.
 *
 * **Le client est le vrai, le stockage et le réseau sont les seuls doubles** : c'est le seul moyen de
 * voir ce que fait l'initialisation d'`auth-js`, que rien d'autre dans ce dépôt n'exerce. Temps réels,
 * pour la raison écrite en tête de `src/lib/supabase.test.ts`.
 *
 * **Éprouvé en le cassant, le 02/10/2026** (`TESTING.md` §1.1), le fichier restauré après chaque
 * mutation :
 *   - l'écoute de la session retirée enlevée (le module d'avant) → « un jeton refusé à l'initialisation… »,
 *     sur la session anonyme créée — le défaut, reproduit —, et « « Commencer un bilan… » » par sa
 *     précondition (l'état n'est jamais `refusee`) ;
 *   - la déconnexion volontaire qui ne se déclare plus (`pendantUnDepartVolontaire` réduit à son
 *     corps) → « une déconnexion voulue… », seul ;
 *   - `repartirSurCetAppareil` qui n'efface plus le refus → « « Commencer un bilan sur cet appareil »… »,
 *     seul.
 *
 * **La première rédaction passait à côté du refus, et restait rouge pour une mauvaise raison** : le
 * stockage importé en tête du fichier n'était pas l'instance que le module rechargé lisait
 * (`resetModules`), donc aucune session n'était jamais trouvée, et la session anonyme se créait sur
 * une vraie première ouverture. Le stockage se reprend désormais dans le registre du module — et
 * l'ordre des événements a été relu une fois sur le client réel : `SIGNED_OUT`, puis
 * `INITIAL_SESSION`, puis la lecture de l'app.
 */
import type AsyncStorageType from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const CLE_DE_SESSION = 'sb-exemple-auth-token';

/** Une session d'un compte réel, dont le jeton d'accès a expiré il y a une heure. */
const SESSION_EXPIREE = {
  access_token: 'jeton-expire',
  refresh_token: 'jeton-de-rafraichissement-revoque',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) - 3600,
  user: { id: 'compte-reel', aud: 'authenticated', role: 'authenticated', is_anonymous: false },
};

/** Une session anonyme que le serveur créerait — elle ne doit pas l'être sur un refus. */
const SESSION_ANONYME = {
  access_token: 'jeton-anonyme',
  refresh_token: 'rafraichissement-anonyme',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'anonyme-neuf', aud: 'authenticated', role: 'authenticated', is_anonymous: true },
};

const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } });

describe('une session refusée au démarrage', () => {
  const fetchDOrigine = global.fetch;
  let creations: string[] = [];
  let module: typeof import('@/lib/supabase');
  // **Le stockage se reprend après `resetModules`**, dans le même registre que le module : importé en
  // tête du fichier, c'était une autre instance du double, et la session écrite par le test n'était
  // jamais celle que le client lisait — la première version de ce test passait à côté du refus.
  let AsyncStorage: typeof AsyncStorageType;

  beforeEach(async () => {
    jest.resetModules();
    // Le double est un module CommonJS : son export est l'objet lui-même, `default` en plus ou non.
    const double = jest.requireMock<{ default?: typeof AsyncStorageType } & typeof AsyncStorageType>(
      '@react-native-async-storage/async-storage'
    );
    AsyncStorage = double.default ?? double;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://exemple.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    await AsyncStorage.clear();
    creations = [];
    global.fetch = jest.fn(async (entree: RequestInfo | URL) => {
      const adresse = String(entree);
      if (adresse.includes('/auth/v1/token')) {
        return json(400, {
          code: 400,
          error_code: 'refresh_token_not_found',
          msg: 'Invalid Refresh Token: Refresh Token Not Found',
        });
      }
      if (adresse.includes('/auth/v1/signup')) {
        creations.push(adresse);
        return json(200, SESSION_ANONYME);
      }
      if (adresse.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
      return json(200, {});
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    module?.supabase.auth.stopAutoRefresh();
    global.fetch = fetchDOrigine;
  });

  /** Le module chargé sur ce que le stockage porte à cet instant — c'est son initialisation qui compte. */
  const charger = () => {
    module = jest.requireActual<typeof import('@/lib/supabase')>('@/lib/supabase');
    return module;
  };

  it('un jeton refusé à l’initialisation se dit « refusée », et n’ouvre pas de session anonyme', async () => {
    await AsyncStorage.setItem(CLE_DE_SESSION, JSON.stringify(SESSION_EXPIREE));
    const { ensureSession, etatDeLaSession } = charger();

    const session = await ensureSession();

    expect(session).toBeNull();
    expect(etatDeLaSession()).toBe('refusee');
    expect(creations).toHaveLength(0);
    // Et le refus tient : un second appel — un écran qui s'ouvre sous l'écran de reconnexion — ne
    // crée rien non plus.
    expect(await ensureSession()).toBeNull();
    expect(creations).toHaveLength(0);
  });

  it('« Commencer un bilan sur cet appareil » lève le refus : la session anonyme s’ouvre alors', async () => {
    await AsyncStorage.setItem(CLE_DE_SESSION, JSON.stringify(SESSION_EXPIREE));
    const { ensureSession, etatDeLaSession, repartirSurCetAppareil } = charger();
    await ensureSession();
    expect(etatDeLaSession()).toBe('refusee');

    repartirSurCetAppareil();
    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    expect(etatDeLaSession()).toBe('presente');
    expect(creations).toHaveLength(1);
  });

  it('une première ouverture reste une première ouverture : la session anonyme s’ouvre', async () => {
    const { ensureSession, etatDeLaSession } = charger();

    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    expect(etatDeLaSession()).toBe('presente');
    expect(creations).toHaveLength(1);
  });

  it('une déconnexion voulue n’est pas un refus : la session suivante s’ouvre', async () => {
    const { ensureSession, etatDeLaSession, pendantUnDepartVolontaire, supabase } = charger();
    await ensureSession();
    expect(creations).toHaveLength(1);

    await pendantUnDepartVolontaire(() => supabase.auth.signOut({ scope: 'local' }));
    const session = await ensureSession();

    expect(etatDeLaSession()).toBe('presente');
    expect(session?.user.id).toBe('anonyme-neuf');
    expect(creations).toHaveLength(2);
  });
});
