# Tests — conventions et pièges

Ce que Ramille a appris en écrivant ses trois suites (Jest sur la logique pure, pgTAP sur la
base, et le parcours réel contre une vraie stack depuis le 20/09/2026). La **§1 vaut sur n'importe quel projet** ; la **§2** porte les fichiers, les chiffres et les
pièges propres à Ramille, et ne voyage pas. L'histoire complète est dans `CLAUDE.md` (mécaniques)
et dans les documents `docs/architecture/v1-0N-*.md` que chaque paragraphe cite.

> **Quand lire ce fichier** : avant d'écrire un test censé protéger une correction · avant
> d'**annoncer que quelque chose est vérifié** · quand une suite rougit ou verdit de façon
> inattendue · avant de rejouer la CI en local. Pour pgTAP, le projet distant et le référentiel
> des facteurs : `TESTING-PGTAP.md` ; pour une garde de la CI, le parcours réel compris :
> `TESTING-GARDES.md`.

**Découpé le 01/10/2026**, où il pesait 84 Ko : ce fichier garde la méthode (§1), les suites et la
ligne qui les sépare (§2.1), le test d'écran (§2.10) et le rejeu de la CI (§2.13). Les autres
sections sont parties **telles quelles et sous leur numéro**, qui reste unique dans la famille — un
renvoi « `TESTING.md` §2.x » écrit avant cette date, dans un commentaire du code ou un document
daté, se retrouve donc par cette table :

| Sections | Vivent dans |
|---|---|
| §1.7 (pgTAP, cinq pièges), §2.2 à §2.5 | `TESTING-PGTAP.md` |
| §2.6 à §2.9, §2.11, §2.12, §2.14, §2.15 | `TESTING-GARDES.md` |
| tout le reste | ici |

---

## 1. Ce qui vaut sur n'importe quel projet

### 1.1 Une garde se vérifie en cassant ce qu'elle garde

Un test qui passe n'a encore rien prouvé : il faut **remettre le défaut** — l'ancien défaut de la
valeur, le rang tronqué, la policy fautive fabriquée exprès, le script mutilé — et constater que
l'assertion tombe, **et seulement celle-là**. Sans ce passage on a écrit une ligne qui *pourrait*
garder quelque chose ; avec, on sait laquelle. Deux règles qui en découlent :

- **Le compte s'écrit dans le fichier de test** (« retirer X fait tomber 1 test ; ignorer Y, 3 »),
  daté. C'est ce qui permet, six mois plus tard, de savoir si une garde s'est désarmée sans que
  personne ne touche au test — un test vert qui ne tombe plus sur aucune mutation est une garde
  morte qui a l'air vivante. Exemple : l'en-tête de `scripts/vercel-ignorer-le-build.test.ts`.
- **Une mutation qui passe est elle-même un signal**, pas une formalité ratée : soit la garde ne
  garde rien, soit le défaut n'est pas observable là où on le cherche. Les deux valent d'être
  écrits avant de conclure.
- **La remise en place ne passe jamais par `git checkout --` tant que le travail n'est pas commis.**
  Le 20/09/2026, deux constantes neuves sont parties avec la mutation qu'on annulait, et la mesure
  suivante a compté les tests d'une constante absente — quatorze échecs lus comme le résultat de la
  mutation. Commettre d'abord, ou annuler par l'opération inverse (le `sed` miroir), et relire
  `git status` avant de croire un compte.

Corollaire pour une valeur attendue : **une hypothèse sur les données se mesure, jamais au
raisonnement**. Une assertion chiffrée se recalcule par une requête sur la base, et n'écrit que ce
qui a été ainsi vérifié (`TESTING-PGTAP.md` §2.2).


**Une mutation se défait en réécrivant l'état d'avant, jamais par un second remplacement
textuel.** Relevé le 20/09/2026 : la chaîne remise en place existait **ailleurs** dans le même
fichier, le remplacement a frappé la première occurrence, et deux messages d'erreur se sont
retrouvés intervertis — verts au typecheck, au linter et aux tests, parce que l'assertion en place
vérifiait qu'ils sont *différents* et non qu'ils sont *à la bonne place*. Garder une copie de
l'état d'avant et la réécrire coûte une ligne.

