// Le réglage du jeton au démarrage (`reglerLeJetonDeCetAppareil`) : la règle pure est dans
// `src/types/rappels.ts` (`leJetonAuDemarrage`) ; ce fichier éprouve ce que l'entrée-sortie en fait,
// et c'est là que la contre-lecture du 22/10/2026 a trouvé deux défauts que la règle seule ne voyait
// pas.
//
// - **La valeur rendue à la garde** (`gardeDuJeton`, `src/types/session.ts`) : `true` ferme les
//   retours au premier plan. Rendu sans jeton inscrit, il empêchait le retour des réglages du
//   téléphone de réinscrire quelqu'un qui venait de choisir la notification.
// - **La reprise avant la désactivation** : `unregister_push_token` ne touche que les lignes de la
//   session présente, donc après un changement de compte le jeton restait actif au nom du compte
//   quitté (A4-7).
//
// Doublés : le client (le `rpc`, et la lecture de sa propre ligne de `push_tokens`), les marques et la
// préférence (`@/lib/notification-prefs`), et les modules d'Expo — un téléphone réel, une permission
// qu'on règle, un jeton que le service rend.
//
// **La reprise seulement pour une ligne qui n'est pas à soi** (seconde contre-lecture du 22/10/2026) :
// elle remet la ligne active et vue à l'instant, ce qui peut évincer un autre appareil du compte. Une
// ligne que la session voit est la sienne, et se désactive directement.
//
// Mutations jouées le 22/10/2026 (consignées ici, `TESTING.md` §1.1) :
// - la branche `desinscrire` qui rend `true` → tombent « sans la notification, rien n'est inscrit, et
//   le retour réévalue » et « une reprise refusée ne désactive rien », qui attend aussi `false` ;
// - la reprise retirée (désactivation directe) → tombent « la désactivation reprend d'abord le jeton »
//   et « une reprise refusée ne désactive rien » ;
// - la désactivation faite malgré une reprise refusée → tombe « une reprise refusée ne désactive rien » ;
// - le suivi posé seulement par `enregistrerLeJeton` → tombe « le suivi porte le réglage entier » ;
// - une préférence illisible traitée comme l'e-mail → tombe « une préférence illisible ne touche à rien » ;
// - la reprise faite même pour une ligne à soi → tombe « une ligne déjà à soi se désactive sans reprise » ;
// - le chemin de la permission retirée remis sur la désactivation directe → tombe « la permission
//   retirée reprend aussi le jeton avant de le désactiver ».
import { reglerLeJetonDeCetAppareil } from '@/lib/rappels';

const mockAppels: string[] = [];
const mockSuivis: Promise<unknown>[] = [];
const mockEtat: {
  prefere: 'push' | 'email' | 'none' | null;
  marque: string | null;
  erreurDeReprise: unknown;
  /** La ligne du jeton est-elle visible pour la session présente — c'est-à-dire à elle ? */
  aSoi: boolean;
  permission: 'granted' | 'denied';
} = { prefere: null, marque: null, erreurDeReprise: null, aSoi: false, permission: 'granted' };

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'projet' } } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: async () => ({ status: mockEtat.permission, canAskAgain: true }),
  getExpoPushTokenAsync: async () => {
    mockAppels.push('expo');
    return { data: 'ExponentPushToken[neuf]' };
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    // La lecture de sa propre ligne : la RLS ne rend que les lignes de la session.
    from: () => {
      const maillon = {
        select: () => maillon,
        eq: () => maillon,
        maybeSingle: async () => ({ data: mockEtat.aSoi ? { token: mockEtat.marque } : null, error: null }),
      };
      return maillon;
    },
    rpc: async (nom: string, args: { p_token: string }) => {
      mockAppels.push(`${nom}:${args.p_token}`);
      if (nom === 'register_push_token' && mockEtat.erreurDeReprise) {
        return { data: null, error: mockEtat.erreurDeReprise };
      }
      return { data: null, error: null };
    },
  },
}));

jest.mock('@/lib/notification-prefs', () => ({
  lireLeCanalPrefere: async () => {
    mockAppels.push('preference');
    return mockEtat.prefere;
  },
  lireLeJetonDeCetAppareil: async () => mockEtat.marque,
  memoriserLeJetonDeCetAppareil: async (jeton: string | null) => {
    mockEtat.marque = jeton;
  },
  desinscrireLeJetonDeCetAppareil: async () => {
    mockAppels.push(`desinscrire:${mockEtat.marque}`);
    mockEtat.marque = null;
  },
  suivreLEnregistrementDuJeton: (enregistrement: Promise<unknown>) => {
    mockSuivis.push(enregistrement);
  },
}));

