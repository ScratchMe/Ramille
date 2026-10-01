/**
 * La lecture des bilans valides, depuis qu'elle sert deux décisions (01/10/2026, audit R-4).
 *
 * La restitution la lit au chargement pour la **place** du bilan — qui commande le lien du retrait et
 * ce que sa confirmation dit — et, désormais, pour le **bilan précédent** auquel elle compare un
 * re-bilan ; elle la relit au toucher du lien. Trois contrats, et aucun ne se voit ailleurs : le
 * parcours réel ne retire jamais un bilan ancien au-delà de dix, et `src/types` reçoit une liste déjà
 * lue.
 *
 *   1. **Du plus récent au plus ancien** : c'est l'ordre dans lequel `generate_plan_cycle_for_user`
 *      choisit le bilan qui porte le plan, et celui que lit `placeDuBilan`. Dans l'autre ordre, le
 *      plus ancien passerait pour celui qui porte le plan, et la confirmation dirait faux.
 *   2. **Sans borne** : un bilan ancien relu depuis le suivi doit figurer dans la liste, sans quoi sa
 *      place vaut `null` et le lien du retrait ne se rend pas. La borne de dix de l'ancienne lecture du
 *      précédent vit dans `precedentDeLaRestitution`, pas ici.
 *   3. **Un échec est un échec**, jamais une liste vide : une liste vide dirait « aucun bilan valide »,
 *      donc une place fausse (`FRONT.md` §1.2).
 *
 * Le test **double** Supabase : ce qu'il garde est la requête qui part et ce qu'on fait de sa réponse,
 * pas ce que le serveur répondrait.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1) :
 *   - `.limit(10)` ajouté à la requête → « lit tous les bilans complétés… », seul ;
 *   - `ascending: true` → la même, seule ;
 *   - un échec rendu en `{ ok: true, data: [] }` → « un échec est un échec… », seul ;
 *   - le total lu sur l'objet seul (`bilan.assessment_results?.total_co2_kg_year`, sans le cas du
 *     tableau) → « prend le total que PostgREST rende un objet ou un tableau », seul.
 */
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Chargé après le double : `retrait-du-bilan.ts` lit `@/lib/supabase` à l'import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { lireLesBilansValides } = require('./retrait-du-bilan') as typeof import('./retrait-du-bilan');

type Appel = [methode: string, ...args: unknown[]];

/** Une requête PostgREST qui note chaque filtre posé et rend `reponse` quand on l'attend. */
function requete(reponse: { data: unknown; error: unknown }, appels: Appel[]) {
  const chaine: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit']) {
    chaine[methode] = (...args: unknown[]) => {
      appels.push([methode, ...args]);
      return chaine;
    };
  }
  chaine.then = (resoudre: (valeur: unknown) => unknown, rejeter: (raison: unknown) => unknown) =>
    Promise.resolve(reponse).then(resoudre, rejeter);
  return chaine;
}

beforeEach(() => {
  mockFrom.mockReset();
});

describe('lireLesBilansValides', () => {
  it('lit tous les bilans complétés, du plus récent au plus ancien, avec leur date et leur total', async () => {
    const appels: Appel[] = [];
    mockFrom.mockImplementation(() =>
      requete(
        {
          data: [
            { id: 'b3', submitted_at: '2026-10-01T09:00:00Z', assessment_results: { total_co2_kg_year: 1800 } },
            { id: 'b2', submitted_at: '2026-06-02T08:00:00Z', assessment_results: { total_co2_kg_year: 2400 } },
          ],
          error: null,
        },
        appels
      )
    );

    await expect(lireLesBilansValides()).resolves.toEqual({
      ok: true,
      data: [
        { id: 'b3', submittedAt: '2026-10-01T09:00:00Z', totalKg: 1800 },
        { id: 'b2', submittedAt: '2026-06-02T08:00:00Z', totalKg: 2400 },
      ],
    });
    expect(mockFrom).toHaveBeenCalledWith('assessments');
    expect(appels).toEqual([
      ['select', 'id, submitted_at, assessment_results(total_co2_kg_year)'],
      ['eq', 'status', 'completed'],
      ['order', 'submitted_at', { ascending: false }],
    ]);
  });

  it('prend le total que PostgREST rende un objet ou un tableau, et dit quand il manque', async () => {
    mockFrom.mockImplementation(() =>
      requete(
        {
          data: [
            { id: 'tableau', submitted_at: '2026-10-01T09:00:00Z', assessment_results: [{ total_co2_kg_year: 900 }] },
            { id: 'sans-resultat', submitted_at: '2026-09-01T09:00:00Z', assessment_results: null },
            { id: 'sans-date', submitted_at: null, assessment_results: { total_co2_kg_year: 1200 } },
          ],
          error: null,
        },
        []
      )
    );

    await expect(lireLesBilansValides()).resolves.toEqual({
      ok: true,
      data: [
        { id: 'tableau', submittedAt: '2026-10-01T09:00:00Z', totalKg: 900 },
        { id: 'sans-resultat', submittedAt: '2026-09-01T09:00:00Z', totalKg: null },
        { id: 'sans-date', submittedAt: null, totalKg: 1200 },
      ],
    });
  });

  it('un échec est un échec, jamais une liste vide', async () => {
    mockFrom.mockImplementation(() =>
      requete({ data: null, error: { message: 'TypeError: Network request failed', code: '' } }, [])
    );
    await expect(lireLesBilansValides()).resolves.toEqual({ ok: false });

    mockFrom.mockImplementation(() => requete({ data: null, error: null }, []));
    await expect(lireLesBilansValides()).resolves.toEqual({ ok: false });
  });
});
