/**
 * Ce qu'on retient d'une panne, et lesquelles on signale (`src/types/remontee-des-pannes.ts`). Les écoutes
 * qui s'en servent sont gardées par `src/lib/remontee-des-pannes.test.ts`.
 *
 * Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1), une mutation à la fois, le module restauré entre
 * deux :
 *   - la route rendue telle quelle (`routeDeLaPanne` réduite à `return chemin`) → « ne rend jamais
 *     l'adresse tapée » et « retire la requête », seuls ;
 *   - le build ignoré (`versionDeLApp` rend la version seule) → « joint le numéro de build », seul ;
 *   - une version d'une autre forme acceptée (le motif retiré) → « ignore une version… », seul ;
 *   - le plafond du lancement retiré (`vues.size >= plafond` ôté) → « pas plus de dix par lancement », seul ;
 *   - la signature sans l'origine → « une même exception par deux chemins… », seul ;
 *   - un fichier d'une autre origine accepté (`laPanneEstANous` ne regarde plus le fichier) → « une
 *     extension… », seul ;
 *   - l'hydratation non reconnue (le motif vidé) → « reconnaît les erreurs d'hydratation », seul.
 */
import { MAX_PROP_VALUE_LENGTH } from '@/types/analytics';
import {
  estUneErreurDHydratation,
  laPanne,
  laPanneEstANous,
  PANNES_PAR_LANCEMENT,
  routeDeLaPanne,
  signatureDeLaPanne,
  trierLesPannes,
  versionDeLApp,
} from '@/types/remontee-des-pannes';

describe('routeDeLaPanne', () => {
  it('garde un chemin du produit', () => {
    for (const chemin of ['/', '/plan', '/plan/pistes', '/suivi/bilan', '/confidentialite', '/rappels/stop']) {
      expect(routeDeLaPanne(chemin)).toBe(chemin);
    }
  });

  it('ne rend jamais l’adresse tapée : ce qui n’est pas une page du produit est la page introuvable', () => {
    expect(routeDeLaPanne('/jean.dupont@exemple.fr')).toBe('/+not-found');
    expect(routeDeLaPanne('/plan/0612345678')).toBe('/+not-found');
    expect(routeDeLaPanne('/constructor')).toBe('/+not-found');
  });

  it('retire la requête, le fragment et la barre finale', () => {
    expect(routeDeLaPanne('/suivi/bilan?id=4b0c')).toBe('/suivi/bilan');
    expect(routeDeLaPanne('/rappels/stop#x')).toBe('/rappels/stop');
    expect(routeDeLaPanne('/plan/')).toBe('/plan');
  });

  it('retombe sur la racine sans chemin, comme le store de navigation avant son montage', () => {
    expect(routeDeLaPanne(undefined)).toBe('/');
    expect(routeDeLaPanne('')).toBe('/');
    expect(routeDeLaPanne('?x=1')).toBe('/');
  });
});

describe('versionDeLApp', () => {
  it('joint le numéro de build quand la plateforme le donne', () => {
    expect(versionDeLApp('1.0.0', '14')).toBe('1.0.0+14');
  });

  it('rend la version seule sans build — le web', () => {
    expect(versionDeLApp('1.0.0', null)).toBe('1.0.0');
    expect(versionDeLApp('1.0.0', undefined)).toBe('1.0.0');
  });

  it('ignore une version ou un build d’une autre forme plutôt que de l’envoyer', () => {
    expect(versionDeLApp(undefined, '14')).toBeUndefined();
    expect(versionDeLApp('1.0.0 bêta pour Jean', '14')).toBeUndefined();
    expect(versionDeLApp('1.0.0', '14 (Jean)')).toBe('1.0.0');
  });

  it('tient toujours dans la borne d’une valeur de propriété', () => {
    const longue = versionDeLApp('1'.repeat(24), '2'.repeat(16));
    expect(longue?.length).toBeLessThanOrEqual(MAX_PROP_VALUE_LENGTH);
  });
});