**Et une garde dont le succès est une ABSENCE doit laisser à ce qu'elle interdit le temps et les
conditions de réussir.** Même journée, deux fois : une assertion « la session n'a pas basculé »
relisait l'état trop tôt, puis déclenchait l'attaque pendant que l'app se routait encore — la
redirection emportait la navigation, donc l'attaque n'avait pas lieu et la garde concluait
« refusée ». Avec la faille grande ouverte, elle restait verte. Le test d'une garde de cette forme
n'est donc pas « passe-t-elle ? » mais « **tombe-t-elle quand je remets le défaut ?** » — et si
elle ne tombe pas, c'est la garde qu'on instrumente, pas le produit qu'on déclare sain.

**« Tombe à la bonne étape » n'est pas « tombe sur la bonne assertion ».** Relevé le 29/09/2026 : un
script de mutation qui ne rapportait que l'étape où le parcours s'arrêtait a dû être rejoué en
entier — trois mutations visaient la même étape, et seul le message d'échec dit laquelle des
gardes a parlé. **Chaque passage garde son journal complet**, et le compte écrit dans le fichier de
test cite le message, pas l'étape.

**Et tant qu'une source est mutée, rien d'autre ne lit l'arbre.** Un script qui mute, exporte puis
restaure laisse la mutation sur le disque pendant tout l'export : un commit pris à ce moment
l'embarque, un test lancé à côté éprouve le mutant, un second export le livre. Le même jour, un
commit a dû exclure le seul fichier encore muté, et une mutation de `plan.ts` a attendu la fin des
exports d'une autre série. Rejouer les parcours sur des exports déjà construits, lui, ne touche
plus aux sources.

### 1.2 Où passe la ligne entre logique pure et entrée-sortie

La ligne passe par **ce qu'un test doit dresser avant de pouvoir affirmer**, et non par le nom
d'un import. Deux niveaux :

- **Un module de logique pure** n'importe rien de la plateforme et n'installe aucun double. C'est
  ce qui le rend éprouvable à la vitesse de la pensée, et c'est fragile par un lien que rien
  n'affiche : une dépendance ajoutée à un module *importé par* un module pur fait tomber toute la
  suite qui en dépend. Une règle ESLint vaut mieux qu'une prose (`eslint.config.js` la porte pour
  `src/types/**`).
- **Un module d'entrée-sortie** est testé avec un double **exactement de ce qu'il éprouve**
  (le stockage local pour un module de stockage, la plateforme pour un module de plateforme), et
  n'éprouve que ce que ce double couvre. Importer un client réseau devenu paresseux (mandataire qui
  lève à la première utilisation, jamais au chargement) est inoffensif — interdire l'import gardait
  un danger disparu et interdisait des tests utiles.

### 1.3 Doubler un module entier passe au vert en salissant la sortie

Étaler un module natif avec `requireActual` **lit** chacune de ses propriétés, donc déclenche
les avertissements de dépréciation posés sur ses exports sortants. Un `Proxy` ne lit que ce qu'on
lui demande. Un avertissement dans une sortie de CI est un avertissement qu'on cesse de lire, et
c'est ainsi qu'on manque le vrai.

### 1.4 Le fuseau de la suite fait partie de la suite — et il ne suffit pas

En UTC, toutes les distinctions UTC/local qu'un dépôt documente avec soin sont
**indistinguables** : les tests passent aussi bien avec l'erreur. Forcer un fuseau réaliste
(`TZ=Europe/Paris` dans la commande de test — pas depuis le corps d'un test : Node met son fuseau
en cache à la première opération de date, et Jest en a déjà fait une) rend visible au moins un
défaut, et le test qui tombe alors est du même coup **la garde du réglage** : lancer la suite en
`TZ=UTC` doit le faire tomber, et cette mesure s'écrit dans la documentation avec sa date (la
première rédaction disait l'inverse, ce qui était faux).

Mais un fuseau à l'est de Greenwich ne garde pas les distinctions du même genre dans l'autre sens
(minuit UTC et le jour écrit y tombent le même jour). Une garde intitulée « quel que soit le
fuseau » doit éprouver le **moyen** et non la sortie : neutraliser le constructeur `Date` le temps
de l'appel, ou le réduire à sa forme à composantes quand une date locale est nécessaire.

### 1.5 Deux résolveurs qui ne disent pas la même chose

