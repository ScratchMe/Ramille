/**
 * **Un jeton refusé ne donne pas un compte vide** (`v1-27` §12.27, corrigé le 02/10/2026).
 *
 * C2.11 voulait que `ensureSession()` reconnaisse un jeton refusé et n'ouvre pas de session anonyme
 * à sa place. Il le lisait dans l'erreur de `getSession()`, et la version installée d'`auth-js` (2.116)
 * ne la rend pas là : au démarrage, sur un jeton d'accès déjà expiré dont le rafraîchissement est
 * refusé, c'est **l'initialisation du client** qui retire la session (`_callRefreshToken`, puis
 * `_removeSession`), avant toute lecture de l'app. `getSession()` voyait ensuite « pas de session, pas
 * d'erreur » — une première ouverture —, et l'app créait une session anonyme vide à quelqu'un qui a un
 * compte. Mesuré sur l'export par la vague `v1-33`, reproduit ici.
 *
 * **Le refus se déduit d'une marque** — « cet appareil porte un compte rattaché »
 * (`src/lib/marque-de-compte.ts`), que seuls les départs voulus effacent. La première version le
 * déduisait de tout `SIGNED_OUT` non déclaré, et la contre-lecture de la PR #315 y a trouvé deux
 * défauts, que ce fichier garde désormais : une session **anonyme** purgée se voyait proposer de « se
 * reconnecter », et le refus, tenu en mémoire, ne survivait pas à un redémarrage.
 *
 * **Le client est le vrai, le stockage et le réseau sont les seuls doubles** : c'est le seul moyen de
 * voir ce que fait l'initialisation d'`auth-js`, que rien d'autre dans ce dépôt n'exerce. Temps réels,
 * pour la raison écrite en tête de `src/lib/supabase.test.ts`. Et les départs voulus passent par leurs
 * **vrais appelants** (`src/lib/compte.ts`) : garder la fonction ne garde pas ses appels.
 *
 * **Et depuis le 02/10/2026, les marques locales suivent leur propriétaire**
 * ([#319](https://github.com/ScratchMe/Ramille/issues/319)) : une session anonyme refusée laissait ses
 * marques à la suivante. Les tests de la fin de ce fichier gardent la règle sur le même client réel.
 *
 * **Éprouvé en le cassant, le 02/10/2026** (`TESTING.md` §1.1) : voir le relevé des mutations au bas
 * de ce fichier, joué une à une, le module restauré entre deux.
 *
 * **La première rédaction passait à côté du refus, et restait rouge pour une mauvaise raison** : le
 * stockage importé en tête du fichier n'était pas l'instance que le module rechargé lisait
 * (`resetModules`), donc aucune session n'était jamais trouvée. Le stockage se reprend désormais dans
 * le registre du module.
 */
import type AsyncStorageType from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const CLE_DE_SESSION = 'sb-exemple-auth-token';
const MARQUE_DU_COMPTE = 'traceverte.compte_rattache.v1';
const dans = (secondes: number) => Math.floor(Date.now() / 1000) + secondes;

/** Une session d'un compte rattaché ; `expires_at` dit si son jeton d'accès vaut encore. */
const sessionDuCompte = (expiresAt: number) => ({
  access_token: 'jeton-du-compte',
  refresh_token: 'rafraichissement-du-compte',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  user: { id: 'compte-reel', aud: 'authenticated', role: 'authenticated', is_anonymous: false },
});

/** Une session anonyme — celle que le serveur crée à `signup`, ou celle qu'une purge a effacée. */
const sessionAnonyme = (expiresAt: number) => ({
  access_token: 'jeton-anonyme',
  refresh_token: 'rafraichissement-anonyme',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  user: { id: 'anonyme-neuf', aud: 'authenticated', role: 'authenticated', is_anonymous: true },
});

/** Une session anonyme d'avant — purgée au bout de 90 jours d'inactivité, et dont le jeton est refusé. */
const sessionAnonymePurgee = (expiresAt: number) => ({
  ...sessionAnonyme(expiresAt),
  access_token: 'jeton-purge',
  refresh_token: 'rafraichissement-purge',
  user: { id: 'anonyme-purge', aud: 'authenticated', role: 'authenticated', is_anonymous: true },
});

const PROPRIETAIRE = 'traceverte.proprietaire_des_marques.v1';
/** Les marques que la recette du 02/10/2026 a vues survivre à la session anonyme refusée (#319). */
const MARQUES_DE_L_ANONYME_PURGE: [string, string][] = [
  ['traceverte.a_un_bilan.v1', '1'],
  ['traceverte.premier_parcours.v1', 'fait'],
  ['traceverte.premier_plan_vu.v1', '1'],
  ['traceverte.bilan_draft.v1', '{"answers":{},"step":"context"}'],
];

