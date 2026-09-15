// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // `.vercel/` est la sortie de `npx vercel build` hors ligne (VERCEL.md §1.2) : des bundles
    // minifiés, que le linter lirait sinon — des milliers de problèmes à des colonnes à cinq
    // chiffres, c'est ce signe-là.
    ignores: ['dist/*', '.vercel/*'],
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
  {
    // **La frontière `src/types` / `src/lib`, en règle plutôt qu'en prose.** Les modules de
    // `src/types/` sont purs et testés par Jest ; ils ne doivent tirer ni le client Supabase
    // (dont le mandataire lève au premier accès), ni AsyncStorage, ni `react-native`. La règle
    // était écrite dans trois en-têtes et dans CLAUDE.md, et rien ne l'appliquait : le jour où
    // quelqu'un ajoute une dépendance à un module de `src/lib/` importé depuis `src/types/`,
    // c'est toute la suite qui tombe, par un lien qu'aucun outil n'affiche.
    //
    // **`@/lib/format` est la seule exception, et elle est nommée pour le rester.** Ce module
    // est pur, `src/types/resultat.ts` l'importe, et son en-tête porte la contrepartie : aucune
    // dépendance ne s'y ajoute. La négation ci-dessous est ce qui rend cette promesse
    // vérifiable — ouvrir une seconde exception demande de l'écrire ici, donc de la justifier.
    files: ['src/types/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/*', '!@/lib/format'],
              message:
                'Un module de src/types/ est pur et testé : il ne tire ni le client Supabase, ni AsyncStorage, ni react-native. Seul @/lib/format est autorisé, et il doit rester pur.',
            },
          ],
        },
      ],
    },
  },
];
