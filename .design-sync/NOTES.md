# Notes de synchronisation vers Claude Design

Relevé du 11/09/2026, première synchronisation.

## La source n'est pas la racine du dépôt

Ce dépôt est une **app Expo privée**, pas une bibliothèque de composants : `main` vaut
`expo-router/entry`, `private: true`, aucun build de bibliothèque, aucun `exports`, et **48 des 50
composants de `src/components/` importent `react-native`** — plusieurs tirent en plus le client
Supabase, la navigation et AsyncStorage. Le `dist/` du dépôt est l'export web de l'**app** (des
pages), pas un bundle de composants.

**La source à synchroniser est `docs/design/design-system/`**, et c'est un choix, pas un défaut :
ce dossier est un kit Claude Design (issu du canvas v1-14), déjà écrit en **React navigateur** —
`<div>`, `var(--color-*)`, zéro import `react-native` — avec ses jetons, ses guidelines et son UI
kit. Chaque composant y porte sa source (`Source : src/components/plan/action-card.tsx — rayon 18
padding 20 gap 8`). Les 27 chemins ainsi cités ont été vérifiés un par un le 11/09/2026 : tous
existent.

Ce que le kit n'avait pas et que la synchronisation construit : le bundle runtime `_ds_bundle.js`,
la mise en forme par composant avec ses cartes d'aperçu, et l'ancre `_ds_sync.json`.

## Ce qui a été corrigé avant le premier téléversement

**Le mot de passe, qui n'existe plus dans le produit depuis le 07/09/2026** (`v1-10` §2.D : aucun
`signInWithPassword`, le seul accès à un compte est un lien à usage unique par email). Le kit le
portait à cinq endroits, dont les deux qui comptent le plus :

- `components/forms/TextField.prompt.md` — l'**exemple d'usage principal**, c'est-à-dire ce contre
  quoi l'agent de design code ;
- `readme.md` — la phrase de mot de passe servait d'**exemple du ton** de la maison ;
- `components/forms/TextField.d.ts` — `type?: … | 'password'` ;
- `components/forms/forms.card.js` et `components/core/core.card.js` — les **cartes d'aperçu**, ce
  que les humains voient dans le sélecteur de composants.

Remplacé par de la copie réelle du produit (`« Cette adresse semble incomplète. »`, `« L'envoi n'a
pas abouti. Vérifie l'adresse et réessaie. »`), et le `.prompt.md` dit désormais explicitement
qu'il n'y a pas de mot de passe — sans quoi l'agent construirait un écran que le produit n'a pas.

## Ce qui reste volontairement en l'état

`ui_kits/ramille/Catalogue - 38 ecrans.dc.html` garde huit mentions du mot de passe. **Deux raisons
de ne pas y toucher** : c'est un artboard de canvas, donc un relevé figé du handoff V1, et
`docs/design/` est « figé tel quel, jamais réécrit » (CLAUDE.md) ; et `ui_kits/` ne fait pas partie
de ce que le téléversement emporte (`components/`, `tokens/`, `fonts/`, `guidelines/`, `styles.css`,
le bundle) — il n'atteint donc jamais l'agent de design. CLAUDE.md documente déjà cet écart.

## Pièges du dépôt à connaître pour une resynchronisation

- **Les `.d.ts` du kit sont dans le `include` du tsconfig racine** (`**/*.ts`, `exclude` ne porte que
  `node_modules` et `api/**`). Une faute de type dans le kit **fait rougir `npx tsc --noEmit`** du
  produit. Vérifié après correction : typecheck, lint et les 298 tests passent.
- Le kit est une **photographie du dépôt, pas une source de vérité** (CLAUDE.md) : en cas d'écart,
  le code gagne. La vérification qui vaut la peine avant chaque sync est celle des `Source : …`,
  faite ci-dessus.