/** Une panne gardée sur l'appareil (`src/types/erreurs-en-attente.ts`) : elle appartient à l'appareil, pas au compte. */
const FILE_DES_ERREURS: [string, string] = [
  'traceverte.erreurs_en_attente.v1',
  '[{"category":"type","route":"/plan","noteeLe":1759406400000}]',
];

const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } });

/** Ce qui part sans être attendu — une marque écrite, une lecture de l'écoute — le temps de se poser. */
const laisserSePoser = () => new Promise((resoudre) => setTimeout(resoudre, 0));

describe('une session refusée', () => {
  const fetchDOrigine = global.fetch;
  let creations: string[] = [];
  let module: typeof import('@/lib/supabase') | undefined;
  let AsyncStorage: typeof AsyncStorageType;

  /** Un registre neuf — un lancement de l'app —, le stockage repris dans ce registre, `contenu` dedans. */
  async function nouveauLancement(contenu: [string, string][] = []) {
    module?.supabase.auth.stopAutoRefresh();
    jest.resetModules();
    // **Le stockage se reprend après `resetModules`**, dans le même registre que le module : importé en
    // tête du fichier, c'était une autre instance du double. Le double est un module CommonJS.
    const double = jest.requireMock<{ default?: typeof AsyncStorageType } & typeof AsyncStorageType>(
      '@react-native-async-storage/async-storage'
    );
    AsyncStorage = double.default ?? double;
    await AsyncStorage.clear();
    for (const [cle, valeur] of contenu) await AsyncStorage.setItem(cle, valeur);
    const charge = jest.requireActual<typeof import('@/lib/supabase')>('@/lib/supabase');
    module = charge;
    return charge;
  }

  /** Ce que le stockage porte à cet instant — pour le reprendre au lancement suivant. */
  async function contenuDuStockage(): Promise<[string, string][]> {
    const paires = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
    return paires.filter((paire): paire is [string, string] => paire[1] !== null);
  }

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://exemple.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
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
        return json(200, sessionAnonyme(dans(3600)));
      }
      if (adresse.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
      return json(200, {});
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    module?.supabase.auth.stopAutoRefresh();
    module = undefined;
    global.fetch = fetchDOrigine;
  });

  /** Un compte rattaché, vu une fois sur cet appareil : la marque est posée par ce lancement-là. */
  async function unCompteDejaVu(): Promise<[string, string][]> {
    const { ensureSession } = await nouveauLancement([[CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))]]);
    await ensureSession();
    await laisserSePoser();
    expect(await AsyncStorage.getItem(MARQUE_DU_COMPTE)).toBe('1');
    return contenuDuStockage();
  }

  /** Le lancement d'après : le jeton d'accès a expiré, et le rafraîchissement est refusé. */
  async function relancerAvecUnJetonRefuse(contenu: [string, string][]) {
    const expire = contenu.map(([cle, valeur]): [string, string] =>
      cle === CLE_DE_SESSION ? [cle, JSON.stringify(sessionDuCompte(dans(-3600)))] : [cle, valeur]
    );
    return nouveauLancement(expire);
  }

  it('un jeton refusé à l’initialisation se dit « refusée », et n’ouvre pas de session anonyme', async () => {
    const { ensureSession, etatDeLaSession, ecouterLeRefus } = await relancerAvecUnJetonRefuse(await unCompteDejaVu());
    const prevenu = jest.fn();
    ecouterLeRefus(prevenu);

    const session = await ensureSession();

    expect(session).toBeNull();
    expect(etatDeLaSession()).toBe('refusee');
    expect(creations).toHaveLength(0);
    expect(prevenu).toHaveBeenCalled();
    // Et le refus tient : un second appel — un écran qui s'ouvre sous l'écran de reconnexion — ne
    // crée rien non plus.
    expect(await ensureSession()).toBeNull();
    expect(creations).toHaveLength(0);
  });

  it('le refus survit à un redémarrage : la session est partie, la marque est restée', async () => {
    const { ensureSession } = await relancerAvecUnJetonRefuse(await unCompteDejaVu());
    await ensureSession();
    expect(await AsyncStorage.getItem(CLE_DE_SESSION)).toBeNull();

    // L'app tuée pendant qu'on va chercher son code, ou la page rechargée.
    const relance = await nouveauLancement(await contenuDuStockage());
    const session = await relance.ensureSession();

    expect(session).toBeNull();
    expect(relance.etatDeLaSession()).toBe('refusee');
    expect(creations).toHaveLength(0);
  });

  it('une session anonyme refusée — purgée, révoquée — reste une première ouverture', async () => {
    const { ensureSession, etatDeLaSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionAnonyme(dans(-3600)))],
    ]);

    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    expect(etatDeLaSession()).toBe('presente');
    expect(creations).toHaveLength(1);
    // Et la session anonyme ne pose pas la marque : elle n'a aucun compte à retrouver.
    await laisserSePoser();
    expect(await AsyncStorage.getItem(MARQUE_DU_COMPTE)).toBeNull();
  });

  it('« Commencer un bilan sur cet appareil » efface la marque et lève le refus', async () => {
    const { ensureSession, etatDeLaSession, ecouterLeRefus, repartirSurCetAppareil } = await relancerAvecUnJetonRefuse(
      await unCompteDejaVu()
    );
    await ensureSession();
    expect(etatDeLaSession()).toBe('refusee');
    const prevenu = jest.fn();
    ecouterLeRefus(prevenu);

    await repartirSurCetAppareil();
    // Tout de suite, avant toute relecture : l'écran de reconnexion se déduit de cet état, et
    // resterait posé sur `/onboarding` s'il ne changeait qu'au prochain `ensureSession()`.
    expect(etatDeLaSession()).toBe('absente');
    expect(prevenu).toHaveBeenCalledTimes(1);
    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    expect(etatDeLaSession()).toBe('presente');
    expect(creations).toHaveLength(1);
    expect(await AsyncStorage.getItem(MARQUE_DU_COMPTE)).toBeNull();
  });

  it('une session revenue lève le refus, et prévient', async () => {
    const { ensureSession, etatDeLaSession, ecouterLeRefus, supabase } = await relancerAvecUnJetonRefuse(
      await unCompteDejaVu()
    );
    await ensureSession();
    const prevenu = jest.fn();
    ecouterLeRefus(prevenu);

    // Une session qui revient — ici par le serveur ; à l'écran, par le code de `/connexion/retrouver`.
    await supabase.auth.signInAnonymously();

    expect(etatDeLaSession()).toBe('presente');
    expect(prevenu).toHaveBeenCalledTimes(1);
  });

  // Le refus en cours de route : le rafraîchissement échoue pendant qu'on se sert de l'app, et `auth-js`
  // retire la session hors de son initialisation — l'écoute de `SIGNED_OUT` est seule à le voir.
  it('un refus en cours de route se dit et prévient, sans attendre une relecture', async () => {
    const { ensureSession, etatDeLaSession, ecouterLeRefus, supabase } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
    ]);
    await ensureSession();
    await laisserSePoser();
    const prevenu = jest.fn();
    ecouterLeRefus(prevenu);

    // Une heure plus tard : le jeton d'accès a expiré, et la première lecture le rafraîchit.
    await AsyncStorage.setItem(CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(-3600))));
    await supabase.auth.getSession();
    await laisserSePoser();

    expect(etatDeLaSession()).toBe('refusee');
    expect(prevenu).toHaveBeenCalledTimes(1);
    expect(creations).toHaveLength(0);
  });

  // La reconnexion par code pose la marque au `SIGNED_IN`, puis balaie les marques de l'ancien
  // propriétaire : c'est la relecture de la racine qui doit la reposer.
  it('la marque balayée par une reconnexion revient à la session suivante relue', async () => {
    const { ensureSession } = await nouveauLancement([[CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))]]);
    await ensureSession();
    await laisserSePoser();
    const { effacerLesMarquesLocales } = jest.requireActual<typeof import('@/lib/marques-locales')>(
      '@/lib/marques-locales'
    );

    await effacerLesMarquesLocales();
    expect(await AsyncStorage.getItem(MARQUE_DU_COMPTE)).toBeNull();
    await ensureSession();
    await laisserSePoser();

    expect(await AsyncStorage.getItem(MARQUE_DU_COMPTE)).toBe('1');
  });

  it('une première ouverture reste une première ouverture : la session anonyme s’ouvre', async () => {
    const { ensureSession, etatDeLaSession } = await nouveauLancement();

    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    expect(etatDeLaSession()).toBe('presente');
    expect(creations).toHaveLength(1);
  });

  it('une déconnexion voulue n’est pas un refus : rien ne s’annonce, et la session suivante s’ouvre', async () => {
    const { ensureSession, etatDeLaSession, ecouterLeRefus } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
    ]);
    await ensureSession();
    await laisserSePoser();
    const prevenu = jest.fn();
    ecouterLeRefus(prevenu);
    const { seDeconnecterDeCetAppareil } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    expect(await seDeconnecterDeCetAppareil()).toEqual({ ok: true });
    await laisserSePoser();
    const session = await ensureSession();

    expect(prevenu).not.toHaveBeenCalled();
    expect(etatDeLaSession()).toBe('presente');
    expect(session?.user.id).toBe('anonyme-neuf');
    expect(creations).toHaveLength(1);
  });

  // ── Les marques locales suivent leur propriétaire (#319) ─────────────────────────────────────

  it('une session anonyme refusée ne laisse pas ses marques à la session anonyme suivante (#319)', async () => {
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionAnonymePurgee(dans(-3600)))],
      [PROPRIETAIRE, 'anonyme-purge'],
      ...MARQUES_DE_L_ANONYME_PURGE,
    ]);

    const session = await ensureSession();

    expect(session?.user.id).toBe('anonyme-neuf');
    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(PROPRIETAIRE)).toBe('anonyme-neuf');
  });

  it('un brouillon écrit avant toute session survit à la première, qui devient propriétaire', async () => {
    const BROUILLON: [string, string] = ['traceverte.bilan_draft.v1', '{"answers":{},"step":"commute_mode"}'];
    const { ensureSession } = await nouveauLancement([BROUILLON]);

    await ensureSession();

    expect(await AsyncStorage.getItem(BROUILLON[0])).toBe(BROUILLON[1]);
    expect(await AsyncStorage.getItem(PROPRIETAIRE)).toBe('anonyme-neuf');
  });

  it('les marques du propriétaire restent à chaque lancement', async () => {
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
      [PROPRIETAIRE, 'compte-reel'],
      ...MARQUES_DE_L_ANONYME_PURGE,
    ]);

    await ensureSession();

    for (const [cle, valeur] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBe(valeur);
  });

  it('une session d’un autre compte trouvée au lancement balaie les marques de l’ancien', async () => {
    // Une reconnexion dont l'app a été tuée avant la suite (`apresUneReconnexion`) : c'est le lancement
    // suivant qui fait le ménage.
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
      [PROPRIETAIRE, 'anonyme-de-cet-appareil'],
      ...MARQUES_DE_L_ANONYME_PURGE,
    ]);

    await ensureSession();

    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(PROPRIETAIRE)).toBe('compte-reel');
  });

  it('une reconnexion du même compte, après un refus, garde ses marques — son brouillon compris', async () => {
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
      [PROPRIETAIRE, 'compte-reel'],
      ...MARQUES_DE_L_ANONYME_PURGE,
    ]);
    await ensureSession();
    const { apresUneReconnexion } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    await apresUneReconnexion();

    for (const [cle, valeur] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBe(valeur);
    expect(await AsyncStorage.getItem('traceverte.session_retrouvee.v1')).toBe('1');
  });

  it('une reconnexion à un autre compte balaie les marques de la session quittée', async () => {
    // La session de l'appareil était anonyme ; le code vient d'ouvrir celle du compte retrouvé.
    await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
      [PROPRIETAIRE, 'anonyme-de-cet-appareil'],
      ...MARQUES_DE_L_ANONYME_PURGE,
    ]);
    // **Après** le lancement : avant, ce serait un autre registre, donc un autre stockage (en-tête).
    const { apresUneReconnexion } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    await apresUneReconnexion();

    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(PROPRIETAIRE)).toBe('compte-reel');
    expect(await AsyncStorage.getItem('traceverte.session_retrouvee.v1')).toBe('1');
  });

  it('une reconnexion sans propriétaire noté balaie, comme avant', async () => {
    await nouveauLancement([[CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))], ...MARQUES_DE_L_ANONYME_PURGE]);
    const { apresUneReconnexion } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    await apresUneReconnexion();

    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(PROPRIETAIRE)).toBe('compte-reel');
  });

  // ── La file des erreurs appartient à l'appareil (contre-lecture du 02/10/2026) ───────────────

  it('la file des erreurs survit à la session anonyme refusée : ses pannes partiront sous la suivante', async () => {
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionAnonymePurgee(dans(-3600)))],
      [PROPRIETAIRE, 'anonyme-purge'],
      ...MARQUES_DE_L_ANONYME_PURGE,
      FILE_DES_ERREURS,
    ]);

    await ensureSession();

    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(FILE_DES_ERREURS[0])).toBe(FILE_DES_ERREURS[1]);
  });

  it('la file des erreurs survit à une reconnexion, même sans session relue', async () => {
    await nouveauLancement([...MARQUES_DE_L_ANONYME_PURGE, FILE_DES_ERREURS]);
    const { apresUneReconnexion } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    await apresUneReconnexion();

    for (const [cle] of MARQUES_DE_L_ANONYME_PURGE) expect(await AsyncStorage.getItem(cle)).toBeNull();
    expect(await AsyncStorage.getItem(FILE_DES_ERREURS[0])).toBe(FILE_DES_ERREURS[1]);
  });

  it('une déconnexion voulue emporte la file des erreurs avec le reste', async () => {
    const { ensureSession } = await nouveauLancement([
      [CLE_DE_SESSION, JSON.stringify(sessionDuCompte(dans(3600)))],
      FILE_DES_ERREURS,
    ]);
    await ensureSession();
    const { seDeconnecterDeCetAppareil } = jest.requireActual<typeof import('@/lib/compte')>('@/lib/compte');

    expect(await seDeconnecterDeCetAppareil()).toEqual({ ok: true });

    expect(await AsyncStorage.getItem(FILE_DES_ERREURS[0])).toBeNull();
  });
});

