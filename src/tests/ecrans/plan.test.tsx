/**
 * L'écran du plan : l'ordre de ses états quand ses deux premières lectures partent ensemble, et une
 * relance qui répond sous le doigt (audits P-9 et P-8, 01/10/2026).
 *
 * **Pourquoi un test d'écran** (`TESTING.md` §2.10) : les deux décisions vivent dans l'écran — l'ordre
 * dans lequel il lit ses résultats, et l'état d'un contrôle pendant une lecture qu'il a demandée —,
 * aucune dérivation de `src/types` ne les porte, et le parcours réel ne joue ni une lecture en échec
 * ni une relance. Ce sont des **branches d'état**, la famille que le critère vise.
 *
 *   1. **« Pas de bilan » gagne sur un cycle illisible, et un bilan illisible gagne sur tout** (P-9).
 *      Les deux lectures partaient l'une après l'autre ; elles partent ensemble, et l'écran doit lire
 *      leurs résultats dans l'ordre d'avant — sans quoi quelqu'un sans bilan lirait une panne.
 *   2. **Les deux lectures partent ensemble** : la seconde est lancée avant que la première ne rende.
 *   3. **« Réessayer » de la ligne de relecture répond sous le doigt** (P-8) : inactif pendant la
 *      lecture qu'il a demandée, relâché à sa fin, même quand elle échoue encore — le `finally`.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1), chacune faisant tomber la sienne et
 * aucune autre :
 *   - le cycle illisible décidé avant « pas de bilan » → 1, son premier cas ;
 *   - les deux lectures remises en séquence (`await` du bilan avant de lancer le cycle) → 2 ;
 *   - la relance qui n'appelle plus que `rafraichir` (l'état d'avant) → 3, « inactif pendant » ;
 *   - le `finally` qui ne relâche plus la relance → 3, « relâché à la fin ».
 *
 * **Ce qu'il coûte** : douze modules doublés pour monter l'écran — le transport, le stockage local
 * de quatre marques, la navigation et ses deux contextes de pile, la mesure, et les composants qui
 * tirent `react-native-svg`. C'est le prix d'un écran qui lit dix sources ; le relevé de
 * `plan-pistes.test.tsx` en dit le reste.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import Plan from '@/app/(tabs)/plan/index';

// ── Les doublures ─────────────────────────────────────────────────────────────────────────────

/** Ce que rend chaque lecture, par table ou par RPC — remplacé test par test. */
const mockLire = jest.fn<Promise<unknown>, [string]>();

jest.mock('@/lib/supabase', () => {
  // Un constructeur de requête qui se chaîne sur toutes les méthodes que l'écran appelle, et se
  // résout sur ce que le test a prévu pour sa table.
  const requete = (table: string) => {
    const r: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'in', 'gte']) r[m] = () => r;
    r.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => mockLire(table).then(ok, ko);
    return r;
  };
  return {
    supabase: {
      from: (table: string) => requete(table),
      rpc: (nom: string) => mockLire(`rpc:${nom}`),
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    },
  };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({}),
  useScrollToTop: () => {},
}));
// **Des fonctions stables, comme les vraies** : `laBarreArrive` est une dépendance de l'effet de
// chargement, et une fonction neuve à chaque rendu relancerait la lecture à chaque rendu — le
// premier essai de ce fichier tournait ainsi en rond, et la relance ne se relâchait jamais.
jest.mock('@/app/(tabs)/plan/_layout', () => {
  const passage = { deposer: () => {}, reprendre: () => null, aMontrer: () => false };
  return { usePassageDEngagement: () => passage };
});
jest.mock('@/app/(tabs)/_layout', () => {
  const parcours = { etape: null, laBarreArrive: () => {}, lesDeuxLieuxSontVus: () => {} };
  return { usePremierParcours: () => parcours };
});
jest.mock('@/hooks/use-rafraichir-au-retour', () => ({ useRafraichirAuRetour: () => {} }));
jest.mock('@/hooks/use-reprendre-l-engagement', () => ({ useReprendreLEngagement: () => {} }));
jest.mock('@/hooks/use-track-focus', () => ({ useTrackFocus: () => {} }));
jest.mock('@/lib/analytics', () => ({ track: () => {} }));
jest.mock('@/lib/connexion-prefs', () => ({
  aVuRattachementAnnonce: async () => true,
  marquerRattachementAnnonce: async () => {},
  aVuEngagementOrphelin: async () => true,
  marquerEngagementOrphelinVu: async () => {},
}));
jest.mock('@/lib/saison-prefs', () => ({
  aVuLouvertureDeSaison: async () => true,
  marquerLouvertureDeSaisonVue: async () => {},
}));
jest.mock('@/lib/premier-parcours', () => ({ aVuLePremierPlan: async () => true, marquerLePremierPlanVu: async () => {} }));
jest.mock('@/lib/compte', () => ({ lireEtatDuRattachement: async () => ({ kind: 'local' }) }));
/** Les réglages de rappel lus — `null` quand rien n'a été lu (`loadReminderPrefs`, T-6). */
const mockPrefs = jest.fn<Promise<unknown>, []>();
jest.mock('@/lib/notification-prefs', () => ({
  loadReminderPrefs: () => mockPrefs(),
  aDejaVuLaFeuilleDeRappel: async () => true,
  aDejaProposeLaVeille: async () => true,
  lireLaFenetreDuMotDeLaVeille: async () => null,
}));
jest.mock('@/lib/rappels', () => ({ lirePermission: async () => 'fermee' }));
// Ce qui dessine — la bande et son icône de compte, la mascotte, l'illustration, la feuille : rien de
// ce que ce fichier garde, et `react-native-svg` ne se charge pas ici.
jest.mock('@/components/bande-haute', () => ({ BandeHaute: () => null }));
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/illustrations/empty-state-illustration', () => ({ EmptyStateIllustration: () => null }));
jest.mock('@/components/plan/feuille-rappels', () => ({ FeuilleRappels: () => null }));

