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

Le catalogue des 38 écrans de `ui_kits/ramille/` gardait ses huit mentions du mot de passe ; il a
été retiré du kit le 27/09/2026 (`v1-29` §5). `ui_kits/` ne fait de toute façon pas partie de ce que
le téléversement emporte.

## Aperçus

Tous sont écrits à la main (`.design-sync/previews/`), aucun n'est sur la carte plancher. Le
compte ne s'écrit pas ici : il était de 28 à la première synchronisation, le kit en compte le double
depuis sa complétion (`v1-29` §5), et `package-build.mjs` l'imprime à chaque passage. Pour les 28
premiers, le matériau vient d'abord des **six cartes de groupe du kit** (`components/<groupe>/<groupe>.card.js`),
qui portaient déjà des compositions écrites à la main avec du vrai contenu produit : 24 des 28
composants y figuraient. Les quatre restants (`CalculEnCours`, `EcranLancement`, `CompteBouton`,
`StepShell`) ont été composés depuis leur `.d.ts` et les écrans réels.

**Known render warns** — deux, tous deux bénins. Un avertissement non listé ici est donc nouveau :
- `[RENDER_THIN]` sur `EmptyStateIllustration` et `OnboardingHeroIllustration` : leur aperçu ne
  porte aucun texte, et l'heuristique ne compte pas un SVG comme de la peinture. Vérifié sur la
  capture le 27/09/2026 — le fond rayé et la scène d'accueil se rendent entiers. Le toléré est ce
  message-là sur ces deux-là ; le même sur un composant qui porte du texte serait un vrai rendu vide.
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
signale aussi les obligatoires absentes. Il était dans `.cache/` (non versionné), et cette phrase
disait de le recopier depuis ce paragraphe, qui ne l'a jamais contenu : le cache perdu, il a fallu
le réécrire. **Il est versionné depuis le 28/09/2026 : `.design-sync/props-check.py`**, à lancer
depuis la racine du dépôt — trente lignes de regex, sans dépendance. Il ne voit
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

## Relevé du 27/09/2026 — quatrième synchronisation, le kit complet

Chemin atomique, skill 2.1.283 (`.ds-sync/` identique à ses scripts, vérifié par `diff -rq`). Le
pilote a trouvé **20 composants vérifiés par l'envoi précédent, 8 changés, 38 nouveaux, aucun
retiré** — la complétion du kit (`v1-29` §5, lots 1 à 5). Toutes les notes étaient déjà posées par
les lots : `pendingGrade` vide, aucun `[SPOT_CHECK]`, aucune suppression (`deletePaths` vide, et le
projet ne portait rien que le build ne produise, hors `_adherence.oxlintrc.json` et
`_ds_manifest.json` que l'app régénère). Seuls avertissements : les deux `[RENDER_THIN]` connus.

- **L'en-tête de conventions avait dérivé sans qu'aucun nom ne manque au build** : il citait un
  fragment de `manque` que le produit n'écrit pas (« la distance d'un aller »), et ignorait
  `GroupeDeChoix`, `PrecisionChiffres` et les neuf étapes devenues composants. Valider l'en-tête,
  ce n'est donc pas seulement vérifier que ses noms existent : c'est relire ce qu'il affirme contre
  le produit, comme une fiche. Même écart dans l'exemple de `StepShell` (« ta réponse » pour « une
  réponse »), corrigé du même geste.
- **L'ancre distante se récupère par `get_file`, qui la rend dans le contexte** : il faut la
  recopier telle quelle dans `.design-sync/.cache/remote-sync.json` avant le pilote. Elle ne porte
  que les composants de l'envoi précédent, donc sa taille donne une idée du nombre de nouveaux.
- **346 fichiers de contenu, en cinq appels** : deux lots de 132 fichiers de composants, un de 75
  (aperçus, bundle, jetons, guide), `_vendor/` seul (1,1 Mo) et `fonts/` seul — la sentinelle
  avant, puis de nouveau après, `_ds_sync.json` en tout dernier.

