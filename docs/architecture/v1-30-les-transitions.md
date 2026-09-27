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
- **reanimated 4.5.1, les CSS transitions et les CSS animations** (`transitionProperty`,
  `animationName` avec `css.keyframes`…) marchent sur Android comme sur web, avec `cubicBezier`, mais
  **ignorent la préférence** : aucune trace de réduction du mouvement dans `src/css` ni dans le moteur
  natif `Common/cpp/reanimated/CSS`. Tout usage passe sa durée à zéro sous `useReducedMotion()`, ou
  n'est pas posé du tout.
- **Les animations de disposition de reanimated ne sont pas utilisables telles quelles sur web** —
  trois essayées pendant la livraison, trois retirées, chacune sur une mesure de l'export :
  - **`entering`** pose `visibility: hidden` sur l'élément jusqu'à l'événement `animationstart`, une
    image au moins plus tard, et un élément masqué ne reçoit pas le focus : « Voir les autres
    modes », qui le donne au premier mode révélé, le laissait retomber sur le document (section H de
    `scripts/verifier-etats-export.mjs`), et le parcours réel ne trouvait plus « Voiture (seul) » ;
  - **`LinearTransition`** ne déplace pas un bloc qui change de taille : il l'**étire** par une
    échelle (`Linear.web.ts`), contenu compris — la liste des modes était écrasée pendant deux
    images quand une précision s'y ouvrait ;
  - **`exiting`** recopie l'élément qui part dans un clone accroché à son `offsetParent`, hors du
    défilement : la carte d'ouverture refermée faisait défiler le plan de 521 px.

  Ce qui les remplace est en §4.3 : les CSS animations de reanimated, qui jouent dès la première
  image sans rien masquer, et deux composants qui suivent la vraie mise en page.
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

1. **`withTiming` de reanimated** : suivi par défaut ; on écrit quand même
   `reduceMotion: ReduceMotion.System`, comme les fichiers existants. **Mais ce n'est pas une
   défense sur laquelle compter** : la carte d'ouverture, qui en dépend, est bien posée dès la
   première image ; `Depliage`, laissé jouer sous la préférence (mutation J12), **ne s'ouvre pas du
   tout** — la précision reste à hauteur nulle. Mécanisme non élucidé ; la règle qui en sort est de
   ne pas lancer d'animation sous la préférence plutôt que de compter qu'elle se pose seule.