Le défaut de `moduleFileExtensions` de Jest est `['js','mjs','cjs','jsx','ts','tsx',…]`, soit
l'inverse des `sourceExts` d'Expo/Metro. Sans un réglage explicite, un `.js` égaré à côté de son
`.ts` (un `npx tsc` lancé sans `--outDir` suffit) devient **silencieusement** le module que la
suite éprouve, pendant que l'app charge le `.ts` — et ça se lit « tous les tests verts ». Et si le
réglage vit dans un JSON, la raison ne peut pas vivre à côté (une clé de commentaire fait émettre
un `Validation Warning`) : elle s'écrit dans la documentation.

### 1.6 La couverture se relève sans seuil

Un seuil transforme une carte en obstacle, et se contourne en écrivant des tests qui touchent du
code sans rien affirmer. Relever la couverture sur le périmètre qui est *censé* être testé (la
logique pure), sans y lister ce qui n'est pas testé par décision (les écrans, à 0 %, noieraient
la carte).

### 1.8 Un `describe` vide passe au vert, et Jest ne le dit pas

Relevé le 21/09/2026 en relisant un fichier dont un chantier avait retiré des tests : deux
`describe` ne contenaient plus **aucun** `it`. La suite les compte comme des suites passantes, sans
avertissement, et la ligne « 40 passed » ne bouge pas — le fichier annonçait donc trois marques
gardées quand il n'en gardait plus qu'une.

C'est la même famille que la couverture sans seuil (§1.6) : ce qui manque ne se signale pas. Deux
parades, et la seconde est la bonne : au moment de **retirer** un test, se demander si son
`describe` reste habité ; et, quand une garde disparaît parce que son mécanisme a disparu, écrire ce
qui reste vrai plutôt que de laisser la coquille — ici, trois assertions de dégradation du stockage
(`jest.spyOn(Storage, …).mockRejectedValue(…)`), qui gardent la seule promesse restante : une marque
illisible ne fait jamais échouer l'écran.

### 1.9 Coller n'est pas taper, et `fill` n'est ni l'un ni l'autre

Trois façons d'écrire dans un champ, et elles n'éprouvent pas la même chose — mesuré le 21/09/2026,
où la différence cachait un vrai défaut :

| Geste | Ce que le navigateur applique | Ce que ça éprouve |
|---|---|---|
| `locator.fill(v)` | rien : la valeur du DOM est écrite | le composant reçoit `v`, et c'est tout |
| `locator.type(v)` | un événement d'entrée **par caractère** | la frappe, caractère par caractère |
| `keyboard.insertText(v)` | **un seul** événement d'entrée | le collé |

Le défaut : un champ de code portait `maxLength`, qui tronque la saisie **brute** avant que la
dérivation n'ait retiré les espaces. Un collé de « 847 924 69 » ne laissait donc que six chiffres,
bouton inerte et aucun message ; la **frappe** marchait, chaque espace étant rejeté avant
d'atteindre la limite. La garde utilisait `fill`, qui contourne les deux et ne pouvait rien voir.

La règle : **un champ qu'on remplit en collant se teste en collant.** Et quand le geste réel porte
ce que la dérivation doit retirer — des espaces, un préfixe « code : » —, le coller **tel quel**, puis
asserter ce que le champ a **gardé**, pas seulement ce que l'écran fait ensuite : l'assertion sur la
valeur retenue nomme le nombre de chiffres perdus, là où une assertion d'aval ne dit qu'un délai
expiré.

---

## 2. Propre à Ramille

### 2.1 Les suites, et où passe la ligne

