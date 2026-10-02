/**
 * Le préremplissage du questionnaire ne lit la base qu'avec une session (29/09/2026).
 *
 * `/bilan` ouvert par son adresse dans un navigateur neuf appelait `loadLastSubmittedAnswers` avant
 * que la session anonyme n'existe : la requête partait avec la seule clé `anon`, et le serveur
 * répondait 42501 (recette du 29/09, `v1-13` §17). Le test **double** Supabase : ce qu'il garde est
 * que rien ne part sans session, pas ce que le serveur répondrait.
 *
 * Éprouvé en cassant ce qu'il garde, le 29/09/2026 : la garde `if (!session) return null` retirée
 * fait tomber le premier test, et lui seul.
 *
 * **Et depuis le 02/10/2026, l'échec ne se confond plus avec l'absence** (`v1-33` §9) : la lecture rend
 * une `Lecture`, et le questionnaire reprend l'échec en arrière-plan. Éprouvé le même jour : l'erreur
 * du bilan ignorée (`if (erreurDuBilan)` retiré) fait tomber « dit l'échec… », seul ; celle des
 * réponses ignorée, « dit l'échec des réponses… », seul ; celle de la session ignorée, « dit l'échec
 * quand la session… », seul.
 */
const mockGetSession = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Chargé après le double : `bilan-history.ts` lit `@/lib/supabase` à l'import.
const { loadAnsweredCheckins, loadAssessmentHistory, loadCycleCourant, loadFrequenceDesLoisirs, loadLastSubmittedAnswers } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./bilan-history') as typeof import('./bilan-history');

/** Une requête PostgREST qui rend `data` au bout de sa chaîne, quels que soient les filtres. */
function requete(data: unknown, error: unknown = null) {
  const chaine: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit', 'lte']) chaine[methode] = () => chaine;
  chaine.maybeSingle = async () => ({ data, error });
  return chaine;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockFrom.mockReset();
});

