# Vercel — conventions et pièges

Ce que Ramille a appris de Vercel, et ce qu'un autre projet (Tour de Growth, le 15/09/2026) a
appris en payant avant nous. La **§1 vaut sur n'importe quel projet Vercel** ; la **§2** porte
les chiffres, les routes et les décisions de Ramille, et ne voyage pas. Chaque règle dit d'où
elle vient ; l'histoire complète est dans `CLAUDE.md` (mécaniques) et dans les documents
`docs/architecture/v1-0N-*.md` qu'elle cite.

> **Quand lire ce fichier** : avant toute fusion sur `main` (chaque fusion de code est un
> déploiement, et un déploiement se paie trente jours ; une fusion de documentation seule est
> sautée, §1.3) · avant de toucher `vercel.json`, `api/`, le script
> `vercel-build` ou `scripts/vercel-ignorer-le-build.sh` · avant d'ajouter une route à l'app ·
> avant d'affirmer quoi que ce soit sur un compteur ou une facture Vercel · pour mesurer le
> poids d'un déploiement.

---

## 1. Ce qui vaut sur n'importe quel projet Vercel

### 1.1 Functions Storage : une somme glissante que rien ne purge

**Functions Storage est une somme glissante sur trente jours.** Chaque déploiement ajoute le
poids de ses fonctions ; il en sort trente jours plus tard, **qu'il ait été supprimé ou non**.

```
Functions Storage = poids des fonctions × déploiements des 30 derniers jours
```

Trois conséquences, apprises dans le mauvais sens par Tour de Growth (13→15/09/2026) et
vérifiées par Antoine auprès de Vercel :

- **Supprimer des déploiements ne fait rien pour ce compteur.** Une politique de rétention agit
  sur autre chose. Écrire un correctif sur cette hypothèse corrige zéro octet.
- **La cadence de fusions est un terme de la facture**, au même titre que le poids du bundle. À
  poids constant, diviser les fusions par deux divise le compteur par deux — c'est presque
  toujours le levier le plus gros et le moins cher. Un projet dont les fonctions pèsent peu peut
  quand même heurter la limite : il suffit de fusionner souvent.
- **Une fusion qui ne touche que la documentation coûte autant qu'une fusion de code**, tant
  qu'un Ignored Build Step ne l'écarte pas (§1.3). Sur Ramille, 13 des 82 fusions des trente jours
  précédant le 15/09/2026 étaient dans ce cas — et 3 des 5 fusions de cette seule journée.
- **Le compteur est celui du compte, pas du projet.** Un tableau de bord qui affiche 9,85 Go sur
  10 additionne tous les projets du compte ; le chiffre par projet est ailleurs sur la même page.
  Lire l'un sans l'autre, c'est raisonner sur le mauvais dénominateur — Ramille a passé une heure
  à chercher un facteur cinq qui était un autre projet (15/09/2026). Demander les deux chiffres.

