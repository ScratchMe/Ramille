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
 *
 * **Et depuis le 05/10/2026, le captcha avant le code** (passe avant le lancement) : la base autorise
 * le rattachement (`autoriser_le_rattachement`) avant que `updateUser` parte, et son hook tait tout
 * code sans autorisation. Éprouvé en le cassant le même jour : l'appel à l'autorisation retiré fait
 * tomber les quatre tests du captcha (aucun RPC, ou un `updateUser` qui part) ; un refus rendu sans
 * `code` fait tomber le refus (« code » au lieu de « message », un envoi annoncé qui n'a pas eu lieu) ;
 * l'erreur du RPC rendue telle quelle, avec son `code` PostgREST, fait tomber la panne de la même
 * façon ; un jeton absent envoyé `null` fait tomber le dernier.
 */
import { estPanneDeTransport, suiteDeLaDemandeDeCode } from '@/types/connexion';

const mockEnsureSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockRpc = jest.fn();
const mockJetonDuCaptcha = jest.fn();

jest.mock('@/lib/supabase', () => ({
  ensureSession: () => mockEnsureSession(),
  supabase: {
    auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('@/lib/captcha', () => ({
  jetonDuCaptcha: (...args: unknown[]) => mockJetonDuCaptcha(...args),
}));

// Chargé après le double : `auth.ts` lit `@/lib/supabase` à l'import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { demanderLeRattachement } = require('./auth') as typeof import('./auth');

beforeEach(() => {
  mockEnsureSession.mockReset();
  mockUpdateUser.mockReset();
  mockRpc.mockReset();
  mockJetonDuCaptcha.mockReset();
  // Par défaut, le captcha rend un jeton et la base l'accepte : les tests de la session n'en parlent pas.
  mockJetonDuCaptcha.mockResolvedValue('jeton-du-captcha');
  mockRpc.mockResolvedValue({ data: true, error: null });
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

  it('demande l’autorisation du captcha avant le code, avec le jeton du rattachement', async () => {
    mockEnsureSession.mockResolvedValue({ access_token: 'jeton' });
    mockUpdateUser.mockResolvedValue({ error: null });

    await demanderLeRattachement('personne@exemple.fr');

    expect(mockJetonDuCaptcha).toHaveBeenCalledWith('rattachement');
    expect(mockRpc).toHaveBeenCalledWith('autoriser_le_rattachement', { p_jeton: 'jeton-du-captcha' });
    expect(mockRpc.mock.invocationCallOrder[0]).toBeLessThan(mockUpdateUser.mock.invocationCallOrder[0]);
  });

  it('n’envoie rien quand la base refuse le captcha, et le dit comme un refus du captcha', async () => {
    mockEnsureSession.mockResolvedValue({ access_token: 'jeton' });
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { error } = await demanderLeRattachement('personne@exemple.fr');

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: 'captcha_failed' });
    expect(suiteDeLaDemandeDeCode('rattachement', error)).toBe('message');
  });

  it('n’envoie rien quand l’autorisation échoue, et le dit comme une panne', async () => {
    mockEnsureSession.mockResolvedValue({ access_token: 'jeton' });
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } });

    const { error } = await demanderLeRattachement('personne@exemple.fr');

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(estPanneDeTransport(error)).toBe(true);
    expect(suiteDeLaDemandeDeCode('rattachement', error)).toBe('message');

    mockRpc.mockRejectedValue(new TypeError('Failed to fetch'));
    const { error: rejet } = await demanderLeRattachement('personne@exemple.fr');
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(suiteDeLaDemandeDeCode('rattachement', rejet)).toBe('message');
  });

  it('passe un jeton vide quand le captcha n’en rend pas : la base sans secret autorise quand même', async () => {
    mockEnsureSession.mockResolvedValue({ access_token: 'jeton' });
    mockJetonDuCaptcha.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue({ error: null });

    const { error } = await demanderLeRattachement('personne@exemple.fr');

    expect(mockRpc).toHaveBeenCalledWith('autoriser_le_rattachement', { p_jeton: '' });
    expect(error).toBeNull();
  });
});
