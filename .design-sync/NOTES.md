# Notes de synchronisation vers Claude Design

Relevé du 11/09/2026, première synchronisation. Projet Claude Design « Ramille »
(`93230318-3cf5-46fc-b0be-ac9ec87b2877`), épinglé dans `config.json`.

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

## Comment le convertisseur atteint le kit — deux gestes à refaire après un clone

Le convertisseur résout son paquet par `join(--node-modules, cfg.pkg)`, et le kit doit résoudre
`react`. Deux choses le rendent possible, et **aucune des deux ne survit à un clone** :

1. **Le lien symbolique** `node_modules/ramille-design-system → ../docs/design/design-system`
   (`node_modules` est ignoré par git). Sans lui, `[NO_DIST]` ou pire : le convertisseur part de
   la racine du dépôt et découvre `src/` — les 50 composants React **Native**.
   `ln -sfn ../docs/design/design-system node_modules/ramille-design-system`
2. **`.design-sync/node_modules`**, le lien vers `.ds-sync/node_modules`, nécessaire parce que
   `.design-sync/overrides/docs.mjs` est un fork (voir ci-dessous) :
   `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`

Le kit porte désormais son propre `package.json` (`ramille-design-system@1.0.0`, `private`), et
**il n'est pas décoratif** : `lib/dts.mjs` le lit sans garde (`projectFor`) et lève sans lui.

Pas de `dist/`, pas de barrel : le convertisseur est en **mode synth-entry**, il compose son
entrée à partir des 28 `.jsx`. La liste des composants vient alors du scan des exports PascalCase
des sources — `opticalScale` et `mascotFaceGeometry` (minuscules) en sont naturellement exclus,
d'où 28 composants pour 30 exports dans `window.Ramille`.

## Le fork `docs.mjs`

Le kit range la doc d'usage de chaque composant en **`<Nom>.prompt.md`**, à côté de son `.jsx` et
de son `.d.ts`. La sonde du convertisseur ne connaît que `<Nom>.md` / `.mdx` / `.docs.mdx`. Trois
issues possibles, et deux sont mauvaises : renommer les 28 fichiers rendrait fausse une ligne du
HANDOFF figé de v1-14 (`docs/design/` ne se réécrit pas) ; énumérer 28 chemins dans `cfg.docsMap`
se périmerait au composant suivant, ce que le skill déconseille explicitement. D'où
`.design-sync/overrides/docs.mjs`, qui ajoute `<Nom>.prompt.md` **en tête** de la sonde. Une ligne
de différence avec l'original ; à rediffer contre `lib/docs.mjs` à chaque resynchronisation.

## Le style : il n'y a pas de CSS de composant, et c'est ce qui décide de `cssEntry`