// ── Les lectures ──────────────────────────────────────────────────────────────────────────────

const CYCLE = {
  id: 'c1',
  period_label: 'Automne 2026',
  period_start: '2026-09-01',
  period_end: '2026-11-30',
  cadence_type: 'season',
  trip_label: 'Trajet domicile-travail',
  poste: 'commute',
  baseline_co2_kg_year: 0,
  target_reduction_pct: 20,
  plan_actions: [],
};

/** Un plan lu, sauf ce que `surcharge` change — table par table, RPC par RPC. */
function lectures(surcharge: Record<string, () => Promise<unknown>> = {}) {
  const base: Record<string, () => Promise<unknown>> = {
    assessments: async () => ({ data: { id: 'b1', submitted_at: '2026-09-10T10:00:00Z' }, error: null }),
    plan_cycles: async () => ({ data: [CYCLE], error: null }),
    engagement_checkins: async () => ({ data: [], error: null }),
    assessment_results: async () => ({ data: { total_co2_kg_year: 11 }, error: null }),
    'rpc:mes_boucles_a_venir': async () => ({ data: [], error: null }),
    assessment_answers: async () => ({ data: null, error: null }),
    plan_action_commitments_archive: async () => ({ data: [], count: 0, error: null }),
    ...surcharge,
  };
  mockLire.mockImplementation((cle) => (base[cle] ?? (async () => ({ data: null, error: null })))());
}

/** Hors ligne : la requête n'a pas eu de réponse HTTP — le `catch` du transport pose `status: 0`. */
const panne = async () => ({ data: null, error: { message: 'réseau' }, status: 0 });
/** Le serveur a répondu, en échec. */
const panneDuServeur = async () => ({ data: null, error: { message: 'Internal Server Error' }, status: 500 });

const PREFS = {
  prefere: 'none',
  jetonActif: false,
  emailPossible: false,
  email: null,
  reponseALaVeille: null,
};

beforeEach(() => {
  mockLire.mockReset();
  mockPrefs.mockReset().mockResolvedValue(PREFS);
});

describe('Plan — l’ordre des états, les deux premières lectures parties ensemble', () => {
  it('dit « pas de bilan » plutôt qu’une panne quand seul le cycle est illisible', async () => {
    lectures({ assessments: async () => ({ data: null, error: null }), plan_cycles: panne });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText('Ton bilan n’est pas encore fait')).toBeTruthy());
    expect(screen.queryByText('Ton plan n’a pas pu être relu. Vérifie ta connexion.')).toBeNull();
  });

  it('dit la panne quand le bilan est illisible, même si le cycle a été lu', async () => {
    lectures({ assessments: panne });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText('Ton plan n’a pas pu être relu. Vérifie ta connexion.')).toBeTruthy());
  });

  it('lance la lecture du cycle sans attendre celle du bilan', async () => {
    let rendreLeBilan: (valeur: unknown) => void = () => {};
    lectures({ assessments: () => new Promise((rendre) => (rendreLeBilan = rendre)) });
    render(<Plan />);
    await waitFor(() => expect(mockLire).toHaveBeenCalledWith('assessments'));
    expect(mockLire).toHaveBeenCalledWith('plan_cycles');
    await act(async () => rendreLeBilan({ data: null, error: null }));
  });
});

