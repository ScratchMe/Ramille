# Expo — conventions et pièges

Ce que Ramille a appris d'Expo — Expo Router et son export statique, Metro et Babel, React
Native et `react-native-web`, EAS, Android. La **§1 vaut sur n'importe quel projet Expo** ; la
**§2** porte les écrans, les gardes et les incidents propres à Ramille, et ne voyage pas.
L'histoire complète est dans `CLAUDE.md` et dans les documents `docs/architecture/v1-0N-*.md`
que chaque paragraphe cite. Ce qui relève de l'hébergement de l'export (`cleanUrls`, fonctions,
déploiements) est dans `VERCEL.md`.

> **Quand lire ce fichier** : avant d'ajouter une route ou un fichier dans `public/` · avant de
> toucher à `app.json`, `app.config.js`, `.env`, à l'export ou à un hook natif · devant un écran
> blanc sur web · avant d'ajouter une dépendance native ou de lancer un build EAS · quand
> `expo-doctor` rougit en CI.

---

## 1. Ce qui vaut sur n'importe quel projet Expo

### 1.1 L'export statique : ce qui se construit n'est pas ce qui s'affiche

- **Une route sans enfants sort en fichier plat** (`suivi.html`), une route avec enfants en
  répertoire (`plan/index.html`) — l'hébergeur doit le savoir (`VERCEL.md` §1.5), sinon la
  moitié des routes répond 404 pendant que l'export local est parfait.
- **Jamais de route dynamique `[id]` sans `generateStaticParams`** : la page n'est pas produite,
  et l'hébergeur répond 404 sans rien signaler. Une chaîne de requête (`?id=`) à la place.
- **Ce que `public/` porte disparaît de l'export sans erreur** — `robots.txt`, `sitemap.xml`,
  `.well-known/assetlinks.json`. Chaque fichier qu'un tiers lit (moteur, Play, réseau social)
  mérite un garde d'export qui le vérifie **dans `dist/`**, ligne par ligne.
- **Un lien qui doit compter pour un moteur passe par `Link`, jamais par un `onPress`** :
  `react-native-web` rend un `onPress` sur du texte en `<div>`, cliquable pour un humain,
  inexistant pour un crawler. Et l'ancrage se vérifie dans le HTML statique, pas dans le code.
- **Une page dont le rendu dépend de l'exécution ne se vérifie qu'en l'ouvrant** : un garde
  d'export qui charge chaque route dans un navigateur et échoue sur une page vide ou une
  exception non rattrapée attrape ce que ni le typecheck, ni les tests, ni l'export ne voient.

### 1.2 `EXPO_PUBLIC_*` : deux pièges d'inlining

- **`babel-preset-expo` remplace `process.env.EXPO_PUBLIC_X` par sa valeur — sauf** quand l'accès
  est écrit directement comme valeur d'une propriété d'objet dont la clé porte ce même nom, où il
  rend `void 0` (vérifié en A/B). Lire la variable dans un `const` d'abord, jamais la replier dans
  une expression. Le typecheck passe, les tests passent, l'export réussit, l'app démarre sur une
  configuration vide : seul un garde qui lit le bundle exporté le voit.
- **Changer `.env` puis réexporter ne suffit pas : il faut `expo export --clear`.** Le cache de
  transformation de Metro est indexé sur le contenu des fichiers, pas sur les valeurs
  `EXPO_PUBLIC_*` : un second export réutilise le `void 0` d'un premier export sans variables, au
  bit près. La CI, qui part d'un checkout neuf, ne peut pas tomber dans ce piège — donc le garde
  accuse en local un défaut qui n'existe pas.

### 1.3 Un hook natif appelé au rendu emporte toute l'app sur web

Un hook s'exécute au rendu : une garde `Platform.OS` placée dans l'effet arrive trop tard, et une
exception dans le layout racine fait tomber l'arbre React entier — page blanche sur **toutes** les
routes, pendant que le HTML statique est servi en 200 avec son titre. Un hook ne peut pas être
appelé conditionnellement ; un composant, si : le hook vit dans un composant monté sous
`{estNatif && …}`.

