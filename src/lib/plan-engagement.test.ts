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
// Et le 04/10/2026, le plan périmé (`P0002`) : plus reconnu dans `commitPlanAction` → « relit le plan
// quand l'action n'est plus… », seul ; dans `clearPlanActionCommitment` → « relit le plan quand
// l'engagement n'est plus… », seul.
import { clearPlanActionCommitment, commitPlanAction } from '@/lib/plan-engagement';
import { CODE_REFUS_DE_PLAFOND, TROP_DE_CHANGEMENTS_D_ENGAGEMENT } from '@/types/refus-de-plafond';

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

  // Le plafond d'engagements (`RM002`, trente archivages par jour, `20261005170000`) : le refus dure
  // jusqu'au lendemain, et « Réessaie dans un instant » — la phrase d'une panne — était fausse.
  it('dit le plafond d’engagements pour ce qu’il est : demain, et sans relire le plan', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: CODE_REFUS_DE_PLAFOND, message: 'Tu as changé ton engagement de nombreuses fois aujourd’hui. Reviens demain.' },
      status: 400,
    });
    const resultat = await engager();
    expect(resultat).toEqual({ ok: false, message: TROP_DE_CHANGEMENTS_D_ENGAGEMENT });
    // Rien n'a changé côté serveur : relire le plan serait un aller-retour pour rien, et l'écran garde le
    // sélecteur ouvert, sa sélection gardée.
    expect(resultat).not.toHaveProperty('rechargerLePlan');
    expect(TROP_DE_CHANGEMENTS_D_ENGAGEMENT.endsWith('Réessaie demain.')).toBe(true);
  });

  // La même phrase du serveur sous un autre code est une panne : le message n'est jamais lu.
  it('ne reconnaît pas le plafond à sa phrase', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'Tu as changé ton engagement de nombreuses fois aujourd’hui. Reviens demain.' },
      status: 500,
    });
    expect(await engager()).toEqual({
      ok: false,
      message: 'Ton choix n’a pas été enregistré. Réessaie dans un instant.',
    });
  });

  // Une nouvelle saison pendant la nuit, ou un plan refait ailleurs : l'action n'est plus sur le plan
  // en cours (`v1-27` §12.36). Chaque essai échouait sous un message de panne.
  it('relit le plan quand l’action n’est plus sur le plan en cours', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Action introuvable.' }, status: 500 });
    expect(await engager()).toEqual({
      ok: false,
      message: 'Ton choix n’a pas été enregistré : ton plan a changé entre-temps. Il vient d’être relu.',
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

  it('relit le plan quand l’engagement n’est plus sur le plan en cours', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Action introuvable.' }, status: 500 });
    expect(await clearPlanActionCommitment('a1')).toEqual({
      ok: false,
      message: 'Le changement n’a pas été enregistré : ton plan a changé entre-temps. Il vient d’être relu.',
      rechargerLePlan: true,
    });
  });
});
