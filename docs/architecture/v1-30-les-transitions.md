# v1-30 — Les transitions de l'interface : ce qui bouge, comment, et dans quel ordre

> **Décidé le 27/09/2026, en cours de livraison.** La personne qui pilote a demandé que l'interface
> finisse par avoir *« un rendu professionnel et smooth »*, en regardant ce que transitions.dev
> pouvait apporter. Ce document dit ce que l'étude a établi, ce qui a été décidé, et **chaque travail
> à faire, assez précisément pour qu'un autre agent le reprenne** : fichiers, durées, comportement
> sous « réduire les animations », tests, gardes et mutations qui les éprouvent. L'état d'avancement
> est en §9, tenu à jour pendant le travail et pas après coup.

## 1. D'où ça vient

La demande : *« Rendre les transitions de l'interface plus fluides, en regardant ce que peut apporter
transitions.dev »*, avec la question *« peut-on l'installer en tant que skill ? »*. En cours d'étude,
trois pistes de plus (les CSS transitions de reanimated, les shared element transitions de React
Navigation, `LayoutAnimation` de React Native) et un plug-in à juger (`hzblj-skills`, archive
`Skills_For_Real_ReactReact_Native_Engineers-1.7.1`).

L'étude s'est faite **sans rien installer** : les deux sources lues hors du dépôt, leurs scripts lus
sans être exécutés, les bibliothèques vérifiées dans `node_modules` aux versions du dépôt (Expo 57,
React Native 0.86, react-native-web 0.21, reanimated 4.5.1, expo-router 57.0.23). **Le parcours réel a
été filmé** sur l'export web contre la stack Supabase locale, avec et sans « réduire les animations »,
puis découpé image par image autour de chaque transition — la méthode pour le refaire est en §10.

## 2. Les décisions (27/09/2026)

Posées une par une sous la forme de `CLAUDE.md` ; **toutes les recommandations sont suivies**, avec
une précision sur la n° 2 et une sur la n° 9.

| N° | La question | Décision |
|---|---|---|
| 1 | transitions.dev ne s'installe pas (§3.1) : écrire à la place un skill de Ramille sur le mouvement ? | **Oui** : `.claude/skills/mouvement/`, appelé par son nom (§5.1) |
| 2 | Le plug-in `hzblj-skills` ? | **Installé en mode manuel** (§5.2) — la recommandation était de ne pas l'installer, et, s'il l'était, en manuel, après correction du script et **sans `/polish`** |
| 3 | Les feuilles : le voile se fond, la feuille glisse, la fermeture s'anime | **Oui** (§5.4) |
| 4 | « Compris » et la barre d'onglets qui arrive en glissant, en rouvrant l'écart n° 3 de `v1-17` §9 | **Oui** (§5.5) |
| 5 | Le changement d'étape du questionnaire, malgré « Animation : rare et signifiante » | **Oui** (§5.6) |
| 6 | Le contenu qui glisse au lieu de sauter | **Oui** (§5.7) |
| 7 | La sortie de l'écran de lancement en fondu | **Oui, dans un second temps** (§6) |
| 8 | Les onglets en fondu, et le « Chargement… » différé | **Oui** (§5.8) |
| 9 | L'ordre de livraison | **Une vague pour 1, 2, 3, 4, 6 et 8, puis le lancement à part** — *« mais commence par documenter tous les travaux à faire, comme ça un autre agent pourrait reprendre ton travail au besoin »* : c'est ce document |

**Le « sans `/polish` » de la n° 2 est appliqué** : c'était la condition de l'option retenue, et elle
se défait en relançant l'installation sans l'exclusion. La commande applique d'office un
rétrécissement à 0,96 sous le doigt, qui défait la décision n° 6 de `v1-29` (§3.3).

## 3. Ce qui a été établi, et qui ne se re-raisonne pas

### 3.1 transitions.dev

- **Ce que c'est** : une collection de transitions **web** — 32 gratuites, des « Pro » payantes —,
  chacune écrite en CSS plus quelques lignes de JavaScript qui manipulent le DOM (`classList`,
  `getComputedStyle`, un reflow forcé). Autour : deux skills (`transitions-dev`,
  `transitions-polish`), une CLI npm qui les télécharge depuis `api.transitions.dev` et écrit un
  skill « Pro » dans `~/.claude/skills`, et Refine, en bêta, qui injecte un panneau dans l'app, lance
  un relais local et peut installer la CLI Cursor.
- **Ce n'est pas un plug-in** : pas de `.claude-plugin/plugin.json`, donc
  `scripts/installer-un-plugin.mjs` le refuse.