/*
 * Le relevé des mutations (02/10/2026), chacune jouée seule sur `src/lib/supabase.ts` ou
 * `src/lib/compte.ts`, restaurés entre deux, avec ce fichier et `src/lib/compte.test.ts` :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | la marque jamais lue (`porteUnCompte` toujours faux : le défaut d'avant, reproduit) | « un jeton refusé… », « le refus survit… », « Commencer… » et « une session revenue… » — les deux derniers par leur précondition |
 *   | la marque jamais posée (`noterLaSession` qui sort toujours) | les quatre mêmes, « un refus en cours de route… » et « la marque balayée… » |
 *   | la marque posée aussi pour une session anonyme (la garde `is_anonymous` retirée) | « une session anonyme refusée… » et « Commencer… » — la session anonyme d'après repose la marque |
 *   | « Me déconnecter » non déclaré | « une déconnexion voulue… », et « ne ferme que la session… » (`compte.test.ts`) |
 *   | le refus jamais levé par une session revenue | « une session revenue… », seul |
 *   | « Commencer » qui n'efface pas la marque | « Commencer… », seul |
 *   | la suppression du compte non déclarée | « ferme la session de cet appareil… » (`compte.test.ts`), seul |
 *
 * **Et trois que la seconde contre-lecture a fait survivre à la première version des tests**, rejouées
 * le même jour sur les tests ajoutés pour elles :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | l'écoute de `SIGNED_OUT` qui ne pose jamais le refus | « un refus en cours de route… », seul |
 *   | « Commencer » qui efface la marque sans lever l'état | « Commencer… », seul — par l'état lu juste après, avant toute relecture |
 *   | la marque écrite une seule fois par session (le cache d'avant) | « la marque balayée… », seul |
 *
 * **Et six pour les marques qui suivent leur propriétaire** (#319, 02/10/2026), rejouées sur ce fichier et
 * `src/lib/compte.test.ts` :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | la session anonyme créée n'est pas accueillie (le défaut d'avant, reproduit) | « une session anonyme refusée ne laisse pas… (#319) » et « un brouillon écrit avant toute session… » — le second par le propriétaire jamais noté |
 *   | la session trouvée au lancement n'est pas accueillie | « une session d'un autre compte trouvée au lancement… », seul |
 *   | un propriétaire inconnu toujours balayé | « un brouillon écrit avant toute session… », seul |
 *   | le propriétaire plus reconnu (`rien` retiré) | « les marques du propriétaire restent… » et « une reconnexion du même compte… » |
 *   | la reconnexion qui note sans balayer | « une reconnexion sans propriétaire noté balaie… », seul |
 *   | la reconnexion qui ne se note pas (`v1-27` §12.28) | « une reconnexion du même compte… » et « une reconnexion à un autre compte… » |
 *
 * **Et trois pour la file des erreurs** (contre-lecture du 02/10/2026 : la conciliation la balayait avec les
 * marques, avant que ses pannes partent), jouées sur `src/lib/marques-locales.ts` et `src/lib/compte.ts` :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | la conciliation qui balaie tout (`effacerLesMarquesLocales`) | « la file des erreurs survit à la session anonyme refusée… », seul |
 *   | la reconnexion sans session relue qui balaie tout | « la file des erreurs survit à une reconnexion… », seul |
 *   | la déconnexion qui garde la file (`effacerLesMarquesDuCompte`) | « une déconnexion voulue emporte la file… », seul |
 */