2. **`Animated` de React Native, les CSS transitions et animations de reanimated, le `Modal` de
   react-native-web** : ignorent la préférence. Sous `useReducedMotion()`, la durée passe à zéro
   (`dureeSelonLaPreference`), l'animation n'est pas posée (`styleDEntree`, `Apparition`), ou le style
   ne lit pas la valeur animée (la barre d'onglets, §5.5).
3. **Un rappel de fin d'animation** (la feuille qui se démonte après sa sortie) doit partir aussi sous
   la préférence, **immédiatement** : à vérifier par la garde, pas à supposer.

**Et un effet n'est pas la première image.** La barre d'onglets remettait sa valeur à 1 dans un
`useEffect`, qui part après le rendu, donc parfois après la première image : une image transparente
sous la préférence, vue par le parcours réel au premier de deux passages (§5.5). Sous la préférence,
l'état posé se décide **au rendu**.

### 4.3 Les dérivations, et leurs tests

`src/types/mouvement.ts` (logique pure, `TESTING.md` §2.1) et `src/types/mouvement.test.ts`. Ce qui
décide d'une animation sort de l'écran et se teste :

- `sensDuPassage(de, vers, ordre)` → `'avant' | 'arriere' | null` : le côté d'où entre l'étape du
  questionnaire ; `null` pour une première étape ou une étape hors de l'ordre ;
- `barreArrive(avant, apres)` → vrai **seulement** sur un passage de masquée à visible — jamais au
  démarrage, où l'état précédent est inconnu (`null`) ;
- `animationDesOnglets(reduit)` → `'fade' | 'none'` ;
- `dureeSelonLaPreference(duree, reduit)` → `0` sous la préférence : le seul chemin des cas 2 de §4.2.

Et ce qui **anime** est écrit une fois, dans `src/lib/mouvement.tsx` — huit écrans l'emploient, et un
réglage recopié diverge au premier ajustement :

- `styleDEntree(sens, reduit)` : la CSS animation d'une étape qui entre, du côté que
  `decalageDEntree` lui donne ; rien sans sens ou sous la préférence ;
- `Apparition` : un fondu (`Mouvement.fondu`) pour ce qui monte après son écran ;
- `Depliage` : ce qui s'ouvre sous un choix grandit de zéro à sa hauteur mesurée pendant qu'il
  apparaît, puis redevient une vue ordinaire ;
- `HauteurSuivie` : un bloc dont le contenu change va d'une hauteur à l'autre ; sa hauteur reste
  tenue entre deux changements, ce qui évite une image à la nouvelle hauteur avant le départ. Tenir
  une hauteur, c'est découper ce qui dépasse : la découpe laisse quatre pixels autour du contenu
  (`MARGE_DE_DECOUPE`), sans quoi l'anneau de focus du navigateur, dessiné hors de l'élément, était
  effacé — entièrement sur une ligne de piste, trouvé en relisant la vague ;
- `SansApparitionAuMontage` : ce qui est déjà là quand l'écran arrive ne s'ouvre pas sous les yeux —
  une précision rouverte par un brouillon, un point déjà répondu.

**Ce qui se teste où** : Jest pour les dérivations (§4.3, douze tests) et pour le délai du chargement
(`src/hooks/use-apres-un-delai.test.ts`) ; reanimated y est doublé par `scripts/doublage-reanimated.js`
(`TESTING.md` §2.1). Les composants, eux, ne se jugent qu'image par image dans un vrai navigateur :
deux gardes, `scripts/verifier-etats-export.mjs` (section J, sans réseau) et
`scripts/verifier-parcours-reel.mjs` (ce qui demande des données), relèvent chaque image avec le même
outil, `scripts/relever-par-image.mjs`. **« En chemin » s'y lit sur une valeur strictement
intermédiaire, jamais sur une durée** : un runner lent perd des images, il n'en invente pas. Chaque
garde a deux moitiés, avec et sans la préférence, et chacune est éprouvée en la cassant — les
mutations sont consignées dans l'en-tête de la garde, datées (`TESTING.md` §1.1).

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
  `Mouvement.courbe` (valeurs partagées et `withTiming`). À la fermeture, la feuille redescend et le
  voile s'efface en `Mouvement.sortie`, **puis** la feuille se démonte (`onFerme`).
- **Qui ferme en animant** : le geste de retour et Échap (`onRequestClose`), et l'appelant par la
  poignée `PoigneeDeFeuille` (`fermer(apres?)`, passée en `ref`) — « Pas maintenant » de la feuille du
  re-bilan, le choix validé de la feuille des rappels. Un bouton qui **navigue** (« Soumettre mon
  bilan », « Rattacher un compte ») appelle son rappel directement : sur natif, une route poussée sous
  un `Modal` encore ouvert reste dessous. Une seconde fermeture pendant la sortie est ignorée.
- **Sous la préférence** : voile et feuille posés dès la première image (valeurs initiales à 1), et la
  fermeture démonte tout de suite, sans attendre de rappel — **ce qui corrige aussi le défaut web** de
  §3.4, technique et non décidé ici.
- **Décision touchée** : le kit disait « Feuilles : glissement natif ». La feuille glisse toujours ; le
  voile ne glisse plus (`components/core/FeuilleDuBas.prompt.md`, ligne « Animation » du `readme.md`).
- **Accessibilité** : le dialogue garde son nom (le titre) ; le piège à focus de react-native-web ne
  change pas ; « le geste de retour referme toujours » reste le contrat.
- **Garde** : le parcours réel (`scripts/verifier-parcours-reel.mjs`, étape « re-bilan ») ouvre la
  feuille « Ton plan va être recalculé » — la seule qui s'ouvre sur web sans adresse rattachée, et
  elle demande une action engagée, d'où le re-bilan, jamais soumis :
  - animations actives : le voile ne bouge d'aucune image (son haut reste à 0), il passe par une
    opacité intermédiaire, la feuille est en chemin au moins une image ; à Échap, elle redescend au
    moins une image avant de se démonter ;
  - sous la préférence (émulée, page rechargée) : aucune image où la feuille bouge ou le voile est
    translucide, à l'ouverture comme à Échap.

### 5.5 « Compris » et l'arrivée de la barre (décision n° 4)

- **Fichiers** : `src/app/(tabs)/_layout.tsx` (la barre), `src/components/plan/carte-douverture.tsx`
  (son commentaire, qui dit pourquoi elle part d'un coup).
- **Avant** : la carte disparaît, le contenu remonte d'un bloc, la barre surgit.
- **Après** :
  - **la barre glisse depuis le bas** : translateY de sa hauteur à 0 et opacité de 0 à 1 en
    `Mouvement.entreeDeBarre`, par un `Animated.Value` posé dans `tabBarStyle` (§3.2), avec le pilote
    de la barre elle-même (natif hors du web). Seulement quand `barreArrive` le dit ; masquée, elle
    attend en bas et transparente, pour que sa première image visible soit le début du mouvement ;
  - **la carte qui part s'en va d'un coup**, et celle qui arrive fait son entrée (320 ms, déjà là).
    Au premier plan, « Compris » remplace une carte par une autre de même hauteur à quelques pixels
    près : c'est l'entrée de la seconde qui fait le passage ;
  - **le reste du plan ne glisse pas, et c'est un écart à la recommandation** : `exiting` et
    `LinearTransition`, les deux outils prévus, ont été retirés sur mesure (§3.2). Une carte de
    saison refermée laisse donc le plan remonter d'un coup — quatre fois par an. Le rouvrir demande
    un conteneur à hauteur suivie autour des cartes d'ouverture, et le `gap` de la liste défilante
    ne s'y prête pas sans réécrire l'espacement de l'écran : non fait dans cette vague.
- **Sous la préférence** : la barre ne lit pas la valeur animée du tout — `tabBarStyle` ne porte ni
  opacité ni transformation. La première forme la remettait à 1 dans un effet, donc parfois après la
  première image : le parcours réel l'a vue au premier de deux passages, une image transparente sur
  une bande vide (§4.2).
- **Décision touchée** : **l'écart n° 3 de `v1-17` §9 est levé**. Sa raison — il fallait envelopper
  `BottomTabBar`, donc dépendre de `@react-navigation/bottom-tabs` — ne tenait pas (§3.2). Reporté
  dans une ligne datée sous le tableau de `v1-17` §9, le commentaire de `src/app/(tabs)/_layout.tsx`,
  le paragraphe de C5.7 dans `CLAUDE.md` et `EXPO.md` §1.7.
- **La bande pendant l'arrivée** : l'écran reprend sa hauteur d'un coup quand la barre passe de `none`
  à `flex`, donc la bande de la barre est vide pendant son entrée. Regardée image par image sur
  l'export (planches à 80 ms) : elle ne se voit que sur une image, d'un gris à peine plus sombre que
  le fond, la barre y entrant déjà à demi opaque — la courbe de sortie douce fait l'essentiel du
  trajet dans le premier tiers. **L'appareil le confirme ou non** (§8.3).
- **Un piège de mesure, payé le 27/09/2026** : cliquer « Compris » avec `locator.click()` pendant
  que la carte fait encore son entrée fait défiler le plan de la hauteur de la carte — Playwright
  cherche à viser un lien qui bouge. Ce n'est pas le produit : un clic aux coordonnées
  (`page.mouse.click`), comme un doigt, ne défile pas, avant comme après ce chantier. Le parcours
  réel clique « Compris » bien après l'entrée de la carte.
- **Gardes** :
  - `scripts/verifier-etats-export.mjs`, section J, sans réseau : **au démarrage**, sans marque, avec
    `barre` et avec `fait`, la barre est à sa place et opaque à chaque image — une barre qui
    glisserait à chaque ouverture serait le pire effet de ce chantier ;
  - `scripts/verifier-parcours-reel.mjs` : à « Compris », au moins une image montre la barre en
    chemin, et elle finit opaque ; le second profil, joué **sous la préférence**, voit sa barre
    arriver posée à chaque image.

### 5.6 Le changement d'étape du questionnaire (décision n° 5)

- **Fichiers** : `src/app/bilan/index.tsx` (le sens, par `sensDuPassage`),
  `src/components/bilan/step-shell.tsx` (l'entrée), `src/components/bilan/progress-header.tsx` (le
  rail de progression), `src/lib/mouvement.tsx` (`styleDEntree`).
- **Après** : la nouvelle étape entre en opacité 0 → 1 et en `Mouvement.deplacement` depuis le côté du
  parcours (de la droite en avançant, de la gauche en reculant), en `Mouvement.entree`. L'ancienne
  sort sans animation. Pas d'animation au montage (première étape, reprise d'un brouillon). Le rail
  avance jusqu'à sa largeur en `Mouvement.entree`, par une CSS transition de reanimated sur `width`.
- **Mécanisme** : une **CSS animation** de reanimated (`css.keyframes`, une par sens) sur une vue qui
  prend l'étape pour clé, donc qui repart de son début à chaque étape. Ni valeur partagée ni
  `entering` : ce dernier masquait l'étape une image, et le titre avec elle (§3.2).
- **Sous la préférence** : l'animation n'est pas posée, le rail a une durée nulle — les CSS animations
  et transitions ne lisent pas la préférence (§4.2, cas 2).
- **Focus** : il va au titre de l'étape **au montage**, sans attendre la fin de l'animation. Les
  sections E et G de `scripts/verifier-etats-export.mjs` le gardent, et restent vertes.
- **Décision touchée** : « Animation : rare et signifiante » — le kit en fait une exception écrite :
  le motif « axe partagé » est le standard Material d'un parcours par étapes, et le sens dit
  « j'avance » ou « je reviens ».
- **Garde** (`scripts/verifier-etats-export.mjs`, section J) : après « Suivant », le titre de l'étape
  qui arrive est translucide et à droite de sa place au moins une image ; après « Retour », à gauche ;
  le rail passe par une largeur intermédiaire. Sous la préférence : aucune image translucide ni
  décalée, aucune largeur intermédiaire.

### 5.7 Le contenu qui s'ouvre au lieu de sauter (décision n° 6)

- **Où** : les précisions du questionnaire (`src/components/bilan/steps/commute-mode.tsx`,
  `commute-extra.tsx` pour « Lequel ? », `leisure-detail.tsx` pour « Voir les autres modes »,
  `long-trips.tsx`) ; la ligne de piste qui s'ouvre en carte (`src/app/(tabs)/plan/pistes.tsx`) ; la
  carte du point qui passe à la réplique (`src/components/checkin-card.tsx`).
- **Après** :
  - **ce qui s'ouvre sous un choix se déplie** (`Depliage`) : sa hauteur part de zéro et rejoint sa
    mesure en `Mouvement.entree` pendant qu'il apparaît en `Mouvement.fondu` — ce qui est dessous
    descend avec lui, image par image, parce que c'est la vraie mise en page qui bouge ;
  - **ce qui change de contenu change de hauteur en glissant** (`HauteurSuivie`) : la carte du point
    quand la réplique remplace la question, une piste qui passe de ligne à carte. La réplique et la
    carte ouverte apparaissent en fondu (`Apparition`) ;
  - ce qui disparaît (un autre mode choisi) part sans animation.
- **Mécanisme** : jamais `LinearTransition` ni `entering` (§3.2). `SansApparitionAuMontage` entoure le
  contenu de l'étape, la liste des pistes et la carte du point : ce qui est déjà là à l'arrivée est
  posé.
- **Sous la préférence** : `Depliage` et `Apparition` ne jouent pas, `HauteurSuivie` laisse la hauteur
  libre.
- **Focus** : les déplacements existants (premier mode révélé par « Voir les autres modes »,
  réplique du point) partent toujours au geste, sans attendre — c'est ce que la section H garde, et ce
  qu'`entering` avait cassé.
- **Risque technique** : animer une hauteur relance la mise en page à chaque image. Si la recette voit
  saccader une liste sur un Android d'entrée de gamme, on garde le fondu et on retire le dépliage de
  cette liste-là.
- **Gardes** :
  - `scripts/verifier-etats-export.mjs`, section J : après « Voiture (seul) », « Voiture
    (covoiturage) », juste dessous, passe par une position intermédiaire et « Thermique » par une
    opacité intermédiaire ; sous la préférence, ni l'un ni l'autre ; et l'étape rouverte depuis un
    brouillon, motorisation déjà ouverte, ne l'ouvre pas sous les yeux ;
  - `scripts/verifier-parcours-reel.mjs`, étape « point » : quand le point est répondu, le cap, sous
    la carte, passe par une position intermédiaire ; et avant, l'anneau de focus de « Oui », collé au
    bord gauche du contenu, n'est rogné par aucun ancêtre.
  - **Ce qui n'est pas gardé** : `HauteurSuivie` sous la préférence (le seul profil qui répond à un
    point joue animé), et l'ouverture d'une piste en carte — même composant que la carte du point,
    regardée sur planche.