Trois suites de tests automatisés, ciblées sur la logique où un bug est le plus coûteux
(chiffre affiché à l'utilisateur, navigation du wizard) — les deux premières ci-dessous, la
troisième, le parcours réel, en `TESTING-GARDES.md` §2.6 ; le flux de connexion a en plus son propre jeu de bout en
bout (`TESTING-GARDES.md` §2.9), et quelques écrans leur test (§2.10) :

- **Jest** (`npm test`, qui force `TZ=Europe/Paris` — voir plus bas pourquoi) sur la logique pure
  côté client. La règle, plutôt qu'une liste qui se
  périme au fichier suivant : **toute dérivation pure affichée à la personne ou décidant d'une
  navigation est testée**, dans un `*.test.ts` colocalisé — l'inventaire se lit en listant
  `src/**/*.test.ts`. Quelques-uns de ces tests n'existent pas pour attraper une régression de
  code mais une régression de **jugement**, et il faut savoir qu'ils sont là avant de « corriger »
  ce qu'ils épinglent : l'invariant SDES de `carbon-reference.test.ts` (le total est la somme des
  postes), la table de vérité de `rappels.test.ts` (jumelle SQL de `reminder_channel_for`), les
  règles de voix de `mascotte.test.ts` (jamais un nombre, jamais « tu devrais »), et la conformité
  des chemins de `mascot.test.ts`.
  **La ligne passe par ce qu'un test doit dresser avant de pouvoir affirmer** (C3.12), et non par
  le nom d'un import. La règle disait « un module testé n'importe pas `@/lib/supabase` » ; elle
  protégeait une chose qui n'existe plus — le client levait au **chargement**, donc un seul import
  faisait tomber la suite entière — et depuis qu'il est un mandataire, l'importer est inoffensif.
  Elle interdisait donc des tests utiles en gardant un danger disparu. Deux niveaux la remplacent :
  **`src/types/*` est de la logique pure** — n'importe rien de la plateforme, n'installe aucun
  double ; c'est aussi pourquoi `format.ts` doit rester pur bien qu'il vive dans `src/lib`, puisque
  `src/types/resultat.ts` l'importe. **`src/lib/*` est de l'entrée-sortie** — le test **double**
  exactement ce qu'il éprouve (AsyncStorage pour `bilan-draft`, `connexion-prefs`, `saison-prefs`
  et la moitié locale de `notification-prefs` ; `Platform` pour `app-url`) et n'éprouve que ce que
  ce double couvre. `notification-prefs` importe `@/lib/supabase` et est quand même testé : ce qui
  y est éprouvé ne touche que le stockage. Corollaire à connaître si cette suite tombe un jour sur
  une erreur de configuration — ce n'est pas le test qui aura changé, c'est une de ces fonctions
  qui aura commencé à toucher le client au chargement du module.
  **La couverture est relevée en CI sans seuil** (`npm test -- --coverage`, périmètre
  `src/types` · `src/lib` · `src/constants` dans `collectCoverageFrom`) : un seuil transforme une
  carte en obstacle et se contourne en écrivant des tests qui touchent du code sans rien affirmer.
  Les écrans n'y sont pas — hors du périmètre de couverture, testés seulement par exception sous le
  critère de §2.10 —, et les lister à 0 % à chaque passage noierait la carte. 79 % des lignes au 14/09/2026.
  **Doubler `react-native` en entier passe au vert en salissant la sortie** : le `setup.js` de
  jest-expo est privé de ce qu'il installe, et l'étaler avec `requireActual` **lit** chaque
  propriété du module, donc déclenche les avertissements de dépréciation posés sur ses exports
  sortants. Un `Proxy` ne lit que ce qu'on lui demande — la démonstration est dans
  `app-url.test.ts`. Un avertissement dans une sortie de CI est un avertissement qu'on cesse de
  lire, et c'est ainsi qu'on manque le vrai.
  **La suite tourne en `TZ=Europe/Paris`, et ce n'est pas cosmétique** (C2.7) : en UTC, toutes les
  distinctions UTC/local que ce dépôt documente avec soin — `debutDePeriodeInterrogee` et
  `periodePrecedente` qui lisent l'UTC comme leurs jumelles SQL, `saisonDe`, `progressionDeLaPeriode`
  et `keepLatestPerDay` qui lisent le calendrier local — sont **indistinguables**, donc leurs tests
  passeraient tout aussi bien avec l'erreur. Le test « regroupe sur le jour local » de
  `suivi.test.ts` est celui qui l'a rendu visible : il échoue sur l'ancienne implémentation en
  Europe/Paris et **échoue en UTC avec l'une comme avec l'autre** — ce qui en fait du même coup la
  garde de ce réglage : `TZ=UTC npx jest src/types/suivi.test.ts` le fait tomber, mesuré le
  14/09/2026 (la première rédaction disait « passe des deux façons en UTC », ce qui était faux).
  **Et ce fuseau ne suffit pas à garder les autres distinctions du même genre** : Paris est à l'est
  de Greenwich, donc minuit UTC et le jour écrit y tombent le même jour, et deux gardes intitulées
  « quel que soit le fuseau » restaient vertes avec l'implémentation qu'elles interdisent. Elles
  éprouvent désormais le **moyen** et non la sortie — le constructeur `Date` est neutralisé le temps
  de l'appel pour `finDePeriodeEnMots`, et réduit à sa forme à composantes pour `pointsParSaison`,
  qui a besoin d'une date locale. Forcer le fuseau depuis le corps d'un test ne marche
  pas — Node met son fuseau en cache à la première opération de date, et Jest en a déjà fait une.
  **Jest résout `ts` avant `js` parce que le dépôt le lui dit, et Metro le faisait déjà.**
  `package.json` porte un `moduleFileExtensions` explicite : le défaut de Jest est
  `['js','mjs','cjs','jsx','ts','tsx',…]`, soit l'inverse des `sourceExts` d'Expo, qui commencent par
  `ts`/`tsx`. Sans ce réglage, un `.js` égaré à côté de son `.ts` — un `npx tsc` lancé sans
  `--outDir` suffit, et c'est arrivé le 13/09/2026 sur sept modules — devient silencieusement le
  module que la suite éprouve, pendant que l'app continue de charger le `.ts`. Deux résolveurs qui
  ne disent pas la même chose sont exactement la forme de défaut que ce dépôt traque ailleurs, et
  la seule à se lire « 590 tests verts ». La raison vit ici et non à côté du réglage parce que
  `package.json` est du JSON : une clé de commentaire y fait émettre à Jest un `Validation Warning`
  à chaque passage.
  Des modules de `src/lib` sont testés en place — la liste se lit en listant `src/lib/*.test.ts` —,
  et deux conditions les y gardent : `format.ts` reste pur (il est importé par
  `src/types/resultat.ts`, donc une dépendance ajoutée là ferait tomber toute la suite qui en
  dépend, par un lien que rien n'affiche), et les autres doublent exactement ce qu'ils éprouvent,
  selon la règle écrite plus haut — leurs `jest.mock` en font la liste, qui ne se recopie pas ici.
- **pgTAP** (`supabase/tests/database/*.sql`, numérotés, un fichier par sujet — l'inventaire se
  lit dans le répertoire) sur les fonctions SQL de calcul, sur les policies RLS (isolation
  stricte par utilisateur en lecture/écriture, verrouillage des tables à écriture serveur-only,
  lecture publique des référentiels) et sur la matrice de privilèges. Même distinction que côté
  Jest : plusieurs assertions sont là pour **empêcher une correction de réflexe** — l'ordre ACV
  des motorisations (hybride > thermique > rechargeable > électrique), la grosse moto au-dessus
  de la voiture, la **source** de chaque facteur et le vélo non nul, le refus d'écriture directe
  sur `plan_actions` et `engagement_checkins`. Tourne via `supabase test db`, qui démarre une
  stack Postgres locale (Docker) à partir de `supabase/config.toml` + `supabase/migrations/` —
  indépendante du projet Supabase distant `TraceVerte-v1` utilisé pour le développement applicatif
  courant. Nécessite Docker et le CLI Supabase **à la version que la CI épingle**
  (`npx supabase@2.117.0`, jamais `@latest` — `ci.yml` dit pourquoi). Docker tourne dans
  l'environnement d'agent depuis le 20/09/2026 (`TESTING-GARDES.md` §2.6) ; avant, un fichier se validait par des
  transactions `BEGIN`/`ROLLBACK` sur le projet distant, ce que `TESTING-PGTAP.md` §2.3 borne.

Les trois suites tournent en CI (`.github/workflows/ci.yml`) sur chaque pull request — la
troisième, le parcours réel, a la sienne en `TESTING-GARDES.md` §2.6.

### 2.10 Tester un écran — le critère, et ce que ça coûte

Un test d'écran est possible depuis le 20/09/2026 (`@testing-library/react-native`, et un
`moduleNameMapper` qui neutralise l'import CSS de `src/constants/theme.ts` — sans lui **tout**
test d'écran échoue au chargement). Le relevé de coût complet est en `v1-27` §12.11 ; ce qu'il
faut retenir ici tient en un critère et quelques frottements.

**Le critère : on peut nommer la mutation qu'il fait tomber, et elle n'est visible ni par
`src/types` ni par le parcours réel.** Ça vise une famille étroite — les **branches d'état**
(chargement / erreur / vide / plein) et le **câblage d'un message** —, c'est-à-dire exactement
là où vit la règle de C1.4 : *un échec de lecture ne dit jamais « tu n'as rien »*. La mise en
page, l'apparence et « est-ce que ça rend » restent à la recette et à
`verifier-etats-export.mjs` : les y mettre coûterait du temps de CI pour une garde qui casse à
chaque retouche de maquette.

**Ce que ça coûte, mesuré** : un fichier de 173 lignes pour 4 assertions, 18 lignes de doublage
contre 13 d'assertion, 4 modules doublés, et **+21 % sur la suite / +64 % de temps CPU** pour ce
seul fichier. Le second chiffre est celui qui compte sur un runner.

**Un test d'écran ne se colocalise PAS**, et c'est une contrainte et non un choix : `src/app/`
**est** le routeur, et `expo-router` n'ignore que `+html`, `+native-intent`, `+api` et
`+middleware` (relevé dans son `getRoutesCore.js`). Un fichier de test posé à côté de
`pistes.tsx` produit une **route** « /plan/pistes.test », exportée et servie. Mesuré le 20/09/2026
sur la CI : l'export l'a bien rendue, et c'est `verifier-titres-export.mjs` qui l'a arrêtée — elle
n'avait pas de ligne dans `PAGE_TITLES`. Les tests d'écran vivent donc dans `src/tests/ecrans/`,
et la règle de colocalisation du dépôt s'arrête à la porte du routeur.

**Les frottements qui ne se voient pas quand on ne teste que de la logique pure** :

1. une variable citée dans une fabrique `jest.mock()` doit être préfixée `mock` — jest hisse les
   appels au-dessus des déclarations du fichier et refuse toute autre variable hors portée ;
2. `react-test-renderer` doit correspondre **exactement** à la version de React installée, sinon
   la bibliothèque refuse de se charger ;
3. le CSS, ci-dessus ;
4. **reanimated ne sait pas s'initialiser sous Jest** (`loadUnpackers`, relevé le 27/09/2026 en
   testant la carte du point) : il est doublé pour toute la suite par `scripts/doublage-reanimated.js`
   (`setupFiles` de `package.json`), qui pose les doubles officiels de `react-native-worklets` et de
   reanimated et leur ajoute ce que le second ne porte pas — `css`, `cubicBezier`,
   `useReducedMotion`. Un test d'écran n'éprouve donc **aucune** animation : elles se jugent image
   par image dans un navigateur (`TESTING-GARDES.md` §2.14). **Sauf ce qui se passe à leur fin** : un test qui doit
   placer un geste pendant une sortie retient les fins de `withTiming` dans son propre double — un
   `jest.mock` de fichier **remplace** celui du `setupFiles` au lieu de s'y ajouter, donc il recopie
   le reste —, et les joue dans un `await act(async …)`, parce que `scheduleOnRN` repasse côté React
   par un microtask (`src/tests/ecrans/feuille-du-bas.test.tsx`).

