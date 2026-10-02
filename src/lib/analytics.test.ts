// La file d'attente des erreurs, de la panne à l'envoi (02/10/2026, `docs/exploitation/remontee-erreurs.md`
// §3) : ce que `track('app_error')` garde, et ce qu'`envoyerLesErreursEnAttente` en fait.
//
// **Un module d'entrée-sortie, testé en doublant le client et le stockage, rien d'autre** — la ligne que
// trace l'en-tête de `src/lib/notification-prefs.test.ts`. La file elle-même est gardée par
// `src/types/erreurs-en-attente.test.ts` ; ses deux déclencheurs (le démarrage et le retour au premier
// plan, dans `src/app/_layout.tsx`) ne le sont que par relecture.
//
// Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1), chacune faisant tomber la sienne :
//   - rien de gardé sans session (`garderLErreur` retiré de cette branche) → « garde une panne survenue
//     sans session », seul ;
//   - rien de gardé sur un insert sans réponse → « garde une panne dont l'envoi n'a pas eu de
//     réponse », seul ;
//   - la file jamais vidée après l'envoi → « envoie les pannes gardées… », seul ;
//   - les écritures de la file hors de leur série (`enSerie` retiré de `garderLErreur`) → « envoie les
//     pannes gardées… », seul : deux pannes au même instant, la seconde écrasait la première ;
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
const { envoyerLesErreursEnAttente, track } = require('./analytics') as typeof import('./analytics');

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

  it('envoie les pannes gardées en un lot, différées, et vide la file', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('app_error', { category: 'type', route: '/plan' });
    track('app_error', { category: 'autre', route: '/' });
    await laisserSePoser();
    mockSession.mockResolvedValue(SESSION);

    await envoyerLesErreursEnAttente();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const lignes = mockInsert.mock.calls[0][0] as { name: string; user_id: string; props: Record<string, unknown> }[];
    expect(lignes.map((l) => [l.name, l.user_id, l.props.route, l.props.differee])).toEqual([
      ['app_error', 'u1', '/plan', true],
      ['app_error', 'u1', '/', true],
    ]);
    expect(await AsyncStorage.getItem(FILE)).toBeNull();
  });

  it('garde la file quand le lot n’a pas eu de réponse, et n’envoie rien sans session', async () => {
    mockSession.mockResolvedValue(SANS_SESSION);
    track('app_error', { category: 'type', route: '/plan' });
    await laisserSePoser();

    await envoyerLesErreursEnAttente();
    expect(mockInsert).not.toHaveBeenCalled();

    mockSession.mockResolvedValue(SESSION);
    mockInsert.mockResolvedValue({ error: { message: 'Failed to fetch' }, status: 0 });
    await envoyerLesErreursEnAttente();
    expect(await fileStockee()).toHaveLength(1);
  });
});
