/**
 * La demande de rattachement attend la session anonyme (25/09/2026, `v1-29` §4).
 *
 * Un « Recevoir un code » touché avant que la session existe faisait répondre `updateUser` par
 * `AuthSessionMissingError`, sans aucune requête — et l'écran, qui mène tout échec non reconnu à la
 * saisie du code, annonçait un envoi qui n'avait pas eu lieu. Ces tests épinglent les deux moitiés :
 * rien ne part sans session, et ce qui n'est pas parti se dit comme une panne, pas comme un code.
 *
 * Éprouvé en cassant ce qu'il garde, le 25/09/2026 : l'appel à `ensureSession` retiré de
 * `demanderLeRattachement` fait tomber les deux premiers tests, et eux seuls ; l'erreur rendue au
 * statut 400 plutôt que 0 fait tomber les deux mêmes, cette fois sur leur classement (« message »
 * attendu, « code » rendu) — c'est-à-dire exactement le défaut d'origine, un échec pris pour un
 * envoi.
 */
import { estPanneDeTransport, suiteDeLaDemandeDeCode } from '@/types/connexion';

const mockEnsureSession = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  ensureSession: () => mockEnsureSession(),
  supabase: { auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args) } },
}));

// Chargé après le double : `auth.ts` lit `@/lib/supabase` à l'import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { demanderLeRattachement } = require('./auth') as typeof import('./auth');

beforeEach(() => {
  mockEnsureSession.mockReset();
  mockUpdateUser.mockReset();
});

describe('demanderLeRattachement', () => {
  it('n’envoie rien sans session, et le dit comme une panne', async () => {
    mockEnsureSession.mockResolvedValue(null);

    const { error } = await demanderLeRattachement('personne@exemple.fr');

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(estPanneDeTransport(error)).toBe(true);
    expect(suiteDeLaDemandeDeCode('rattachement', error)).toBe('message');
  });

  it('n’envoie rien quand la session ne peut pas s’ouvrir, et le dit comme une panne', async () => {
    mockEnsureSession.mockRejectedValue(new TypeError('Failed to fetch'));

    const { error } = await demanderLeRattachement('personne@exemple.fr');

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(suiteDeLaDemandeDeCode('rattachement', error)).toBe('message');
  });

  it('demande le code une fois la session ouverte, adresse nettoyée', async () => {
    mockEnsureSession.mockResolvedValue({ access_token: 'jeton' });
    mockUpdateUser.mockResolvedValue({ error: null });

    const { error } = await demanderLeRattachement('  personne@exemple.fr ');

    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'personne@exemple.fr' });
    expect(error).toBeNull();
  });
});
