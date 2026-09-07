// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // `Alert.alert` est banni du produit (issue #59). Sur web il retombe sur
      // `window.alert()` : une boîte système grise en plein produit soigné, qui bloque le fil
      // d'exécution — et dont le `onPress` n'est pas invoqué de façon fiable, ce qui a déjà
      // cassé un flux (cf. CLAUDE.md). Les cinq écrans qui en dépendaient disent maintenant
      // l'échec dans la page, avec `MessageInline` ou un état de composant.
      //
      // La règle porte sur l'import : c'est lui qui rend l'appel possible, et l'interdire là
      // donne l'erreur à l'endroit exact où on s'apprêtait à réintroduire le motif.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Alert'],
              message:
                'Alert.alert retombe sur window.alert() sur web. Utilise MessageInline pour un échec, ou un état de composant pour une confirmation.',
            },
          ],
        },
      ],
    },
  },
];