Les composants du kit portent tout en **styles en ligne** (`style={{…}}` + `var(--color-*)`) : ils
n'importent aucun CSS. `_ds_bundle.css` sort donc vide, et pointer `cssEntry` sur l'ancien
`styles.css` (qui n'était qu'une suite d'`@import`) faisait échouer `[CSS_PLACEHOLDER]`.

La réponse est `base.css`, écrit pour l'occasion et versionné dans le kit : **la seule feuille du
kit**, et elle ne contient que ce qui ne peut pas vivre dans un composant — police, fond et encre
de la page, `box-sizing`, anneau de focus, motif des placeholders. Chaque carte du kit et chaque
carte de guideline réécrivait ces déclarations à la main dans un `<style>` local. Les avoir là,
c'est ce qui fait qu'un écran construit avec Ramille hérite de la police sans que personne y pense.

## Les polices sont versionnées, et ce n'était pas qu'une question de vitesse

`tokens/fonts.css` portait un `@import url(fonts.googleapis.com/…)`. Deux conséquences :
**une police de marque servie par un tiers se dégrade en silence en police système** partout où
cet hôte n'est pas joignable (et rien en aval ne le signale) ; et, localement, chaque page de la
vérification de rendu attendait ~30 s le chargement — 14 min par passage de `package-validate`,
parce que le chromium de Playwright ne porte pas le proxy de l'environnement alors que `curl`
l'a. Les quatre graisses de Spline Sans (224 Ko, SIL OFL 1.1) sont désormais dans
`docs/design/design-system/assets/fonts/`, reprises de `@expo-google-fonts/spline-sans` que le
dépôt utilise déjà, déclarées en `@font-face` local et câblées par `cfg.extraFonts`.
`tokens/fonts.css` a disparu avec l'`@import`. **L'app, elle, continue de charger la police via
`@expo-google-fonts` — c'est le kit qui devient autonome, pas le dépôt qui change.**

## Le piège du typecheck, et sa correction

Le `include` du tsconfig racine vaut `**/*.ts` + `**/*.tsx`, et son `exclude` ne portait que
`node_modules` et `api/**`. Trois arborescences de la synchronisation y tombaient :
`.design-sync/previews/*.tsx` (qui importent `'ramille-design-system'`), `ds-bundle/**/*.d.ts`
(sortie régénérée), et `.ds-sync/node_modules` (une seconde copie de `@types/react`). `exclude`
porte désormais `.ds-sync/**`, `.design-sync/**` et `ds-bundle/**`.

**Les `.d.ts` du kit restent, eux, dans le typecheck du produit** — c'est un garde-fou utile :
une faute de type dans le kit fait rougir `npx tsc --noEmit`. Vérifié après cette
synchronisation : typecheck, lint et les 298 tests Jest passent.

## Ce que la synchronisation a corrigé dans le kit

Trois écarts, tous du même genre : **un kit qui montre un comportement disparu ne se lit pas
« historique », il se lit « disponible »** — et c'est ce que l'agent de design recopie.

1. **Le mot de passe**, qui n'existe plus dans le produit depuis le 07/09/2026 (`v1-10` §2.D : le
   seul accès à un compte est un lien à usage unique par email). Il vivait dans le `.prompt.md` de
   `TextField` comme **exemple d'usage principal**, dans `readme.md` comme **exemple du ton**, dans
   `TextField.d.ts` (`type?: … | 'password'`) et dans deux cartes d'aperçu.
2. **`NumericField` jetait la virgule** (`replace(/[^0-9]/g, '')`) : « 3,5 » donnait **35**, sans
   erreur ni refus. C'est le défaut que le dépôt a corrigé (`saisieVersNombre`,
   `src/types/bilan.ts`), et il porte sur le poste le plus lourd de la plupart des bilans.
3. **`FeuilleRappels` figeait « lundi » dans ses détails de canal** quelle que soit la boucle : sur
   `boucle="mensuel"`, le choix disait l'inverse de ce que Ramille venait d'annoncer.

`ui_kits/ramille/Catalogue - 38 ecrans.dc.html` garde ses huit mentions du mot de passe, et c'est
volontaire : artboard de canvas, relevé figé du handoff V1, et `ui_kits/` ne fait pas partie de ce
que le téléversement emporte.

## Aperçus

Les 28 sont écrits à la main (`.design-sync/previews/`), aucun n'est sur la carte plancher.
Le matériau vient d'abord des **six cartes de groupe du kit** (`components/<groupe>/<groupe>.card.js`),
qui portaient déjà des compositions écrites à la main avec du vrai contenu produit : 24 des 28
composants y figuraient. Les quatre restants (`CalculEnCours`, `EcranLancement`, `CompteBouton`,
`StepShell`) ont été composés depuis leur `.d.ts` et les écrans réels.