beforeEach(() => {
  mockAppels.length = 0;
  mockSuivis.length = 0;
  mockEtat.prefere = null;
  mockEtat.marque = null;
  mockEtat.erreurDeReprise = null;
  mockEtat.aSoi = false;
  mockEtat.permission = 'granted';
});

describe('reglerLeJetonDeCetAppareil', () => {
  it('la notification choisie : le jeton s’inscrit, et le réglage le dit', async () => {
    mockEtat.prefere = 'push';
    await expect(reglerLeJetonDeCetAppareil()).resolves.toBe(true);
    expect(mockAppels).toContain('expo');
    expect(mockAppels).toContain('register_push_token:ExponentPushToken[neuf]');
    expect(mockEtat.marque).toBe('ExponentPushToken[neuf]');
  });

  it('sans la notification, rien n’est inscrit, et le retour réévalue', async () => {
    mockEtat.prefere = 'email';
    // `false`, pour que la garde laisse le retour au premier plan réessayer : la personne peut choisir
    // la notification, refuser l'invite et la rouvrir dans les réglages du téléphone avant de revenir.
    await expect(reglerLeJetonDeCetAppareil()).resolves.toBe(false);
    expect(mockAppels).not.toContain('expo');
  });

  it('la désactivation reprend d’abord le jeton, pour la session présente', async () => {
    mockEtat.prefere = 'none';
    mockEtat.marque = 'ExponentPushToken[ancien]';
    await reglerLeJetonDeCetAppareil();
    const reprise = mockAppels.indexOf('register_push_token:ExponentPushToken[ancien]');
    const desactivation = mockAppels.indexOf('desinscrire:ExponentPushToken[ancien]');
    expect(reprise).toBeGreaterThanOrEqual(0);
    expect(desactivation).toBeGreaterThan(reprise);
    // Le jeton repris est la marque locale : rien ne part chez Expo.
    expect(mockAppels).not.toContain('expo');
  });

  it('une ligne déjà à soi se désactive sans reprise', async () => {
    mockEtat.prefere = 'email';
    mockEtat.marque = 'ExponentPushToken[ancien]';
    mockEtat.aSoi = true;
    await reglerLeJetonDeCetAppareil();
    expect(mockAppels.some((appel) => appel.startsWith('register_push_token'))).toBe(false);
    expect(mockAppels).toContain('desinscrire:ExponentPushToken[ancien]');
  });

  it('la permission retirée reprend aussi le jeton avant de le désactiver', async () => {
    mockEtat.prefere = 'push';
    mockEtat.permission = 'denied';
    mockEtat.marque = 'ExponentPushToken[ancien]';
    await expect(reglerLeJetonDeCetAppareil()).resolves.toBe(false);
    const reprise = mockAppels.indexOf('register_push_token:ExponentPushToken[ancien]');
    const desactivation = mockAppels.indexOf('desinscrire:ExponentPushToken[ancien]');
    expect(reprise).toBeGreaterThanOrEqual(0);
    expect(desactivation).toBeGreaterThan(reprise);
    expect(mockAppels).not.toContain('expo');
  });

  it('une reprise refusée ne désactive rien, et garde la marque pour le retour suivant', async () => {
    mockEtat.prefere = 'email';
    mockEtat.marque = 'ExponentPushToken[ancien]';
    mockEtat.erreurDeReprise = { code: 'RM002', message: 'Trop d’appareils enregistrés aujourd’hui pour ce compte.' };
    await expect(reglerLeJetonDeCetAppareil()).resolves.toBe(false);
    expect(mockAppels.some((appel) => appel.startsWith('desinscrire'))).toBe(false);
    expect(mockEtat.marque).toBe('ExponentPushToken[ancien]');
  });

  it('une préférence illisible ne touche à rien', async () => {
    mockEtat.prefere = null;
    mockEtat.marque = 'ExponentPushToken[ancien]';
    await expect(reglerLeJetonDeCetAppareil()).resolves.toBe(false);
    expect(mockAppels.filter((appel) => appel !== 'preference')).toEqual([]);
    expect(mockEtat.marque).toBe('ExponentPushToken[ancien]');
  });

  it('le suivi porte le réglage entier, lecture de la préférence comprise', async () => {
    mockEtat.prefere = 'email';
    const reglage = reglerLeJetonDeCetAppareil();
    // Une lecture du jeton partie pendant l'aller-retour de la préférence doit attendre le réglage
    // entier (`v1-33` T-12) : c'est lui qui est suivi, et pas seulement l'inscription — qui, ici, n'a
    // même pas lieu.
    expect(mockSuivis[0]).toBe(reglage);
    await reglage;
  });
});
