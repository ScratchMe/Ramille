/**
 * La restitution d'un bilan lit tout en un aller-retour (01/10/2026, audit R-4).
 *
 * L'écran enchaînait ses lectures : le résultat et les bilans valides, **puis** le cycle de plan, et
 * rendait ; **puis** il relisait la liste des bilans pour trouver le précédent, **puis** le cycle
 * d'alors, et rendait une seconde fois. Deux allers-retours avant le premier rendu, quatre avant la
 * comparaison — et la barre « Ton bilan précédent » s'insérait au-dessus de « Toi » une fois l'écran
 * lu, toutes les barres changeant de longueur, ce qui est la condition exacte de la cécité au
 * changement, sur la seule question qu'un re-bilan pose : « est-ce que ça a bougé ? ».
 *
 * **Le critère de `TESTING.md` §2.10 est rempli.** Les mutations ci-dessous sont des câblages de
 * l'écran — quelles lectures partent ensemble, laquelle attend l'autre —, qu'aucune dérivation de
 * `src/types` ne voit (`precedentDeLaRestitution` y est gardée, pas son moment), et le parcours réel
 * non plus : ses re-bilans sont tous des corrections du même jour, qui ne se comparent à rien, et il
 * attend l'état final sans regarder par où l'écran y passe.
 *
 * Le réseau est doublé par des réponses **retenues** : chaque requête attend que le test la libère.
 * C'est ce qui rend visible un aller-retour — une lecture partie trop tard n'est pas dans la liste
 * des requêtes en attente au moment où les premières répondent.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1) — chacune fait tomber la sienne :
 *   - le cycle courant attendu après le résultat (l'état d'avant, pour lui seul) → « toutes les
 *     lectures partent au montage… » ;
 *   - le précédent remis en second temps, après le premier rendu → la même, sur la barre ;
 *   - la chaîne de chargement d'avant R-9 (sans bande haute) → la même, sur la bande ;
 *   - le `.catch` de la lecture des bilans valides retiré → « une lecture tolérante qui lève… » ;
 *   - le `.catch` de la fréquence des loisirs retiré → la même ;
 *   - le cycle lu aussi en relecture → « en relecture, le cycle n'est pas lu… ».
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import BilanResultat from '@/app/(tabs)/suivi/bilan';
import { APP_NAME } from '@/constants/produit';

// ── Les doublures ─────────────────────────────────────────────────────────────────────────────
//
// Quatre modules : le transport, la navigation, la mesure (qui partirait vers le transport), et la
// marque locale (AsyncStorage) — reanimated l'est déjà pour toute la suite.

type Requete = { table: string; filtres: unknown[][]; repondre: (r: unknown) => void; lever: (e: unknown) => void };
const mockEnAttente: Requete[] = [];
let mockParams: { id?: string; nouveau?: string } = {};

jest.mock('@/lib/supabase', () => {
  /** Une requête PostgREST qui note ses filtres, et ne répond que quand le test la libère. */
  function requete(table: string) {
    const filtres: unknown[][] = [];
    let promesse: Promise<unknown> | null = null;
    const attendre = () =>
      (promesse ??= new Promise((repondre, lever) => mockEnAttente.push({ table, filtres, repondre, lever })));
    const chaine: Record<string, unknown> = {};
    for (const methode of ['select', 'eq', 'order', 'limit', 'lte']) {
      chaine[methode] = (...args: unknown[]) => {
        filtres.push([methode, ...args]);
        return chaine;
      };
    }
    chaine.single = attendre;
    chaine.maybeSingle = attendre;
    chaine.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => attendre().then(ok, ko);
    return chaine;
  }
  return {
    supabase: {
      from: (table: string) => requete(table),
      // La bannière de compte lit la session une fois l'écran prêt : sans session, elle ne se rend pas.
      auth: { getSession: async () => ({ data: { session: null } }) },
    },
  };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/marque-de-bilan', () => ({ effacerLaMarqueDeBilan: jest.fn() }));

// ── Les données : un re-bilan d'octobre, après un bilan de juin plus lourd ─────────────────────

const RESULTAT = {
  assessment_id: 'b2',
  total_co2_kg_year: 4200,
  dominant_poste: 'commute',
  dominant_poste_label: 'Trajet domicile-travail (Voiture seul)',
  dominant_poste_mode: 'voiture_thermique',
  dominant_poste_co2_kg_year: 1920,
  commute_co2_kg_year: 1920,
  leisure_co2_kg_year: 280,
  travel_co2_kg_year: 2000,
  extras_poste: null,
  extras_poste_label: null,
  mobility_constrained: false,
};

const BILANS_VALIDES = [
  { id: 'b2', submitted_at: '2026-10-01T09:00:00Z', assessment_results: { total_co2_kg_year: 4200 } },
  { id: 'b1', submitted_at: '2026-06-02T08:00:00Z', assessment_results: { total_co2_kg_year: 4700 } },
];

const tablesEnAttente = () => mockEnAttente.map((r) => r.table).sort();

/** Libère la requête en attente sur `table` (la première), avec sa réponse ou son exception. */
function liberer(table: string, issue: { reponse: unknown } | { exception: unknown }) {
  const rang = mockEnAttente.findIndex((r) => r.table === table);
  if (rang < 0) throw new Error(`aucune requête en attente sur ${table}`);
  const [requete] = mockEnAttente.splice(rang, 1);
  if ('reponse' in issue) requete.repondre(issue.reponse);
  else requete.lever(issue.exception);
}