### 5.8 Les onglets en fondu, et le « Chargement… » différé (décision n° 8)

- **Fichiers** : `src/app/(tabs)/_layout.tsx` (`animation: animationDesOnglets(reduit)` dans
  `screenOptions`) ; `src/app/(tabs)/plan/index.tsx`, `src/app/(tabs)/plan/pistes.tsx`,
  `src/app/(tabs)/suivi/index.tsx` (la ligne de chargement) ; `src/hooks/use-apres-un-delai.ts`.
- **Après** : un fondu de 150 ms entre onglets (celui de la barre embarquée) ; la ligne « Chargement
  de ton … » n'apparaît qu'après **300 ms** de chargement continu (`DELAI_AVANT_CHARGEMENT`) — en
  dessous, l'écran reste vide et le contenu arrive seul. Sur les pistes, l'échec s'affiche tout de
  suite : seul le chargement attend.
- **Hors périmètre, exprès** : `/suivi/bilan` garde son « Chargement de ton bilan… » immédiat, dont
  le HTML statique est épinglé par la section D de `scripts/verifier-etats-export.mjs`.
- **Sous la préférence** : `animation: 'none'` ; le délai du chargement reste (ce n'est pas du
  mouvement).
- **Décision touchée** : « Navigations : standard plateforme », lue comme le fondu de Material entre
  destinations d'une barre de navigation ; le délai touche un état de chargement (`FRONT.md` §1.3 :
  l'état de départ n'affirme rien, et un écran vide n'affirme rien non plus).