**Et le piège de fond, trouvé en mutant** : un test d'écran écrit spontanément n'affirme que des
**présences**. Il laisse alors passer tout ce qui est en trop — une phrase d'état vide rendue
au-dessus des pistes, par exemple, ne fait bouger aucune assertion de présence. Chaque branche
qu'on prétend garder demande donc sa moitié négative.

### 2.13 Rejouer la CI en local, et ce que le rejeu garde de lui-même

`node scripts/rejouer-la-ci.mjs` rejoue les travaux de `ci.yml` dans l'ordre — `verifications`,
`jest`, `export`, `base`, `parcours` —, ou ceux qu'on nomme (27/09/2026). On l'appelle aussi par le
skill `/rejouer-la-ci`. La CI avait été rejouée cinq fois à la main la semaine du 21 au 25/09/2026,
et deux pièges y revenaient à chaque fois : `npx jest` sans le fuseau (§1.4), et un export qui rend
le bundle d'un autre arbre (`EXPO.md` §1.1) ou d'une autre configuration (`TESTING-GARDES.md` §2.6). Le script les
porte, et il lit chaque code de sortie sur le processus lui-même, jamais à travers un tube.

**Sa sortie vaut 0 si, et seulement si, chaque pas choisi a été joué ET a réussi.** Un pas « non
joué » — Docker éteint, export raté, stack prise — n'a rien vérifié, et c'est la règle de ce
fichier : on n'annonce pas « vérifié » pour ce qui n'a pas tourné. La première ligne nomme le commit
rejoué et prévient quand l'arbre porte des modifications ou des fichiers non suivis que la CI ne
verra pas.

