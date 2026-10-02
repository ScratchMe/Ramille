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
 * **Et deux contrats de plus le 01/10/2026, la vague produit de `v1-33`** — des branches d'état que le
 * parcours réel ne joue pas (il ne fait jamais échouer une lecture) :
 *   4. **une erreur du serveur ne parle pas de la connexion** (D19) : le genre de l'échec se calcule sur
 *      le statut de la lecture qui a échoué, et l'écran d'erreur comme la ligne de relecture le disent ;
 *   5. **des rappels qui n'ont rien rendu ne remplacent pas la dernière lecture** (relevé par le
 *      chantier B) : la carte d'attente reste, et la ligne de relecture s'allume.
 * Quatre mutations, chacune faisant tomber la sienne et aucune autre :
 *   - le bilan illisible toujours dit hors ligne (`echecDeLecture('horsLigne')`) → 4, « sur l'écran
 *     d'erreur » ;
 *   - les boucles illisibles toujours dites hors ligne → 4, « la relecture en échec du serveur » ;
 *   - `setRappels(prefs)` sans condition (l'état d'avant) → 5 ;
 *   - `prefs === null` retiré de la ligne de relecture → 5.
 *
 * **Et un sixième le 02/10/2026** (`v1-27` §12.28) : 6. **une reconnexion ne se compte pas comme un
 * rattachement** — le plan constate un compte rattaché sans annonce faite et émettait `connexion_success`,
 * que la session vienne d'un rattachement ou d'une reconnexion par code. L'émission vit dans l'écran,
 * aucune dérivation ne la porte, et le parcours réel ne lit pas la mesure. Deux mutations :
 *   - la marque de reconnexion ignorée (l'état d'avant) → 6, « ne compte pas une reconnexion » ;
 *   - l'émission jamais faite → 6, « compte un rattachement par email ».
 *
 * **Ce qu'il coûte** : douze modules doublés pour monter l'écran — le transport, le stockage local
 * de quatre marques, la navigation et ses deux contextes de pile, la mesure, et les composants qui
 * tirent `react-native-svg`. C'est le prix d'un écran qui lit dix sources ; le relevé de
 * `plan-pistes.test.tsx` en dit le reste.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import Plan from '@/app/(tabs)/plan/index';
import { Colors } from '@/constants/theme';

// ── Les doublures ─────────────────────────────────────────────────────────────────────────────