- **Gardes** : `scripts/verifier-etats-export.mjs`, section J, sans réseau : au retour sur « Plan »
  depuis « Suivi », au moins une image montre une scène en plein fondu ; sous la préférence, aucune.
  Le délai : `src/hooks/use-apres-un-delai.test.ts`, horloge simulée — rien avant 300 ms, la ligne
  après, faux dès l'arrêt, et un chargement qui se relance repart de zéro (trois mutations).

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
- « Compris » : la carte des deux lieux entre, la barre glisse, **aucune bande de couleur** sous
  l'écran ; et une carte de saison refermée laisse le plan remonter d'un coup — c'est l'écart de §5.5,
  à juger sur l'appareil ;
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
| 5.4 | Les feuilles | fait — gardées par le parcours réel, avec et sans la préférence |
| 5.5 | « Compris » et la barre | fait, avec un écart : le reste du plan ne glisse pas quand une carte de saison part (§5.5) ; barre gardée au démarrage (section J) et à l'arrivée (parcours réel, les deux moitiés) ; un défaut d'une image sous la préférence trouvé par la garde et corrigé |
| 5.6 | Le questionnaire | fait — section J, les deux sens et le rail, avec et sans la préférence |
| 5.7 | Le contenu qui s'ouvre | fait — section J pour les précisions, parcours réel pour la carte du point ; `HauteurSuivie` sous la préférence et la piste qui s'ouvre ne sont pas gardées (§5.7) ; une découpe qui effaçait l'anneau de focus, trouvée en relisant, corrigée et gardée |
| 5.8 | Les onglets et le chargement | fait — section J pour le fondu, Jest pour le délai |
| — | Les mutations des gardes | fait — douze sur la section J, sept sur le parcours réel, jouées une à une sur un fichier égal au commit ; tables en tête de chaque garde. Trois ont d’abord corrigé la garde (`TESTING.md` §2.14, point 5) |
| 7 | Les documents | fait — kit, `FRONT.md` §2.12, `EXPO.md` §1.5 et §1.7, `TESTING.md` §2.10 et §2.14, `CLAUDE.md`, `v1-17` §9, skill `mouvement` |
| 8.1 | Contre-lecture, rejeu de la CI, poids Vercel | à faire |
| 8.2 | Build EAS (à demander) | à faire |
| 8.3 | Recette sur appareil | à faire |
| 6 | Vague 2 : la sortie du lancement | après 8.3 |