- **La licence l'exclut.** Le dépôt n'a pas de fichier LICENSE ; la CLI et Refine sont sous MIT,
  mais les transitions relèvent des conditions du site (juillet 2026) : usage libre dans ses propres
  produits, modification permise, **interdiction de republier la collection ou une part
  substantielle** comme bibliothèque ou kit. Le skill en est une part substantielle (ses 32 fiches
  et ses jetons), et ce dépôt est public.
- **Et il ne servirait pas** : ni CSS ni DOM sur Android ; sur web, react-native-web ne pose pas de
  classes, donc ses extraits ne s'y branchent pas non plus.
- **Ce qui a de la valeur, ce sont ses principes** — repris dans nos mots dans le skill `mouvement`
  (§5.1), sans extrait ni table recopiés : une fermeture plus rapide que l'ouverture ; jamais de
  rebond ni de délai sur une fermeture ; le dépassement réservé aux entrées ; des distances courtes
  (8 px pour un contenu qui glisse) ; un étalement total sous 300 ms ; raccourcir une durée plutôt
  qu'ajouter un délai.

### 3.2 Les bibliothèques, telles qu'elles sont dans le dépôt

Chaque fait ci-dessous a été lu dans la source installée, pas dans une documentation :

- **reanimated 4.5.1, `withTiming` et les animations de disposition** (`entering`, `exiting`,
  `LinearTransition`) suivent la préférence par défaut (`ReduceMotion.System` : l'animation arrive
  directement à sa valeur finale). Le dépôt l'écrit quand même explicitement, pour le lecteur
  (`mascot.tsx`, `ecran-lancement.tsx`, `carte-douverture.tsx`).
- **reanimated 4.5.1, les CSS transitions** (`transitionProperty`, `transitionDuration`…) marchent sur
  Android comme sur web, avec `cubicBezier`, mais **ignorent la préférence** : aucune trace de
  réduction du mouvement dans `src/css` ni dans le moteur natif `Common/cpp/reanimated/CSS`. Tout
  usage passe sa durée à zéro sous `useReducedMotion()`.
- **`Animated` de React Native ignore la préférence** lui aussi. Même règle.
- **`useReducedMotion()` n'est lu qu'au démarrage** (`v1-29` §6.4) : changer la préférence demande de
  relancer l'app, sur l'appareil comme dans un test.
- **Le `Modal` de react-native-web 0.21** anime par des keyframes CSS de 250 ms
  (`cubic-bezier(0.215, 0.61, 0.355, 1)` à l'entrée, `cubic-bezier(0.47, 0, 0.745, 0.715)` à la
  sortie) et **ne lit pas `prefers-reduced-motion`**. Tout le contenu du `Modal` glisse — le voile
  compris, puisqu'il est dedans.