**Known render warns** — aucun à ce jour. Un avertissement non listé ici est donc nouveau :
- `[GRID_OVERFLOW]` sur `Mascot` a été **corrigé**, pas toléré : `cfg.overrides.Mascot.cardMode =
  "column"`. Les expressions sont rendues à 96 px (80 pour l'inclinaison) : à 64 px le visage
  n'était pas lisible à l'échelle de la carte, ce qui vide de sens la planche des expressions.

## Relevé du 14/09/2026 — deuxième synchronisation

Re-synchro sur le chemin atomique (projet épinglé). Verdict du pilote : les **28 composants
`unchanged`**, donc vérifiés par le téléversement précédent — aucun regrade, aucun `[SPOT_CHECK]`,
`pendingGrade` vide. `validate` sort à 0 avec **28/28 aperçus rendus** et **zéro ligne
d'avertissement**, ce qui confirme le « aucun à ce jour » de la liste connue. Les noms énumérés par
`conventions.md` ont été revalidés un par un contre le build frais (deux jetons, dix composants
présents à la fois dans l'arbre et dans le bundle, `StepShell.manque`, `Button.flex`,
`guidelines/readme.md`, 28 `.prompt.md`) : aucune dérive, donc le fichier n'a pas été réécrit.

**Le seul écart était `aux`** — ni le bundle, ni le style, ni un composant. Cause : le corps généré
du README a changé avec la **version du skill** (2.1.268 → 2.1.270) alors que `scriptsSha` est resté
identique. Conséquence à connaître : **une montée de version du skill peut produire un téléversement
aux-seul**, et ce n'est pas un signe de dérive du kit.

Trois pièges rencontrés, dont deux qui coûtent du temps :

1. **Ne jamais faire passer la sortie du pilote dans `tail`.** Les lignes d'avertissement que la
   procédure demande de confronter à la liste connue sont en **tête** de sortie ; un `| tail -80` les
   jette et il faut rejouer `package-validate.mjs` seul pour les récupérer (rejeu sans danger : seul
   `package-build.mjs` efface `.sync-diff.json`).
2. **Un build dans un répertoire témoin n'est pas un test de déterminisme** pour `bundleSha12` ni
   `styleSha`. esbuild embarque le chemin de l'entrée synthétisée (`<out>/.pkg-entry.mjs`) dans un
   commentaire de module : à `--out ./ds-bundle` c'est un chemin **relatif**, ailleurs c'est un
   absolu, donc les deux empreintes diffèrent sans qu'aucun contenu n'ait bougé (`styles.css`,
   `_ds_bundle.css` et `README.md` sont, eux, identiques octet pour octet). `auxSha` et le README
   sont les seules empreintes comparables d'un répertoire à l'autre.
3. **Le premier lien symbolique a survécu, le second non.** Sur cette machine
   `node_modules/ramille-design-system` était encore là (le `node_modules` du conteneur datait de la
   synchro précédente) alors que `.design-sync/node_modules` avait disparu. Les refaire tous les deux
   sans regarder coûte une seconde ; en vérifier un seul laisse l'autre casser plus tard.

## Relevé du 26/09/2026 — troisième synchronisation

Re-synchro sur le chemin atomique, skill 2.1.283. Le kit avait bougé avec les arbitrages des
24 et 25/09/2026 (`v1-29`) : 23 composants, le bundle et le style à téléverser. Le pilote les a
pourtant tous classés `unchanged` côté **vérification** — c'est voulu : les notes suivent les
aperçus, pas le code des composants.

**C'est exactement ce qui a laissé dériver dix aperçus, et c'est la leçon de cette passe.** Un
aperçu écrit contre l'ancienne API d'un composant ne casse pas : React ignore une prop inconnue,
et la carte se rend « bien ». Mais l'agent de design lit l'aperçu comme un exemple d'usage. Relevé
en auditant quatre composants (`--spot-check-components`), puis généralisé :

- **des props qui n'existent plus** : `etiquette` (`ActionCard`), `underline` et `align`
  (`TextLink` — `style` à la place), `reponses` (`CheckinCard`), `label` (`GoogleButton`),
  `type="email"` (`TextField` → `keyboardType="email-address"`), `ariaLabel` (`Chip` →
  `accessibilityLabel`), `detail` et `disabled` (`ChoiceRow`, qui ne porte qu'un libellé) ;
- **une prop devenue obligatoire et absente** : `Chip.role` (`radio` | `checkbox`), dans `Chip`
  et `StepShell` ;
- **le vocabulaire d'avant le produit** : « Une notification / Un email / Rien », le canal `aucun`
  (c'est `none`), « Renvoyer le lien », « Recevoir le lien » (c'est un code depuis le 20/09),
  « Ce mois-ci » dans une question qui doit nommer le mois écoulé, et des tranches `< 5 km` que
  le questionnaire n'écrit pas.

**La garde, à rejouer à chaque resynchronisation** : `.design-sync/.cache/props-check.py`
compare chaque prop passée à un composant du kit dans `previews/*.tsx` à son `<Nom>Props`, et
signale aussi les obligatoires absentes. Il est dans `.cache/` (non versionné) : le recopier
depuis ce paragraphe si le cache a disparu — trente lignes de regex, sans dépendance. Il ne voit
pas le vocabulaire : pour lui, relire les feuilles, et chercher les mots retirés du produit
(`grep -rn "aucun'\|lien à usage\|Recevoir le lien" .design-sync/previews`).

Deux autres corrections :

- **`cfg.overrides.Chip.cardMode = "column"`** : les puces font 48 px depuis le 24/09, et les
  sept jours débordaient d'une cellule de grille (`[GRID_OVERFLOW]`).
- **`conventions.md`, deux faits corrigés et rien d'autre** : « l'action estompée à 0,72 » (elle
  recule par son cadre, jamais par une opacité) et « la cible fait 44 px » (48). Les noms qu'il
  cite ont tous été revalidés contre le build : les onze composants dans l'arbre et le bundle,
  `StepShell.manque`, `Button.flex`, `--color-accent` et `--color-scrim`, `guidelines/readme.md`.

**Ce que cette passe n'a pas fait** : ajouter au kit les composants que le produit a gagnés depuis
(`GroupeDeChoix`, `FeuilleDuBas`, `LigneDeCanal`, `TitreDArrivee`, `v1-29` §5). La
synchronisation téléverse le kit tel qu'il est ; le compléter est un chantier du kit, pas de la
synchronisation.

## Risques de resynchronisation

- **Les deux liens symboliques ci-dessus** sont la première chose à refaire sur une machine
  neuve ; leur absence ne produit pas une erreur claire mais une découverte qui part de la racine
  du dépôt.
- **Le fork `docs.mjs`** peut diverger de l'amont : le rediffer contre `.ds-sync/lib/docs.mjs`
  avant de relancer, et fusionner ce qui a changé.
- **Les binaires de police** sont versionnés dans `docs/`. Une mise à jour de
  `@expo-google-fonts/spline-sans` ne les met pas à jour : c'est une copie, assumée, et le
  `OFL.txt` voyage avec elle.
- **Le chromium de Playwright n'a pas le proxy de l'environnement.** Toute ressource distante
  référencée par une feuille du kit (police, image) fera à nouveau ramper la vérification de
  rendu sans lever d'erreur. Le symptôme est une capture toutes les 30 s.
- **`cfg.pkg` n'est pas un chemin.** Il valait `docs/design/design-system` dans la toute première
  version de ce fichier de config, ce qui ne peut pas marcher : c'est un nom de paquet, résolu
  sous `--node-modules`.
- **Deux chemins de config se lisent différemment, et l'un rate en silence.** `readmeHeader` est
  relatif au *config home*, c'est-à-dire au répertoire qui **contient** `.design-sync/` — donc
  `.design-sync/conventions.md`, pas `conventions.md`. Écrit court, il est simplement « skipped »
  avec une ligne d'avertissement, et le README part sans son en-tête. `cssEntry`, `tokensGlob`
  et `extraFonts`, eux, sont relatifs au **paquet** (le kit).
- **`tokensGlob` seul ne copie rien** : `copyTokens` sort immédiatement si `tokensPkg` est absent.
  Les deux vont ensemble, et `tokensPkg` vaut ici le kit lui-même.
- **Un changement d'API d'un composant du kit ne fait regrader personne.** Le pilote suit les
  aperçus, pas le code : après toute vague qui touche le kit, rejouer `props-check.py` et relire
  les feuilles des composants touchés (`--spot-check-components`), sans quoi les aperçus
  enseignent l'ancienne API à l'agent de design (relevé du 26/09/2026 ci-dessus).
- Ce qui a été vérifié ici, ce sont les **rendus locaux**. Le vrai environnement est la page
  Claude Design ; un coup d'œil au panneau après téléversement reste la seule preuve de bout en
  bout, et un nouveau téléversement coûte peu.
