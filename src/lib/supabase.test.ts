/**
 * Le client Supabase tel que `src/lib/supabase.ts` le construit — et pas un double : le contrat qu'on
 * garde est un **réglage** du client, que ni le typecheck ni la lecture d'un écran ne voient.
 *
 * `@supabase/postgrest-js` rejoue **par défaut** toute lecture (GET, HEAD) dont le `fetch` rejette, trois
 * fois, après 1 s, 2 s puis 4 s — et ses réponses 503 et 520 de même. Hors ligne, un écran qui lit en
 * s'ouvrant disait « Chargement… » pendant sept secondes avant d'arriver à son écran d'erreur (audit du
 * 01/10/2026, `v1-33`, R-5 et P-3), sur le chemin nominal du rappel ouvert dans le métro. Le réglage
 * `db: { retry: false }` y met fin ; ce fichier garde qu'il est posé **et** que la version installée de
 * `supabase-js` le transmet à PostgREST — une option qu'une mise à jour renommerait serait ignorée sans un
 * mot, et l'attente reviendrait.
 *
 * **Le client est le vrai, le réseau est le seul double** (`global.fetch`, que le transport rappelle à
 * chaque requête). Les temps sont réels, et c'est voulu : sous des minuteries fictives, la chaîne d'attente
 * de la session — le verrou d'`auth-js`, AsyncStorage — ne se débloquait pas. Chaque test borne donc
 * l'attente à 1,5 s, quand le rejeu en demanderait sept, et la borne tombe en échec propre plutôt qu'en
 * délai dépassé.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), le fichier restauré depuis une copie
 * après chaque mutation :
 *   - `db: { retry: false }` retiré (l'état d'avant) → les trois premiers tests tombent, chacun sur sa
 *     borne de 1,5 s (relevé sur le client réel : quatre appels à 0,1, 1,1, 3,1 et 7,1 s, l'erreur à
 *     7,1 s) ; le dernier reste vert ;
 *   - l'option écrite sous un autre nom (`retries: false`, ce qu'une mise à jour de `supabase-js` pourrait
 *     faire) → les trois mêmes : l'option inconnue est ignorée sans erreur de typage ni message ;
 *   - `retry: true` écrit en toutes lettres → les trois mêmes ;
 *   - `fetchAvecSecondeChance` retiré du transport → le dernier tombe, et lui seul : sans la seconde
 *     chance, le 401 « jeton trop neuf » est rendu tel quel.
 */
import { createClient } from '@supabase/supabase-js';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const BORNE_MS = 1_500;

/** Une lecture se règle-t-elle dans la borne ? `'trop long'` sinon — sans attendre la fin du rejeu. */
async function dansLaBorne<T>(lecture: PromiseLike<T>): Promise<T | 'trop long'> {
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const borne = new Promise<'trop long'>((resoudre) => {
    minuterie = setTimeout(() => resoudre('trop long'), BORNE_MS);
  });
  try {
    return await Promise.race([lecture, borne]);
  } finally {
    clearTimeout(minuterie);
  }
}

describe('le client Supabase de l’app', () => {
  const fetchDOrigine = global.fetch;

  // Le module lit l'environnement à son chargement : on le recharge pour chaque test, avec une
  // configuration complète, et on arrête le rafraîchissement automatique que son client démarre.
  let supabase: ReturnType<typeof createClient>;
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://exemple.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
  });
  afterEach(() => {
    supabase?.auth.stopAutoRefresh();
    global.fetch = fetchDOrigine;
  });
  const clientDeLApp = () => {
    supabase = jest.requireActual<typeof import('@/lib/supabase')>('@/lib/supabase').supabase as typeof supabase;
    return supabase;
  };

  it('une lecture dont le fetch échoue n’est tentée qu’une fois : l’échec réseau se dit tout de suite', async () => {
    const fetchHorsLigne = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    global.fetch = fetchHorsLigne as unknown as typeof fetch;

    const issue = await dansLaBorne(clientDeLApp().from('assessments').select('id'));

    expect(issue).not.toBe('trop long');
    expect(issue).toMatchObject({ error: { message: expect.stringContaining('Network request failed') } });
    expect(fetchHorsLigne).toHaveBeenCalledTimes(1);
  });

  it.each([503, 520])('un %i sur une lecture n’est pas rejoué non plus', async (statut) => {
    const fetchEnPanne = jest.fn(async () => new Response('{}', { status: statut }));
    global.fetch = fetchEnPanne as unknown as typeof fetch;

    const issue = await dansLaBorne(clientDeLApp().from('assessments').select('id'));

    expect(issue).not.toBe('trop long');
    expect(fetchEnPanne).toHaveBeenCalledTimes(1);
  });

  it('le rejeu du jeton trop neuf, une couche au-dessous, tient toujours', async () => {
    // `fetchAvecSecondeChance` ne vise que le 401 PGRST303 « JWT issued at future » : couper le rejeu de
    // PostgREST ne doit pas le défaire. Le test attend son premier délai réel (1,2 s).
    const reponses = [
      new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    ];
    const fetchJetonNeuf = jest.fn(async () => reponses.shift() as Response);
    global.fetch = fetchJetonNeuf as unknown as typeof fetch;

    const { data, error } = await clientDeLApp().from('assessments').select('id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(fetchJetonNeuf).toHaveBeenCalledTimes(2);
  });

  // **Le renouvellement de la session suit le premier plan, sur natif** (02/10/2026, `v1-27` §12.4).
  // Éprouvé en le cassant le même jour : l'écoute retirée fait tomber ce test ; `start` et `stop`
  // intervertis aussi.
  it('arrête le renouvellement de la session en arrière-plan, et le relance au premier plan', () => {
    // Le `react-native` du registre neuf, celui que le module chargé ci-dessous lira.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppState } = require('react-native') as typeof import('react-native');
    const ecoute = jest.spyOn(AppState, 'addEventListener');
    const client = clientDeLApp();
    const changement = ecoute.mock.calls.find(([type]) => type === 'change')?.[1];
    const demarrer = jest.spyOn(client.auth, 'startAutoRefresh');
    const arreter = jest.spyOn(client.auth, 'stopAutoRefresh');

    expect(changement).toBeDefined();
    changement?.('background');
    expect(arreter).toHaveBeenCalledTimes(1);
    expect(demarrer).not.toHaveBeenCalled();
    changement?.('active');
    expect(demarrer).toHaveBeenCalledTimes(1);
  });
});
