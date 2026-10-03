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
 */
import {
  FRAICHEUR_DU_PRECHARGEMENT,
  lectureDuPlan,
  lireLePlan,
  prechargerLePlan,
} from '@/lib/lecture-du-plan';

// Chaque lecture commence par `assessments` : le compte de ces appels est le compte des lectures. Le
// bilan rendu dit si la lecture s'arrête là (`sans_bilan`) ou va jusqu'aux points.
const mockBase = {
  lectures: 0,
  points: 0,
  utilisateur: 'u1' as string | null,
  bilan: null as unknown,
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
        if (table === 'assessments') {
          mockBase.lectures += 1;
          return chaine(Promise.resolve({ data: mockBase.bilan, error: null, status: 200 }));
        }
        if (table === 'engagement_checkins') mockBase.points += 1;
        if (table === 'plan_cycles') {
          return chaine(Promise.resolve({ data: [{ id: 'c1', period_start: '2026-09-21' }], error: null, status: 200 }));
        }
        return chaine(vide());
      },
      rpc: vide,
    },
  };
});
jest.mock('@/lib/notification-prefs', () => ({ loadReminderPrefs: async () => null }));
jest.mock('@/lib/rappels', () => ({ lirePermission: async () => 'fermee' }));

beforeEach(async () => {
  // Un préchargement laissé par le test précédent se consomme ici, puis tout repart de zéro.
  await lectureDuPlan();
  mockBase.lectures = 0;
  mockBase.points = 0;
  mockBase.utilisateur = 'u1';
  mockBase.bilan = null;
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
});
