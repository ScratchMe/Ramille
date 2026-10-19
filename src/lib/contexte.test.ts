// Corriger son contexte : ce que `enregistrerLeContexte` dit d'un échec.
//
// **Un module d'entrée-sortie, testé en doublant le client et lui seul** — la ligne que trace l'en-tête
// de `src/lib/notification-prefs.test.ts`. Ce qui est éprouvé, c'est que le code de la réponse décide
// de la phrase : le plafond des corrections (`RM002`, vingt par jour) se dit pour ce qu'il est, une
// panne du serveur ne nomme pas la connexion, et hors ligne si.
//
// Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1) :
//   - le refus `RM002` plus reconnu → « dit le plafond des corrections… », seul ;
//   - `genreDeLEchec(status)` remplacé par `'horsLigne'` → « dit le serveur… », seul.
import { CODE_TROP_DE_CORRECTIONS, enregistrerLeContexte, TROP_DE_CORRECTIONS } from '@/lib/contexte';
import type { ContexteEnregistrable } from '@/types/contexte';

const mockRpc = jest.fn<Promise<{ data: unknown; error: unknown; status: number }>, [string, unknown]>();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (nom: string, args: unknown) => mockRpc(nom, args) },
}));

const CHOIX: ContexteEnregistrable = {
  zone_type: 'urbain_dense',
  transports_proches: ['metro_tram', 'bus'],
  household_vehicles: '1',
  teletravail: null,
};

beforeEach(() => mockRpc.mockReset());

describe('enregistrerLeContexte', () => {
  it('rend ok quand les réponses sont enregistrées', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null, status: 204 });
    expect(await enregistrerLeContexte(CHOIX)).toEqual({ ok: true });
  });

  it('dit le plafond des corrections pour ce qu’il est : un refus jusqu’au lendemain', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: CODE_TROP_DE_CORRECTIONS, message: 'phrase du serveur' },
      status: 400,
    });
    expect(await enregistrerLeContexte(CHOIX)).toEqual({ ok: false, message: TROP_DE_CORRECTIONS });
    expect(TROP_DE_CORRECTIONS).toBe(
      'Tes réponses ne sont pas enregistrées : tu as déjà corrigé ton contexte de nombreuses fois aujourd’hui. Réessaie demain.'
    );
  });

  it('dit le serveur sans nommer la connexion', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'Internal Server Error' }, status: 500 });
    expect(await enregistrerLeContexte(CHOIX)).toEqual({
      ok: false,
      message: 'Tes réponses ne sont pas enregistrées. Réessaie dans un instant.',
    });
  });

  it('nomme la connexion hors ligne', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' }, status: 0 });
    expect(await enregistrerLeContexte(CHOIX)).toEqual({
      ok: false,
      message: 'Tes réponses ne sont pas enregistrées. Vérifie ta connexion et réessaie.',
    });
  });
});
