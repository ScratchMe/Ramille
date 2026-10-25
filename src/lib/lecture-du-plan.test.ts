/**
 * La lecture du plan préchargée pendant le lancement, et reprise une fois (`v1-33` T-12, 03/10/2026).
 *
 * Ce que ce fichier garde, c'est le contrat du préchargement — ce que ni l'écran du plan ni le parcours
 * réel ne voient : le parcours ne compte pas les requêtes, et un préchargement jamais repris, ou repris
 * à tort, rendrait un plan plausible dans les deux cas. Le premier coûterait le gain ; le second
 * montrerait un plan lu à l'ouverture après une écriture, ou celui d'une autre session.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — six mutations :
 *   - `lectureDuPlan` qui ignore le préchargement (relit toujours) → « reprend la lecture préchargée »,
 *     et « ne sert qu'une fois », qui compte alors trois lectures ;
 *   - le préchargement gardé après usage (`prechargement = null` retiré) → « ne sert qu'une fois », et
 *     « un autre passage que le premier… », qui le retrouve ensuite ;
 *   - la fraîcheur ignorée → « est jetée quand elle est trop vieille » ;
 *   - `reprendre` ignoré → « un autre passage que le premier relit la base » ;
 *   - la session ignorée → « est jetée quand la session a changé » ;
 *   - le contrôle d'annulation retiré après le premier lot → « une lecture annulée s'arrête… ».
 *     Depuis l'étape 7b, ce contrôle suit le bilan et les cycles, et le cas d'origine ne le voit plus — le
 *     départ des points rend aussi « annulée » ; c'est « une lecture annulée le dit avant toute décision »
 *     qui tombe, rejoué le 25/10/2026.
 *
 * Et la lecture en une fournée (étape 7b de `v1-35`, 25/10/2026), cinq mutations :
 *   - les préférences lancées après le bilan → « les boucles, l'archive et les préférences partent avec
 *     le bilan » ; les boucles et l'archive lancées après lui → le même ;
 *   - le tableau d'un élément pas déplié pour les réponses de contexte → « le total et les réponses… » ;
 *   - le contrôle d'annulation retiré du départ des points → « une lecture annulée s'arrête… » ;
 *   - le `catch` qui rattrape le rejet des préférences quand personne ne l'attend, retiré → **rien ne
 *     tombe** : un rejet orphelin n'atteint pas le bac à sable de Jest. Il atteindrait, lui, le
 *     gestionnaire global des promesses rejetées, qui le remonterait comme une panne de l'app.
 */
import {
  FRAICHEUR_DU_PRECHARGEMENT,
  lectureDuPlan,
  lireLePlan,
  prechargerLePlan,
} from '@/lib/lecture-du-plan';

// Chaque lecture commence par `assessments` : le compte de ces appels est le compte des lectures. Le
// bilan rendu dit si la lecture s'arrête là (`sans_bilan`) ou va jusqu'aux points. `tables` garde l'ordre
// des lectures, `bilanRetenu` fait attendre le bilan, et `prefs` dit ce que rendent les préférences.
const mockBase = {
  lectures: 0,
  points: 0,
  tables: [] as string[],
  utilisateur: 'u1' as string | null,
  bilan: null as unknown,
  bilanRetenu: null as Promise<void> | null,
  prefs: (): Promise<unknown> => Promise.resolve(null),
};

jest.mock('@/lib/supabase', () => {
  const chaine = (reponse: Promise<unknown>): unknown => {
    const maillon: Record<string, unknown> = {};
    for (const methode of ['select', 'eq', 'in', 'gte', 'order', 'limit']) maillon[methode] = () => maillon;
    maillon.maybeSingle = () => reponse;
    maillon.then = (resoudre: (valeur: unknown) => unknown, rejeter: (raison: unknown) => unknown) =>
      reponse.then(resoudre, rejeter);
    return maillon;
  };
  const vide = () => Promise.resolve({ data: null, error: null, status: 200 });
  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: mockBase.utilisateur === null ? null : { user: { id: mockBase.utilisateur } } },
        }),
      },
      from: (table: string) => {
        mockBase.tables.push(table);
        if (table === 'assessments') {
          mockBase.lectures += 1;
          const reponse = { data: mockBase.bilan, error: null, status: 200 };
          return chaine((mockBase.bilanRetenu ?? Promise.resolve()).then(() => reponse));
        }
        if (table === 'engagement_checkins') mockBase.points += 1;
        if (table === 'plan_cycles') {
          return chaine(Promise.resolve({ data: [{ id: 'c1', period_start: '2026-09-21' }], error: null, status: 200 }));
        }
        return chaine(vide());
      },
      rpc: (nom: string) => {
        mockBase.tables.push(`rpc:${nom}`);
        return vide();
      },
    },
  };
});
jest.mock('@/lib/notification-prefs', () => ({
  loadReminderPrefs: () => {
    mockBase.tables.push('preferences');
    return mockBase.prefs();
  },
}));
jest.mock('@/lib/rappels', () => ({ lirePermission: async () => 'fermee' }));

beforeEach(async () => {
  // Un bilan retenu par un test qui a échoué avant de le relâcher ferait attendre la suite entière.
  mockBase.bilanRetenu = null;
  // Un préchargement laissé par le test précédent se consomme ici, puis tout repart de zéro.
  await lectureDuPlan();
  mockBase.lectures = 0;
  mockBase.points = 0;
  mockBase.tables = [];
  mockBase.utilisateur = 'u1';
  mockBase.bilan = null;
  mockBase.bilanRetenu = null;
  mockBase.prefs = () => Promise.resolve(null);
});