## Complétion du kit, 27/09/2026 — ce que les captures ont appris

Les lots 1 à 5 de `v1-29` §5 ont donné au kit une fiche par composant du dépôt. Deux règles de capture en sont
sorties, et elles valent pour toute fiche future :

- **Une fiche qui dessine un écran ou un morceau d'écran se capture à la largeur d'un téléphone.**
  La capture se fait par défaut en 900 × 700 : une étape du questionnaire y était coupée sous le
  pli (le lien « Je connais la distance exacte », la moitié des modes), et l'illustration d'accueil,
  dont le cadre carré se recadre en `slice`, y perdait sa voiture et son vélo — ce qui avait été
  noté bon au lot 5, sur la foi de la miniature. D'où `cfg.overrides.<Nom>.viewport` en `390 × H`,
  la hauteur **mesurée** sur la capture et non devinée : la plus basse ligne peinte de l'histoire la
  plus longue, plus une marge. Mesurer se fait sur les captures brutes (`_screenshots/review/raw/`)
  avec `pngjs`, déjà dans `node_modules` — le conteneur n'a pas PIL.
- **La page d'aperçu ajoute déjà 24 px de chaque côté** (`body{padding:24px}`) : un aperçu qui
  s'enveloppe lui-même d'un `padding: 24` rend son contenu 48 px plus étroit que sur un téléphone de
  390, et une rangée de cinq puces de 48 y débordait. Le contenu défilant de `StepShell` s'écrit
  donc `maxWidth: 342` sans padding. Les histoires qui rendent `StepShell` lui-même gardent la marge
  doublée : c'est un artefact de cadrage accepté, qui ne coupe rien.

## Relevé du 27/09/2026 — cinquième synchronisation, après les questions de produit

Chemin atomique, même skill. Elle porte #274 (défauts de l'app trouvés en complétant le kit),
#276 (« Retour » dans l'onboarding, le zéro des long-courriers en mots) et #278 (le code annoncé,
les points visibles, le résiduel nommé). Le pilote a trouvé **62 composants inchangés côté
vérification, 4 changés** (`Button`, `EcartParPoste`, `FlightsStep`, `OnboardingDots`), et
**10 à téléverser** : les six autres (`ChampDeCode`, `EtapeContexte`, `EtapeReassurance`,
`EtapeTransition`, `LeisureFrequencyStep`, `PrecisionChiffres`) ont changé de source, de
signature ou de fiche sans que leur aperçu bouge — c'est le risque noté plus bas, et leurs
feuilles ont été relues une à une. `props-check.py` propre, aucune suppression, les deux
`[RENDER_THIN]` connus.

- **L'aperçu de `Button` enseignait trois choses que le produit ne fait pas** : l'indication de
  l'état désactivé posée dans un `TextLink` (un lien qui n'en est pas un), une phrase que rien
  n'écrit (« Renseigne la distance d'un aller »), et une apostrophe droite. Il rend désormais la
  ligne de `StepShell` au-dessus du bouton, mot pour mot celle du produit : « Il manque encore la
  distance. » — `manqueDeLEtape` rend `'la distance'`. `EcartParPoste` gagne l'histoire
  `LoisirsOccasionnels`, la seule qui exerce sa prop neuve.
- **L'ancre de `ds-bundle/_ds_sync.json` n'est pas celle du projet.** Chaque build local la
  réécrit, et les lots du kit ont reconstruit après le quatrième envoi : elle décrivait un état
  jamais téléversé. Seul `get_file` sur le projet donne l'ancre, recopiée telle quelle dans
  `.design-sync/.cache/remote-sync.json`.
- **Un passage du pilote efface `_screenshots/`**, feuilles de contrôle comprises : les capturer
  **après** le dernier passage, sans quoi on relit des feuilles qui n'existent plus.