Ce qui diffère de la CI est écrit en tête du script, une ligne par écart, avec sa raison. Quatre de
ces écarts méritent d'être connus avant de lire un résultat :

- **La stack est redémarrée à neuf** (`supabase stop --no-backup`, puis `supabase start`) avant
  pgTAP et le parcours, comme la CI en démarre une neuve. Deux raisons, dont la seconde ne se voit
  pas : une stack déjà démarrée porte les migrations de l'arbre qui l'a démarrée, et GoTrue ne relit
  ses gabarits et `supabase/config.toml` qu'à son démarrage (`TESTING-GARDES.md` §2.11) — une stack qui tourne vérifierait
  le code de connexion d'une autre copie. La première version se contentait d'un `db reset`, qui
  refait la base et laisse GoTrue tel quel (contre-lecture du 27/09/2026). Ce n'est pas la parade
  écartée en `TESTING-PGTAP.md` §2.3 : une base qui a servi ne doit toujours pas faire rougir une assertion.
- **Chaque export a son propre cache de Metro**, un `TMPDIR` dans le dossier des journaux. Le cache
  vit par défaut dans le répertoire temporaire du système, donc partagé entre copies de travail, et
  `--clear` ne protège pas d'un voisin qui écrit pendant qu'on lit (`EXPO.md` §1.1). Un cache privé
  rend inutile le marqueur que §1.1 prescrit pour un export fait à la main.
