// `APP_URL` — l'origine des liens que le produit fabrique, et la seule surface publique qu'il ait.
//
// **Les deux branches ont chacune leur façon de casser, et aucune ne se voit à la lecture.**
// Simplifier le ternaire en gardant la branche web ferait lire `window.location.origin` sur
// Android, où `window` n'existe pas : une exception au chargement d'un module importé par la
// restitution. Le garder en ne gardant que la branche canonique ferait pointer tous les liens d'une
// preview Vercel vers la production — un partage qui a l'air de marcher et qui ne montre pas ce
// qu'on vient de faire.
//
// La valeur est un `const` évalué à l'import, donc chaque cas se joue en rechargeant le module :
// `jest.isolateModules` par-dessus un `Platform` doublé, dont l'objet survit au rechargement parce
// que la fabrique le renvoie tel quel.
import { ORIGINE_CANONIQUE } from '@/constants/produit';

// **Seul `Platform` est doublé, et par un mandataire**, ce qui a demandé deux essais avant de
// tenir — les deux ratés valent d'être connus, parce qu'ils passent tous les deux au vert en
// salissant la sortie :
//
//   - remplacer le module entier par `{ Platform }` prive le `setup.js` de jest-expo de ce qu'il
//     installe au démarrage, et la suite crache un `console.warn` d'`expo-modules-core` ;
//   - l'étaler (`...jest.requireActual('react-native')`) **lit chaque propriété** du module pour la
//     recopier, donc déclenche les avertissements de dépréciation que react-native pose sur ses
//     exports sortants (`ProgressBarAndroid`…).
//
// Le mandataire ne lit que ce qu'on lui demande. Un avertissement dans une sortie de CI est un
// avertissement qu'on cesse de lire, et c'est ainsi qu'on manque le vrai.
const mockPlatform = { OS: 'web' };
jest.mock('react-native', () => {
  const reel = jest.requireActual('react-native');
  return new Proxy(reel as object, {
    get: (cible, cle) => (cle === 'Platform' ? mockPlatform : Reflect.get(cible, cle)),
  });
});

function chargerAppUrl(): string {
  let valeur = '';
  jest.isolateModules(() => {
    // `require` et non `import` : c'est le seul appel qui re-demande le module **maintenant**, ce
    // dont ce test a besoin puisque `APP_URL` est un `const` évalué à l'import. Un `import` serait
    // hissé en tête de fichier et rendrait la même valeur aux quatre cas.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    valeur = require('@/lib/app-url').APP_URL as string;
  });
  return valeur;
}

const fenetreDorigine = (globalThis as { window?: unknown }).window;

afterEach(() => {
  mockPlatform.OS = 'web';
  if (fenetreDorigine === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = fenetreDorigine;
});

describe('APP_URL', () => {
  it('suit l’origine réelle de la page sur le web', () => {
    // C'est ce qui fait qu'un lien partagé depuis une preview Vercel pointe vers cette preview,
    // exactement comme le `redirectTo` de `lib/auth.ts`.
    mockPlatform.OS = 'web';
    (globalThis as { window?: unknown }).window = {
      location: { origin: 'https://ramille-preview-me-c4a3.vercel.app' },
    };
    expect(chargerAppUrl()).toBe('https://ramille-preview-me-c4a3.vercel.app');
  });

  it('retombe sur le domaine canonique hors du web', () => {
    mockPlatform.OS = 'android';
    (globalThis as { window?: unknown }).window = { location: { origin: 'https://jamais.lu' } };
    // Même si un `window` traîne — c'est le cas dans un environnement de test —, la plateforme
    // décide en premier. L'ordre du ternaire est donc lui aussi éprouvé ici.
    expect(chargerAppUrl()).toBe(ORIGINE_CANONIQUE);
  });

  it('retombe sur le domaine canonique quand `window` n’existe pas', () => {
    mockPlatform.OS = 'web';
    delete (globalThis as { window?: unknown }).window;
    expect(chargerAppUrl()).toBe(ORIGINE_CANONIQUE);
  });

  it('l’origine canonique n’a ni barre finale ni chemin', () => {
    // Les appelants composent `${APP_URL}/api/partage?...` : une barre finale donnerait `//api`,
    // qu'aucun serveur ne normalise pour nous, et un chemin collé à l'origine ferait des liens
    // morts sur la seule surface publique du produit.
    expect(ORIGINE_CANONIQUE).toMatch(/^https:\/\/[^/]+$/);
  });
});