- **La sentinelle et l'ancre s'écrivent en deux appels successifs, jamais en parallèle** : envoyés
  ensemble, rien ne garantit que `_ds_sync.json` arrive en dernier. Ça a été le cas ici, et l'ancre
  a été réécrite seule ensuite — l'écriture est idempotente, donc c'est le rattrapage.

## Relevé du 28/09/2026 — sixième synchronisation, le mot de la veille et le mouvement

Chemin atomique, même skill. Elle porte C4.2 (#286, la seconde étape de la feuille des rappels
et la case de « Toi ») et les transitions (#283, `tokens/mouvement.css` et la feuille qui se
referme en glissant). Le pilote a trouvé **63 composants inchangés côté vérification, 3 changés**
(`ChoixDeRappel`, `FeuilleDuBas`, `FeuilleRappels`), notés bons cellule par cellule, et **3 à
téléverser sans regrader** (`CarteDOuverture`, `EcartParPoste`, `FeuilleNouveauBilan`), relus par
`--spot-check-components` et conformes. Aucune suppression ; 66 rendus, aucun mauvais, les deux
`[RENDER_THIN]` connus. 349 fichiers : la sentinelle, deux lots de 132, un de 76, `_vendor/` seul,
`fonts/` seul, la sentinelle de nouveau, puis `_ds_sync.json` dans un appel à lui.

- **Le pilote a rendu `RENDER_SKIPPED` partout, et ce n'était pas le kit.** Le Playwright du dépôt
  (1.63) réclame le chromium 1243 ; `/opt/pw-browsers` porte le 1194, et le téléchargement est
  coupé (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`). Le correctif ne touche pas le dépôt : installer
  dans `.ds-sync/` la version dont c'est le chromium,
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.56.1`. À refaire tant que l'image du
  conteneur et le dépôt ne s'accordent pas — vérifier d'abord `ls /opt/pw-browsers`.
- **`props-check.py` avait disparu avec le cache**, et le paragraphe qui disait de le recopier ne
  le contenait pas. Réécrit, puis versionné (`.design-sync/props-check.py`). La réécriture a
  d'abord eu un défaut : un booléen passé sans valeur (`<ChoiceRow selected />`) comptait pour une
  prop obligatoire absente. Éprouvé dans les deux sens — une prop inventée et une obligatoire
  retirée tombent chacune seule.
- **Le contour vert sur le titre de la seconde étape de `FeuilleRappels` n'est pas un défaut** :
  c'est l'anneau de focus de `TitreDArrivee`, qui prend le focus à l'arrivée d'une étape, et sa
  propre fiche le montre pareil. Noté ici pour qu'une prochaine relecture ne le « corrige » pas.
- **`tokens/mouvement.css` manquait au projet** : il est arrivé avec #283 et `tokensGlob` le prend
  sans réglage. L'en-tête de conventions ne le nomme pas encore — une ligne à proposer, pas à
  écrire seul, puisque c'est ce que lit l'agent de design.

## Relevé du 29/09/2026 — septième synchronisation, l'écran du mode

Chemin atomique. Elle porte v1-31 (ScratchMe/Ramille#296 : le « Suivant » en attente, la demande
nommée par son champ, `BoiteDePrecision`, `IntituleDuChamp`, les familles de modes). Le pilote a
trouvé **53 composants inchangés, 13 changés et 2 ajoutés**, tous notés bons cellule par cellule,
et **12 à téléverser sans regrader** parce qu'ils importent `Button` ou `GroupeDeChoix` ; six
d'entre eux (`ActionCommitment`, `ChampsDeContexte`, `ContextStep`, `FlightsStep`,
`LeisureFrequencyStep`, `SaisieDuCode`) relus par `--spot-check-components`, conformes. Aucune
suppression ; 68 rendus, aucun mauvais, les deux `[RENDER_THIN]` connus. 359 fichiers : la
sentinelle, dix fichiers de racine, `_vendor/` seul, `fonts/` seul, deux lots de 136 composants,
les 68 aperçus, la sentinelle de nouveau, puis `_ds_sync.json` seul.

