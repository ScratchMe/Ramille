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
porte toujours le 1194). Elle porte ce que le kit a reçu depuis la septième synchronisation (#298, le
29/09/2026) : les boucles qui suivent le dernier bilan valide et les puces centrées (#306), les deux lieux qui
ne disent que ce qui tourne (#308), la feuille de recette unique (#299), surtout les vagues technique et
produit de v1-33 (#314, 74 fichiers du kit), puis les textes validés le 02/10 (#316), la quatrième fréquence
des loisirs (#325), la question du mois qui attend le mois choisi (#328), l'intention modifiable sans libérer
l'engagement (#331), le champ sous « 10+ » (#333), et v1-34, ce qui passe près de chez soi (#330). Le pilote a
trouvé **58 composants inchangés côté vérification, 10 changés et 1 ajouté** (`ChampDuPlafond`, #333), aucun
retiré ; **32 composants à téléverser**, plus le bundle, le style et le README. Les 11 notés bons cellule par cellule, `ActionCommitment` aussi (aperçu enrichi en route), et 11 des
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
  `ActionCommitment.demande` (v1-33 D13, venue avec #314) et `onModify` (D15), `plafond` de `FlightsStep` et
  `LongTripsStep` (#333). Les aperçus en ont gagné les états — `LongTripsStep` seulement à la contre-lecture :
  son aperçu ne passait ni `plafond` ni `choisirLePlafond`, donc « 10+ » y décochait la série au lieu d'ouvrir
  le champ. Le relevé qui les trouve, sur les composants à téléverser :
  `git diff <arbre synchronisé la fois d'avant> HEAD -- docs/design/design-system/components/*/<Nom>.d.ts`,
  sans les lignes de commentaire. **L'arbre synchronisé se nomme dans chaque relevé**, puisque les commits
  d'une branche disparaissent au squash : pour celui-ci, `docs/design/design-system` tel que `main` le porte
  après la fusion de #338 — aucune autre PR ne l'a touché entre-temps. Rejoué depuis #298, il trouve aussi
  `relecture` (`ActionCommitment`, `CarteDePiste`, #314) : « C'est noté » inerte pendant que l'écran relit le
  plan. Histoire `Relecture` ajoutée à `ActionCommitment`, parce qu'elle montre le seul `disabled` à côté de
  l'attente qui lui ressemble (brief de l'étape du contexte §4.5) ; pas à `CarteDePiste`, qui pose le même
  `ActionCommitment`.
- **Les cadres se mesurent, et un changement de cadre veut un build complet** : `preview-rebuild.mjs` refuse
  en `[CONFIG_STALE]`. La méthode tient désormais dans un script versionné, `.design-sync/mesurer-les-cadres.cjs`
  (cadres élargis à 1600, build, capture, mesure, cadre final = la plus haute mesure + une trentaine de
  pixels). `LongTripsStep` / `EnVoiture` s'arrête à 1150, d'où 1180 — la contre-lecture y a soupçonné une
  mesure tronquée par un cadre de 1150 ; remesurée dans un cadre de 1600, elle donne bien 1150. `ChampsDeContexte` (470 → 710) et `ContextStep` (650 → 870) n'affichaient que
  la moitié de l'étape depuis v1-34.
- **Un constat produit, pas de synchronisation** : dans `ActionCommitment` / `DemandeSansJour`, « C'est noté »
  en attente se fond dans l'encart du choix — `Button` donne au désactivé comme à l'attente le fond
  `backgroundElement`, celui de l'encart. L'aperçu est fidèle à l'app. Remonté à la personne qui pilote, qui
  l'a joint au brief de Claude Design (§4.5) ; consigné en `v1-33` §9, sous D13.
- **L'en-tête de conventions** : tous ses noms existent dans le build. Il ignorait la série à cocher que
  v1-34 a introduite (`GroupeDeChoix cumulable`, `Chip role="checkbox"`, une réponse exclusive) : proposée,
  puis écrite le jour même avec l'accord de la personne qui pilote (seconde passe, plus bas). « Aucune phrase
  n'est fausse », écrit ici au premier relevé, était faux — voir la seconde passe.
- **Le processus a redémarré entre le plan approuvé et le premier envoi** : le `planId` a tenu, puisque la
  conversation a survécu, et l'envoi a repris après avoir vérifié l'arbre et `ds-bundle/`. Une remise à zéro
  du contexte, elle, le perdrait : nouveau `finalize_plan`, nouvelle approbation.

### Seconde passe, le même jour — main avait bougé le kit pendant le premier envoi

Quatre fusions sont arrivées sur `main` entre le relevé et la PR de cette synchronisation, dont trois
touchaient le kit : la réponse au point qui se corrige (#334, `CheckinCard`), les liens à trois apparences
(#335), l'attente et la bande haute écrites une fois (#336) ; le plancher du lancement (#337) n'y touchait
pas. Le projet portait donc un kit déjà en retard. Seconde passe sur la branche fusionnée, l'ancre fraîchement
téléversée en `--remote` : **5 changés** (`ActionCard`, `CheckinCard`, `FeuilleDuBas`, `GoogleButton`,
`TextLink`), **2 ajoutés** (`CadreDOnglet`, `LigneDAttente`, fiches venues avec #336), 10 à téléverser, 71
rendus, aucun mauvais. 374 fichiers par le même enchaînement, en trois lots de contenu (128, 128, 116),
aucune suppression ; l'ancre distante relue juste avant `finalize_plan` était bien celle du premier envoi.

- **Deux PR de main avaient écrit, de leur côté, des fiches que cette synchronisation écrivait aussi** :
  #336 `ChampDuPlafond.tsx` (trois états figés), #335 `LeisureFrequencyStep.tsx` (`total` retiré, mais
  `commute_has_regular_trip` et l'histoire devenue identique encore là). Les conflits ont été tranchés pour les versions
  de cette branche, qui les contiennent : quatre états avec `useState` pour l'une, la quatrième fréquence pour
  l'autre. Deux sessions qui touchent `previews/` le même jour se croisent sans que rien ne le dise avant la
  fusion — c'est le relevé de fichiers de `CLAUDE.md`, appliqué à `.design-sync/`. **Et la version gardée de
  `ChampDuPlafond` échappait à `props-check.py`**, qui saute une balise aux props étalées (`{...props}`) :
  ses props s'écrivent désormais en clair, et une prop inventée y a été attrapée (mutation du 03/10/2026).
- **`CheckinCard` a gagné un état sans gagner d'histoire** — exactement le risque relevé le matin même :
  `correction`, `reponseEnPlace`, `onModify`, `onCancel` (#334, v1-33 §6, « Modifier ma réponse »). Les cartes
  répondues montraient déjà le lien, mais rien ne montrait la carte rouverte. Histoire `EnCorrection` ajoutée.
- **`LigneDAttente` / `PendantLeDelai` est vide, et c'est voulu** : la ligne se tait les 300 premières
  millisecondes. Une cellule blanche n'y est pas un défaut de rendu ; elle est notée bonne avec cette raison.
- **L'en-tête de conventions** : #336 y a ajouté que `BandeHaute` est posée par sa pile (`CadreDOnglet`).
  La série à cocher y est entrée ensuite, décidée avec la personne qui pilote, avec le rôle `checkbox` dans
  la phrase d'accessibilité. **Et en relisant le README téléversé, une phrase fausse depuis le 01/10** : elle
  donnait le « C'est noté » d'une intention incomplète comme l'exemple de `disabled`, alors que v1-33 D13 l'a
  mis en attente (`src/components/plan/action-commitment.tsx`, `enAttente={manque !== null}`). Le premier
  relevé l'avait déclaré juste en ne vérifiant que les noms — la règle des risques ci-dessous le disait déjà ;
  elle ne suffit pas sans relire chaque phrase contre le code de l'app, pas seulement contre le kit.
- **`--remote` ne pointe jamais dans `ds-bundle/`.** Pour l'envoi des conventions, le pilote a d'abord été
  lancé avec `--remote ds-bundle/_ds_sync.json` : le build réécrit ce fichier avant le diff, le bundle se
  compare à lui-même et rend `upload.any: false`. L'ancre se copie dans `.design-sync/.cache/remote-sync.json`
  **avant** le build — ou, perdue, se reconstruit en refaisant le build sur l'état téléversé (il est
  déterministe) puis en comparant `bundleSha12`, `auxSha` et `styleSha` à `get_file _ds_sync.json`.
- **Quatre envois ce jour-là après le premier**, chacun derrière son propre `finalize_plan` : le contenu de
  main (374 fichiers), deux fois le seul README et `guidelines/` (`upload.aux`), puis les quatre aperçus
  corrigés à la contre-lecture (`ActionCommitment`, `ChampDuPlafond`, `CheckinCard`, `LongTripsStep`).
- **La contre-lecture a rendu douze constats** : deux histoires fausses ou incomplètes, deux angles morts
  des gardes, quatre erreurs d'attribution ou de compte dans ce relevé, une phrase de `BILAN.md` restée au
  futur, l'usage faux de `mesurer-les-cadres.cjs`, un constat produit qui ne vivait qu'ici, et un soupçon de
  mesure tronquée — infirmé en remesurant.

## Relevé du 03/10/2026 — neuvième synchronisation, la puce à case et la sortie d'un écran

Chemin atomique, skill 2.1.288. Elle porte ce que le kit a reçu depuis la huitième : la sortie d'un écran qui se
consulte (#341 : `SortieDuDetour`, les pages légales qui la posent, et la fiche de `TextLink`, qui y renvoie), la réponse de Claude Design à
l'étape du contexte (#343 : la question d'abord, la puce à case, le bouton grisé sur un encart) et l'alias mort
retiré de `tokens/colors.css` (#346). Le pilote a trouvé **69 composants inchangés, 2 changés** (`ChampsDeContexte`,
`ContextStep`) **et 1 ajouté** (`SortieDuDetour`), aucun retiré, `deletePaths` vide ; **10 à téléverser**, plus le
bundle, le style et le README. 72 rendus, aucun mauvais, les deux `[RENDER_THIN]` connus, aucune histoire en
double ; `props-check.py` sans écart, et le diff des `.d.ts` depuis l'arbre de la huitième ne montre que
`SortieDuDetour`. 377 fichiers de contenu : la sentinelle, racine + jetons + guide (10), `_vendor/` seul, `fonts/`
seul, les 72 aperçus, deux lots de composants (144, 144), la sentinelle de nouveau, `_ds_sync.json` seul. L'arbre
synchronisé : le kit de `main@d9fae26` plus les retouches de cette synchronisation (`ChampsDeContexte.jsx`,
`ThemedText.prompt.md`).

- **Le `ThemedText` du kit est un bloc** (`display: block`), quand un `Text` imbriqué reste dans la ligne dans le
  dépôt. Dans `ChampsDeContexte`, le terme de chaque zone (« Urbain dense : ») passait donc seul à la ligne, au-dessus
  de sa définition, pendant que l'app les écrit d'un tenant. Aucune garde ne le voit : seule la lecture de la
  feuille l'a montré. Corrigé par `display: inline` sur le terme ; un relevé par script n'a trouvé aucun autre
  `ThemedText` imbriqué dans le kit, et l'app en a un autre que le kit ne porte pas encore (« par an » dans le gain
  de `plan/pistes.tsx`). Le geste est donc écrit dans la fiche de `ThemedText`, que lit l'agent de design, et non
  seulement ici.
- **Les cadres se mesurent après le dernier changement de source, pas avant.** Mesurés d'abord à 788 et 944 px,
  ils ont fondu à 748 et 904 une fois les définitions remises d'un tenant : `ChampsDeContexte` 710 → 780,
  `ContextStep` 870 → 935. Une mesure prise sur un cadre plus grand que le contenu reste valable, donc la seconde
  n'a pas demandé d'élargir de nouveau.
- **Sept composants partaient sans regrader** alors que leur source ou leur fiche avait bougé (`ActionCommitment`, `Button`,
  `Chip`, `IntituleDuChamp`, `StepShell`, `TextLink`, `LegalPage`) : relus par `--spot-check-components`, tous
  conformes — la case des jours, « C'est noté » en attente ou désactivé sur l'encart, la sortie en haut et en bas
  de la page légale.
- **L'en-tête de conventions** ne disait rien de la place d'une sortie, que #341 a tranchée. Une ligne ajoutée,
  tirée de la fiche de `SortieDuDetour` : un composant qui porte une règle de composition gagne sa ligne dans
  l'en-tête, sans quoi l'agent de design ne l'apprend qu'en ouvrant la fiche. Elle reprend une décision déjà prise
  par la personne qui pilote (`v1-33` T-10), sans règle neuve — d'où l'absence de question, à la différence de la
  série à cocher de la huitième. « Aucune phrase fausse » avait été écrit ici trop tôt : la contre-lecture a trouvé
  que la phrase d'accessibilité interdisait tout `Pressable` autour d'un texte, ce que `SortieDuDetour` est — elle
  porte désormais l'exception que `FRONT.md` §2.4 écrivait déjà —, et que la ligne neuve oubliait la seconde sortie
  des pages légales et le gris du `TextLink` du bas.
- **Le processus a redémarré entre `finalize_plan` et le premier envoi**, comme à la huitième : le `planId` a tenu,
  et l'envoi a repris après avoir vérifié que `ds-bundle/` portait le build final (verdict, ancre, correction
  présente dans `_ds_bundle.js` — le `.jsx` de `ds-bundle/` n'est qu'un renvoi vers lui).
- **Le système de design de la galerie a suivi le même jour**, à la main (section suivante) : le bundle de ce
  build, les deux aperçus aux cadres remesurés, l'en-tête de conventions du README et la fiche de `ThemedText` —
  le premier envoi avait oublié le README, que la méthode reprend pourtant de `ds-bundle/` (contre-lecture).

## Relevé du 04/10/2026 — dixième synchronisation, et l'index du panneau resté à 28 composants

Chemin atomique, skill 2.1.289, conteneur neuf : `npm ci` d'abord (le dépôt n'avait aucun `node_modules`), les deux
liens, puis `playwright@1.56.1` dans `.ds-sync/` (l'image porte toujours le chromium 1194). Depuis la neuvième (#349), le
kit n'avait bougé que par #351 (ce qui s'ouvre sous un choix se pose sur Android) : un commentaire de
`BoiteDePrecision.jsx` et une ligne de `readme.md`. Le pilote : **72 composants inchangés**, aucun à regrader, et un
envoi réduit à `aux` — le commentaire ne survit pas au bundle, `bundleSha12` n'a pas bougé, et le README est celui de
la neuvième octet pour octet (`auxSha` recalculé à la contre-lecture) : seul `guidelines/readme.md` changeait. Rendu
complet quand même (`--render-sample 0`) : 72 rendus, aucun mauvais, les deux `[RENDER_THIN]` connus ; `props-check.py`
sans écart ; l'en-tête de conventions revalidé contre le build (20 composants, 10 props, 5 jetons), et #351 ne touche
aucune de ses phrases. À la demande de la personne qui pilote (« que la page d'aperçu soit bien à jour avec tous les
composants dans leur dernière version »), **tout** a été réécrit, pas seulement `aux` : 379 fichiers, soit les 377 de
contenu de la neuvième plus la sentinelle et l'ancre — la sentinelle, racine + jetons + guide (10), `_vendor/`,
`fonts/`, les 72 aperçus, deux lots de composants (144, 144), la sentinelle de nouveau, `_ds_sync.json` seul. Aucune
suppression. L'arbre synchronisé : le kit de `main@c979c5d`, plus la fiche de `BoiteDePrecision` retouchée par cette
synchronisation (plus bas), puis, le même jour, `tokens/mouvement.css` tel que le porte la PR qui ferme `v1-27` §12.34.

- **L'index du panneau Design System comptait 28 composants, et depuis la mi-septembre.** Ce n'est pas un fichier de
  la synchronisation : `_ds_manifest.json` (les composants et les cartes que le panneau affiche, les jetons qu'il
  liste) et `_adherence.oxlintrc.json` sont régénérés **par l'app**, quand le projet s'ouvre dans le navigateur et
  qu'elle y trouve la sentinelle `_ds_needs_recompile` — qu'elle efface alors. Relus avant l'envoi : 28 composants, 28
  cartes, `--height-target: 44px`, pas de `tokens/mouvement.css`, et des props retirées avant la troisième
  synchronisation (`TextField type`, `ChoiceRow detail`, `Chip ariaLabel`) — un index en retard de sept
  synchronisations, de la troisième à la neuvième. La sentinelle était toujours là. Les fichiers téléversés, eux,
  étaient à jour ; que l'agent de design se serve de cet index ou des fichiers, on ne le sait pas — le README
  téléversé nommait les 72 composants, et le brief de l'étape du contexte (`docs/design/v1-34-l-etape-du-contexte/`)
  dit que la réponse de Claude Design du 03/10 s'est construite sur le kit tel que synchronisé ce jour-là. Cet envoi
  fait, la personne qui pilote a ouvert le projet : la sentinelle a disparu (`get_file` rend 404) et l'index compte
  **72 composants et 72 cartes**, groupes et cadres justes, jetons du jour. Pourquoi il n'avait pas suivi reste
  inconnu : projet pas ouvert depuis le 26/09 (la troisième synchronisation), ou contrôle de l'app en échec sur un état
  d'alors. La vérification à rejouer est dans les Risques, plus bas.
- **L'index lit les jetons sans leur `@media`** : les cinq durées de `tokens/mouvement.css` y valaient `0ms`, la valeur
  du bloc « réduire les animations », déclaré en dernier. Le rendu n'en est pas touché — la feuille garde sa requête
  média —, seule la liste des jetons de l'app se trompe. Laissé d'abord au relevé de dette (`v1-27` §12.34), puis
  **corrigé le même jour** à la demande de la personne qui pilote : `tokens/mouvement.css` pose les durées à zéro dans
  `:root` et leur donne leur valeur sous `prefers-reduced-motion: no-preference`, déclarées en dernier. Même résultat
  dans tout navigateur qui connaît la préférence, éprouvé dans chromium sous les deux ; un navigateur qui ne la connaît
  pas pose tout, là où l'app et `StepShell` animent — sans conséquence, aucun composant ne lit ces jetons. Seul le
  style du kit est reparti (sentinelle, les sept feuilles, sentinelle, ancre), sous un nouveau plan — l'approbation de
  l'après-midi avait expiré —, puis une seconde fois pour le seul commentaire de la feuille, corrigé à la
  contre-lecture. Projet rouvert entre les deux : l'index donne 250, 280, 320, 200 et 200 ms ; le second envoi n'a
  changé aucune déclaration. **L'index distingue les
  sélecteurs mais ignore `@media`** : `--color-text` y vaut `#131612` à la racine et `#FFFFFF` sous la portée
  `[data-theme="dark"]`, alors qu'une déclaration sous `@media` écrase, pour lui, celle du même sélecteur déclarée
  avant. Une feuille de jetons du kit garde donc ses vraies valeurs dans la dernière déclaration de chaque nom, pour
  chaque sélecteur.
- **La fiche de `BoiteDePrecision` était restée en retard sur #351** (contre-lecture) : elle donnait le dépli en 250 ms
  sans dire qu'il se pose sur Android, quand le `.jsx` et `readme.md` le disaient. Alignée sur `readme.md`, puis
  téléversée par un second envoi sous le même plan : la sentinelle, les quatre fichiers du composant et
  `_ds_bundle.js`, la sentinelle, l'ancre seule. **Une fiche seule fait repartir le bundle** : son en-tête
  `@ds-bundle` porte l'empreinte de chaque fichier source, `.prompt.md` compris — le pilote le dit (`upload.bundle`),
  et la comparaison des deux ancres le confirme (seule l'empreinte de la fiche diffère, `bundleSha12` passe de
  `e94d944e24a5` à `9a6c535bb19d`). La règle des Risques — relire les feuilles des composants qu'une vague a touchés —
  vaut aussi pour leurs fiches.
- **Le système de design de la galerie** (section suivante) a été remis au niveau le même jour, à la demande de la
  personne qui pilote (sa version 14) : `guidelines/readme.md`, la fiche de `BoiteDePrecision`, `components/bundle.js`
  (l'en-tête seul) et une note datée dans le README, en un envoi, l'index en dernier et seul son `lastChange` changé.
  La version en ligne relue juste avant était celle lue au départ, et son bundle celui de la neuvième (sha256
  `e94d944e24a5…`) : personne n'y avait touché. Banc (`verifier-la-galerie.cjs`, feuille servie et React du système
  relus en ligne) : 72 aperçus rendus, aucun en défaut, aucun jeton lu sans déclaration. Les cinq fichiers relus
  après l'envoi : identiques à ce qui est parti.

## Le système de design de la galerie — un second miroir, remis à jour le 04/10/2026

À côté du projet Claude Design, la galerie d'artefacts de la personne qui pilote porte un système de design
« Ramille » (type Design System, <https://claude.ai/artifact/YMmJJKSpypTyA18LdPXPna>, privé). Il est né le
16/09/2026 d'une migration du projet Claude Design (28 composants et les jetons de ce jour-là) et n'avait plus
bougé — d'où le canvas de l'étape du contexte, bâti sur les valeurs du kit et non sur lui. Remis à jour le
03/10/2026 depuis `main@f6407cd`, à la demande de la personne qui pilote, puis le soir même par le bundle, deux
aperçus, le README et la fiche de `ThemedText` de la neuvième synchronisation, et le 04/10/2026 par ce que la
dixième a changé (son relevé, plus haut). **Aucun pilote ne le tient** : chaque
synchronisation vers Claude Design le laisse en retard, et sa mise à jour se fait à la main, fichier par
fichier, en fusionnant avec ce qui est en ligne (la méthode `from-code.md` du type : on ne reconstruit pas, on
garde ce qui y a été porté).

1. Un `package-build.mjs` complet, comme pour une synchronisation — l'ancre copiée d'abord dans
   `.design-sync/.cache/remote-sync.json`, puisque le build réécrit `ds-bundle/_ds_sync.json`.
2. `node .design-sync/vers-la-galerie.mjs ds-bundle docs/design/design-system <dossier>`, hors du dépôt et vide :
   les trois fichiers de chaque composant, les types pris dans le kit (ceux de `ds-bundle/` sont tronqués).
3. `components/bundle.js` est `ds-bundle/_ds_bundle.js` tel quel. `components/bundle.css` reprend la fermeture de
   `styles.css` moins ce que `tokens.json` porte : les tailles de texte en variables (`--type-*`, que les styles de
   texte ne produisent pas et que des composants lisent, plus l'ancien `--type-label-caps-*` de la version du
   16/09), la règle « réduire les animations », `base.css` entier, et un repli des jetons neufs que le bundle lit
   (plus bas) ; les `@font-face` viennent de `tokens.json`. **La règle « réduire les animations » des cinq durées
   s'écrit pour la galerie et ne se prend pas dans le kit** : `@media (prefers-reduced-motion: reduce)`, les durées
   à `0ms`, après la feuille des jetons qui porte les vraies. Le kit a la forme inverse depuis le 04/10/2026 (des zéros
   dans `:root`, les vraies durées sous `no-preference`, `v1-27` §12.34) : appliquée à la lettre, la soustraction
   ferait tomber les deux et la galerie perdrait la préférence. L'en-tête de `tokens/mouvement.css` ne se recopie pas
   non plus.
4. Avant l'envoi, la version en ligne doit être celle qu'on a lue — son identifiant ne bouge pas tant que
   personne n'enregistre — ; sinon, relire chaque fichier qu'on réécrit et refaire la fusion dessus. Les jetons
   gardent leurs noms ; un nom que le kit ne définit plus reste, noté comme tel dans son usage, jusqu'à la décision
   de la personne qui pilote (`type-label-caps` reste le nom de l'étiquette en capitales, que le kit appelle
   `--type-label-*`). Ils gagnent les jetons neufs et deux styles (`type-display`, `type-question`), un usage chacun — tiré des commentaires de `theme.ts` et du kit, ou
   disant qu'aucun composant ne le lit —, et une provenance (`meta`). Le README est celui de `ds-bundle/`, plus une
   note datée et la section de migration gardée ; `guidelines/readme.md` est le `readme.md` du kit ; la licence
   de Spline Sans part dans `assets/notes/OFL-Spline-Sans.txt`.
5. `verifier-la-galerie.cjs`, avec le React que l'index du système désigne et le `tokens.css` que la page sert,
   relus en ligne (l'usage est en tête du script) : autant d'aperçus que le build en imprime, aucun en défaut,
   aucun jeton lu sans déclaration. Puis un seul envoi, l'index en dernier et seul son `lastChange` changé ; les
   `.d.ts`, les aperçus et le bundle partent en `text/plain` (l'outil refuse `.ts`, et c'est ainsi qu'ils étaient
   rangés).

- **La page ne régénère pas ce qu'elle génère quand on publie** : `tokens.css`, `manifest.json` (le catalogue,
  son ordre et ses résumés), les cartes `api/` et la fin du README attendent la prochaine modification faite
  dans la page. Relu après le premier envoi du 03/10/2026, `tokens.css` était encore celui du 16/09 — cible 44,
  puce 8, et ni les quatre couleurs d'état, ni `--stroke-field` — et le catalogue listait 28 composants. Les
  aperçus recevaient donc des `var()` vides : le contour des champs et la teinte d'un appui disparaissaient sans
  une erreur, et le premier banc, qui compilait ses jetons depuis `tokens.json`, rendait « 72 aperçus, aucun en
  défaut ». D'où deux choses : le relevé statique des jetons du banc, et un repli dans `bundle.css` en
  `:where()`, sans poids, que la feuille servie emporte dès qu'elle déclare le jeton (vérifié dans les deux
  thèmes). Le catalogue, lui, ne se répare pas d'ici : il faut une modification faite dans la page. Une retouche
  de la personne qui pilote a tout régénéré le jour même — 72 composants et leurs résumés, la feuille avec les
  jetons neufs et leurs usages ; le repli ne sert donc plus, et reste pour le prochain envoi qui ajoutera un jeton.
- **Les types de `ds-bundle/` coupent chaque commentaire à 120 caractères** (`.ds-sync/lib/dts.mjs`), en plein
  mot : 52 commentaires dans 26 fiches au premier envoi. Le convertisseur prend désormais ceux du kit. Le projet
  Claude Design reçoit, lui, les types tronqués à chaque synchronisation.
- **La galerie charge React 18.3.1** (`components/lib/`, porté à la migration), quand `ds-bundle/_vendor/` est un
  React 19 : un `ref` passé à un composant du kit n'y est pas transmis, ce que les `.d.ts` du kit disent déjà.
  Les 72 aperçus se rendent sous l'un comme sous l'autre.
- **Le kit portait un alias mort** : `--stroke-selected: var(--color-accent)` dans `tokens/colors.css`, que
  `tokens/spacing.css` redéclare à `1.5px` plus loin dans `styles.css`. Aucun fichier ne le lisait, ni comme
  couleur ni comme épaisseur ; retiré du kit le jour même. La neuvième synchronisation l'a téléversé comme un
  changement de style, sans aucun effet visible.
- **Ce n'est pas le « nettoyage » que la page propose** (`migrated-upgrading.md` du type) : il réécrit le README
  en livre de marque et marque le système comme mis à niveau, et il n'a pas été demandé. Les restes de la
  migration, eux, sont retirés le soir même avec l'accord de la personne qui pilote — des fichiers et de
  `tokens.json` ; la feuille servie et la carte des jetons les portent jusqu'à la prochaine modification faite dans
  la page : `color-pagination-inactive`,
  `radius-mode-item` et les treize styles en `-line` (des interlignes pris pour des tailles), la copie du bundle et
  du runtime de l'époque (`docs/`), les 28 fichiers d'appoint de `components/src/`. Le rapport de migration reste
  dans `assets/notes/`.

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
- **Une prop optionnelle neuve, ou un champ d'objet retiré, passent toutes les gardes** (relevé de la huitième
  synchronisation, ci-dessus) : relire le diff des `.d.ts` des composants à téléverser, et les feuilles des histoires qui en
  dépendent. Et un composant ajouté au kit sans fiche part sur la carte plancher sans que le pilote le dise.
  Et une balise d'aperçu qui étale ses props (`<Nom {...props} />`) échappe à `props-check.py` : les props d'un
  composant du kit s'écrivent en clair dans les aperçus, même derrière un enrobage à état.
- **Le système de design de la galerie ne suit pas** : une synchronisation vers Claude Design ne le touche pas.
  Le remettre à jour suit la section qui lui est consacrée, plus haut.
- Ce qui a été vérifié ici, ce sont les **rendus locaux**. Le vrai environnement est la page
  Claude Design ; un coup d'œil au panneau après téléversement reste la seule preuve de bout en
  bout, et un nouveau téléversement coûte peu. **Et l'index du panneau ne suit un envoi qu'après une ouverture du
  projet** : c'est elle qui le régénère (relevé du 04/10/2026, plus haut — sept synchronisations sans qu'il suive).
  D'où deux gestes. **En tête de chaque synchronisation**, avant l'envoi : `get_file _ds_needs_recompile`. Un 404 veut
  dire que l'app a relu l'envoi précédent ; encore là, l'index a au moins un envoi de retard — le dire à la personne
  qui pilote dans le compte rendu. **Après l'envoi**, le compte rendu dit que le panneau ne suivra qu'à la prochaine
  ouverture ; si la personne qui pilote veut la preuve le jour même, elle ouvre le projet (ce qu'elle a fait le
  04/10/2026, à la demande de l'agent, après avoir demandé un aperçu à jour), puis on relit l'index. **La preuve est la
  sentinelle, pas un compte** : un 404 après l'ouverture veut dire que l'app a recompilé ; encore là, son contrôle a
  échoué — à remonter, pas à re-téléverser. Le nombre de composants de `_ds_manifest.json` ne prouve rien seul : il
  valait 28 pour 28 à la troisième synchronisation, l'index déjà périmé. Ce qui se relit, c'est le **contenu** : les
  noms des composants et des cartes contre l'arbre `components/` du build, et quelques jetons contre
  `ds-bundle/tokens/` (l'index garde, par sélecteur, la dernière déclaration de chaque jeton, `@media` ignoré :
  `v1-27` §12.34).
