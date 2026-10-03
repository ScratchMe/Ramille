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
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1), sur un fichier égal au commit et
 * restauré depuis sa copie :
 *   - le cycle courant attendu après le résultat (l'état d'avant, pour lui seul) → « toutes les
 *     lectures partent au montage… », sur la liste des requêtes en vol ; et « une lecture tolérante
 *     qui échoue ou lève… », dont la libération du cycle ne trouve alors aucune requête en vol ;
 *   - le précédent absent du premier rendu prêt (`precedent: null`, la barre d'avant) → « toutes les
 *     lectures partent au montage… », seul, sur « Ton bilan précédent · juin » ;
 *   - le chargement sans la bande haute (l'état d'avant R-9) → la même, seule, sur la bande. **Cette
 *     ligne ne vaut plus depuis le 03/10/2026** : l'écran ne rend plus la bande, sa pile la pose une
 *     fois autour de tous ses états (`v1-33` T-13), et c'est `cadre-des-piles.test.tsx` qui la garde ;
 *     ici, c'est son absence qui se garde — `<BandeHaute />` remis dans le chargement → la même, seule,
 *     sur une bande en double (03/10/2026) ;
 *   - `immediate` retiré de la ligne de chargement → la même, et « la bannière de compte est dans le
 *     premier rendu prêt… », qui la lit aussi : la ligne n'est pas là au premier rendu (03/10/2026) ;
 *   - le `.catch` de la lecture des bilans valides retiré → « une lecture tolérante qui échoue ou
 *     lève… », seul : l'écran d'erreur prend la place ;
 *   - le `.catch` de la fréquence des loisirs retiré → la même, seule ;
 *   - le cycle lu aussi en relecture → « en relecture, le cycle n'est pas lu… », seul.
 *
 * **Ce qu'il coûte, mesuré le même jour** : 3 tests, 4 modules doublés, ≈ 0,15 s de tests sur
 * ≈ 2,5 s pour le fichier (le chargement de l'écran et de ses dépendances fait le reste). Avec les
 * cinq tests ajoutés plus bas (01/10/2026, la page et la bannière) : 8 tests, ≈ 0,28 s de tests sur
 * ≈ 2,8 s pour le fichier.
 *
 * **Un quatrième test garde l'ordre de la page** (01/10/2026, décisions D9 et D11 de `v1-33` §5) : le
 * total juste sous la carte dominante, les deux liens de contestation juste sous le total, la fin de
 * page réduite au partage et au nouveau bilan. C'est une décision de produit, prise sur une mesure
 * (le chiffre était sous le pied collant), et rien d'autre ne la tient : aucune dérivation de
 * `src/types` ne voit un bloc déplacé, et le parcours réel attend des textes, jamais leur rang. Il
 * lit l'ordre du **texte** rendu, pas des pixels — ce que la page mesure à l'écran reste à la recette.
 *   **Éprouvé en le cassant, le 01/10/2026** : trois mutations, relevées sur le test lui-même.
 *
 * **Et trois tests gardent la bannière de compte** (même jour) : elle arrive avec le résultat, dans le
 * premier rendu prêt, et non une image après lui — une insertion au-dessus du total, qui le décalait de
 * 92 px. La session est la quatrième lecture du montage, tolérante comme les trois autres ; elle n'est
 * pas lue en relecture ; et ce que l'écran en tire (anonyme sans adresse en attente) est épinglé par
 * ligne de table, parce que `etatDeLaBanniere` ne voit pas ce que l’écran lui passe. Six mutations,
 * relevées sur chaque test.
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import BilanResultat from '@/app/(tabs)/suivi/bilan';
import { APP_NAME } from '@/constants/produit';

// ── Les doublures ─────────────────────────────────────────────────────────────────────────────
//
// Quatre modules : le transport, la navigation, la mesure (qui partirait vers le transport), et la
// marque locale (AsyncStorage) — reanimated l'est déjà pour toute la suite.

type Requete = {
  table: string;
  filtres: unknown[][];
  repondre: (reponse: unknown) => void;
  lever: (exception: unknown) => void;
};
const mockEnAttente: Requete[] = [];
let mockParams: { id?: string; nouveau?: string } = {};
// La session que lit la bannière de compte : rendue tout de suite par défaut, retenue ou levée à la demande.
let mockSession: { user: { is_anonymous: boolean; new_email?: string } } | null = null;
let mockSessionRetenue = false;
let mockSessionLeve = false;
let mockAppelsDeSession = 0;
const mockSessionsEnAttente: ((valeur: unknown) => void)[] = [];

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
      // La bannière de compte lit la session avec le résultat : sans session, elle ne se rend pas.
      auth: {
        getSession: () => {
          mockAppelsDeSession += 1;
          if (mockSessionLeve) return Promise.reject(new TypeError('Network request failed'));
          if (mockSessionRetenue) return new Promise((repondre) => mockSessionsEnAttente.push(repondre));
          return Promise.resolve({ data: { session: mockSession } });
        },
      },
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

/** Les textes de l'arbre rendu, **dans l'ordre où la page les porte** — de haut en bas. */
function textesDansLOrdre(noeud: unknown): string[] {
  if (noeud === null || noeud === undefined) return [];
  if (typeof noeud === 'string') return [noeud];
  if (Array.isArray(noeud)) return noeud.flatMap(textesDansLOrdre);
  return textesDansLOrdre((noeud as { children?: unknown }).children);
}

/** Libère la requête en attente sur `table` (la première), avec sa réponse ou son exception. */
function liberer(table: string, issue: { reponse: unknown } | { exception: unknown }) {
  const rang = mockEnAttente.findIndex((r) => r.table === table);
  if (rang < 0) throw new Error(`aucune requête en attente sur ${table}`);
  const [requete] = mockEnAttente.splice(rang, 1);
  if ('reponse' in issue) requete.repondre(issue.reponse);
  else requete.lever(issue.exception);
}

const ok = (data: unknown) => ({ reponse: { data, error: null } });

/** Ce que rend la lecture du résultat : le résultat, avec le statut et la date de son bilan. */
const resultatLu = (soumisLe: string, champs: Partial<typeof RESULTAT> = {}) =>
  ok({ ...RESULTAT, ...champs, assessments: { status: 'completed', submitted_at: soumisLe } });

beforeEach(() => {
  mockEnAttente.length = 0;
  mockSession = null;
  mockSessionRetenue = false;
  mockSessionLeve = false;
  mockAppelsDeSession = 0;
  mockSessionsEnAttente.length = 0;
});

const LIGNE_DE_COMPTE = 'Ce bilan n’est accessible que depuis cet appareil.';

describe('la restitution d’un re-bilan', () => {
  it('toutes les lectures partent au montage, et la comparaison est là au premier rendu prêt', async () => {
    mockParams = { id: 'b2', nouveau: '1' };
    render(<BilanResultat />);
    await act(async () => {});

    // Le chargement se dit au premier rendu (`immediate`). Et l'écran ne rend pas la bande : sa pile la
    // pose autour de tous ses états (`cadre-des-piles.test.tsx`), et une seconde se lirait en double.
    expect(screen.getByText('Chargement de ton bilan…')).toBeTruthy();
    expect(screen.queryByText(APP_NAME)).toBeNull();
    // Un seul aller-retour : le résultat, les bilans valides, le cycle courant et la fréquence des
    // loisirs sont tous en vol avant que le premier ne réponde.
    expect(tablesEnAttente()).toEqual([
      'assessment_answers',
      'assessment_results',
      'assessments',
      'plan_cycles',
    ]);

    await act(async () => {
      liberer('assessment_results', resultatLu('2026-10-01T09:00:00Z'));
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
    expect(screen.queryByText(APP_NAME)).toBeNull();
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
    // La session de la bannière lève aussi : la quatrième lecture du montage, tolérante comme les trois autres.
    mockSession = { user: { is_anonymous: true } };
    mockSessionLeve = true;
    render(<BilanResultat />);
    await act(async () => {});

    await act(async () => {
      liberer('assessment_results', resultatLu('2026-10-01T09:00:00Z'));
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
    expect(screen.queryByText(LIGNE_DE_COMPTE)).toBeNull();
    // Sans précédent, pas de cycle d'alors à demander.
    expect(tablesEnAttente()).toEqual([]);
    console_.mockRestore();
  });

  it('en relecture, le cycle n’est pas lu : le palier n’appartient qu’au bilan qu’on vient de soumettre', async () => {
    mockParams = { id: 'b1' };
    // Une session anonyme, qui ferait rendre la ligne partout ailleurs : en relecture elle n'est ni lue ni rendue.
    mockSession = { user: { is_anonymous: true } };
    render(<BilanResultat />);
    await act(async () => {});

    expect(tablesEnAttente()).toEqual(['assessment_answers', 'assessment_results', 'assessments']);

    await act(async () => {
      liberer(
        'assessment_results',
        resultatLu('2026-06-02T08:00:00Z', { assessment_id: 'b1', total_co2_kg_year: 4700 })
      );
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });

    expect(screen.getByText('Bilan du 2 juin 2026')).toBeTruthy();
    expect(screen.queryByText(/Ton bilan précédent/)).toBeNull();
    expect(screen.getByText('Ce bilan ne me ressemble pas')).toBeTruthy();
    expect(tablesEnAttente()).toEqual([]);
    expect(screen.queryByText(LIGNE_DE_COMPTE)).toBeNull();
    expect(mockAppelsDeSession).toBe(0);
  });

  // **L'ordre de la page** (D9 et D11 du 01/10/2026). À 390 × 844, à la sortie du questionnaire, le
  // total se rendait sous le pied collant : la répartition par poste s'était glissée entre la carte
  // dominante et lui, et deux liens de contestation fermaient la page, à ≈ 650 px du chiffre qu'ils
  // contestent. La décision : le total juste sous la carte dominante, « Un chiffre me semble faux » et
  // le retrait sous « Comment ce chiffre est calculé », et en fin de page le partage et le nouveau
  // bilan seulement. Le lien du retrait est dans la séquence : sa place arrive avec le résultat, dans
  // le même aller-retour (c'est ce que garde le premier test), donc il est là dès le premier rendu
  // prêt et ne décale pas le total en arrivant après lui.
  //
  // Les deux moitiés comptent : la séquence entière est croissante (le total n'est pas remonté sans
  // que la contestation le suive), **et** la fin de page ne conteste plus rien — la séquence ne lit
  // que la première occurrence d'un texte, donc un lien recopié en fin de page lui échapperait.
  //
  // **Éprouvé en le cassant, le 01/10/2026**, sur un fichier égal au commit, le témoin sans mutation
  // vert ; chaque mutation remise en place depuis une copie, et `diff` vide ensuite :
  //   - la répartition par poste remise entre la carte dominante et le total (l'état d'avant D9) → la
  //     séquence, seule : « Répartition par poste » devant « Estimation annuelle… » ;
  //   - les deux liens de contestation remis dans le bloc de fin de page (l'état d'avant D11) → la
  //     séquence, seule : les deux liens passent après « Faire un nouveau bilan » ;
  //   - un lien de contestation **recopié** en fin de page, le total gardé (la séquence reste
  //     croissante) → la fin de page, seule : « Un chiffre me semble faux » après « Où tu te situes ».
  it('le total suit la carte dominante, la contestation suit le total, la fin de page ne conteste plus rien', async () => {
    mockParams = { id: 'b2', nouveau: '1' };
    render(<BilanResultat />);
    await act(async () => {});
    await act(async () => {
      liberer('assessment_results', resultatLu('2026-10-01T09:00:00Z'));
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('plan_cycles', ok({ id: 'cycle-oct', baseline_co2_kg_year: 1920, target_reduction_pct: 20 }));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });

    const textes = textesDansLOrdre(screen.toJSON());
    const sequence = [
      'Ton bilan transport',
      'Ton trajet domicile-travail en voiture thermique',
      'Estimation annuelle, tous déplacements',
      'Comment ce chiffre est calculé',
      'Un chiffre me semble faux',
      'Ce bilan ne me ressemble pas',
      'Répartition par poste',
      'Où tu te situes',
      'Partager mon bilan',
      'Faire un nouveau bilan',
    ];
    const rangs = sequence.map((texte) => ({ texte, rang: textes.indexOf(texte) }));
    // Chaque texte est là : sans cette moitié, un rang à -1 passerait pour « avant tout le reste ».
    expect(rangs.filter(({ rang }) => rang < 0)).toEqual([]);
    expect(rangs.map(({ texte }) => texte)).toEqual(
      [...rangs].sort((a, b) => a.rang - b.rang).map(({ texte }) => texte)
    );

    // La fin de page : après « Où tu te situes », le partage et le nouveau bilan, et rien qui conteste.
    const apres = textes.slice(textes.indexOf('Où tu te situes'));
    expect(apres).not.toContain('Un chiffre me semble faux');
    expect(apres).not.toContain('Ce bilan ne me ressemble pas');
  });

  // **La bannière de compte arrive avec le résultat, pas une image après** (01/10/2026). Lue par un
  // effet à part une fois l'écran prêt, elle posait sa ligne au-dessus du total, qu'elle décalait de
  // 92 px — mesuré sur l'export, une image après le premier rendu prêt : le chiffre que D9 venait de
  // remonter pour qu'on le voie sautait sous les yeux. La session est lue au montage, avec les trois
  // autres lectures, et l'écran n'est prêt qu'avec elle : c'est ce que ce test retient — la session
  // est la seule à ne pas revenir, et l'écran attend encore.
  //
  // **Éprouvé en le cassant, le 01/10/2026**, la source remise en place depuis une copie (`diff` vide) :
  // la session lue par un effet à part, après l'état prêt (l'état d'avant) → ce test, seul, sur la
  // lecture au montage (un appel au lieu de zéro) ; la session lue au montage mais que rien n'attend
  // → ce test sur « Chargement de ton bilan… » (l'écran était déjà prêt), et la ligne d'une session
  // anonyme, qui arrive après lui ; son `try/catch` retiré → « une lecture tolérante… », seul ; la
  // session lue aussi en relecture → « en relecture… », seul.
  it('la bannière de compte est dans le premier rendu prêt : l’écran attend la session avec le reste', async () => {
    mockParams = { id: 'b2', nouveau: '1' };
    mockSession = { user: { is_anonymous: true } };
    mockSessionRetenue = true;
    render(<BilanResultat />);
    await act(async () => {});

    // Lue au montage, avec les autres lectures — pas après elles.
    expect(mockAppelsDeSession).toBe(1);
    await act(async () => {
      liberer('assessment_results', resultatLu('2026-10-01T09:00:00Z'));
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('plan_cycles', ok({ id: 'cycle-oct', baseline_co2_kg_year: 1920, target_reduction_pct: 20 }));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });
    // Tout est revenu sauf la session : l'écran n'est pas prêt, donc rien ne peut s'insérer après lui.
    expect(screen.getByText('Chargement de ton bilan…')).toBeTruthy();
    expect(screen.queryByText('Estimation annuelle, tous déplacements')).toBeNull();

    await act(async () => {
      for (const repondre of mockSessionsEnAttente.splice(0)) repondre({ data: { session: mockSession } });
    });
    expect(screen.getByText('Estimation annuelle, tous déplacements')).toBeTruthy();
    expect(screen.getByText(LIGNE_DE_COMPTE)).toBeTruthy();
  });

  // Le câblage de la ligne, que `etatDeLaBanniere` ne voit pas : ce que l'écran lui passe. Anonyme sans
  // adresse en attente, la ligne se rend ; un compte rattaché, ou une adresse à confirmer, non. Une
  // session absente laisse la ligne absente (c'est le défaut du test précédent, et celui de tous les
  // autres). Éprouvé le 01/10/2026 : `estAnonyme: true` en dur → le compte rattaché la voit ; l'adresse en
  // attente ignorée → la seconde la voit.
  it.each([
    ['une session anonyme', { user: { is_anonymous: true } }, true],
    ['un compte rattaché', { user: { is_anonymous: false } }, false],
    ['une adresse à confirmer', { user: { is_anonymous: true, new_email: 'a@exemple.fr' } }, false],
  ])('la ligne de compte, avec %s', async (_nom, session, seRend) => {
    mockParams = { id: 'b2', nouveau: '1' };
    mockSession = session;
    render(<BilanResultat />);
    await act(async () => {});
    await act(async () => {
      liberer('assessment_results', resultatLu('2026-10-01T09:00:00Z'));
      liberer('assessments', ok(BILANS_VALIDES));
      liberer('plan_cycles', ok({ id: 'cycle-oct', baseline_co2_kg_year: 1920, target_reduction_pct: 20 }));
      liberer('assessment_answers', ok({ leisure_frequency: 'souvent' }));
    });
    expect(screen.getByText('Estimation annuelle, tous déplacements')).toBeTruthy();
    expect(screen.queryByText(LIGNE_DE_COMPTE) !== null).toBe(seRend);
  });
});
