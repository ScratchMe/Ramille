// La file d'attente des erreurs, de la panne à l'envoi (02/10/2026, `docs/exploitation/remontee-erreurs.md`
// §3 bis) : ce que `track('app_error')` garde, et ce qu'`envoyerLesErreursEnAttente` en fait. Ce qu'un
// changement de compte en laisse est gardé sur le vrai client, dans `src/lib/session-refusee.test.ts`.
//
// **Un module d'entrée-sortie, testé en doublant le client et le stockage, rien d'autre** — la ligne que
// trace l'en-tête de `src/lib/notification-prefs.test.ts`. La file elle-même est gardée par
// `src/types/erreurs-en-attente.test.ts` ; ses deux déclencheurs (le démarrage et le retour au premier
// plan, dans `src/app/_layout.tsx`) ne le sont que par relecture.
//
// Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1), chacune rejouée après la contre-lecture du
// même jour, les tests qui ne gardent pas l'entrée dans la file la posant désormais eux-mêmes :
//   - rien de gardé sans session (`garderLErreur` retiré de cette branche) → « garde une panne survenue
//     sans session » et « envoie les pannes gardées… », qui remplit sa file par ce chemin (la première
//     rédaction disait « seul », et trois tests tombaient) ;
//   - rien de gardé sur un insert sans réponse → « garde une panne dont l'envoi n'a pas eu de
//     réponse », seul ;
//   - la file jamais vidée après l'envoi → « envoie les pannes gardées… » et « un second appel pendant
//     un envoi… », qui vérifie aussi la file vide à la fin ;
//   - les écritures de la file hors de leur série (`enSerie` retiré de `garderLErreur`) → « envoie les
//     pannes gardées… », seul : deux pannes coup sur coup, la seconde écrasait la première ;
//   - deux envois à la fois (la garde de `envoyerLesErreursEnAttente` retirée) → « un second appel
//     pendant un envoi… », seul ;
//   - un autre événement que `app_error` gardé aussi (la condition `name === 'app_error'` retirée) est un
//     **mutant équivalent** aujourd'hui : `garderLErreur` exige une catégorie et une route, qu'aucun
//     autre événement du référentiel ne porte. « ne garde que les pannes » reste, pour le jour où un
//     événement en porterait.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSession = jest.fn<Promise<unknown>, []>();
const mockInsert = jest.fn<Promise<{ error: unknown; status: number }>, [unknown]>();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockSession() },
    from: () => ({ insert: (lignes: unknown) => mockInsert(lignes) }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { envoyerLesErreursEnAttente, garderUnePanne, track } = require('./analytics') as typeof import('./analytics');

const FILE = 'traceverte.erreurs_en_attente.v1';
const SESSION = { data: { session: { user: { id: 'u1' } } } };
const SANS_SESSION = { data: { session: null } };
/** `track()` ne s'attend pas : on laisse ses écritures se poser. */
const laisserSePoser = () => new Promise((resoudre) => setTimeout(resoudre, 0));
const fileStockee = async () => JSON.parse((await AsyncStorage.getItem(FILE)) ?? '[]') as { route: string }[];

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSession.mockReset().mockResolvedValue(SESSION);
  mockInsert.mockReset().mockResolvedValue({ error: null, status: 201 });
});

