// L'engagement sur une action du plan : ce que `commitPlanAction` et `clearPlanActionCommitment` disent
// d'un échec (`v1-33` §9, 02/10/2026).
//
// **Un module d'entrée-sortie, testé en doublant le client et lui seul** — la ligne que trace l'en-tête
// de `src/lib/notification-prefs.test.ts`. Ce qui est éprouvé, c'est que le **statut** de la réponse
// décide de la phrase : la connexion n'est nommée que hors ligne, et le refus `RM001` garde la sienne.
//
// Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1) :
//   - `genreDeLEchec(status)` remplacé par `'horsLigne'` dans `commitPlanAction` (l'état d'avant) →
//     « dit le serveur… » de `commitPlanAction`, seul ;
//   - le même dans `clearPlanActionCommitment` → « dit le serveur… » de `clearPlanActionCommitment`,
//     seul ;
//   - le refus `RM001` plus reconnu → « garde le refus… », seul.
import { clearPlanActionCommitment, commitPlanAction } from '@/lib/plan-engagement';

const mockRpc = jest.fn<Promise<{ data: unknown; error: unknown; status: number }>, [string, unknown]>();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (nom: string, args: unknown) => mockRpc(nom, args) },
}));

const horsLigne = { data: null, error: { message: 'Failed to fetch' }, status: 0 };
const panneDuServeur = { data: null, error: { message: 'Internal Server Error', code: 'XX000' }, status: 500 };

beforeEach(() => mockRpc.mockReset());

describe('commitPlanAction', () => {
  const engager = () => commitPlanAction('a1', { timing: 'le_mois_prochain' });

  it('rend ok quand l’engagement est enregistré', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null, status: 204 });
    expect(await engager()).toEqual({ ok: true });
  });

  it('nomme la connexion hors ligne', async () => {
    mockRpc.mockResolvedValue(horsLigne);
    expect(await engager()).toEqual({
      ok: false,
      message: 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.',
    });
  });

  it('dit le serveur sans nommer la connexion', async () => {
    mockRpc.mockResolvedValue(panneDuServeur);
    expect(await engager()).toEqual({
      ok: false,
      message: 'Ton choix n’a pas été enregistré. Réessaie dans un instant.',
    });
  });

  it('garde le refus d’une autre action engagée, et demande de relire le plan', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'RM001', message: 'refus' }, status: 400 });
    expect(await engager()).toEqual({
      ok: false,
      message: 'Une autre action est engagée sur cette période. Ton plan vient d’être relu.',
      rechargerLePlan: true,
    });
  });
});

describe('clearPlanActionCommitment', () => {
  it('nomme la connexion hors ligne', async () => {
    mockRpc.mockResolvedValue(horsLigne);
    expect(await clearPlanActionCommitment('a1')).toEqual({
      ok: false,
      message: 'Le changement n’a pas été enregistré. Vérifie ta connexion et réessaie.',
    });
  });

  it('dit le serveur sans nommer la connexion', async () => {
    mockRpc.mockResolvedValue(panneDuServeur);
    expect(await clearPlanActionCommitment('a1')).toEqual({
      ok: false,
      message: 'Le changement n’a pas été enregistré. Réessaie dans un instant.',
    });
  });
});
