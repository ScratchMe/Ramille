/* global jest */
// reanimated ne s'initialise pas sous Jest : il charge le module natif de `react-native-worklets`,
// qui n'existe pas hors d'une app (« Cannot read properties of undefined (reading 'loadUnpackers') »).
//
// Tant que seules la mascotte et l'écran de lancement animaient, aucun test ne les montait. Depuis
// le 27/09/2026 (`docs/architecture/v1-30-les-transitions.md`), des composants qu'on teste animent
// aussi — la carte du point, l'écran des pistes —, et chacun faisait échouer sa suite au chargement,
// exactement comme la CSS avant `doublage-css.js`. Même frottement, même remède, une seule fois.
//
// Les deux doubles viennent des bibliothèques elles-mêmes : une animation y est une vue ordinaire,
// donc un test garde ce qu'un écran dit et fait, jamais comment il bouge — ce sont les gardes de
// l'export et du parcours réel qui regardent le mouvement. Le double de reanimated ignore ses
// animations CSS (`css.keyframes`, `cubicBezier`), que `src/lib/mouvement.tsx` appelle au
// chargement : on les rend inertes, une animation CSS n'étant qu'une clé de style de plus. Et il
// n'a pas `useReducedMotion` : il rend « faux », l'appareil d'un test n'ayant pas la préférence.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  css: { keyframes: (definition) => definition, create: (styles) => styles },
  cubicBezier: () => 'ease',
  useReducedMotion: () => false,
}));