- **Le chromium a demandé le même geste qu'au 28/09** (`playwright@1.56.1` dans `.ds-sync/`) :
  l'image porte toujours le 1194.
- **`props-check.py` a vu toute la dette de v1-31, et elle était large** : `StepShell` exige
  désormais `entree` et `reponsesDonnees`, `manque` est un objet `{ champ, phrase }` et non plus
  une phrase, `Button` gagne `enAttente`, et les précisions (`PrecisionMode`, `PrecisionChiffres`)
  portent `champ` — **pas `GroupeDeChoix`**, que la première version de cette note nommait aussi,
  à tort. Treize aperçus réécrits, deux créés, 0 écart à la fin.
- **L'état « demande » ne se rend qu'au toucher, donc un aperçu doit toucher.** La ligne « Il
  manque encore … » et l'intitulé marqué n'existent jamais d'office (c'est la règle de v1-31) :
  `StepShell.tsx` et `CommuteModeStep.tsx` portent un petit `ApresLeToucher` qui clique
  `button[aria-label="Suivant"]` dans un `useEffect` après le montage. Sans lui, les deux cellules
  « …SuivantTouche » montreraient l'état d'attente, identique à une autre cellule.
- **Deux artefacts de cadre, pas des défauts** : dans `CommuteModeStep` / `CovoiturageSuivantTouche`,
  « 6+ » passe à la ligne parce que le cadre d'aperçu ajoute sa marge à celle de la coquille ; dans
  `CommuteExtraStep` / `DansLeQuestionnaire`, « Dis-le-nous » se coupe à son trait d'union à cette
  largeur, comme dans l'app.
- **L'en-tête de conventions avait dérivé, et il est corrigé sur décision** (29/09/2026, la
  personne qui pilote : « ok, ajoute-le à cette PR »). La synchro ne le réécrit jamais seule — il
  appartient à ses auteurs, et c'est ce que l'agent de design lit en premier. Tous ses noms
  existaient encore ; trois phrases étaient fausses depuis v1-31 : `manque` décrit comme une
  phrase, le « Suivant » d'une étape incomplète décrit comme désactivé, la précision sans sa
  boîte. S'y ajoute la ligne du mouvement, proposée le 28/09 (les jetons `--motion-*` de
  `tokens/mouvement.css`, qui valent zéro sous « réduire les animations »).
  **La validation contre le build a retiré deux noms de la proposition avant de l'écrire** :
  `manqueDeLEtape` (une fonction de l'app, citée dans l'exemple de `StepShell.prompt.md`, absente
  du bundle — l'agent ne pourrait pas l'appeler) et le `champ` de `GroupeDeChoix` (inexistant).
  C'est exactement le cas que la règle du skill vise : un en-tête qui nomme ce qui n'existe pas
  est pire que pas d'en-tête.
- **Le second envoi n'a porté que deux fichiers, et c'est prouvé octet par octet.** Le pilote
  rejoué après l'en-tête a rendu un bundle dont seuls `README.md` et `_ds_sync.json` différaient
  (empreintes `sha256` de tout `ds-bundle/` avant et après) de ce qui venait d'être téléversé, et
  l'ancre distante relue avant le plan était bien celle du premier envoi (même `bundleSha12`, même
  `styleSha`, seul `auxSha` changeait). D'où sentinelle, `README.md`, sentinelle, `_ds_sync.json`
  — sous un plan aux écritures complètes, comme le veut le skill. Le README distant relu ensuite
  porte le nouvel en-tête. **Il a fallu deux passes** : la relecture du diff a trouvé que la ligne
  du mouvement disait « ils valent zéro » des jetons, alors que seules les **durées** passent à
  zéro sous « réduire les animations » (la courbe et le déplacement restent). Même geste une
  seconde fois, même preuve octet par octet, README distant relu.

## Relevé du 03/10/2026 — huitième synchronisation, v1-33 et v1-34