/** Ce que rend chaque lecture, par table ou par RPC — remplacé test par test. */
const mockLire = jest.fn<Promise<unknown>, [string]>();
/** L'utilisateur de la session, lu pour dire par quel chemin le compte a été rattaché. */
const mockUtilisateur = jest.fn<Promise<unknown>, []>();
/** L'annonce du rattachement déjà faite sur cet appareil ? La session vient-elle d'une reconnexion ? */
const mockAnnonceVue = jest.fn<Promise<boolean>, []>();
const mockReconnexion = jest.fn<Promise<boolean>, []>();
const mockEtatDuRattachement = jest.fn<Promise<unknown>, []>();
const mockTrack = jest.fn();

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
      auth: { getUser: () => mockUtilisateur() },
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
jest.mock('@/lib/analytics', () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
jest.mock('@/lib/connexion-prefs', () => ({
  aVuRattachementAnnonce: () => mockAnnonceVue(),
  vientDUneReconnexion: () => mockReconnexion(),
  marquerRattachementAnnonce: async () => {},
  aVuEngagementOrphelin: async () => true,
  marquerEngagementOrphelinVu: async () => {},
}));
/** La carte d'ouverture de saison a-t-elle été vue sur cet appareil ? Vue, sauf où un test dit non. */
const mockVuLaSaison = jest.fn<Promise<boolean>, [string]>();
const mockMarquerLaSaison = jest.fn<Promise<void>, [string]>();
jest.mock('@/lib/saison-prefs', () => ({
  aVuLouvertureDeSaison: (cycle: string) => mockVuLaSaison(cycle),
  marquerLouvertureDeSaisonVue: (cycle: string) => mockMarquerLaSaison(cycle),
}));
jest.mock('@/lib/premier-parcours', () => ({ aVuLePremierPlan: async () => true, marquerLePremierPlanVu: async () => {} }));
jest.mock('@/lib/compte', () => ({ lireEtatDuRattachement: () => mockEtatDuRattachement() }));
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
  mockUtilisateur.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  mockAnnonceVue.mockReset().mockResolvedValue(true);
  mockReconnexion.mockReset().mockResolvedValue(false);
  mockEtatDuRattachement.mockReset().mockResolvedValue({ kind: 'local' });
  mockTrack.mockReset();
  mockPrefs.mockReset().mockResolvedValue(PREFS);
  mockVuLaSaison.mockReset().mockResolvedValue(true);
  mockMarquerLaSaison.mockReset().mockResolvedValue(undefined);
  (router.push as jest.Mock).mockClear();
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

/**
 * **« Choisir une action » de la carte de saison amène la première piste du plan** (D16 de `v1-33`,
 * 01/10/2026 ; audit P-14). Le parcours réel ne joue jamais une ouverture de saison — il lui faudrait un
 * cycle précédent et un jour dans les deux premières semaines du cycle —, donc ce câblage n'est vu
 * qu'ici : la carte se referme, la liste ne s'ouvre pas, et le focus part au geste sur le bloc de la
 * première carte, qui l'annonce par son titre. Le défilement, lui, demande une vraie mise en page.
 *
 * Éprouvé en le cassant, le 01/10/2026, chacune faisant tomber la sienne et aucune autre :
 *   - « Choisir une action » qui pousse encore `/plan/pistes` (l'état d'avant) → « referme la carte… » ;
 *   - le focus jamais donné (`donnerLeFocus` retiré du geste) → la même, sur le focus ;
 *   - « Choisir une autre » qui n'ouvre plus la liste → « « Choisir une autre » mène toujours… ».
 */
describe('Plan — la carte de saison, « Choisir une action »', () => {
  /** Aujourd'hui en `YYYY-MM-DD` local : la carte ne vit que les deux premières semaines du cycle. */
  const jour = (decalageEnMois = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + decalageEnMois);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const action = (id: string, rang: number, texte: string, engagee = false) => ({
    id,
    action_template_id: `g${rang}`,
    saving_kg_year: 600 - rang * 100,
    saving_share_percent: 10,
    detail_text: null,
    first_step: null,
    rank: rang,
    committed_at: engagee ? '2026-09-02T10:00:00Z' : null,
    intention_days: engagee ? [2] : null,
    intention_timing: null,
    carried_over_from: null,
    action_templates: { action_text: texte, poste: 'commute' },
  });
  const cycles = (engagee: boolean) => [
    {
      ...CYCLE,
      id: 'c2',
      period_start: jour(),
      period_end: jour(3),
      baseline_co2_kg_year: 1000,
      plan_actions: [
        action('a1', 1, 'Passer deux trajets sur cinq en train', engagee),
        action('a2', 2, 'Faire un trajet sur cinq à vélo'),
      ],
    },
    { ...CYCLE, id: 'c1', period_start: jour(-3), period_end: jour(-1) },
  ];

  let focus: jest.SpyInstance;
  beforeEach(() => {
    focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    mockVuLaSaison.mockResolvedValue(false);
  });
  afterEach(() => focus.mockRestore());

  it('referme la carte et amène la première piste, sans ouvrir la liste', async () => {
    lectures({ plan_cycles: async () => ({ data: cycles(false), error: null }) });
    render(<Plan />);
    const choisir = await screen.findByRole('button', { name: 'Choisir une action' });

    fireEvent.press(choisir);

    expect(router.push).not.toHaveBeenCalledWith('/plan/pistes');
    expect(screen.queryByRole('button', { name: 'Choisir une action' })).toBeNull();
    expect(mockMarquerLaSaison).toHaveBeenCalledWith('c2');
    const vise = focus.mock.calls.filter(([, evenement]) => evenement === 'focus').at(-1)?.[0] as
      | { props?: { accessibilityLabel?: string } }
      | undefined;
    expect(vise?.props?.accessibilityLabel).toMatch(/^Passer deux trajets sur cinq en train\./);
  });

  it('« Choisir une autre » mène toujours à la liste, où l’on change d’action', async () => {
    lectures({ plan_cycles: async () => ({ data: cycles(true), error: null }) });
    render(<Plan />);
    fireEvent.press(await screen.findByRole('button', { name: 'Choisir une autre' }));
    expect(router.push).toHaveBeenCalledWith('/plan/pistes');
  });
});

/**
 * **L'accent de la carte du point, quand deux points sont ouverts, va à la question de l'engagement**
 * (`v1-33` §6, tranché le 01/10/2026). `accentDesPoints` a ses tests ; ce qui ne se voit qu'ici est
 * l'**appel** — que l'écran passe la liste affichée, le libellé du cycle et l'action engagée relue —, et
 * le parcours réel n'ouvre jamais deux points à la fois.
 *
 * Éprouvé en le cassant, le 01/10/2026 : l'écran qui garde la règle d'avant
 * (`emphasize={checkin.trip_label === cycle.trip_label}`) fait tomber ce test, et lui seul.
 */
describe('Plan — l’accent des deux points ouverts', () => {
  const VOL = 'Renoncer à un vol long-courrier cette année';
  const point = (surcharge: Record<string, unknown>) => ({
    loop_type: 'commute',
    period_label: 'Semaine du 22 septembre',
    trip_label: CYCLE.trip_label,
    poste: 'commute',
    period_start: '2026-09-22',
    question_kind: 'generique',
    mode: null,
    committed_question: 'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?',
    committed_action_text: null,
    status: 'pending',
    response_kind: null,
    responded_at: null,
    ...surcharge,
  });

  it('va au point du mois qui referme l’engagement, et non au poste dominant', async () => {
    lectures({
      plan_cycles: async () => ({
        data: [
          {
            ...CYCLE,
            plan_actions: [
              {
                id: 'a1',
                action_template_id: 'g1',
                saving_kg_year: 1601,
                saving_share_percent: 30,
                detail_text: null,
                first_step: null,
                rank: 1,
                committed_at: '2026-09-02T10:00:00Z',
                intention_days: null,
                intention_timing: 'au_prochain_voyage',
                carried_over_from: null,
                action_templates: { action_text: VOL, poste: 'travel' },
              },
            ],
          },
        ],
        error: null,
      }),
      engagement_checkins: async () => ({
        data: [
          point({ id: 'p1' }),
          point({
            id: 'p2',
            loop_type: 'extras',
            period_label: 'Septembre 2026',
            trip_label: 'Voyages longue distance (Avion)',
            poste: 'travel',
            period_start: '2026-09-01',
            question_kind: 'occasion',
            committed_question: 'En septembre, as-tu renoncé à un vol long-courrier ?',
            committed_action_text: VOL,
          }),
        ],
        error: null,
      }),
    });
    render(<Plan />);
    const couleur = async (texte: string) => {
      const etiquette = await screen.findByText(texte);
      return [etiquette.props.style].flat(Infinity).reduce((c, st) => (st && st.color ? st.color : c), null);
    };
    expect(await couleur('Septembre 2026')).toBe(Colors.light.accentText);
    expect(await couleur('Semaine du 22 septembre')).toBe(Colors.light.textTertiary);
  });
});

// ── Le rattachement constaté, et ce qui se compte ─────────────────────────────────────────────

describe('Plan — un rattachement se compte, une reconnexion non (`v1-27` §12.28)', () => {
  /** Un compte rattaché par email, dont l'annonce n'a jamais été faite sur cet appareil. */
  function unCompteRattacheSansAnnonce() {
    lectures();
    mockAnnonceVue.mockResolvedValue(false);
    mockEtatDuRattachement.mockResolvedValue({ kind: 'rattache', email: 'camille@exemple.fr' });
    mockUtilisateur.mockResolvedValue({ data: { user: { identities: [{ provider: 'email' }] } }, error: null });
  }
  const ANNONCE = 'Ton compte est rattaché à camille@exemple.fr. Ton bilan te suit d’un appareil à l’autre.';
  const succes = () => mockTrack.mock.calls.filter(([nom]) => nom === 'connexion_success');

  it('compte un rattachement par email constaté, et l’annonce', async () => {
    unCompteRattacheSansAnnonce();
    render(<Plan />);
    expect(await screen.findByText(ANNONCE)).toBeTruthy();
    await waitFor(() => expect(succes()).toEqual([['connexion_success', { method: 'email' }]]));
  });

  it('ne compte pas une reconnexion, et l’annonce quand même — elle dit vrai', async () => {
    unCompteRattacheSansAnnonce();
    mockReconnexion.mockResolvedValue(true);
    render(<Plan />);
    expect(await screen.findByText(ANNONCE)).toBeTruthy();
    // Le test d'une absence laisse au défaut le temps d'arriver : la lecture de la reconnexion a eu
    // lieu, et c'est elle qui décide de l'émission (`TESTING.md` §1.1).
    await waitFor(() => expect(mockReconnexion).toHaveBeenCalled());
    await act(async () => {});
    expect(succes()).toEqual([]);
  });
});