const ok = (data: unknown) => ({ reponse: { data, error: null } });

beforeEach(() => {
  mockEnAttente.length = 0;
});

describe('la restitution d’un re-bilan', () => {
  it('toutes les lectures partent au montage, et la comparaison est là au premier rendu prêt', async () => {
    mockParams = { id: 'b2', nouveau: '1' };
    render(<BilanResultat />);
    await act(async () => {});

    // Le chargement garde le cadre de l'écran prêt (R-9) : la bande haute est déjà là.
    expect(screen.getByText('Chargement de ton bilan…')).toBeTruthy();
    expect(screen.getByText(APP_NAME)).toBeTruthy();
    // Un seul aller-retour : le résultat, les bilans valides, le cycle courant et la fréquence des
    // loisirs sont tous en vol avant que le premier ne réponde.
    expect(tablesEnAttente()).toEqual(['assessment_answers', 'assessment_results', 'assessments', 'plan_cycles']);

    await act(async () => {
      liberer('assessment_results', ok({ ...RESULTAT, assessments: { status: 'completed', submitted_at: '2026-10-01T09:00:00Z' } }));
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('plan_cycles', ok({ id: 'cycle-oct', baseline_co2_kg_year: 1920, target_reduction_pct: 20 }));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });

    // Le premier rendu prêt porte déjà la comparaison : la barre d'avant, « Toi, aujourd'hui », la
    // phrase — et le palier de la saison, qui vient du cycle courant.
    expect(screen.getByText('Ton bilan précédent · juin')).toBeTruthy();
    expect(screen.getByText('Toi, aujourd’hui')).toBeTruthy();
    expect(screen.getByText(/^500 kg de moins que ton bilan de juin\.$/)).toBeTruthy();
    expect(screen.getByText('Ton prochain palier')).toBeTruthy();
    // Seul le cycle d'alors reste en vol, et il n'ajoute qu'une phrase.
    expect(tablesEnAttente()).toEqual(['plan_cycles']);
    expect(mockEnAttente[0].filtres).toContainEqual(['lte', 'period_start', '2026-06-02']);

    await act(async () => {
      liberer('plan_cycles', ok({ id: 'cycle-juin', baseline_co2_kg_year: 2500, target_reduction_pct: 20 }));
    });
    expect(
      screen.getByText(/^500 kg de moins que ton bilan de juin\. Le palier que tu visais est derrière toi\.$/)
    ).toBeTruthy();
  });

  it('une lecture tolérante qui échoue ou lève ôte ce qu’elle porte, jamais l’écran', async () => {
    const console_ = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockParams = { id: 'b2', nouveau: '1' };
    render(<BilanResultat />);
    await act(async () => {});

    await act(async () => {
      liberer('assessment_results', ok({ ...RESULTAT, assessments: { status: 'completed', submitted_at: '2026-10-01T09:00:00Z' } }));
      // Les bilans valides et la fréquence **lèvent** — ce que PostgREST ne fait pas aujourd'hui, et
      // que le `.catch` de chacune garde ; le cycle rend son échec comme une valeur, ce qu'il fait.
      liberer('assessments', { exception: new TypeError('Network request failed') });
      liberer('plan_cycles', { reponse: { data: null, error: { message: 'TypeError: Network request failed' } } });
      liberer('assessment_answers', { exception: new TypeError('Network request failed') });
    });

    // L'écran est là, entier sans ce que les trois lectures portaient…
    expect(screen.getByText('Estimation annuelle, tous déplacements')).toBeTruthy();
    expect(screen.getByText('Toi')).toBeTruthy();
    expect(screen.queryByText(/n’a pas pu être affiché/)).toBeNull();
    // … et sans elles : ni comparaison, ni palier, ni lien du retrait — dont la place n'est pas sue.
    expect(screen.queryByText(/Ton bilan précédent/)).toBeNull();
    expect(screen.queryByText('Ton prochain palier')).toBeNull();
    expect(screen.queryByText('Ce bilan ne me ressemble pas')).toBeNull();
    // Sans précédent, pas de cycle d'alors à demander.
    expect(tablesEnAttente()).toEqual([]);
    console_.mockRestore();
  });

  it('en relecture, le cycle n’est pas lu : le palier n’appartient qu’au bilan qu’on vient de soumettre', async () => {
    mockParams = { id: 'b1' };
    render(<BilanResultat />);
    await act(async () => {});

    expect(tablesEnAttente()).toEqual(['assessment_answers', 'assessment_results', 'assessments']);

    await act(async () => {
      liberer(
        'assessment_results',
        ok({ ...RESULTAT, assessment_id: 'b1', total_co2_kg_year: 4700, assessments: { status: 'completed', submitted_at: '2026-06-02T08:00:00Z' } })
      );
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });

    expect(screen.getByText('Bilan du 2 juin 2026')).toBeTruthy();
    expect(screen.queryByText(/Ton bilan précédent/)).toBeNull();
    expect(screen.getByText('Ce bilan ne me ressemble pas')).toBeTruthy();
    expect(tablesEnAttente()).toEqual([]);
  });
});