describe('la file d’attente des erreurs', () => {
  it('garde une panne survenue sans session', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('app_error', { category: 'type', route: '/plan' });
    await laisserSePoser();
    expect(await fileStockee()).toEqual([expect.objectContaining({ category: 'type', route: '/plan' })]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('garde une panne dont l’envoi n’a pas eu de réponse', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'Failed to fetch' }, status: 0 });
    track('app_error', { category: 'reference', route: '/suivi' });
    await laisserSePoser();
    expect(await fileStockee()).toEqual([expect.objectContaining({ route: '/suivi' })]);
  });

  it('ne garde pas une panne envoyée, ni une panne refusée par le serveur', async () => {
    track('app_error', { category: 'type', route: '/plan' });
    mockInsert.mockResolvedValueOnce({ error: { message: 'refus' }, status: 400 });
    track('app_error', { category: 'type', route: '/suivi' });
    await laisserSePoser();
    expect(await fileStockee()).toEqual([]);
  });

  it('ne garde que les pannes', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('plan_view');
    await laisserSePoser();
    expect(await AsyncStorage.getItem(FILE)).toBeNull();
  });

  it('envoie les pannes gardées une par une, différées, et vide la file', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('app_error', { category: 'type', route: '/plan' });
    track('app_error', { category: 'autre', route: '/' });
    await laisserSePoser();
    mockSession.mockResolvedValue(SESSION);

    await envoyerLesErreursEnAttente();

    expect(mockInsert).toHaveBeenCalledTimes(2);
    const lignes = mockInsert.mock.calls.map(
      ([ligne]) => ligne as { name: string; user_id: string; props: Record<string, unknown> }
    );
    expect(lignes.map((l) => [l.name, l.user_id, l.props.route, l.props.differee])).toEqual([
      ['app_error', 'u1', '/plan', true],
      ['app_error', 'u1', '/', true],
    ]);
    expect(await AsyncStorage.getItem(FILE)).toBeNull();
  });

  /**
   * **Le budget du jour se compte ligne à ligne** (`enforce_usage_events_rate_limit`) : un lot en un seul
   * insert qui le franchissait était refusé en entier, et la file se vidait des pannes qui tenaient
   * encore dessous. Éprouvé le 18/10/2026, une mutation à la fois, l'état d'avant réécrit après chacune :
   *   - un seul insert pour tout le lot (l'état d'avant) → quatre : « un refus au milieu… », « une
   *     panne passagère au milieu… », « envoie les pannes gardées une par une… » et « une panne gardée
   *     garde son origine… », qui lisent une ligne et non un tableau ;
   *   - l'envoi qui continue après un échec → « un refus au milieu… » et « une panne passagère au
   *     milieu… », deux ;
   *   - un refus qui garde le reste du lot → « un refus au milieu… », seul ;
   *   - une panne passagère qui vide tout le lot → « une panne passagère au milieu… » et « garde la file
   *     quand le lot n'a pas eu de réponse… », deux.
   */
  const LOT = ['/a', '/b', '/c'].map((route, i) => ({ category: 'type', route, noteeLe: Date.now() - i }));

  it('un refus au milieu du lot : les pannes d’avant sont parties, le reste sort de la file sans être tenté', async () => {
    await AsyncStorage.setItem(FILE, JSON.stringify(LOT));
    mockInsert
      .mockResolvedValueOnce({ error: null, status: 201 })
      .mockResolvedValueOnce({ error: { message: 'Trop de pannes remontées pour cet utilisateur sur 24 h.' }, status: 400 });
    // Le refus se dit en développement, et ce test le provoque exprès : il ne salit pas la sortie.
    const avertir = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await envoyerLesErreursEnAttente();
    } finally {
      avertir.mockRestore();
    }

    expect(mockInsert.mock.calls.map(([ligne]) => (ligne as { props: { route: string } }).props.route)).toEqual([
      '/a',
      '/b',
    ]);
    expect(await AsyncStorage.getItem(FILE)).toBeNull();
  });

  it('une panne passagère au milieu du lot : celles d’avant sont parties, celle-là et les suivantes restent', async () => {
    await AsyncStorage.setItem(FILE, JSON.stringify(LOT));
    mockInsert
      .mockResolvedValueOnce({ error: null, status: 201 })
      .mockResolvedValueOnce({ error: { message: 'Failed to fetch' }, status: 0 });

    await envoyerLesErreursEnAttente();

    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect((await fileStockee()).map((e) => e.route)).toEqual(['/b', '/c']);
  });

  it('garde la file quand le lot n’a pas eu de réponse, et n’envoie rien sans session', async () => {
    await AsyncStorage.setItem(FILE, JSON.stringify([{ category: 'type', route: '/plan', noteeLe: Date.now() }]));
    mockSession.mockResolvedValue(SANS_SESSION);

    await envoyerLesErreursEnAttente();
    expect(mockInsert).not.toHaveBeenCalled();

    mockSession.mockResolvedValue(SESSION);
    mockInsert.mockResolvedValue({ error: { message: 'Failed to fetch' }, status: 0 });
    await envoyerLesErreursEnAttente();
    expect(await fileStockee()).toHaveLength(1);
  });

  /**
   * **L'origine et la version voyagent avec la panne** (18/10/2026, `src/lib/remontee-des-pannes.ts`).
   * Éprouvé le 18/10/2026 : `garderLErreur` ne recopiant plus que la catégorie et la route → ce test et
   * « une panne fatale se garde sans partir… », seuls.
   */
  it('une panne gardée garde son origine et sa version, et les envoie', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('app_error', { category: 'type', route: '/plan', origine: 'promesse', version: '1.0.0+14' });
    await laisserSePoser();
    mockSession.mockResolvedValue(SESSION);

    await envoyerLesErreursEnAttente();

    const ligne = mockInsert.mock.calls[0][0] as { props: Record<string, unknown> };
    expect(ligne.props).toEqual(
      expect.objectContaining({ origine: 'promesse', version: '1.0.0+14', differee: true })
    );
  });

  it('une panne fatale se garde sans partir : l’app se ferme avant tout envoi', async () => {
    await garderUnePanne({ category: 'reference', route: '/suivi', origine: 'fatale', version: '1.0.0+14' });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(await fileStockee()).toEqual([
      expect.objectContaining({ category: 'reference', route: '/suivi', origine: 'fatale', version: '1.0.0+14' }),
    ]);
  });

  it('un second appel pendant un envoi n’envoie pas le lot une seconde fois', async () => {
    await AsyncStorage.setItem(FILE, JSON.stringify([{ category: 'type', route: '/plan', noteeLe: Date.now() }]));
    let repondre: (reponse: { error: unknown; status: number }) => void = () => undefined;
    mockInsert.mockReturnValueOnce(
      new Promise((resoudre) => {
        repondre = resoudre;
      })
    );

    // Le démarrage dont l'envoi reste suspendu, puis un retour au premier plan.
    const premier = envoyerLesErreursEnAttente();
    await laisserSePoser();
    const second = envoyerLesErreursEnAttente();
    await laisserSePoser();
    repondre({ error: null, status: 201 });
    await Promise.all([premier, second]);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(FILE)).toBeNull();
  });
});