describe('loadLastSubmittedAnswers', () => {
  it('ne lit rien sans session, et ne préremplit rien', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(loadLastSubmittedAnswers()).resolves.toEqual({ ok: true, data: null });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('lit le dernier bilan complété quand une session existe', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton' } }, error: null });
    mockFrom.mockImplementation(() => requete(null));

    await expect(loadLastSubmittedAnswers()).resolves.toEqual({ ok: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith('assessments');
  });

  it('dit l’échec quand la session elle-même n’a pas pu être lue', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Failed to fetch' } });

    await expect(loadLastSubmittedAnswers()).resolves.toEqual({ ok: false });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('dit l’échec de la lecture du bilan, au lieu de « aucun bilan »', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton' } }, error: null });
    mockFrom.mockImplementation(() => requete(null, { message: 'Failed to fetch' }));

    await expect(loadLastSubmittedAnswers()).resolves.toEqual({ ok: false });
  });

  it('dit l’échec des réponses, une fois le bilan trouvé', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton' } }, error: null });
    mockFrom.mockImplementation((table: string) =>
      table === 'assessments' ? requete({ id: 'b1' }) : requete(null, { message: 'Failed to fetch' })
    );

    await expect(loadLastSubmittedAnswers()).resolves.toEqual({ ok: false });
  });
});

/**
 * Les deux lectures tolérantes de la restitution qui sont sorties de l'écran le 01/10/2026 (audit
 * R-4) pour partir avec le résultat. Ce qu'elles gardent : **un échec ne lève pas**, et rend ce que
 * rendrait une absence — pas de cycle, donc pas de marche ; pas de fréquence, donc les libellés
 * figés. Et le cap se calcule comme il se calculait dans l'écran, à la virgule près.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1) :
 *   - le `/ 100` du cap retiré → « le cap du cycle courant… », seul ;
 *   - `error` levé par la lecture de la fréquence (`if (error) throw error`) → « une fréquence
 *     illisible… », seul.
 */
describe('loadCycleCourant', () => {
  it('le cap du cycle courant est la part visée de la baseline, et sans baseline il n’y en a pas', async () => {
    mockFrom.mockImplementation(() =>
      requete({ id: 'cycle-1', baseline_co2_kg_year: 1920, target_reduction_pct: 20 })
    );
    await expect(loadCycleCourant()).resolves.toEqual({ cycleId: 'cycle-1', capKg: 384 });
    expect(mockFrom).toHaveBeenCalledWith('plan_cycles');

    mockFrom.mockImplementation(() =>
      requete({ id: 'cycle-2', baseline_co2_kg_year: null, target_reduction_pct: 20 })
    );
    await expect(loadCycleCourant()).resolves.toEqual({ cycleId: 'cycle-2', capKg: null });
  });

  it('une lecture en échec ne lève pas : pas de cycle, donc pas de marche', async () => {
    mockFrom.mockImplementation(() => requete(null, { message: 'TypeError: Network request failed' }));
    await expect(loadCycleCourant()).resolves.toBeNull();
  });
});

describe('loadFrequenceDesLoisirs', () => {
  it('une fréquence illisible ne lève pas : `null`, et les libellés figés reprennent la main', async () => {
    const console_ = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFrom.mockImplementation(() => requete(null, { message: 'TypeError: Network request failed' }));
    await expect(loadFrequenceDesLoisirs('b1')).resolves.toBeNull();
    expect(console_).toHaveBeenCalled();
    console_.mockRestore();

    mockFrom.mockImplementation(() => requete({ leisure_frequency: 'rarement' }));
    await expect(loadFrequenceDesLoisirs('b1')).resolves.toBe('rarement');
    expect(mockFrom).toHaveBeenCalledWith('assessment_answers');
  });
});

/**
 * Les deux lectures dont l'échec fait l'écran d'erreur du suivi disent **pourquoi** (D19 de `v1-33`,
 * 01/10/2026) : hors ligne — pas de réponse HTTP, `status: 0` — ou le serveur en échec. La phrase de
 * l'écran ne parle de connexion qu'au premier.
 *
 * Éprouvé en le cassant, le 01/10/2026 : le statut ignoré (`'serveur'` en dur dans
 * `genreDeLaLecture`) fait tomber « hors ligne, elle le dit » pour les deux lectures, et rien d'autre.
 */
describe('les lectures du suivi disent le genre de leur échec', () => {
  /** Une liste PostgREST qui se résout au bout de son `order`. */
  function liste(reponse: { data: unknown; error: unknown; status: number }) {
    const chaine: Record<string, unknown> = {};
    for (const methode of ['select', 'eq']) chaine[methode] = () => chaine;
    chaine.order = async () => reponse;
    return chaine;
  }
  const LECTURES = [
    ['loadAssessmentHistory', () => loadAssessmentHistory()],
    ['loadAnsweredCheckins', () => loadAnsweredCheckins()],
  ] as const;

  it.each(LECTURES)('%s : hors ligne, elle le dit', async (_nom, lire) => {
    mockFrom.mockImplementation(() => liste({ data: null, error: { message: 'Failed to fetch' }, status: 0 }));
    await expect(lire()).resolves.toEqual({ ok: false, genre: 'horsLigne' });
  });

  it.each(LECTURES)('%s : un serveur en échec n’est pas une coupure', async (_nom, lire) => {
    mockFrom.mockImplementation(() => liste({ data: null, error: { message: 'Internal Server Error' }, status: 500 }));
    await expect(lire()).resolves.toEqual({ ok: false, genre: 'serveur' });
  });

  it.each(LECTURES)('%s : un succès rend ce qu’il rendait', async (_nom, lire) => {
    mockFrom.mockImplementation(() => liste({ data: [], error: null, status: 200 }));
    await expect(lire()).resolves.toEqual({ ok: true, data: [] });
  });
});