describe('le préchargement de la lecture du plan', () => {
  it('reprend la lecture préchargée au lieu d’en lancer une seconde', async () => {
    prechargerLePlan(1_000);
    expect(mockBase.lectures).toBe(1);

    const lecture = await lectureDuPlan({ reprendre: true, maintenant: 1_500 });
    expect(lecture.genre).toBe('sans_bilan');
    expect(mockBase.lectures).toBe(1);
  });

  it('ne sert qu’une fois : la lecture suivante relit la base', async () => {
    prechargerLePlan(1_000);
    await lectureDuPlan({ reprendre: true, maintenant: 1_500 });
    await lectureDuPlan({ reprendre: true, maintenant: 2_000 });
    expect(mockBase.lectures).toBe(2);
  });

  it('un autre passage que le premier relit la base, et oublie le préchargement', async () => {
    prechargerLePlan(1_000);
    await lectureDuPlan({ reprendre: false, maintenant: 1_500 });
    expect(mockBase.lectures).toBe(2);
    await lectureDuPlan({ reprendre: true, maintenant: 2_000 });
    expect(mockBase.lectures).toBe(3);
  });

  it('est jetée quand elle est trop vieille', async () => {
    prechargerLePlan(1_000);
    await lectureDuPlan({ reprendre: true, maintenant: 1_000 + FRAICHEUR_DU_PRECHARGEMENT });
    expect(mockBase.lectures).toBe(2);
  });

  it('est jetée quand la session a changé : elle dirait le plan de quelqu’un d’autre', async () => {
    prechargerLePlan(1_000);
    mockBase.utilisateur = 'u2';
    await lectureDuPlan({ reprendre: true, maintenant: 1_500 });
    expect(mockBase.lectures).toBe(2);
  });

  it('sans préchargement, l’écran lit lui-même', async () => {
    await lectureDuPlan({ reprendre: true });
    expect(mockBase.lectures).toBe(1);
  });
});

describe('lireLePlan', () => {
  it('une lecture annulée s’arrête après le premier lot, sans lire les points', async () => {
    mockBase.bilan = { id: 'b1', submitted_at: '2026-09-21T10:00:00Z' };
    expect((await lireLePlan(() => true)).genre).toBe('annulee');
    expect(mockBase.points).toBe(0);
  });

  // Sans bilan, la lecture s'arrêterait sur « pas de bilan » : seul le contrôle d'annulation qui suit le
  // bilan et les cycles dit « annulée » ici — le cas d'au-dessus, lui, est rattrapé par celui des points.
  it('une lecture annulée le dit avant toute décision, même sans bilan', async () => {
    expect((await lireLePlan(() => true)).genre).toBe('annulee');
  });

  // Étape 7b de `v1-35` : quatre allers-retours à la file devenus deux. Ce qui part avec le bilan ne
  // l'attend pas — et les préférences surtout, qui enchaînent l'utilisateur et le profil.
  it('les boucles, l’archive et les préférences partent avec le bilan, sans l’attendre', async () => {
    let relacher = () => {};
    mockBase.bilanRetenu = new Promise<void>((resoudre) => {
      relacher = resoudre;
    });
    mockBase.bilan = { id: 'b1', submitted_at: '2026-09-21T10:00:00Z' };
    const lecture = lireLePlan();
    await new Promise((resoudre) => setImmediate(resoudre));
    expect(mockBase.tables).toEqual([
      'assessments',
      'plan_cycles',
      'rpc:mes_boucles_a_venir',
      'plan_action_commitments_archive',
      'plan_action_commitments_archive',
      'preferences',
    ]);
    relacher();
    expect((await lecture).genre).toBe('lu');
    // Les points, eux, attendent les cycles : ils en tirent leur fenêtre.
    expect(mockBase.tables.at(-1)).toBe('engagement_checkins');
  });

  it('le total et les réponses de contexte viennent avec le bilan, objet ou tableau d’un élément', async () => {
    mockBase.bilan = {
      id: 'b1',
      submitted_at: '2026-09-21T10:00:00Z',
      assessment_results: { total_co2_kg_year: 1234 },
      assessment_answers: [{ zone_type: 'rural', tc_access: null, household_vehicles: 1, teletravail: null }],
    };
    const lecture = await lireLePlan();
    expect(lecture.genre).toBe('lu');
    if (lecture.genre !== 'lu') return;
    expect(lecture.resultat).toEqual({ total_co2_kg_year: 1234 });
    expect(lecture.contexte).toEqual({ zone_type: 'rural', tc_access: null, household_vehicles: 1, teletravail: null });
    expect(mockBase.tables).not.toContain('assessment_results');
    expect(mockBase.tables).not.toContain('assessment_answers');
  });

  it('sans bilan, un rejet des préférences ne fait pas une panne', async () => {
    mockBase.prefs = () => Promise.reject(new Error('module natif'));
    expect((await lireLePlan()).genre).toBe('sans_bilan');
  });

  it('sur un plan lu, un rejet des préférences lève, et l’écran le dit', async () => {
    mockBase.bilan = { id: 'b1', submitted_at: '2026-09-21T10:00:00Z' };
    mockBase.prefs = () => Promise.reject(new Error('module natif'));
    await expect(lireLePlan()).rejects.toThrow('module natif');
  });
});
