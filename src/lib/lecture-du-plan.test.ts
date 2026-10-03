/**
 * La lecture du plan préchargée pendant le lancement, et reprise une fois (`v1-33` T-12, 03/10/2026).
 *
 * Ce que ce fichier garde, c'est le contrat du préchargement — ce que ni l'écran du plan ni le parcours
 * réel ne voient : le parcours ne compte pas les requêtes, et un préchargement jamais repris, ou repris
 * deux fois, rendrait un plan juste dans les deux cas. Le premier coûterait le gain ; le second
 * montrerait au retour sur l'onglet un plan lu à l'ouverture.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — trois mutations :
 *   - `lectureDuPlan` qui ignore le préchargement (relit toujours) → « reprend la lecture préchargée »,
 *     et « ne sert qu'une fois », qui compte alors trois lectures ;
 *   - le préchargement gardé après usage (`prechargement = null` retiré) → « ne sert qu'une fois » ;
 *   - la fraîcheur ignorée → « est jetée quand elle est trop vieille ».
 */
import {
  FRAICHEUR_DU_PRECHARGEMENT,
  lectureDuPlan,
  prechargerLePlan,
} from '@/lib/lecture-du-plan';

// Chaque lecture commence par `assessments` : le compte de ces appels est le compte des lectures. Sans
// bilan, la lecture s'arrête là (`sans_bilan`), ce qui suffit à ce que ce fichier garde.
const mockLectures = { nombre: 0 };

jest.mock('@/lib/supabase', () => {
  const chaine = (): unknown => {
    const reponse = Promise.resolve({ data: null, error: null, status: 200 });
    const proxy: Record<string, unknown> = {};
    for (const methode of ['select', 'eq', 'in', 'gte', 'order', 'limit']) proxy[methode] = () => proxy;
    proxy.maybeSingle = () => reponse;
    proxy.then = (resoudre: (valeur: unknown) => unknown, rejeter: (raison: unknown) => unknown) =>
      reponse.then(resoudre, rejeter);
    return proxy;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'assessments') mockLectures.nombre += 1;
        return chaine();
      },
      rpc: () => Promise.resolve({ data: null, error: null, status: 200 }),
    },
  };
});
jest.mock('@/lib/notification-prefs', () => ({ loadReminderPrefs: async () => null }));
jest.mock('@/lib/rappels', () => ({ lirePermission: async () => 'fermee' }));

beforeEach(async () => {
  // Un préchargement laissé par le test précédent se consomme ici, puis le compte repart de zéro.
  await lectureDuPlan();
  mockLectures.nombre = 0;
});

describe('le préchargement de la lecture du plan', () => {
  it('reprend la lecture préchargée au lieu d’en lancer une seconde', async () => {
    prechargerLePlan(1_000);
    expect(mockLectures.nombre).toBe(1);

    const lecture = await lectureDuPlan(1_500);
    expect(lecture.genre).toBe('sans_bilan');
    expect(mockLectures.nombre).toBe(1);
  });

  it('ne sert qu’une fois : la lecture suivante relit la base', async () => {
    prechargerLePlan(1_000);
    await lectureDuPlan(1_500);
    await lectureDuPlan(2_000);
    expect(mockLectures.nombre).toBe(2);
  });

  it('est jetée quand elle est trop vieille', async () => {
    prechargerLePlan(1_000);
    await lectureDuPlan(1_000 + FRAICHEUR_DU_PRECHARGEMENT);
    expect(mockLectures.nombre).toBe(2);
  });

  it('sans préchargement, l’écran lit lui-même', async () => {
    await lectureDuPlan();
    expect(mockLectures.nombre).toBe(1);
  });
});
