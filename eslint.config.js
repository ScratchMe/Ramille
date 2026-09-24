// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // `.vercel/` est la sortie de `npx vercel build` hors ligne (VERCEL.md §1.2) : des bundles
    // minifiés, que le linter lirait sinon — des milliers de problèmes à des colonnes à cinq
    // chiffres, c'est ce signe-là. `.claude/worktrees/` porte les copies de travail des
    // sous-agents (`.gitignore` dit pourquoi) : chacune est un dépôt entier, déjà linté chez elle.
    ignores: ['dist/*', '.vercel/*', '.claude/worktrees/**'],
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
    // **`&apos;` est interdit dans le JSX, parce qu'il rend l'apostrophe DROITE.**
    //
    // Babel décode les entités HTML du texte JSX, donc `C&apos;est` arrive à l'écran en
    // `C'est` (U+0027) — l'apostrophe d'une machine à écrire, pas celle de la typographie
    // française. Tout le reste du produit porte `’` (U+2019) : les chaînes dérivées de
    // `src/types/`, les répliques de Ramille, les messages. L'écart se voyait à l'écran, parfois
    // dans la même phrase, et rien ne le gardait — le linter ne réclame l'échappement que de
    // l'apostrophe ASCII, donc écrire `’` directement en JSX passe très bien.
    //
    // Trouvé le 20/09/2026 en écrivant une assertion qui ne matchait pas, corrigé le 21/09/2026 :
    // le relevé de dette (`v1-27` §12.13) nommait déjà cette règle comme le **vrai** correctif,
    // par opposition à un remplacement de plus qui aurait attendu la prochaine occurrence.
    //
    // **Les sélecteurs lisent `raw` et surtout pas `value`, et c'est la mutation qui l'a appris.**
    // La première version de cette règle portait `[value=/&apos;/]` : elle a passé le lint sans
    // broncher sur un `&apos;` fraîchement remis dans le texte — une garde parfaitement inerte,
    // qu'on aurait livrée en croyant avoir fermé le sujet. Le parseur **décode déjà** l'entité,
    // donc `value` vaut `Tu n'as pas` quand la source dit `Tu n&apos;as pas` ; seul `raw` garde
    // ce que le fichier porte. Relevé en dumpant l'AST le 21/09/2026, pas en raisonnant.
    //
    // **Deux sélecteurs, parce qu'il y a deux places dans la grammaire** — le texte d'un élément
    // et la chaîne d'un attribut — et non parce qu'elles casseraient différemment : le même dump
    // montre que l'attribut est décodé pareil (`value` vaut `l'x`), donc les deux rendent la même
    // mauvaise apostrophe. Ce qui **échappe** à la règle, et il faut le savoir plutôt que de la
    // croire exhaustive : une chaîne de `.ts` hors JSX, et un littéral construit par concaténation
    // ou par gabarit. Là, `&apos;` ne serait jamais décodé — les six caractères s'afficheraient
    // tels quels, ce qui est un défaut visible, pas le défaut discret que cette règle attrape.
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[raw=/&apos;/]',
          message:
            'Écris l’apostrophe typographique ’ (U+2019) directement : &apos; est décodé en apostrophe droite, que le reste du produit n’utilise jamais.',
        },
        {
          selector: 'JSXAttribute Literal[raw=/&apos;/]',
          message:
            'Écris l’apostrophe typographique ’ (U+2019) directement : &apos; est décodé en apostrophe droite, que le reste du produit n’utilise jamais.',
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