- **La stack est réservée** pendant `base` et `parcours`, par un verrou rangé dans le répertoire git
  commun (`scripts/verrou-de-la-stack.mjs`). Toutes les copies de travail du dépôt voient donc le
  même, et un second rejeu est refusé en nommant le premier. Le verrou ne voit pas ce qui touche la
  stack à la main.
- **L'environnement hérité est filtré** : `DATABASE_URL`, les `EXPO_PUBLIC_*`, la boîte aux lettres
  de la stack et la clé de service sont retirés, puisque la CI n'en a aucun — un `DATABASE_URL` du
  shell ferait comparer les miroirs de `check` à une autre base que celle qu'on vient de construire.
  Chaque pas remet ce que la CI lui donne.

**Le rejeu ne peut pas se périmer en silence**, et c'est sa garde : `scripts/rejouer-la-ci.test.ts`
lit `ci.yml` **par blocs d'étapes**, quelle que soit la clé qui ouvre une étape, et exige :
- que chaque `run:` soit rejoué par un pas du même travail, ou figure dans `nonRejouees` avec sa
  raison, et qu'aucun pas ne rejoue une étape disparue ;
- que chaque commande locale soit celle de la CI **à quatre transformations déclarées près** —
  `npx --yes`, le CLI Supabase épinglé, `--clear`, le fichier de sortie ;
- que la version du CLI et la configuration factice soient celles de la CI, et que chaque export
  porte `--clear` et son propre cache ;
- que toute variable lue par un script de `scripts/` soit écartée par le rejeu, ou déclarée
  inoffensive avec sa raison.

La première version lisait les seules étapes écrites `- run:`, ne comparait pas les commandes et
consignait une mutation qui ne faisait pas ce qu'elle disait ; la contre-lecture du 27/09/2026 a
relevé les trois. Ce que la garde ne voit toujours pas : ce qu'un pas qui n'est pas une commande (la
stack, le verrou) fait de plus ou de moins que son pendant — c'est l'en-tête du script qui en répond.
Premier passage complet le 27/09/2026 : 33 pas, tous réussis, stack comprise ; et le soir, après la
contre-lecture, 31 pas réussis — la stack arrêtée puis redémarrée en une demi-minute, chaque export
dans son propre cache, effacé à la sortie.

**Le verrou a sa propre garde** (`scripts/verrou-de-la-stack.test.ts`), jouée sans Docker ni stack :
il se prend libre et se rend à la sortie, il refuse un rejeu vivant en le nommant, il reprend celui
d'un rejeu tué, et un seul de deux rejeux lancés ensemble l'obtient. **La course elle-même n'est pas
gardée** : un `mkdir` suivi de l'écriture du propriétaire, à la place du renommage, passe trois fois
sur trois, la fenêtre qu'il ouvre étant trop courte pour qu'un test y tombe. C'est dit en tête du
module, pour que le renommage ne soit pas « simplifié ».