## 10. Comment reprendre

- **La branche** `claude/inspiring-fermi-nlmdhl` porte ce document en premier commit, et la PR
  ScratchMe/Ramille#283 le cite dans sa description. Le socle (§5.1 à §5.3) a un commit par
  chantier ; les écrans (§5.4 à §5.8) sont partis ensemble, parce qu'ils partagent
  `src/app/(tabs)/_layout.tsx` et `src/lib/mouvement.tsx`, puis la bascule vers les CSS animations
  et les hauteurs suivies, puis les gardes. §9 dit où on en est.
- **Le skill `mouvement` (§5.1) s'écrit après le socle (§5.3)** et non avant : il cite ses fichiers,
  et le contrôle des renvois refuse un chemin qui n'existe pas encore.
- **Refaire le relevé filmé** : il n'est pas dans le dépôt, parce qu'il modifie le parcours réel.
  1. Démarrer Docker et la stack (`TESTING.md` §2.6), puis construire l'export avec les variables de
     la stack locale (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
  2. Copier `scripts/verifier-parcours-reel.mjs`, `scripts/servir-export.mjs`,
     `scripts/mesurer-un-choix.mjs` et `scripts/relever-par-image.mjs` hors du dépôt, lier
     `node_modules` à côté.
  3. Dans la copie, ajouter au `newContext` de `nouvelOnglet` :
     `recordVideo: { dir, size: { width: 420, height: 900 } }`, et faire dépendre `reduire` d'une
     variable (`MOUVEMENT_REDUIT`) pour le premier profil ; journaliser un repère horodaté
     (`Date.now()` moins l'instant de création de la page) dans `etape`, `bouton`, `boutonDuPager` et
     avant « Compris » ; ajouter, avant le re-bilan (étape 8 ter, qui ouvre déjà la feuille), un
     détour : l'onglet Suivi puis Plan, « Voir toutes les pistes », une ligne ouverte en carte (clic
     aux coordonnées, §5.5), et retour.
  4. Lancer la copie **depuis la racine du dépôt** (elle lit des fichiers du dépôt par chemin
     relatif), une fois par valeur de `MOUVEMENT_REDUIT`.
  5. Découper la vidéo la plus longue autour des repères avec le ffmpeg de Playwright
     (`/opt/pw-browsers/ffmpeg-*/ffmpeg-linux`, qui sait décoder le VP8 et écrire du PNG) et
     assembler les images dans une page HTML capturée par Playwright.