describe('laPanne', () => {
  it('ne garde que des valeurs produites par le code : jamais le message', () => {
    const panne = laPanne(new TypeError('Écris à aide@exemple.fr'), 'globale', '/plan', '1.0.0+14');
    expect(panne).toEqual({ category: 'type', route: '/plan', origine: 'globale', version: '1.0.0+14' });
    expect(JSON.stringify(panne)).not.toContain('exemple');
  });

  it('part sans version quand l’app ne sait pas la lire', () => {
    expect(laPanne('pas une erreur', 'promesse', '/', undefined)).toEqual({
      category: 'autre',
      route: '/',
      origine: 'promesse',
    });
  });
});

describe('trierLesPannes', () => {
  it('une même panne ne part qu’une fois par lancement', () => {
    const doitPartir = trierLesPannes();
    const signature = signatureDeLaPanne(laPanne(new TypeError(), 'rendu', '/plan', undefined));
    expect(doitPartir(signature)).toBe(true);
    expect(doitPartir(signature)).toBe(false);
  });

  it('une même exception par deux chemins fait deux pannes', () => {
    const doitPartir = trierLesPannes();
    const erreur = new TypeError();
    expect(doitPartir(signatureDeLaPanne(laPanne(erreur, 'globale', '/plan', undefined)))).toBe(true);
    expect(doitPartir(signatureDeLaPanne(laPanne(erreur, 'fatale', '/plan', undefined)))).toBe(true);
  });

  it('pas plus de dix par lancement, même distinctes', () => {
    const doitPartir = trierLesPannes();
    const parties = Array.from({ length: PANNES_PAR_LANCEMENT + 5 }, (_, n) => doitPartir(`rendu|type|/${n}`));
    expect(parties.filter(Boolean)).toHaveLength(PANNES_PAR_LANCEMENT);
  });

  it('chaque lancement repart à zéro', () => {
    trierLesPannes()('rendu|type|/plan');
    expect(trierLesPannes()('rendu|type|/plan')).toBe(true);
  });
});

describe('laPanneEstANous', () => {
  const origine = 'https://www.ramille.fr';

  it('garde une erreur de notre bundle, ou sans fichier', () => {
    expect(laPanneEstANous({ aUneErreur: true, fichier: `${origine}/_expo/static/js/web/entry.js`, origine })).toBe(true);
    expect(laPanneEstANous({ aUneErreur: true, fichier: '', origine })).toBe(true);
    expect(laPanneEstANous({ aUneErreur: true, fichier: undefined, origine })).toBe(true);
  });

  it('écarte « Script error. », sans objet : un script d’une autre origine', () => {
    expect(laPanneEstANous({ aUneErreur: false, fichier: '', origine })).toBe(false);
  });

  it('une extension du navigateur, ou une origine qui ne fait que commencer comme la nôtre, n’est pas à nous', () => {
    expect(laPanneEstANous({ aUneErreur: true, fichier: 'chrome-extension://abc/contenu.js', origine })).toBe(false);
    expect(laPanneEstANous({ aUneErreur: true, fichier: 'https://challenges.cloudflare.com/turnstile/v0/api.js', origine })).toBe(
      false
    );
    expect(laPanneEstANous({ aUneErreur: true, fichier: `${origine}.exemple.net/x.js`, origine })).toBe(false);
  });
});

describe('estUneErreurDHydratation', () => {
  it('reconnaît les erreurs d’hydratation, que la page rattrape d’elle-même', () => {
    expect(estUneErreurDHydratation(new Error('Minified React error #418; visit https://react.dev/errors/418'))).toBe(true);
    expect(estUneErreurDHydratation(new Error('Hydration failed because the server rendered text didn’t match'))).toBe(true);
  });

  it('ne prend pas une vraie panne pour elle', () => {
    expect(estUneErreurDHydratation(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(estUneErreurDHydratation(new Error('Minified React error #185'))).toBe(false);
    expect(estUneErreurDHydratation(undefined)).toBe(false);
  });
});
