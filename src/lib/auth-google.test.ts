/**
 * Le retour de Google sur natif, là où la collision arrive (04/10/2026, revue finale avant la
 * production, et sa contre-lecture).
 *
 * Le serveur d'auth ne découvre qu'un compte Google appartient déjà à un compte Ramille qu'au retour
 * de Google, et le dit dans l'URL de redirection. `linkGoogleIdentity` lisait tout retour en erreur
 * comme une annulation : la personne qui change de téléphone tournait en rond sur « Tu peux
 * réessayer quand tu veux. ». `src/types/connexion.test.ts` garde les dérivations ; ce fichier garde
 * **l'appel**, que la contre-lecture a trouvé sans aucun test — le remettre en annulation laissait
 * toute la suite verte.
 *
 * Les doubles : la fenêtre d'authentification qui rend une URL, Supabase qui rend l'adresse de
 * Google. Pas `react-native` : `auth.ts` n'y lit que `Platform.OS === 'web'`, et la plateforme de
 * jest-expo n'est pas le web — le doubler entier salissait la sortie (`TESTING.md` §1.3).
 *
 * Éprouvé en cassant ce qu'il garde, le 04/10/2026 : `return { issue: 'annulation' }` remis à la place
 * de la lecture du code fait tomber les deux premiers tests, et eux seuls ; `compteGoogleDejaConnu`
 * réduit à l'identité déjà prise fait tomber le deuxième, seul ici — et la première assertion de
 * `compteGoogleDejaConnu` dans `src/types/connexion.test.ts`.
 *
 * **Et le silence du layout racine sur ce retour** (même jour, seconde passe), éprouvé de même : le
 * drapeau jamais levé fait tomber le premier test du dernier bloc, l'URL rendue jamais retenue le
 * second, et chacun seul ; le drapeau abaissé juste après avoir lancé la fenêtre, avant de l'attendre
 * (contre-lecture du même soir), le premier, seul. Ce que ce fichier ne voit pas : que `_layout.tsx` **lise** ce silence —
 * aucun test ne monte le layout racine ; la ligne se vérifie sur appareil (recette d'octobre, 02.4
 * et R.1).
 */
const mockLinkIdentity = jest.fn();
const mockOpenAuthSession = jest.fn();

jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'ramille://' }));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: () => undefined,
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));
jest.mock('@/lib/supabase', () => ({
  ensureSession: jest.fn(),
  supabase: { auth: { linkIdentity: (...args: unknown[]) => mockLinkIdentity(...args) } },
}));

// Chargé après les doubles : `auth.ts` lit ses modules à l'import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { estUnRetourDuNavigateurDAuth, linkGoogleIdentity } = require('./auth') as typeof import('./auth');

beforeEach(() => {
  mockLinkIdentity.mockReset();
  mockOpenAuthSession.mockReset();
  mockLinkIdentity.mockResolvedValue({ data: { url: 'https://auth.exemple/authorize' }, error: null });
});

function retour(url: string) {
  mockOpenAuthSession.mockResolvedValue({ type: 'success', url });
}

describe('linkGoogleIdentity — le retour en erreur', () => {
  it('rend un échec qui porte son code quand l’identité Google est déjà prise', async () => {
    retour('ramille://?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user');

    const resultat = await linkGoogleIdentity();

    expect(resultat.issue).toBe('echec');
    expect(resultat.issue === 'echec' && (resultat.error as Error & { code?: string }).code).toBe(
      'identity_already_exists'
    );
  });

  it('fait de même quand l’adresse appartient à un compte rattaché par code e-mail', async () => {
    retour('ramille://?error=server_error&error_code=email_exists&error_description=Email+address+already+registered');

    const resultat = await linkGoogleIdentity();

    expect(resultat.issue).toBe('echec');
    expect(resultat.issue === 'echec' && (resultat.error as Error & { code?: string }).code).toBe('email_exists');
  });

  it('garde un refus de consentement pour une annulation', async () => {
    retour('ramille://?error=access_denied&error_description=The+user+denied+access');

    expect(await linkGoogleIdentity()).toEqual({ issue: 'annulation' });
  });

  it('garde la fenêtre refermée pour une annulation', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });

    expect(await linkGoogleIdentity()).toEqual({ issue: 'annulation' });
  });
});

describe('estUnRetourDuNavigateurDAuth — le layout racine se tait sur le retour de Google', () => {
  // Sur Android, le même événement `url` arrive à la fenêtre et au layout (`src/lib/auth.ts`) :
  // sans ce silence, le code partait deux fois à l'échange, et le second échec remplaçait l'écran.
  it('couvre toute URL tant que la fenêtre est ouverte', async () => {
    let pendantLOuverture: boolean | null = null;
    mockOpenAuthSession.mockImplementation(async () => {
      // Un tour d'attente d'abord : lu au moment de l'appel, le drapeau laisserait passer un code
      // qui l'abaisserait juste après avoir lancé la fenêtre, avant de l'attendre.
      await Promise.resolve();
      pendantLOuverture = estUnRetourDuNavigateurDAuth('ramille://?code=pendant');
      return { type: 'cancel' };
    });

    await linkGoogleIdentity();

    expect(pendantLOuverture).toBe(true);
    expect(estUnRetourDuNavigateurDAuth('ramille://?code=pendant')).toBe(false);
  });

  it('couvre ensuite l’URL que la fenêtre a rendue — même revenue en erreur, sans réseau —, et elle seule', async () => {
    const collision = 'ramille://?error=server_error&error_code=identity_already_exists';
    retour(collision);
    await linkGoogleIdentity();

    expect(estUnRetourDuNavigateurDAuth(collision)).toBe(true);
    expect(estUnRetourDuNavigateurDAuth('ramille://?code=un-autre')).toBe(false);
  });
});