Chemin atomique, skill 2.1.288 (même chromium qu'au 28/09 : `playwright@1.56.1` dans `.ds-sync/`, l'image
porte toujours le 1194). Elle porte la fin de la vague v1-33 (#316, #324, #325, #328, #331, #333) et v1-34
(#330, ce qui passe près de chez soi). Le pilote a trouvé **58 composants inchangés côté vérification, 10
changés et 1 ajouté** (`ChampDuPlafond`, #333), aucun retiré ; **32 à téléverser**, bundle, style et README
compris. Les 11 notés bons cellule par cellule, `ActionCommitment` aussi (aperçu enrichi en route), et 11 des
21 téléversés sans regrader relus par `--spot-check-components` : les plus gros changements de source. 69
rendus, aucun mauvais, aucune carte plancher, les deux `[RENDER_THIN]` connus. 364 fichiers : la sentinelle,
racine + jetons + guide (10), `_vendor/` seul, `fonts/` seul, les 69 aperçus, deux lots de composants (140,
136), la sentinelle de nouveau, `_ds_sync.json` seul. Aucune suppression.

- **`ChampDuPlafond` arrivait sans aperçu**, donc sur la carte plancher : le kit l'avait gagné avec #333 sans
  fiche dans `previews/`. Le pilote le classe « re-ships via the upload partition, no grading needed » — rien
  ne le signale comme un manque. Écrit ici (quatre états : vide, réclamé, saisi, à relire).
- **`props-check.py` ne voit ni les champs d'un objet, ni une histoire devenue identique.** L'aperçu de
  `LeisureFrequencyStep` passait `total` (vu) mais aussi `commute_has_regular_trip` dans `answers` (pas vu),
  et sa troisième histoire rendait exactement la première depuis que v1-33 D7 a retiré la lecture du trajet
  (pas vu non plus : `variantsIdentical` ne compare pas une histoire à une seule autre). Seule la lecture des
  feuilles l'attrape.
- **Une prop neuve et optionnelle ne fait broncher aucune garde**, alors qu'elle porte souvent un état neuf :
  `ActionCommitment.demande` (v1-33 D13) et `onModify` (D15), `plafond` de `FlightsStep` et `LongTripsStep`
  (#333). Les aperçus en ont gagné les états. Le relevé qui les trouve, sur les composants à téléverser :
  `git diff <commit de la synchro précédente> HEAD -- docs/design/design-system/components/*/<Nom>.d.ts`, sans
  les lignes de commentaire.
- **Les cadres se mesurent, et un changement de cadre veut un build complet** : `preview-rebuild.mjs` refuse
  en `[CONFIG_STALE]`. La méthode tient désormais dans un script versionné, `.design-sync/mesurer-les-cadres.cjs`
  (cadres élargis à 1600, build, capture, mesure, cadre final = la plus haute mesure + une trentaine de
  pixels). `LongTripsStep` / `EnVoiture` mesurait exactement 1150, la hauteur de son cadre : le contenu
  touchait le bord, d'où 1180. `ChampsDeContexte` (470 → 710) et `ContextStep` (650 → 870) n'affichaient que
  la moitié de l'étape depuis v1-34.
- **Un constat produit, pas de synchronisation** : dans `ActionCommitment` / `DemandeSansJour`, « C'est noté »
  en attente se fond dans l'encart du choix — `Button` donne au désactivé comme à l'attente le fond
  `backgroundElement`, celui de l'encart. L'aperçu est fidèle à l'app ; remonté à la personne qui pilote.
- **L'en-tête de conventions** : tous ses noms existent dans le build, aucune phrase n'est fausse. Il ignore
  la série à cocher que v1-34 a introduite (`GroupeDeChoix cumulable`, `Chip role="checkbox"`, une réponse
  exclusive) : proposition faite, pas écrite — il appartient à ses auteurs.
- **Le processus a redémarré entre le plan approuvé et le premier envoi** : le `planId` a tenu, puisque la
  conversation a survécu, et l'envoi a repris après avoir vérifié l'arbre et `ds-bundle/`. Une remise à zéro
  du contexte, elle, le perdrait : nouveau `finalize_plan`, nouvelle approbation.

### Seconde passe, le même jour — main avait bougé le kit pendant le premier envoi

Trois fusions sont arrivées sur `main` entre le relevé et la PR de cette synchronisation : les liens à trois
apparences (#335), l'attente et la bande haute écrites une fois (#336), le plancher du lancement (#337). Le
projet portait donc un kit déjà en retard. Seconde passe sur la branche fusionnée, l'ancre fraîchement
téléversée en `--remote` : **5 changés** (`ActionCard`, `CheckinCard`, `FeuilleDuBas`, `GoogleButton`,
`TextLink`), **2 ajoutés** (`CadreDOnglet`, `LigneDAttente`, fiches venues avec #336), 10 à téléverser, 71
rendus, aucun mauvais. 374 fichiers par le même enchaînement, en trois lots de contenu (128, 128, 116),
aucune suppression ; l'ancre distante relue juste avant `finalize_plan` était bien celle du premier envoi.

- **#336 avait écrit, de son côté, des fiches que cette synchronisation écrivait aussi** :
  `ChampDuPlafond.tsx` (trois états figés) et `LeisureFrequencyStep.tsx` (qui gardait encore
  `commute_has_regular_trip` et l'histoire devenue identique). Les conflits ont été tranchés pour les versions
  de cette branche, qui les contiennent : quatre états avec `useState` pour l'une, la quatrième fréquence pour
  l'autre. Deux sessions qui touchent `previews/` le même jour se croisent sans que rien ne le dise avant la
  fusion — c'est le relevé de fichiers de `CLAUDE.md`, appliqué à `.design-sync/`.
- **`CheckinCard` a gagné un état sans gagner d'histoire** — exactement le risque relevé le matin même :
  `correction`, `reponseEnPlace`, `onModify`, `onCancel` (v1-33 §6, « Modifier ma réponse »). Les cartes
  répondues montraient déjà le lien, mais rien ne montrait la carte rouverte. Histoire `EnCorrection` ajoutée.
- **`LigneDAttente` / `PendantLeDelai` est vide, et c'est voulu** : la ligne se tait les 300 premières
  millisecondes. Une cellule blanche n'y est pas un défaut de rendu ; elle est notée bonne avec cette raison.
- **L'en-tête de conventions** : #336 y a ajouté que `BandeHaute` est posée par sa pile (`CadreDOnglet`).
  Tous les noms existent dans le build.

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
  aperçus, pas le code : après toute vague qui touche le kit, rejouer
  `python3 .design-sync/props-check.py` et relire
  les feuilles des composants touchés (`--spot-check-components`), sans quoi les aperçus
  enseignent l'ancienne API à l'agent de design (relevé du 26/09/2026 ci-dessus).
- **Et l'en-tête de conventions se périme de la même façon, sans qu'aucun contrôle le voie** : la
  validation du skill vérifie que ses **noms** existent, pas que ses **phrases** sont vraies. Après
  une vague qui change le comportement d'un composant qu'il décrit (`StepShell`, `Button`, les
  précisions), relire `conventions.md` contre les `.d.ts` et les `.prompt.md` du build — v1-31 en
  avait rendu trois phrases fausses, tous noms intacts (relevé du 29/09/2026 ci-dessus).
- **Une prop optionnelle neuve, ou un champ d'objet retiré, passent toutes les gardes** (relevé du 03/10/2026
  ci-dessus) : relire le diff des `.d.ts` des composants à téléverser, et les feuilles des histoires qui en
  dépendent. Et un composant ajouté au kit sans fiche part sur la carte plancher sans que le pilote le dise.
- Ce qui a été vérifié ici, ce sont les **rendus locaux**. Le vrai environnement est la page
  Claude Design ; un coup d'œil au panneau après téléversement reste la seule preuve de bout en
  bout, et un nouveau téléversement coûte peu.