describe('Plan — une relance répond sous le doigt', () => {
  const reessayer = () => screen.getByRole('button', { name: 'Réessayer' });
  const inactif = () => reessayer().props.accessibilityState?.disabled === true;

  it('rend « Réessayer » inactif pendant la lecture qu’il a demandée, et le relâche à sa fin', async () => {
    // Le plan est lu, mais pas ses boucles : la ligne de relecture s'allume au-dessus de lui.
    lectures({ 'rpc:mes_boucles_a_venir': panne });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText(/n’a pas pu être relu à l’instant/)).toBeTruthy());
    expect(inactif()).toBe(false);

    // La relecture demandée tient : le contrôle ne répond plus, et le dit.
    let rendreLeBilan: (valeur: unknown) => void = () => {};
    lectures({
      assessments: () => new Promise((rendre) => (rendreLeBilan = rendre)),
      'rpc:mes_boucles_a_venir': panne,
    });
    fireEvent.press(reessayer());
    expect(inactif()).toBe(true);
    // L'effet de chargement part après le rendu du geste : la lecture du bilan est lancée ensuite.
    await waitFor(() => expect(mockLire.mock.calls.filter(([cle]) => cle === 'assessments')).toHaveLength(2));
    expect(inactif()).toBe(true);

    // Elle échoue encore — la ligne reste, et le contrôle redevient actif : le `finally` le relâche.
    await act(async () => rendreLeBilan({ data: { id: 'b1', submitted_at: '2026-09-10T10:00:00Z' }, error: null }));
    await waitFor(() => expect(inactif()).toBe(false));
    expect(screen.getByText(/n’a pas pu être relu à l’instant/)).toBeTruthy();
  });
});

describe('Plan — une erreur du serveur ne parle pas de la connexion (D19)', () => {
  it('dit la panne du serveur sans nommer la connexion, sur l’écran d’erreur', async () => {
    lectures({ assessments: panneDuServeur });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText('Ton plan n’a pas pu être relu. Réessaie dans un instant.')).toBeTruthy());
    expect(screen.queryByText(/connexion/)).toBeNull();
  });

  it('dit la coupure telle qu’elle était, hors ligne', async () => {
    lectures({ plan_cycles: panne });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText('Ton plan n’a pas pu être relu. Vérifie ta connexion.')).toBeTruthy());
  });

  it('dit la relecture en échec du serveur sans nommer la connexion', async () => {
    lectures({ 'rpc:mes_boucles_a_venir': panneDuServeur });
    render(<Plan />);
    await waitFor(() =>
      expect(
        screen.getByText('Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.')
      ).toBeTruthy()
    );
    expect(screen.queryByText(/connexion/)).toBeNull();
  });
});

describe('Plan — des rappels qui n’ont rien rendu ne remplacent pas la dernière lecture', () => {
  it('garde la carte d’attente, et allume la ligne de relecture', async () => {
    // Première lecture : tout est lu sauf le total — la ligne s'allume, la carte d'attente est là.
    lectures({ assessment_results: panneDuServeur });
    render(<Plan />);
    await waitFor(() => expect(screen.getByText(/reviens quand tu veux/)).toBeTruthy());
    expect(screen.getByText(/n’a pas pu être relu à l’instant/)).toBeTruthy();

    // La relecture lit le total, mais pas les rappels : la carte reste, et la ligne aussi.
    lectures();
    mockPrefs.mockResolvedValue(null);
    fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(mockPrefs).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Réessayer' }).props.accessibilityState?.disabled).toBe(false));
    expect(screen.getByText(/reviens quand tu veux/)).toBeTruthy();
    expect(screen.getByText(/n’a pas pu être relu à l’instant/)).toBeTruthy();
  });
});