**Vercel compte le poids d'un bundle une fois par ROUTE, pas une fois par bundle physique.** Un
bundle de 4 Mo partagé par 92 routes est facturé ~368 Mo. Avant de choisir où optimiser, compter
les routes : un gramme retiré du bundle le plus partagé compte N fois, un gramme retiré d'une
fonction mono-route compte une fois. (Ramille a deux fonctions, une route chacune : pas
d'amplification, §2.1.)

**Le coût d'un déploiement se mesure sur un intervalle qui n'en contient QU'UN**, jamais en
divisant l'écart d'une journée par le nombre de fusions. Deux raisons, et la seconde est la
mauvaise : la fenêtre est glissante, donc un intervalle long voit aussi **sortir** de vieux
déploiements, et l'écart net mélange alors les ajouts et les retraits ; et toutes les fusions ne
déploient pas dès qu'un Ignored Build Step existe (§1.3). Un écart mesuré sur un seul déploiement
ne fait ni l'un ni l'autre — et reste un **plancher**, puisqu'un retrait peut toujours s'y cacher.
Corollaire de cadence : **le compteur retarde**, souvent d'une nuit ; on le relit le lendemain, pas
dix minutes après la fusion. C'est ainsi que Ramille a découvert que son coût réel était 10 % plus
élevé que ce que l'export du tableau de bord attribuait à sa fonction (§2.1) — un écart qui n'est
toujours pas expliqué, et qu'on retient tel qu'il est mesuré.

> ⚠️ **Point non réconcilié, à ne pas présenter comme un fait.** Chez Tour de Growth, l'export
> local donnait 428,9 Mo par déploiement, soit 66 Go sur 154 déploiements, quand le compteur
> affichait ~7 Go : Vercel déduplique probablement des bundles identiques. Le **classement
> relatif** des postes est fiable et suffit à décider ; si le chiffre absolu compte pour une
> décision, c'est le tableau de bord qui a raison, jamais le modèle.

### 1.2 Mesurer le poids réel hors ligne

La seule mesure fiable se fait sans rien déployer, avec le CLI :

```bash
# .vercel/project.json peut être fabriqué : l'outil ne le valide pas hors ligne.
# `framework` doit dire ce que dit vercel.json (`null` pour un export statique).
mkdir -p .vercel && printf '%s\n' \
  '{"projectId":"prj_offline","orgId":"team_offline","settings":{"framework":null}}' \
  > .vercel/project.json
npx --yes vercel@59 build --prod --yes
```

Puis, et c'est là que tout le monde se trompe :

1. **`du` sur `.vercel/output/functions` ne mesure rien** quand le framework produit des
   `.func` en **liens symboliques** vers une poignée de bundles physiques (Next.js). Filtrer
   sur « n'est pas un lien » avant de sommer.
2. **Sommer tous les `.func` donne un résultat absurde** pour la même raison — des centaines de
   copies du même bundle.
3. **Ce qu'un `.func` contient dépend du runtime.** Avec Next.js, le `.func` physique ne porte
   presque rien et la vraie liste des fichiers tracés vit dans le `filePathMap` de son
   `.vc-config.json`. Avec `@vercel/node` (une fonction `api/*.ts` hors framework), c'est
   l'inverse, relevé sur Ramille le 15/09/2026 : les fichiers tracés sont **physiquement dans le
   `.func`** (63 fichiers pour `share-card`), et `filePathMap` ne porte que les `includeFiles` de
   `vercel.json`, mappés vers leur source. Une fonction Edge n'a pas de `filePathMap` du tout.

La mesure juste, en une phrase : *pour chaque `.func` non-symlink, sommer les fichiers réels
qu'il contient **et** les fichiers listés dans son `filePathMap`, sans compter deux fois.* Pour le
poids facturé, multiplier ensuite chaque bundle par le nombre de routes qui pointent dessus.

**Et la mesure dépend de l'endroit d'où on la lance, de quelques octets** (relevé le 02/10/2026). Les
sourcemaps du build portent le **chemin absolu** de leur source : mesurer depuis une copie de travail
(`.claude/worktrees/<nom>/`) au lieu de la racine du dépôt ajoute la longueur de ce préfixe une fois
par fichier qui le porte — deux aujourd'hui, la carte de `share-card` et le bundle de `partage`. Ce
jour-là, +52 octets depuis `.claude/worktrees/erreurs/` (26 caractères, deux fois), et `main` mesuré
au même endroit donnait le même contenu. Un écart de quelques dizaines d'octets se compare donc à
`main` mesuré **au même endroit**, avant de chercher une cause dans le code.

**Et le tableau de bord compte l'archive, pas le disque.** L'export d'un déploiement (*Deployment
→ Source/Output*, ou l'export CSV) donne par fonction la taille que Vercel retient ; chez Ramille
c'est 1 595 453 octets pour un bundle qui pèse 4,33 Mo sur disque, soit **37 %** — un `.zip` local
au taux maximal donne 1,37 Mo, donc c'est bien une archive compressée, avec une marge. Le rapport
dépend de ce que le bundle contient (du WASM et du JS se compressent bien, une police moins) :
**la mesure hors ligne donne le classement et l'ordre de grandeur, le tableau de bord donne le
chiffre**, et c'est lui qu'on écrit dans un budget.

**`.vercel/` doit être dans `.gitignore` ET dans les ignores du linter.** Tour de Growth l'avait
oublié : ESLint s'est mis à analyser des bundles minifiés et à rapporter 2 366 problèmes. Le
signe qui ne trompe pas, ce sont des numéros de colonne à quatre ou cinq chiffres (`1:10753`).
Règle de diagnostic générale : quand un compteur d'outil explose après une manipulation, regarder
d'abord **quels fichiers** sont concernés, pas les règles.

**Et `vercel build` laisse des traces** : il a lancé un `npm install` dans `api/` et y a écrit un
`package-lock.json` que le dépôt ne veut pas. Vérifier `git status` après une mesure.

### 1.3 `ignoreCommand` — sémantique exacte, vérifiée à la source

La page de référence de `vercel.json` ne dit que « code 0 ignores the build, code 1 continues
it », ce qui est insuffisant pour écrire la commande en sécurité. L'article du centre d'aide
tranche : « If the command returns '0', the build will be skipped. If, however, a code **'1' or
greater** is returned, then a new deployment will be built. »

**`exit 0` est donc la seule valeur qui saute.** Un crash du script (`127`), une erreur git
(`128`), une variable non définie : tout est ≥ 1, donc tout construit. Le mode d'échec est sûr
par construction — mais l'écrire en sachant *pourquoi* c'est sûr vaut mieux que de l'espérer.

**Règle non négociable : en cas de doute, on construit.** Un déploiement sauté à tort veut dire
qu'un correctif ne part pas en production, ce qui est bien pire que le coût économisé. La forme
qui en découle : ne sortir en 0 que sur une détermination **positive et vérifiée**, et en 1
partout ailleurs, chemin d'erreur compris.

Quatre faits qui changent l'écriture de la commande :

- **`VERCEL_GIT_PREVIOUS_SHA` vaut mieux que `HEAD^`.** C'est le SHA du dernier déploiement
  **réussi**, exposé seulement quand un Ignored Build Step est configuré, et connu pour être
  parfois vide (prévoir le repli). L'écart compte dans un cas précis : une fusion de code qui
  **échoue au build**, suivie d'une fusion de documentation — `HEAD^..HEAD` ne voit que la
  documentation, saute, et **le code de la fusion échouée ne part jamais**.
- **Le clone est superficiel (`--depth=10`).** Une base plus ancienne que dix commits n'y est
  pas, `git diff` échoue, donc le build se déclenche. Sûr, mais à savoir avant de déboguer : après
  dix fusions sautées d'affilée, la onzième construit quoi qu'il arrive.
- **Un build sauté ne construit rien** — « No build minutes consumed, no new production
  deployment created ». Donc aucune fonction, donc rien au Functions Storage : l'économie est
  réelle. Ne pas confondre avec un build **annulé en cours**, qui a déjà exécuté la commande de
  build et compte, lui. **Mais il laisse une trace** (relevé le 03/10/2026 sur l'API) : chaque
  build sauté y figure comme un déploiement à l'état `CANCELED` — cinq fusions de Ramille du
  02/10/2026, toutes de documentation (registre, recette, fiche Play).
  Pour le plafond quotidien de déploiements, c'est peut-être la différence qui compte (§1.9) ; une
  branche que `git.deploymentEnabled` coupe, elle, ne laisse rien (§1.4).
- **La liste blanche se dit en chemins de racine, jamais en `**/*.md`.** Un `.md` sous `src/`
  peut être importé par l'app ; seul le `.md` de la racine est certainement inerte. Et tout ce
  qu'on *croit* inerte sans l'avoir vérifié (`vercel.json` lui-même, `package.json`,
  `.gitignore`) reste hors de la liste : ça construit.

**Un `vercel.json` invalide fait échouer TOUS les déploiements, production comprise.** Toute
évolution de ce fichier passe par un test unitaire qui le parse et vérifie qu'une branche de
production reste du côté « construire ». Sur Ramille, c'est `scripts/vercel-ignorer-le-build.test.ts`,
qui joue aussi le script sur de vrais dépôts git fabriqués — et dont la non-vacuité a été
mesurée en cassant le script six fois (§2.2).

### 1.4 Les prévisualisations coûtent, et `git.deploymentEnabled` a trois pièges

Chaque push de branche déclenche un déploiement de prévisualisation, donc des fonctions, donc du
Functions Storage. Si la vérification se fait localement contre un export de production puis en
CI, ces prévisualisations ne servent à rien. Deux façons de les couper :

```json
{ "git": { "deploymentEnabled": { "**": false, "main": true } } }
```

ou, dans l'`ignoreCommand`, sauter quand `VERCEL_ENV` vaut exactement `preview` — Ramille fait
les deux, la seconde en ceinture sous les bretelles. **Corollaire utile : un push de branche ne
construit plus rien.** Travailler et pousser sur une branche est gratuit ; seule la fusion coûte.

Trois pièges avec `deploymentEnabled`, et **le premier s'est refermé sur nous le jour où on l'a
écrit** (15/09/2026, PR #185) :

- **C'est `"**"` et jamais `"*"`** : Vercel départage les branches en **minimatch**, où `*` ne
  traverse pas les `/`. Des branches nommées `claude/…` passent au travers de `"*": false`, et la
  prévisualisation part quand même — constaté sur la PR qui posait le réglage.
- **La branche de production doit être nommée explicitement** : Vercel déploie dès qu'une règle
  correspondante vaut `true`, donc retirer `main` en croyant simplifier coupe la production.
- **Le réglage vit dans le dépôt, donc il suit la branche** : une branche partie d'un commit
  antérieur au réglage déploie encore.

### 1.5 Un export statique a besoin de `cleanUrls`, et ce n'est pas cosmétique

Un export statique produit deux formes de page : un **répertoire** `plan/index.html` pour une
route qui a des enfants, un **fichier plat** `suivi.html` sinon (Expo Router fait exactement
ça). Sans `cleanUrls: true`, Vercel sert les premières et répond 404 sur les secondes — l'export
local contient bien les fichiers, les routes en répertoire marchent, et rien ne le signale. Sur
Ramille, `/suivi`, `/confidentialite`, `/feedback` et la restitution `/bilan/resultat` ont été
inaccessibles en production de cette façon. **Toute nouvelle route sans enfants tombe dans ce
cas** ; la valeur est épinglée deux fois, par `scripts/verifier-rendu-export.mjs` en CI (qui parse
`vercel.json` et vérifie aussi que chaque `includeFiles` existe) et par
`scripts/vercel-ignorer-le-build.test.ts`, parce que la retirer remettrait la moitié de l'app en 404
en silence. Piège de relevé, subi en écrivant cette ligne : chercher `cleanUrls` dans **un** garde
(`verifier-titres-export.mjs`) ne trouve qu'un commentaire, et la conclusion « aucun garde ne la
lit » était fausse — un relevé qui ne trouve rien doit d'abord prouver qu'il a regardé partout.

**Et la page d'une adresse inconnue s'appelle `404.html`, que l'export ne produit pas.** Expo Router
exporte sa page introuvable sous `+not-found.html` ; sur une sortie statique, Vercel ne sert que
`404.html`, et répond sinon par sa propre page, brute et en anglais (« The page could not be found —
NOT_FOUND »). Chez Ramille, constaté en production à la revue finale du 04/10/2026 : un ancien lien de
partage ou une adresse mal recopiée sortait du produit, dans une autre langue.
`scripts/poser-la-page-introuvable.mjs` copie la page dans `vercel-build`, la CI fait de même juste
après son export, et `verifier-titres-export.mjs` exige `404.html`, identique à `+not-found.html` ;
`scripts/vercel-csp.test.ts` épingle la commande de `vercel-build`, que la CI ne lance pas.

### 1.6 Une Function en runtime Node.js a une checklist, et l'échec est muet

Une Vercel Function échoue avec un `FUNCTION_INVOCATION_FAILED` ou `_TIMEOUT` générique, sans
détail côté client : le seul endroit qui dit pourquoi est *Project → Logs*. La checklist qui
évite d'y aller, chaque point ayant coûté un cycle de déploiement à Ramille (`v1-06` §3) :

- le dossier de la fonction porte son `package.json` en `"type": "module"` ;
- **tout asset chargé par une dépendance transitive** (un `.wasm`, une police) passe par
  `functions["<chemin>"].includeFiles` dans `vercel.json`, sinon le traceur ne l'embarque pas ;
- `request.url` est **relatif** : le parser avec une base factice (`new URL(url, 'http://x')`) ;
- l'export est **nommé** (`GET`, `POST`…), jamais `export default` ;
- `maxDuration` se surveille si le démarrage à froid est lourd (un rendu d'image à partir de
  WASM l'est).

**Et depuis le 20/09/2026, les points 1, 3 et 4 s'éprouvent avant de déployer** :
`scripts/verifier-api.mjs` importe les deux fonctions sous Node 22 (type stripping natif, le même
TypeScript que Vercel compile) et les appelle en CI — la carte doit rendre par son vrai chemin, pas
par le repli `no-store` qui est la seule trace d'un satori, d'un resvg ou d'une police en panne.

**Le troisième point a failli être affirmé sans être gardé**, et c'est la contre-lecture du soir
même qui l'a rattrapé : tous les appels passaient une URL **absolue**, donc ils traversaient tout
aussi bien un `new URL(request.url)` nu. La carte est donc rejouée une seconde fois sur un objet
`{ url: '/api/share-card?…' }` — un chemin, comme Vercel l'envoie, et une simulation plus fidèle
qu'une `Request`, que Node refuse de construire sur un relatif. **Et une troisième fois sans aucun
paramètre**, parce que la contre-lecture du lendemain a montré que les deux premières ne suffisaient
pas : une analyse qui perd la chaîne de requête la perd sur les **deux** appels à la fois, les deux
images restent donc identiques, le statut vaut 200, le cache reste `public` — et la carte ne porte
plus le chiffre de personne. C'est le rendu à vide qui tranche.

**Ce que la garde ne voit pas, ce sont les points 2 et 5**, et les nommer vaut mieux que de les
laisser dans un « tout sauf » — cette phrase-là en oubliait un :

- `includeFiles` : en local, `hb.wasm` est lu depuis `node_modules` sans traçage, donc une
  dépendance nouvelle qui charge un asset se vérifie encore au premier déploiement, dans
  *Project → Logs* ;
- `maxDuration` : le script rend, mesure l'image et s'arrête — il ne chronomètre rien. Un démarrage
  à froid qui passerait la limite de la fonction laisserait cette CI entièrement verte.

### 1.7 Ce qui pèse dans une fonction

- Chez Tour de Growth : **`sharp` (~48 Mo)** est tracé dès que `next/image` *pourrait* servir, et
  **`@vercel/og` embarque deux rendus** (Node et Edge). Dans les deux cas, le remède est une
  exclusion de traçage **plus un test** qui affirme que l'usage justifiant l'exclusion n'existe
  pas dans les sources — sinon un futur import réintroduit les octets sans bruit.
- Chez Ramille : le rendu d'image de partage porte **un binaire WASM de 2,5 Mo** (`@resvg`), soit
  57 % du poids, et il est irréductible tant que l'image se rend côté serveur. Le levier n'est
  donc pas le bundle, c'est la cadence (§1.1) — et depuis que le budget est levé, il n'y a plus
  de levier à tirer, seulement un écart à surveiller (§2.3).

### 1.8 Ce que l'outillage d'une session agent ne voit pas

- **L'outil MCP Vercel d'une session ne voit pas forcément le compte où vivent les projets** — sur
  Ramille, `list_deployments` a répondu 403 le 15/09/2026, puis répond depuis le 01/10/2026 — la liste
  des déploiements et leur commit, pas l'usage, et pas les journaux de build
  (`list_deployment_events` répond 404 sur un déploiement que `list_deployments` vient de lister,
  relevé le 03/10/2026) ; chez Tour de Growth, l'unique équipe visible est restée
  vide. Conséquence : **l'agent ne peut pas lire les compteurs de
  consommation**, et la configuration se fait à la main dans le tableau de bord. Règle : *quand
  une ressource que je ne peux pas lire est en jeu, je demande le chiffre avant d'agir, pas
  après.*
- **La région des fonctions est un réglage de projet**, pas de code. Une région par défaut aux
  États-Unis avec une base en Europe ajoute une seconde et plus par requête ; se vérifie avec
  `x-vercel-id` sur une vraie réponse.

### 1.9 Le nombre de déploiements par jour a un plafond, et c'est celui du compte

**Le 02/10/2026 à 23 h 17 UTC, Vercel a refusé le déploiement d'une fusion sur `main`** : aucun
déploiement créé, la production restée sur le précédent, et pour seule trace un statut GitHub
`Vercel` en échec sur le commit, « Deployment rate limited — retry in 24 hours ». Rien ne réessaie :
le commit refusé n'est déployé que par le suivant qui passe, ou par un redéploiement à la main.
Les deux fusions suivantes, à 23 h 31 et 23 h 58, ont été refusées de la même façon ; la troisième,
à 0 h 51 UTC, est passée et a emporté les trois — une heure et demie après le premier refus, donc le
plafond se libère au fil de l'eau, quoi qu'en dise le message, et non vingt-quatre heures plus tard.

**Le plafond est celui du compte, partagé entre ses projets.** Sur les vingt-quatre heures
précédentes, le compte portait 78 déploiements : 14 de Ramille, dont 5 fusions de documentation
sautées par l'Ignored Build Step et listées comme annulées (§1.3), et 64 d'un autre projet, dont 48
prévisualisations de branches à l'état annulé. Le chiffre exact du plafond ne se lit pas d'ici (§1.8), et ces
78 ne disent pas lequel des enregistrements il compte ; ce qu'on sait, c'est qu'un projet bavard
en prévisualisations bloque la production des autres. La parade est celle du §1.4 :
`git.deploymentEnabled`, qui ne crée rien, plutôt qu'un Ignored Build Step, qui crée un annulé.

**Ce qu'il faut regarder après une fusion qui doit partir** : le statut `Vercel` du commit sur
GitHub, et l'en-tête ou le contenu servi — pas la CI, qui est verte quoi qu'il arrive.

---

## 2. Propre à Ramille

*Cette section ne voyage pas — ce sont nos chiffres, à un instant donné.*

### 2.1 Ce que pèse un déploiement

| | Valeur |
|---|---|
| Fonctions physiques par déploiement | 2 — `api/share-card` (Node.js, 63 fichiers) et `api/partage` (Edge), une route chacune : pas d'amplification (§1.1) |
| Poids de `share-card` sur disque | 3,95 Mo + 0,38 Mo de `hb.wasm` via `includeFiles` = 4,33 Mo (15/09/2026) |
| Poids de `share-card` **retenu par Vercel** | **1 595 453 octets ≈ 1,6 Mo** (export du tableau de bord, 15/09/2026 — l'archive compressée, 37 % du disque) |
| Poids de `partage` | 0,03 Mo sur disque ; l'export du tableau de bord ne lui donne aucune taille (Edge) |
| **Coût d'un déploiement sur le compteur** | **1,76 Mo**, mesuré deux fois le 16/09/2026 sur des intervalles qui n'en contenaient qu'un (PR #191 et #201) — et c'est un **plancher** (§1.1). Deux fusions « doc seule » entre les deux n'ont **rien** ajouté : l'Ignored Build Step mesuré sur le compteur lui-même |
| **Mesure hors ligne de référence** (§1.2, §2.3 règle de mesure) | **4 378 974 octets (4,18 Mio)** le 06/10/2026 : +12 549 sur les 4 366 425 du 29/09, déjà dans `main` et identiques fichier à fichier sur la branche des points d'écran de la seconde passe de sécurité ; l'écart tient au code entré dans `api/` entre-temps (les textes du 02/10, PR #316, puis la liste fermée de `poste`, PR #367 : +145 lignes de source), sans dépendance nouvelle |

**L'écart entre l'export (1,6 Mo) et le compteur (1,76 Mo) n'est pas expliqué, et on ne l'explique
pas à la place de la mesure** : ni 1,5955 Mo décimaux ni 1,5216 Mio ne font 1,76, et `partage`
n'a aucune taille dans l'export. Ce qui est mesuré, c'est l'écart du compteur.

Répartition du poids de `share-card` : `@resvg/resvg-wasm` 2,48 Mo (57 %), `hb.wasm` 0,38,
`@shuding/opentype.js` 0,37, `satori` 0,36, `fflate` 0,17, `linebreak` 0,14, les deux polices
Spline Sans 0,11, `harfbuzzjs` (JS) 0,08, `react` 0,06 ; le reste sous 0,05.

> Tour de Growth avait relevé un compteur proche de sa mesure disque (47 Mo affichés pour 43,5
> mesurés) ; chez Ramille le rapport est de 37 %. Les deux sont vrais : un bundle Next.js est du
> JavaScript déjà minifié qui se compresse peu, le nôtre est un WASM de 2,5 Mo qui se compresse
> bien. **Le tableau de bord a raison**, et la mesure hors ligne sert au classement (§1.2).

Les relevés du compteur du compte (9,85 Go sur 10 le 15/09/2026), le budget de 150 Mo fixé pour
le 15 au 25/09 et sa consommation jour par jour vivaient ici ; ils sont partis le 01/10/2026, le
budget étant levé depuis le 25/09 (§2.3). Ce qu'ils ont appris de portable — le compteur est celui
du **compte**, un coût se mesure sur un intervalle qui ne contient qu'un déploiement, le compteur
retarde d'une nuit — est en §1.1.

### 2.2 Décisions prises, à ne pas rouvrir sans raison

- **Plus de prévisualisation** depuis le 15/09/2026 (PR #185, `git.deploymentEnabled`) : la
  vérification visuelle du web se fait par `expo export --platform web` puis Playwright sur
  `dist/`, ce que font déjà les cinq gardes d'export en CI — aucune n'a jamais interrogé Vercel.
- **Les fusions « doc seule » ne déploient plus** (`ignoreCommand` →
  `scripts/vercel-ignorer-le-build.sh`). Liste blanche, relevée contre ce que lisent
  `expo export --platform web` et les deux fonctions : `docs/`, `.github/`, `supabase/`,
  `.claude/`, `.design-sync/`, `.vscode/`, `scripts/`, `LICENSE` et les `.md` de la racine. Tout le
  reste construit, `vercel.json` et `package.json` compris — **et, depuis le 04/10/2026, les trois
  scripts que `vercel-build` lance**, `poser-la-page-introuvable.mjs`,
  `verifier-origine-supabase-de-la-csp.mjs` et `verifier-cle-turnstile-du-bundle.mjs`, qui passent
  avant `scripts/*` : la liste blanche avait
  été relevée quand le build n'en lisait aucun, et une fusion qui n'aurait touché qu'eux aurait été
  sautée (contre-lecture de la revue finale avant la production). Base de comparaison :
  `VERCEL_GIT_PREVIOUS_SHA`, repli `HEAD^`, `exit 1` sur tout chemin d'erreur, et une
  prévisualisation (`VERCEL_ENV=preview`) ne construit jamais. **Non-vacuité mesurée** en cassant
  le script six fois : chaque mutation fait tomber entre un et quatre tests, jamais zéro (le
  détail est en tête de `scripts/vercel-ignorer-le-build.test.ts`).
- **Le poids de `share-card` n'est pas optimisé.** Le WASM de rendu est 57 % du poids et
  irréductible ; les 43 % restants valent moins de 2 Mo. Ce qui compte, c'est le nombre de
  déploiements.
- **`maxDuration: 30` sur `share-card`** — un rendu d'image WASM au démarrage à froid dépasse
  les 10 s par défaut (`v1-06` §3).
- **`framework: null`** — l'export d'Expo est statique, la commande de build est
  `npm run vercel-build` et la sortie `dist/`.
- **La `Content-Security-Policy` est appliquée** — fusionnée le 02/10/2026, en production depuis le
  03/10/2026 à 2 h 51 (heure de Paris), le déploiement de sa fusion ayant été refusé (§1.9) —, et stricte : les scripts du
  site et une seule empreinte, celle du script d'hydratation qu'Expo Router écrit dans chaque page
  (ni `'unsafe-inline'` ni `'unsafe-eval'`), plus, depuis le 04/10/2026, le seul hôte du captcha
  Turnstile, `https://challenges.cloudflare.com`, en script et en cadre (`frame-src`) ; les styles écrits en dur, dont react-native-web a
  besoin ; les polices et images du site ; un seul projet Supabase, nommé. Elle était en
  `Report-Only` sans collecteur depuis le 20/09, donc elle ne rapportait à personne (`v1-27` §12.3).
  Elle a été mesurée avant d'être appliquée : injectée en rapport seul sur les dix-neuf routes de la
  production, les requêtes vers Supabase coupées pour ne rien écrire — donc chaque écran dans son
  état sans réseau —, aucune infraction, et une politique volontairement trop étroite en relevait des
  dizaines. **Trois choses à savoir avant d'y toucher.** Les gardes navigateur de la CI la servent
  appliquée, l'origine Supabase remplacée par celle de leur export, et échouent à la première
  infraction (`TESTING-GARDES.md` §2.16) : une origine ou un script qui manque se voit en CI, écrans
  avec données compris, et non en production — **sauf Turnstile**, que la CI ne charge jamais faute
  de clé de site : sa place dans la politique ne se voit qu'en production, ou à la main avec la clé de
  test publique de Cloudflare (registre d'exploitation §3.11). Une **montée d'Expo** peut changer le script
  d'hydratation : `verifier-rendu-export.mjs` donne alors l'empreinte à recopier dans `script-src`
  — sans elle, l'app rend sans s'hydrater, mesuré le 02/10/2026. Et le **projet Supabase est écrit
  en dur**, la seule valeur qu'aucune garde ne peut voir : `vercel-build` lance après l'export
  `scripts/verifier-origine-supabase-de-la-csp.mjs`, qui fait échouer un build de production dont
  `EXPO_PUBLIC_SUPABASE_URL` n'est pas l'origine de `connect-src` — le déploiement précédent reste
  alors en ligne. Un changement de projet impose donc de changer les deux ensemble. **Il est bien
  bloquant chez Vercel** : le journal d'un build de production qui le porte dit « build de
  production, contrôle bloquant » (relevé le 03/10/2026 par la personne qui pilote — l'outil MCP
  d'une session ne lit pas les journaux de build, §1.8), donc `VERCEL_ENV` est exposée au build.
  Vérifiée en production le même jour : l'en-tête servi est celui de `vercel.json`, et les
  dix-neuf routes montent sans une infraction. **Depuis le 04/10/2026, `vercel-build` lance aussi
  `scripts/verifier-cle-turnstile-du-bundle.mjs`**, sur le même modèle : un build de production sans
  la clé de site du captcha, ou sans elle dans le bundle, échoue, et le déploiement précédent reste en
  ligne. Son premier passage en production se relit dans le journal du build, comme celui-ci.

### 2.3 La convention de fusion : on fusionne quand on veut, on mesure chaque déploiement

**Depuis le 25/09/2026, il n'y a plus de budget.** Le compteur a été remis à zéro plus tôt que
prévu, et la consigne d'Antoine est mot pour mot : *« Plus besoin de s'inquiéter pour Vercel, ça a
été reset plus tôt que prévu, tu peux merger quand tu veux. Continue simplement de regarder combien
ça doit déployer pour vérifier qu'il n'y ait pas une hausse soudaine, il faudrait alors
l'expliquer. »* Ce qui reste :

1. **Avant chaque fusion de code, mesurer ce que le déploiement va ajouter** — `vercel build`, puis
   la somme des `.func` selon la recette de §1.2 — et **le comparer au relevé précédent** (§2.1).
   Demandé le 21/09/2026, et la demande dit exactement à quoi ça sert : *« juste pour vérifier que
   tu n'as pas fait de bêtise et que le chiffre n'augmente pas soudainement sans qu'on s'en rende
   compte »*. Ce n'est donc **pas** une remesure du coût unitaire — il est connu, il a été mesuré
   deux fois, et le remesurer quinze fois est précisément ce qui a été reproché le même jour. C'est
   une **garde de non-régression** : le chiffre attendu est stable — le relevé de référence est en
   §2.1, et c'est là seulement qu'il se met à jour —, donc ce qu'on cherche est l'**écart**, pas la
   valeur. **Un écart s'explique dans la PR avant de
   fusionner** : un saut veut dire qu'une dépendance est entrée dans `api/`, et c'est le seul moment
   où on peut le voir avant de le payer trente jours. Deux traces à nettoyer après coup, sans quoi
   elles partent dans la PR : `.vercel/` (ignoré par git, mais présent) et `api/package-lock.json`,
   que `vercel build` écrit et que le dépôt ne veut pas (§1.2). Un `git status` après la mesure, à
   chaque fois.
2. **Une fusion de documentation part seule et doit être sautée** (§1.3) : elle ne coûte rien, et
   chacune vérifie que le script fait ce qu'il dit. Elle ne demande pas de mesure.
3. **Une PR par vague plutôt qu'une par chantier** reste une bonne pratique — une vérification
   complète, un push, une fusion —, mais n'est plus une contrainte.

**Ce que la fenêtre du 15 au 25/09/2026 a appris**, et qui reste vrai le jour où un budget
reviendrait : le 15/09, cinq fusions dans la journée, dont trois qui ne touchaient que de la
documentation — le motif exact contre lequel Tour de Growth avait écrit sa règle, et que j'ai
reproduit avant de la lire ; et une marge qui s'élargit parce qu'un **autre** projet du compte
cesse de déployer n'est pas acquise, elle est prêtée — elle se referme à son premier déploiement.
Pendant la fenêtre, la règle était aussi de demander le relevé du tableau de bord avant la première
fusion d'une session (l'agent ne peut pas le lire, §1.8) et de s'en tenir à deux fusions de code par
jour ; les deux sont tombées le 25/09/2026.

### 2.4 Ce qu'il reste à vérifier sur le tableau de bord

- **`VERCEL_GIT_PREVIOUS_SHA` est-il exposé ?** Le script écrit « repli sur HEAD^ » quand il ne
  l'est pas. Si cette ligne apparaît à chaque fois, le trou du build échoué (§1.3) est ouvert et
  il faut le savoir. (L'autre vérification de cette liste — qu'une fusion « doc seule » soit
  sautée sur le compteur et pas seulement dans le journal — est faite depuis le 16/09/2026, §2.1.)
