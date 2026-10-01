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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadLastSubmittedAnswers } = require('./bilan-history') as typeof import('./bilan-history');

/** Une requête PostgREST qui rend `data` au bout de sa chaîne, quels que soient les filtres. */
function requete(data: unknown) {
  const chaine: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit']) chaine[methode] = () => chaine;
  chaine.maybeSingle = async () => ({ data, error: null });
  return chaine;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockFrom.mockReset();
});

describe('loadLastSubmittedAnswers', () => {
  it('ne lit rien sans session, et ne préremplit rien', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(loadLastSubmittedAnswers()).resolves.toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('lit le dernier bilan complété quand une session existe', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton' } }, error: null });
    mockFrom.mockImplementation(() => requete(null));

    await expect(loadLastSubmittedAnswers()).resolves.toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('assessments');
  });
});