### 1.4 Hydratation : l'état démarre à la valeur du serveur

Un état qui diffère entre le serveur et le client doit démarrer à la valeur du serveur et changer
**après** hydratation, sinon le DOM garde l'attribut `style` du HTML statique pour toujours :
l'hydratation ne vérifie que le texte, elle adopte les attributs tels quels. Une largeur lue dans
`Dimensions` dès le premier rendu laisse React croire qu'il tient déjà `width: 390` alors que le
HTML dit `0px`, et rien ne le corrige jamais — ni `onLayout`, ni `key`, ni le compilateur.
`useSyncExternalStore` avec un instantané serveur distinct fait voir le passage à React ;
`useWindowDimensions` ne le fait pas.

### 1.5 `react-native-web` : ce qui ne se comporte pas comme sur natif

- **Un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0` explicite** pour pouvoir
  rétrécir sous sa largeur intrinsèque, sinon un texte voisin est recouvert ou coupé. Même famille
  pour tout enfant flex qui doit pouvoir se comprimer.
- **`Alert.alert()` retombe sur `window.alert()`**, une boîte système qui bloque le fil et dont
  le `onPress` n'est pas invoqué de façon fiable : un état de composant à la place, et une règle
  ESLint sur l'**import** pour que l'erreur tombe à l'endroit où l'on s'apprête à réintroduire le
  motif.
- **`userInterfaceStyle` d'`app.json` ne s'applique qu'au natif** : sur web, `useColorScheme` lit
  `prefers-color-scheme`. Si le thème sombre n'est pas validé, la décision se prend dans le hook
  de thème **et** dans le `ThemeProvider` de navigation — corriger l'un sans l'autre laisse la
  moitié de l'écran dans l'autre palette.

### 1.6 Mise en page : `height` ou `minHeight`

Sous un `minHeight`, une hauteur n'est plus *définie* : un enfant en `flex: 1` ne se résout plus
sur l'espace restant mais sur sa taille max-content. Une page qui gère son propre débordement
(un corps qui défile sous un pied épinglé) veut `height` ; une page qui n'en a pas veut
`minHeight`, dans une `ScrollView` à `flexGrow: 1`. Et une illustration au `viewBox` carré
réclame sa largeur en hauteur sur tous les téléphones : la plafonner à une **part** de la page,
pas à un nombre de pixels.

**En Yoga les marges ne fusionnent pas**, contrairement à CSS. Deux voisins qui portent chacun
leur marge donnent la **somme**, pas le maximum : une `marginVertical` posée sur chaque élément
d'une liste rend un écart double entre deux éléments et simple aux extrémités. Un écart qui doit
être uniforme se pose donc **d'un seul côté**, ou au conteneur par `gap`. Et quand le conteneur ne
peut pas le porter — parce que ses enfants n'ont pas tous besoin du même écart —, la règle se
calcule par **frontière** et non par élément : c'est le second des deux voisins qui porte la
marge, et une frontière ne la compte qu'une fois.

### 1.7 Navigation : un écran d'onglet reste monté

- **react-navigation garde l'écran monté** quand on change d'onglet, et l'app survit à
  l'arrière-plan — qui est exactement l'état d'où l'on revient quand une notification arrive. Un
  `useEffect` de montage rend un écran plausible et périmé : recharger sur **deux** retours, le
  focus de l'écran et le retour de l'app au premier plan que la navigation ne voit pas
  (`useRafraichirAuRetour` chez Ramille).
- **Une mesure d'affichage se prend au focus, jamais au montage** : au montage, l'événement ne
  part qu'une fois par session, et le compteur rend un chiffre plausible et faux.
- **Deux chargements à quelques millisecondes d'écart n'ont pas d'ordre de réponse garanti** : une
  clé d'état incrémentée, l'effet qui la porte en dépendance, et un `cancelled` dans son nettoyage
  — seul le dernier lancé écrit, sans compteur de génération. Le rappel passé au hook de retour
  doit être stable (`useCallback`), sinon l'effet se réabonne à chaque rendu.
- **La barre d'onglets change de disposition toute seule au-delà de 768 px de large.**
  `shouldUseHorizontalLabels` (bottom-tabs) fait passer le libellé **à côté** de l'icône dès que
  la place suffit, sauf si `tabBarLabelPosition` est posé. Tout ce qui est dessiné dans le slot
  `tabBarIcon` en supposant un libellé **au-dessous** — une pastille, un badge, un liseré — se
  retrouve alors à côté du libellé et ne dit plus ce qu'il disait. Ça ne se voit pas sur un
  téléphone, donc jamais pendant le développement d'une app mobile : ça se voit dans un navigateur
  de bureau, et seulement là. Si la maquette ne dessine qu'une barre, poser
  `tabBarLabelPosition: 'below-icon'` vaut mieux que rendre le dessin sensible à la disposition.
- **Masquer la barre par `tabBarStyle: { display: 'none' }` libère sa hauteur** — elle ne laisse
  pas de bande vide. Ça se raisonne (un enfant `display: none` ne prend pas de place dans un
  conteneur flex) mais ça se **mesure**, parce que le navigateur d'onglets passe aussi sa hauteur
  aux écrans par contexte : mesuré chez Ramille le 17/09/2026 sur l'export statique lu par
  Playwright, les deux enfants du conteneur en colonne valent `[784, 60]` barre visible et
  `[844, 0]` barre masquée, sur une fenêtre de 844 px. Le seul cas où une bande resterait est un
  écran qui compense à la main avec `useBottomTabBarHeight()` : le vérifier avant de conclure.
  Corollaire d'accessibilité gratuit — `display: none` retire aussi la barre de l'arbre
  d'accessibilité, donc rien n'y reste focalisable.

### 1.8 Hermes peut être construit sans ICU complet

`toLocaleDateString('fr-FR', { month: 'long' })` rend alors un mois **en anglais** — invisible en
CI, visible sur l'appareil. Une liste de douze chaînes tenue à la main, épinglée par un test et
partagée avec le serveur, vaut mieux. Et `new Date('2026-09-01')` est minuit UTC, donc la veille à
l'ouest de Greenwich : lire les **caractères** d'une date-jour, jamais un `Date`.

### 1.9 Dépendances natives, builds et `expo-doctor`

- **Une dépendance native nouvelle impose un build**, et rien dans le code ne le dit. Le quota de
  builds d'un plan gratuit ne se lit qu'en le heurtant (registre d'exploitation §3.3 chez
  Ramille) : au plus un build tous les deux jours, et la vérification web se fait sans build.
- **`expo-doctor` compare aux versions qu'Expo recommande au moment du passage**, et ce jeu-là
  vit chez Expo : la CI peut rougir sans qu'une ligne du dépôt ait bougé, dès qu'Expo publie un
  patch (11/09 et 15/09/2026 chez Ramille). Épingler la version de l'outil n'épingle pas ce qu'il
  attend. L'étape reste bloquante — c'est ce qu'on veut savoir avant un build — et la conduite
  est `npx expo install --fix`, puis rejouer typecheck, lint, tests et export.
- **`app.config.js` étend `app.json`** et n'a qu'un rôle : brancher un fichier fourni par une
  variable d'environnement de type *fichier* (`google-services.json` chez EAS) sans le mettre dans
  le dépôt. Lu par le CLI au build, jamais replié dans le bundle.

### 1.10 Android : App Links et signature

- **Le lien qui ouvre l'app est autorisé par un fichier que le site sert**,
  `/.well-known/assetlinks.json`, et par un `intentFilter` `autoVerify`. **Revendiquer un chemin
  étroit** plutôt que tout le domaine : les pages que la boutique exige atteignables *sans* l'app
  (suppression de compte, pages légales) doivent le rester. Une chaîne de requête ne fait pas
  partie du chemin d'un `intentFilter`.
- **Google Play resigne l'AAB avec sa propre clé** : l'empreinte de production diffère de celle du
  keystore EAS et s'**ajoute** au tableau (qui en accepte plusieurs) à la publication, sans
  retirer la première.

---

## 2. Propre à Ramille

### 2.1 L'export statique et ses gardes

**`public/robots.txt` et `public/sitemap.xml` sont la cinquième garde d'export, et ils
disparaissent exactement comme `assetlinks.json`** — sans erreur de build ni de déploiement.
`scripts/verifier-titres-export.mjs` les vérifie ligne par ligne dans `dist/`, avec trois points
qu'il ne faut pas défaire à moitié : la paire `Disallow: /api/` + `Allow: /api/partage` +
`Allow: /api/share-card` (sans les deux `Allow`, un lien de bilan partagé sort en URL nue sur les
trois réseaux, qui lisent `robots.txt` avant d'aller chercher une page) ; les pages d'application
restent **parcourables** et portent `noindex` — interdire le crawl empêcherait un moteur de lire
ce `noindex` ; et l'**origine canonique** a une source unique, `ORIGINE_CANONIQUE`
(`src/constants/produit.ts`), que les deux fichiers statiques ne peuvent pas importer et que le
script confronte par motif. La page 404 est une page exportée comme les autres : elle a sa ligne
dans `PAGE_TITLES` (`/+not-found`), la surcharge de `TitreDePage` ne valant qu'à l'exécution.

**Une valeur `EXPO_PUBLIC_*` peut disparaître du bundle sans que rien ne bronche.**
`babel-preset-expo` remplace `process.env.EXPO_PUBLIC_X` par sa valeur littérale — **sauf**
quand l'accès est écrit directement comme valeur d'une propriété d'objet dont la clé porte ce
même nom, où il rend `void 0` (vérifié en A/B, `.env` inchangé entre les deux exports). Lire
la variable dans un `const` d'abord, jamais la replier dans une expression. Le typecheck
passe, les tests passent, l'export réussit, et l'app démarre sur une configuration vide :
`scripts/verifier-configuration-export.mjs` garde ce point en CI, même famille que les gardes
`cleanUrls` et titres de page.

**Changer `.env` puis réexporter ne suffit pas à revérifier l'inlining : il faut
`expo export --clear`.** Le cache de transformation de Metro est indexé sur le contenu des
fichiers, pas sur les valeurs `EXPO_PUBLIC_*` : un second export réutilise le `void 0` qu'un
premier export sans variables avait mis en cache, au bit près (même empreinte de bundle). La CI
ne peut pas tomber dans ce piège — elle part d'un checkout neuf — mais
`scripts/verifier-configuration-export.mjs` accuse alors en local un défaut qui n'existe pas, et
on le cherche dans le code.

**Un lien qui doit compter pour un moteur de recherche passe par `Link` d'Expo Router, jamais
par un `onPress`.** `react-native-web` rend un `onPress` sur du texte en `<div>` : cliquable
pour un humain, inexistant pour un crawler. Et il ne suffit pas que l'ancrage soit correct, il
doit se retrouver dans le HTML **statique** — à vérifier dans `dist/*.html` après
`expo export`, même piège silencieux que `cleanUrls`. Seul cas aujourd'hui : le lien vers la
page personnelle de l'éditeur (`EDITOR_CV_URL`) au pied des deux pages légales, qui sont les
seules surfaces publiques du produit (leurs URL sont données à Google Play et à l'écran de
consentement Google). Le sens du lien est délibéré — Ramille vers le CV — et il ne porte
pas de `nofollow`.

### 2.2 Le web : hydratation, thème, `react-native-web`

**Un état qui diffère entre le serveur et le client doit démarrer à la valeur du serveur et
changer après hydratation** — sinon le DOM garde l'attribut `style` du HTML statique pour
toujours. L'hydratation ne vérifie que le texte : elle adopte les attributs tels quels. Une
largeur lue dans `Dimensions` dès le premier rendu client (390) laisse React croire qu'il
tient déjà `width: 390` alors que le HTML dit `0px`, et rien ne le corrige jamais — ni
`onLayout`, ni `key`, ni le compilateur. C'est ce qui a fait échouer la première tentative
du pager d'onboarding (v1-11 §9.10). `useSyncExternalStore` avec un instantané serveur
distinct fait voir le passage à React ; `useWindowDimensions` ne le fait pas.

**Le mode clair est forcé sur web, et ce n'est pas un oubli** (`src/hooks/use-theme.ts`).
`userInterfaceStyle: light` d'`app.json` ne s'applique qu'au natif : sur web, `useColorScheme`
lit `prefers-color-scheme` et rendait `Colors.dark` — la palette que `constants/theme.ts` décrit
lui-même comme provisoire et jamais validée, avec un bouton principal à 3,4:1 (sous le 4,5:1 de
WCAG AA) et une mascotte restée claire sur fond noir. La décision se prend **là**, et le
`ThemeProvider` du layout racine porte la même en dur pour les chromes de navigation : corriger
l'un sans l'autre laisse la moitié de l'écran dans l'autre palette.

**`react-native-web` : un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0`
explicite pour pouvoir rétrécir sous sa largeur intrinsèque** — sinon un texte voisin
(unité, label) peut être partiellement recouvert/coupé. Voir
`src/components/bilan/numeric-field.tsx` et `src/components/auth/text-field.tsx`.

**`Alert.alert(...)` sur web retombe sur `window.alert()`, qui n'invoque pas fiablement
`onPress`** — pour tout flux qui doit exécuter une action après fermeture de l'alerte,
utiliser un état de composant inline (écran à plusieurs états visuels) plutôt qu'un
callback de bouton d'`Alert`. Voir `src/app/connexion/email.tsx` et
`src/app/connexion/retrouver.tsx`.

**Une API de module natif appelée pendant le rendu emporte toute l'app sur web.** Un hook
s'exécute au rendu : une garde `Platform.OS` placée dans l'effet arrive trop tard, et une
exception dans le layout racine fait tomber l'arbre React entier — page blanche sur
**toutes** les routes, pages légales comprises, pendant que le HTML statique est servi en
200 avec son titre. Un hook ne peut pas être appelé conditionnellement ; un composant, si :
c'est le motif de `RetourDeNotification`, monté sous `{estNatif && …}`. La CI l'a laissé
passer en production le 08/09/2026 — `scripts/verifier-rendu-export.mjs` ouvre désormais
cinq routes dans un navigateur après l'export et échoue sur une page vide ou une exception
non rattrapée (les erreurs d'hydratation restent des avertissements). Troisième garde de la
même famille que `cleanUrls` et l'inlining des `EXPO_PUBLIC_*` : ce qui se construit n'est
pas ce qui s'affiche.

**La barre d'onglets est épinglée en `tabBarLabelPosition: 'below-icon'`, et c'est le web qui
l'imposait** (13.7, recette web du 16/09/2026). `OngletIcone` dessine une pastille de 56 × 30 dans
le slot de l'icône : sur un téléphone, le libellé est dessous et la pastille se lit comme
appartenant au couple — c'est le motif Material 3 et c'est le canvas `v1-11-navigation`. Dans un
navigateur de bureau, react-navigation basculait seul en libellés horizontaux et la pastille se
retrouvait **à côté** du libellé. Mesuré sur l'export servi en local : sans la ligne, à 1280 px de
large, le libellé « Plan » passe à 27 px à droite de l'icône, même `y` ; avec, il reste 25 px
en dessous, à 1280 comme à 390. Ce n'était pas une décision d'écran — `BarreOnglets` du design
system est en `flexDirection: 'column'` sans condition. **Et on n'englobe pas l'icône et le
libellé ensemble** : ce serait casser le motif sur la cible réelle, qui est un téléphone Android.

### 2.3 Android : App Links et build natif

**Le lien du rappel ouvre l'app grâce à un fichier servi par le site, pas par l'app.**
`public/.well-known/assetlinks.json` (recopié tel quel dans l'export) autorise nommément
`fr.ramille.app` à revendiquer `https://www.ramille.fr/plan`, déclaré en `intentFilters`
`autoVerify` dans `app.json`. **La revendication est volontairement étroite** : réclamer tout
le domaine ouvrirait aussi `/compte/suppression` et les pages légales dans l'app, alors que
Google Play exige précisément qu'elles restent atteignables **sans** elle. Deux façons de
casser ça en silence — le fichier qui disparaît de l'export, et l'empreinte de signature qui
change : **Google Play resigne l'AAB avec sa propre clé**, donc l'empreinte de production
différera de celle du keystore EAS et devra être **ajoutée** au tableau (qui en accepte
plusieurs) au moment de la publication, sans retirer la première. `scripts/verifier-assetlinks-export.mjs`
garde le reste.

**Une dépendance native nouvelle impose un build**, et il n'y a aucun moyen de s'en rendre
compte depuis le code : `expo-notifications` (v1-12) est arrivée ainsi. Le jeton d'appareil
ne s'enregistre jamais par un `insert` — `register_push_token` le **reprend** à son
propriétaire précédent, ce qu'une policy RLS owner-scoped ne peut pas faire au moment où une
session anonyme devient un compte, et l'oubli serait silencieux : les rappels partiraient
vers un utilisateur fantôme.

### 2.4 Mise en page : le pager de l'onboarding

**Une page d'un pager doit pouvoir défiler, sinon elle coupe — mais `minHeight` a un effet de
bord qu'il faut connaître.** Les quatre pages de `/onboarding` étaient des boîtes à hauteur fixe
égale au viewport : ce qui dépassait était rogné sans un mot, et aucune étape ne peut l'absorber —
elles centrent leur contenu et les hauteurs de ligne ne se compriment pas. Chaque page est donc une
`ScrollView` verticale à `contentContainerStyle: { flexGrow: 1, minHeight: hauteur }` — et
seulement une fois la hauteur **mesurée**, sinon l'instantané serveur dont dépend l'hydratation est
rompu.
**Sous ce `minHeight`, une hauteur n'est plus *définie*** (relevé au rendu le 14/09/2026) : un
enfant en `flex: 1` ne se résout plus sur l'espace restant mais sur sa taille **max-content**. Deux
conséquences, invisibles à la lecture du code et toutes deux corrigées là où elles naissent.
L'illustration de l'étape 1, dont le `viewBox` est carré, réclamait (largeur − 48) px sur tous les
téléphones — d'où un contenu constant à ~890 px et « Découvrir mon impact » 91 px sous le pli à
360 × 640 ; elle est **plafonnée à 30 % de la hauteur de page** (`PART_ILLUSTRATION`), une part et
non un nombre de pixels, sans quoi un grand téléphone garderait une bande vide. Et le `ScrollView`
interne de l'étape 2 s'étirait à ses 745 px de contenu, si bien que la page entière défilait,
**pied compris** : elle est la seule des quatre construite avec un corps qui défile sous un pied
épinglé, donc sa page reçoit une hauteur **définie** (`contenuDePageFixe`) et non un minimum. La
règle générale qui en sort : une page qui gère son propre débordement veut `height`, une page qui
n'en a pas veut `minHeight`. Détail et mesures en §11.13 et §11.14 de `v1-13`.