- **`LayoutAnimation` ne fait rien sur web** (react-native-web appelle le rappel de fin et s'arrête)
  et, sur Android, anime **tout** ce qui change au prochain rendu, sans lire la préférence. Écarté au
  profit des animations de disposition de reanimated, posées vue par vue.
- **Les shared element transitions** sont déclarées expérimentales et *« not recommended for
  production »*, ne marchent que dans la pile native, derrière un drapeau natif
  (`ENABLE_SHARED_ELEMENT_TRANSITIONS`, donc un build EAS), et pas sur web. Écartées ; elles se
  rouvrent le jour où reanimated les déclare stables.
- **La barre d'onglets embarquée par expo-router** (`expo-router/build/react-navigation/bottom-tabs`)
  propose `animation: 'fade'` entre onglets — 150 ms, linéaire, par `Animated`, donc sur Android
  comme sur web — et ne lit pas la préférence. **Son `tabBarStyle` accepte une valeur animée** (typé
  `Animated.WithAnimatedValue<StyleProp<ViewStyle>>`) et elle l'applique **en dernier** dans le
  `style` de son `Animated.View` : une transformation qu'on y met remplace la sienne. C'est ce qui
  fait tomber la raison de l'écart n° 3 de `v1-17` §9 (§5.5).
- **La pile d'expo-router sur web n'anime rien** ; sur Android, elle a l'animation par défaut de
  react-native-screens. Aucune des deux n'est touchée : « Navigations : standard plateforme ».

### 3.3 Le plug-in `hzblj-skills`

MIT (Jan Blazej, 2026), 39 skills, 8 agents, 8 commandes, aucun hook ni connecteur. Quatre de ses
skills adaptent du contenu de `cursor/plugins` (MIT), ce qu'ils déclarent eux-mêmes.

- **Utile** : ses fiches reanimated (`reanimated-core`, `reanimated-timing`,
  `reanimated-layout-animations`) et `ui-motion`.
- **Contraire aux décisions de Ramille** : `ui-interactions` et `native-feel` prescrivent un
  rétrécissement à 0,96 sous le doigt, `android_ripple` et des vibrations — l'inverse de la décision
  n° 6 de `v1-29` (une teinte immédiate, sans animation, pas de ripple). `/polish` applique ces règles
  d'office, avec des cibles de 44 px là où le dépôt est à 48. `native-feel` suppose aussi un thème
  sombre, reporté après le lancement. **Les règles du dépôt passent devant** (`CLAUDE.md`), et le
  skill `mouvement` le rappelle nommément.
- **Hors sujet** : monorepo Turborepo (`project`), GSAP, Next.js, Tailwind ; `unslop` se déclenche
  sur tout message de commit — en mode manuel, il ne se déclenche plus seul.
- **Notre installateur ne le posait pas correctement** — essayé sur une racine jetable : 8 commandes
  et **aucun skill**. Il lit chaque chemin `skills` du manifeste comme un dossier **parent** de
  skills, alors que celui-ci déclare ses 39 skills un par un. Et les noms de dossier ne sont pas
  uniques (`shared/ui/performance`, `web/animations/gsap/performance`) : ce sont les champs `name` de
  leurs en-têtes qui le sont (`performance`, `gsap-performance`), et ce sont eux que les commandes
  citent (`ui-motion`, `ui-interactions`). Correction en §5.2.

### 3.4 Ce qui bouge aujourd'hui (relevé filmé)

| Moment | Aujourd'hui |
|---|---|
| Écran de lancement | Arrivée (560 ms, `easeOutBack(1,4)`), à-coup, nom (420 ms) ; plancher 1 450 ms ; **coupe franche** vers l'onboarding |
| Onboarding | Défilement lisse ; sous la préférence, la page saute — conforme (`v1-29`) |
| Questionnaire | L'étape est remplacée d'un coup ; la barre de progression saute ; une précision (« Quelle motorisation ? », « Lequel ? ») apparaît d'un coup et pousse le reste |
| « Compris », tout premier plan | En moins de 100 ms : la carte disparaît, le contenu remonte d'un bloc, la carte « Plan et Suivi » entre, la barre surgit |
| Onglets, « Voir toutes les pistes » | Coupe franche, et une image de « Chargement de ton suivi… » / « … des pistes… » au premier passage |
| Feuilles du bas | **Le voile gris monte avec la feuille** ; sur web, la fermeture est instantanée, et **la feuille glisse même sous « réduire les animations »** |
| Carte du point | La question est remplacée par la réplique d'un coup |
| Mascotte, carte d'ouverture | Souffle (1,035, 1 400 ms) ; entrée 320 ms, opacité et 16 px, `easeOutCubic` — conformes |

Tout ceci est lu **sur web**. Sur Android, les feuilles ont la même structure (le voile vit dans la
fenêtre du `Modal`), et le reste passe par le même code — mais seul l'appareil le dit (§8.3).

## 4. Le vocabulaire commun

### 4.1 Les jetons

Ils entrent dans `src/constants/theme.ts`, sous un objet `Mouvement`, **et dans le kit**
(`docs/design/design-system/` : la ligne « Animation » de `readme.md`, et un fichier
`tokens/mouvement.css` importé par `styles.css` comme les trois autres) — le kit se synchronise
(`v1-29` §5).

| Jeton | Valeur | Usage |
|---|---|---|
| `Mouvement.entree` | 250 ms | un contenu qui arrive : étape du questionnaire, contenu qui glisse |
| `Mouvement.entreeDeFeuille` | 280 ms | la feuille qui monte |
| `Mouvement.entreeDeBarre` | 320 ms | la barre d'onglets, valeur du canevas (planche F3 de C5.7) |
| `Mouvement.fondu` | 200 ms | le voile, ce qui apparaît en place |
| `Mouvement.sortie` | 200 ms | la feuille qui redescend, la carte qui se replie |
| `Mouvement.sortieBreve` | 150 ms | un fondu de sortie |
| `Mouvement.deplacement` | 8 px | ce qu'un contenu parcourt en entrant |
| `Mouvement.courbe` | `Easing.bezier(0.22, 1, 0.36, 1)` | la « sortie douce », pour tout ce qui entre, sort, glisse ou se replie |

**Aucun rebond** hors de l'écran de lancement, qui garde les siens (déjà décrits par le kit). Les
valeurs existantes de la mascotte, du lancement et de la carte d'ouverture ne bougent pas.

### 4.2 La règle de la préférence

Trois cas, et le premier est le seul qui soit gratuit :

1. **`withTiming` et les animations de disposition de reanimated** : suivies par défaut ; on écrit
   quand même `reduceMotion: ReduceMotion.System`, comme les fichiers existants.
2. **`Animated` de React Native, les CSS transitions de reanimated, le `Modal` de react-native-web** :
   ignorent la préférence ; la durée passe à zéro (ou l'animation à `'none'`) sous `useReducedMotion()`.
3. **Un rappel de fin d'animation** (la feuille qui se démonte après sa sortie) doit partir aussi sous
   la préférence, **immédiatement** : à vérifier par la garde, pas à supposer.

### 4.3 Les dérivations, et leurs tests

`src/types/mouvement.ts` (logique pure, `TESTING.md` §2.1) et `src/types/mouvement.test.ts`. Ce qui
décide d'une animation sort de l'écran et se teste :

- `sensDuPassage(de, vers, ordre)` → `'avant' | 'arriere' | null` : le côté d'où entre l'étape du
  questionnaire ; `null` pour une première étape ou une étape hors de l'ordre ;
- `barreArrive(avant, apres)` → vrai **seulement** sur un passage de masquée à visible — jamais au
  démarrage, où l'état précédent est inconnu (`null`) ;
- `animationDesOnglets(reduit)` → `'fade' | 'none'` ;
- `dureeSelonLaPreference(duree, reduit)` → `0` sous la préférence : le seul chemin des cas 2 de §4.2.

Les tests de composant (`@testing-library/react-native`, comme `checkin-card.test.tsx`) ne servent
qu'aux deux mécanismes à rappel : la feuille qui appelle `onFerme` après sa sortie, et l'état de
chargement différé. Chaque garde est éprouvée en la cassant, le compte des mutations écrit dans son
fichier et daté (`TESTING.md` §1.1).

## 5. La vague 1

L'ordre de travail est celui des sections : chaque chantier s'appuie sur les jetons et les
dérivations de §4. **Relevé de fichiers** (`CLAUDE.md`, « Avant de lancer une vague ») : deux
fichiers sont revendiqués par deux chantiers — `src/app/(tabs)/_layout.tsx` et
`src/app/(tabs)/plan/index.tsx`, par §5.5 et §5.8 —, et tous créent ou lisent le même socle (§5.3) ;
la vague se fait donc **en séquence**, pas en worktrees parallèles.

### 5.1 Le skill `mouvement` (décision n° 1)

- **Fichier** : `.claude/skills/mouvement/SKILL.md`, en-tête `disable-model-invocation: true` (appelé
  par son nom, comme `/rejouer-la-ci`), cité dans la liste de `CLAUDE.md` (« Ce que Claude Code fait
  seul ici, et ce qui s'appelle par son nom »).
- **Contenu, en français** : les principes de §3.1 dans nos mots ; les jetons de §4.1 et où ils
  vivent ; la règle de la préférence (§4.2), avec le piège des CSS transitions ; ce qui ne bouge
  **jamais** (l'état pressé, les chiffres, toute célébration, les navigations de pile) ; les
  conflits connus avec `hzblj-skills` (§3.3) ; la façon d'éprouver une transition (§8.1) ; la
  provenance (transitions.dev cité comme inspiration, aucun extrait).
- **Il cite des chemins qui existent** : le contrôle des renvois lit les skills écrits par le dépôt
  (`TESTING.md` §2.8).

### 5.2 Le plug-in `hzblj-skills` en mode manuel (décision n° 2)

1. **Corriger `scripts/installer-un-plugin.mjs`**, et son test `scripts/installer-un-plugin.test.ts` :
   - un chemin `skills` du manifeste qui porte lui-même un `SKILL.md` **est** un skill, et non un
     dossier de skills ;
   - son nom d'amont est alors le `name` de son en-tête (valide et unique dans le plug-in), sinon le
     nom du dossier — la règle « c'est le dossier qui nomme » reste celle des skills rangés sous un
     dossier parent, et l'en-tête de script dit pourquoi les deux cas diffèrent ;
   - une option `--exclure <nom>` (répétable) retire une commande ou un skill de l'installation,
     gardée dans `installation.json` et reprise à chaque mise à jour, comme le préfixe et le mode ;
   - chaque ajout a son test, et chaque test est éprouvé en le cassant (mutations datées en tête du
     test).
2. **Installer** : `node scripts/installer-un-plugin.mjs <archive> --manuel --exclure polish`. Le
   préfixe par défaut est le nom du plug-in, `hzblj-skills` : les noms installés restent sous 64
   caractères (le plus long, `hzblj-skills-reanimated-layout-animations`, en fait 41).
3. **Relire ce que le script imprime** (outils pré-autorisés de deux commandes, liens), et les
   consignes installées avant de commettre (`CLAUDE.md`).
4. **Licence** : celle du plug-in voyage avec la provenance ; les mentions MIT de `cursor/plugins`
   sont citées dans les skills concernés.

### 5.3 Les jetons et les dérivations

`Mouvement` dans `src/constants/theme.ts` ; `src/types/mouvement.ts` et ses tests ; le kit synchronisé.
Rien d'autre : c'est le socle des cinq chantiers suivants.

### 5.4 Les feuilles (décision n° 3)

- **Fichiers** : `src/components/feuille-du-bas.tsx`, et ses deux appelants
  (`src/components/plan/feuille-rappels.tsx`, `src/components/bilan/feuille-nouveau-bilan.tsx`) pour
  les fermetures déclenchées par un bouton.
- **Avant** : `Modal animationType="slide"` — tout glisse, voile compris ; sur web 250 ms, fermeture
  instantanée, préférence ignorée.
- **Après** : `Modal animationType="none"` ; le voile passe de 0 à 1 d'opacité en `Mouvement.fondu` ;
  la feuille monte de la hauteur de la fenêtre à 0 en `Mouvement.entreeDeFeuille`, courbe
  `Mouvement.courbe`. À la fermeture, la feuille redescend et le voile s'efface en
  `Mouvement.sortie`, **puis** la feuille se démonte (`onFerme`).
- **Qui ferme** : le geste de retour et Échap (`onRequestClose`), et les boutons qui referment sans
  naviguer (« Pas maintenant » de la feuille du re-bilan, et leurs équivalents), par un
  `useFermerLaFeuille()` que le cadre fournit. Un bouton qui navigue (« Soumettre mon bilan ») n'a
  pas besoin d'attendre. Une seconde fermeture pendant la sortie est ignorée.
- **Sous la préférence** : le voile et la feuille sont posés dès la première image, et la fermeture
  démonte tout de suite — **ce qui corrige aussi le défaut web** de §3.4, technique et non décidé ici.
- **Natif / web** : le même code (reanimated, valeurs partagées et `withTiming`, comme
  `carte-douverture.tsx`) ; pas d'animation de disposition dans un `Modal`, dont le comportement sur
  Android n'a pas été éprouvé.
- **Décision touchée** : le kit dit « Feuilles : glissement natif ». La feuille glisse toujours ; le
  voile ne glisse plus. La ligne du kit est réécrite.
- **Accessibilité** : le dialogue garde son nom (`aria-label`, le titre) ; le piège à focus de
  react-native-web ne change pas ; « le geste de retour referme toujours » reste le contrat.
- **Garde** : dans le parcours réel (`scripts/verifier-parcours-reel.mjs`), un détour par un re-bilan
  qui ouvre la feuille « Ton plan va être recalculé » — la seule qui s'ouvre sur web sans adresse
  rattachée — mesurée deux fois :
  - animations actives : le haut du voile est à 0 **dès la première image**, pendant que la feuille
    est encore en chemin (son haut plus bas qu'à l'arrivée) ; après Échap, la feuille est encore là
    à la première image et partie à la fin ;
  - sous la préférence (`page.emulateMedia({ reducedMotion: 'reduce' })` puis rechargement, puisque
    la préférence n'est lue qu'au démarrage) : la feuille est à sa place dès la première image, et
    partie dès la première image après Échap.
  - **Mutations à consigner** : `animationType="slide"` remis → la première tombe (le voile monte) ;
    la durée non ramenée à zéro sous la préférence, si le chemin passe par le cas 2 de §4.2 → la
    seconde tombe.

### 5.5 « Compris » et l'arrivée de la barre (décision n° 4)

- **Fichiers** : `src/app/(tabs)/_layout.tsx` (la barre), `src/components/plan/carte-douverture.tsx`
  (la sortie de la carte), `src/app/(tabs)/plan/index.tsx` (rien à changer si la sortie vit dans la
  carte — à vérifier).
- **Avant** : la carte disparaît, le contenu remonte d'un bloc, la barre surgit.
- **Après** :
  - **la carte sort** : opacité à 0 en `Mouvement.sortieBreve` **et** hauteur repliée à 0 en
    `Mouvement.sortie`, en parallèle, puis `onSortie` — le contenu remonte en suivant la hauteur au
    lieu de sauter. Cela vaut pour les trois usages de `CarteDOuverture` (nouvelle saison, premier
    plan, les deux lieux) : un seul composant, une seule sortie ;
  - **la barre glisse depuis le bas** : translateY 60 → 0 et opacité 0 → 1 en
    `Mouvement.entreeDeBarre`, par un `Animated.Value` posé dans `tabBarStyle` (§3.2), `useNativeDriver`
    comme la barre elle-même (vrai sur natif, faux sur web). Seulement quand `barreArrive` le dit ;
  - la carte « Plan et Suivi » garde son entrée actuelle (320 ms).
- **Sous la préférence** : tout est posé ; la barre (cas 2 de §4.2) ne s'anime pas.
- **Décision touchée** : **l'écart n° 3 de `v1-17` §9 est levé**. Sa raison — il fallait envelopper
  `BottomTabBar`, donc dépendre de `@react-navigation/bottom-tabs` — ne tient pas (§3.2). À reporter :
  une ligne datée sous le tableau de `v1-17` §9 (le document est daté, on ne réécrit pas la ligne),
  le commentaire de `src/app/(tabs)/_layout.tsx`, le paragraphe de C5.7 dans `CLAUDE.md` (« l'entrée
  glissée de 320 ms du canvas n'est pas rendue »), et `EXPO.md` §1.7.
- **À mesurer avant d'y croire** : l'écran reprend sa hauteur d'un coup quand la barre passe de
  `none` à `flex`, donc la bande de 60 px est vide pendant 320 ms. Elle doit avoir la couleur du fond
  de l'écran — sinon la barre doit glisser **dans** une bande déjà peinte, et c'est ce qu'on montre à
  la personne qui pilote avant de conclure.
- **Garde** :
  - `scripts/verifier-etats-export.mjs`, sans réseau : **au démarrage**, marque `fait`, la barre est à
    sa place et opaque dès la première image — une barre qui glisserait à chaque ouverture serait le
    pire effet de ce chantier ;
  - `scripts/verifier-parcours-reel.mjs`, à « Compris » : la barre est en chemin à la première image
    où elle apparaît (translateY > 0), à sa place à la fin ; la carte est encore là, en train de sortir,
    juste après l'appui.
  - **Mutations** : `barreArrive` rendu toujours vrai → la garde du démarrage tombe ; la valeur animée
    figée à 1 → celle du parcours tombe ; la sortie de la carte retirée → la seconde moitié tombe.

### 5.6 Le changement d'étape du questionnaire (décision n° 5)

- **Fichiers** : `src/app/bilan/index.tsx` (le sens, par `sensDuPassage`),
  `src/components/bilan/step-shell.tsx` (l'entrée), `src/components/bilan/progress-header.tsx` (la
  barre de progression).
- **Après** : la nouvelle étape entre en opacité 0 → 1 et en `Mouvement.deplacement` depuis le côté du
  parcours (de la droite en avançant, de la gauche en reculant), en `Mouvement.entree`. L'ancienne
  sort sans animation. Pas d'animation au montage (première étape, reprise d'un brouillon). La
  barre de progression glisse jusqu'à sa largeur en `Mouvement.entree`, par une CSS transition de
  reanimated sur `width` — donc gardée par la préférence (cas 2 de §4.2).
- **Mécanisme** : `StepShell` reste monté d'une étape à l'autre ; une valeur partagée repart de 0 à
  chaque changement d'étape (comme l'entrée de `CarteDOuverture`), plutôt qu'une animation de
  disposition à clé.
- **Sous la préférence** : l'étape est posée, la barre saute.
- **Focus** : il va au titre de l'étape **au montage**, sans attendre la fin de l'animation. Les
  sections E et G de `scripts/verifier-etats-export.mjs` le gardent déjà ; elles doivent rester vertes.
- **Décision touchée** : « Animation : rare et signifiante » — le kit en fait une exception écrite :
  le motif « axe partagé » est le standard Material d'un parcours par étapes, et le sens dit
  « j'avance » ou « je reviens ».
- **Garde** (`scripts/verifier-etats-export.mjs`, sans réseau — le questionnaire se remplit hors
  ligne) : après « Suivant », le contenu de l'étape est translucide et décalé à la première image,
  posé à la fin ; la barre de progression a une largeur intermédiaire en chemin. Sous la préférence
  (contexte Playwright `reducedMotion: 'reduce'`) : tout est posé dès la première image. **Mutations**
  : l'entrée retirée → la première tombe ; la durée de la barre non gardée → la seconde tombe.

### 5.7 Le contenu qui glisse au lieu de sauter (décision n° 6)

- **Où** : les précisions du questionnaire (`src/components/bilan/precision-mode.tsx`,
  `src/components/bilan/mode-list-item.tsx`, `src/components/bilan/steps/commute-extra.tsx` pour
  « Lequel ? », `src/components/bilan/steps/leisure-detail.tsx` pour « Voir les autres modes »,
  `src/components/bilan/steps/long-trips.tsx`) ; la ligne de piste qui s'ouvre en carte
  (`src/app/(tabs)/plan/pistes.tsx`) ; la carte du point qui passe à la réplique
  (`src/components/checkin-card.tsx`).
- **Après** : ce qui apparaît entre en fondu (`Mouvement.fondu`, `entering`) ; ce qui est dessous
  descend en `Mouvement.entree` (`layout={LinearTransition…}`) au lieu de sauter. Ce qui disparaît
  (un autre mode choisi) sort sans animation ; ce qui est dessous remonte en glissant.
- **Sous la préférence** : tout est posé (cas 1 de §4.2).
- **Focus** : les déplacements existants (premier mode révélé par « Voir les autres modes »,
  réplique du point) partent toujours au geste, sans attendre.
- **Risque technique** : une liste longue sur un Android d'entrée de gamme. Si la recette le voit, on
  retire le `layout` des listes longues et on garde le fondu.
- **Garde** (`scripts/verifier-etats-export.mjs`) : après « Voiture (seul) », la précision est
  translucide à la première image et l'élément suivant n'est pas encore à sa place ; sous la
  préférence, tout est posé. **Mutation** : `layout` retiré → l'élément suivant saute, la garde tombe.

### 5.8 Les onglets en fondu, et le « Chargement… » différé (décision n° 8)

- **Fichiers** : `src/app/(tabs)/_layout.tsx` (`animation: animationDesOnglets(reduit)` dans
  `screenOptions`) ; `src/app/(tabs)/plan/index.tsx`, `src/app/(tabs)/plan/pistes.tsx`,
  `src/app/(tabs)/suivi/index.tsx` (la ligne de chargement).
- **Après** : un fondu de 150 ms entre onglets (celui de la barre embarquée) ; la ligne « Chargement
  de ton … » n'apparaît qu'après **300 ms** de chargement continu — en dessous, l'écran reste vide et
  le contenu arrive seul.
- **Hors périmètre, exprès** : `/suivi/bilan` garde son « Chargement de ton bilan… » immédiat, dont
  le HTML statique est épinglé par la section D de `scripts/verifier-etats-export.mjs`.
- **Sous la préférence** : `animation: 'none'` ; le délai du chargement reste (ce n'est pas du
  mouvement).
- **Décision touchée** : « Navigations : standard plateforme », lue comme le fondu de Material entre
  destinations d'une barre de navigation ; le délai touche un état de chargement (`FRONT.md` §1.3 :
  l'état de départ n'affirme rien, et un écran vide n'affirme rien non plus).
- **Garde** : `scripts/verifier-etats-export.mjs`, sans réseau, barre visible : après l'appui sur
  « Suivi », la scène est translucide à la première image ; sous la préférence, opaque. Le délai du
  chargement : un test de composant (horloge simulée) — rien avant 300 ms, la ligne après.
  **Mutations** : `'fade'` figé → la garde sous la préférence tombe ; `'none'` figé → l'autre tombe ;
  le délai à 0 → le test de composant tombe.

## 6. La vague 2 : la sortie de l'écran de lancement (décision n° 7)

- **Après** : l'écran vert s'efface en 250 ms au-dessus du premier écran, déjà monté, au lieu de la
  coupe franche.
- **Ce que ça change dans la structure** : l'écran de lancement cesse d'être le contenu de `/`
  (`src/app/index.tsx`) pour devenir un **calque** du layout racine (`src/app/_layout.tsx`), retiré une
  fois la destination montée. Le plancher `DUREE_ANIMATION_LANCEMENT` (1 450 ms) ne bouge pas.
- **Sous la préférence** : coupe franche.
- **Risque** : un calque mal retiré bloque le premier écran — le parcours réel le verrait à sa
  première étape. Et sur Android, la route `/` qui remplace son écran a aujourd'hui l'animation de
  remplacement de la pile native : à regarder sur l'appareil **avant** d'écrire, pour savoir ce que le
  fondu remplace.
- Il se lance après la recette sur appareil de la vague 1.

## 7. Documents à tenir à jour avec la vague 1

- `docs/design/design-system/readme.md` : la ligne « Animation » (feuilles, étapes, barre, contenu,
  onglets, jetons), la liste des fichiers importés par `styles.css`, et `tokens/mouvement.css` ;
- `FRONT.md` : une section « Le mouvement » (ce qui bouge, la règle de la préférence, ce qui ne
  bouge jamais, renvoi au skill) ;
- `EXPO.md` : le `Modal` de react-native-web et la préférence (§1.5), la barre animée par `tabBarStyle`
  (§1.7), les CSS transitions de reanimated qui ignorent la préférence ;
- `CLAUDE.md` : le paragraphe de C5.7 (barre), la liste des skills appelés par leur nom ;
- `docs/architecture/v1-17-densite-du-plan.md` : une ligne datée sous le tableau de §9 ;
- `docs/architecture/produit.md` : le chantier dans la feuille de route ;
- ce document, §9.

## 8. Vérifier, livrer

### 8.1 Avant d'ouvrir la PR à la fusion

1. `npx tsc --noEmit`, `npm run lint`, `npm test`.
2. Chaque garde neuve **éprouvée en la cassant**, mutations consignées dans son fichier.
3. Le relevé filmé refait (§10) et regardé, avec et sans la préférence.
4. La contre-lecture du diff entier par le sous-agent `contre-lecture`.
5. `/rejouer-la-ci` (`node scripts/rejouer-la-ci.mjs`).
6. **Le poids Vercel mesuré hors ligne** (`VERCEL.md` §1.2), comparé au dernier relevé (4,16 Mio le
   25/09/2026). Ce chantier ne touche pas `api/` : un écart s'explique dans la PR.

### 8.2 Le build EAS

Il se **demande** avant d'être lancé (au plus un tous les deux jours, registre d'exploitation §3.3).

### 8.3 La recette sur appareil (`RECETTE.md`)

À regarder sur Android, dans les deux états de « Supprimer les animations » (Paramètres →
Accessibilité), **en relançant l'app après chaque changement** :

- les deux feuilles : le voile ne monte pas, la feuille monte, le retour matériel la fait redescendre ;
- « Compris » : la carte se replie, la barre glisse, **aucune bande de couleur** sous l'écran ;
- une barre qui ne glisse **pas** à une ouverture ordinaire de l'app ;
- le questionnaire : le sens de l'entrée en avançant et en reculant ; TalkBack annonce la nouvelle
  question une fois ;
- une précision qui s'ouvre, une piste qui s'ouvre, un point répondu : rien ne saute ;
- les onglets en fondu, et plus d'image de « Chargement… » ;
- sur un Android d'entrée de gamme si possible : les listes du questionnaire ne saccadent pas.

## 9. État d'avancement

| § | Travail | État |
|---|---|---|
| — | Ce document | fait |
| 5.1 | Le skill `mouvement` | fait — cité dans `CLAUDE.md` |
| 5.2 | L'installateur corrigé, `hzblj-skills` en manuel sans `/polish` | fait — 39 skills et 7 commandes, huit mutations consignées en tête du test |
| 5.3 | Les jetons, les dérivations, le kit | fait — sept mutations consignées dans `src/types/mouvement.test.ts` |
| 5.4 | Les feuilles | à faire |
| 5.5 | « Compris » et la barre | à faire |
| 5.6 | Le questionnaire | à faire |
| 5.7 | Le contenu qui glisse | à faire |
| 5.8 | Les onglets et le chargement | à faire |
| 7 | Les documents | à faire |
| 8.1 | Contre-lecture, rejeu de la CI, poids Vercel | à faire |
| 8.2 | Build EAS (à demander) | à faire |
| 8.3 | Recette sur appareil | à faire |
| 6 | Vague 2 : la sortie du lancement | après 8.3 |

## 10. Comment reprendre

- **La branche** `claude/inspiring-fermi-nlmdhl` porte ce document en premier commit, et la PR
  ScratchMe/Ramille#283 le cite dans sa description. Chaque chantier de §5 est un commit à lui, et
  §9 se met à jour dans le même commit.
- **Le skill `mouvement` (§5.1) s'écrit après le socle (§5.3)** et non avant : il cite ses fichiers,
  et le contrôle des renvois refuse un chemin qui n'existe pas encore.
- **Refaire le relevé filmé** : il n'est pas dans le dépôt, parce qu'il modifie le parcours réel.
  1. Démarrer Docker et la stack (`TESTING.md` §2.6), puis construire l'export avec les variables de
     la stack locale (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
  2. Copier `scripts/verifier-parcours-reel.mjs`, `scripts/servir-export.mjs` et
     `scripts/mesurer-un-choix.mjs` hors du dépôt, lier `node_modules` à côté.
  3. Dans la copie, ajouter au `newContext` : `recordVideo: { dir, size: { width: 420, height: 900 } }`
     et `reducedMotion: process.env.MOUVEMENT_REDUIT ? 'reduce' : 'no-preference'` ; journaliser un
     repère horodaté (`Date.now()` moins l'instant de création de la page) dans `etape`, `bouton`,
     `boutonDuPager` et avant « Compris » ; ajouter, avant la suppression du compte, un détour : le
     plan, l'onglet Suivi puis Plan, « Voir toutes les pistes » et retour, puis `/bilan` et « Suivant »
     jusqu'à « Voir mon bilan », la feuille, Échap.
  4. Lancer la copie **depuis la racine du dépôt** (elle lit des fichiers du dépôt par chemin
     relatif), une fois par valeur de `MOUVEMENT_REDUIT`.
  5. Découper la vidéo la plus longue autour des repères avec le ffmpeg de Playwright
     (`/opt/pw-browsers/ffmpeg-*/ffmpeg-linux`, qui sait décoder le VP8 et écrire du PNG) et
     assembler les images dans une page HTML capturée par Playwright.
