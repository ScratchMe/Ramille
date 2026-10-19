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
> poids d'un déploiement · avant de poser un `Cache-Control` sur une réponse de fonction ou sur
> un fichier statique · avant d'ajouter un fichier à `api/`.

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
par fichier qui le porte — quatre aujourd'hui : la carte de chaque fonction, et celle du module
commun copié dans chacune. Ce jour-là, +52 octets depuis `.claude/worktrees/erreurs/` (26 caractères,
deux fois), et `main` mesuré au même endroit donnait le même contenu. Un écart de quelques dizaines
d'octets se compare donc à `main` mesuré **au même endroit** — ou se ramène à une racine de référence
(`/home/user/Ramille`, 18 caractères) en retirant, par occurrence du chemin dans les fichiers du
`.func`, l'excédent de longueur —, avant de chercher une cause dans le code.

**Et depuis une copie de travail, `node_modules` ne doit pas être un lien symbolique.** Celle d'un
sous-agent en porte un (`scripts/preparer-un-worktree.mjs`) : `vercel build` écrit alors
`"node_modules": "node_modules"` dans le `filePathMap` de `share-card` au lieu de copier les fichiers
tracés dans le `.func`, et la somme ne dit plus rien. On mesure dans un projet minimal — `api/`,
`vercel.json` dont la `buildCommand` est un `echo`, `.vercel/project.json` avec
`"installCommand":"true"` pour que rien ne touche à `node_modules`, et les seules dépendances d'`api/`
(`react`, `satori`, `@resvg/resvg-wasm`, `harfbuzzjs`, leurs dépendances) copiées en vrais dossiers.
Relevé le 18/10/2026 : sur l'arbre d'avant le module commun, cette méthode rend les 4 378 974 octets du
06/10/2026 **à l'octet**, une fois ramenée à la racine de référence.

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
  WASM l'est) ;
- **un module commun à deux fonctions** porte un `_` en tête de son nom — Vercel fait une fonction de
  chaque autre fichier de `api/`, donc une route publique et un déploiement de plus —, et **chaque
  import relatif se termine par `.js`** : le compilateur de Vercel ne réécrit pas les spécificateurs, un
  import en `.ts` partirait tel quel dans un déploiement où seul le `.js` compilé existe, et un import
  sans extension n'est pas résolu par Node en ESM. TypeScript, lui, résout un import en `.js` vers le
  `.ts` voisin. Les deux se jugent sur les sources (`scripts/verifier-api.mjs`), parce que Node exécute
  un `.ts` sous son vrai nom et ne verrait ni l'un ni l'autre.

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
  à froid qui passerait la limite de la fonction laisserait cette CI entièrement verte ;
- **le module commun, côté Edge** : `vercel build` copie bien la version compilée du module à côté de
  celle de la page dans le `.func`, et la documentation dit que l'Edge regroupe en un seul fichier ce que
  l'entrée importe (`.js`, `.json`, `.wasm`) ; mais ce regroupement se fait au déploiement. Le côté
  Node, lui, a été joué : le `.func` construit, importé sous Node dans le même répertoire que Lambda
  (cwd = le `.func`, `hb.wasm` posé comme `filePathMap` le demande), rend la carte (18/10/2026) ;
- **la chaîne de requête, de bout en bout** : la plateforme la décode entre le CDN et la fonction —
  c'est arrivé le 19/10/2026, où la forme canonique, jugée sur la chaîne brute, a fait rediriger vers
  elle-même toute adresse qui porte un poste (§1.10, §2.2). Elle se juge désormais sans l'encodage, et
  `verifier-api.mjs` (5b′) comme Jest jouent les écritures que la plateforme peut passer. Ce qui reste
  invisible hors d'un déploiement, c'est toute **autre** réécriture de la chaîne (l'ordre, un `&` ou
  un `?` de trop) : seuls la sonde et un `curl -I` sur l'adresse canonique, qui doit répondre 200 et
  non 308, la voient.

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

### 1.10 Ce que le CDN garde d'une réponse de fonction

**Une réponse de fonction n'entre dans le cache du CDN que si son `Cache-Control` porte `s-maxage`**
(seul, ou avec `stale-while-revalidate` et `stale-if-error`). `max-age` seul ne parle qu'au
navigateur : une fonction qui n'écrit que `public, max-age=31536000` recalcule chaque requête de
chaque visiteur, et une fonction qui n'écrit rien sort `public, max-age=0, must-revalidate` — ce que le
CDN lit comme « ne pas garder ». Quand `Cache-Control` est le seul en-tête de cache, le CDN consomme
`s-maxage` et `stale-while-revalidate` et ne les transmet pas au navigateur ; `CDN-Cache-Control` et
`Vercel-CDN-Cache-Control` règlent le CDN seul.

- **La clé est la méthode, l'URL complète (chaîne de requête comprise), l'hôte, le schéma et le
  déploiement.** Un déploiement neuf repart d'un cache vide : une durée longue ne fige donc rien d'une
  version à l'autre, et un cache ne soulage un déploiement qu'après la première requête de chaque
  adresse. Le cache est aussi segmenté par région.
- **Seuls 200, 404, 410, 301, 302, 307 et 308 se gardent** — jamais un 400 —, et jamais une réponse
  `private`, `no-cache`, `no-store`, avec `Set-Cookie` ou `Vary: Cookie`.
- **Un repli ne se garde jamais** : la réponse neutre servie à la place d'une panne passagère part en
  `no-store`, sans quoi la panne se figerait sur son adresse après avoir cessé.
- **Toute forme équivalente d'une adresse est une entrée de cache neuve**, et c'est une faille de
  coût quand la réponse se paie : un paramètre en plus, l'ordre, un zéro de tête, un texte derrière
  un nombre que `parseFloat` lit quand même. Le pare-feu de la plateforme compte des
  requêtes, pas des clés de cache. Le cache seul n'y répond pas ; ce qui y répond est une **forme
  canonique** jugée avant tout travail coûteux : l'adresse canonique est servie, une variante lisible
  est redirigée (308, cacheable) vers elle, une adresse sans sens répond 400 — **sauf sur une page
  qu'une personne ouvre depuis un lien**, où le paramètre sans sens s'ignore comme un paramètre
  inconnu : un 400 ne se garde pas au CDN, donc il ne protège pas mieux qu'un 308, et il ferme le
  chemin à qui a reçu un lien abîmé.
- **L'encodage, lui, n'est pas une forme : la plateforme décode la chaîne de requête avant d'appeler
  la fonction, et son cache confond les encodages d'une même adresse.** Mesuré en production le
  19/10/2026, chaque fois par un premier appel en `MISS` puis l'autre écriture en `HIT` : `+` et `%20`,
  `(` et `%28`, `/` et `%2F`, `0` et `%30`, l'hexadécimal en minuscules et en majuscules — et même `&&`
  et `&`, `??` et `?`. Une espace, elle, se lit `%20` dans `new URL(request.url).search`, qu'on l'ait
  envoyée en `+` ou en `%20`. Une
  forme canonique jugée au caractère près redirige donc vers elle-même toute adresse qui contient une
  espace, en boucle, sans que rien ne le montre en local : la fonction y reçoit la chaîne telle qu'on
  l'a écrite. Elle se juge sur la chaîne réécrite dans un encodage fixe, segment par segment, jamais au
  caractère près — et c'est une sonde qui appelle la vraie adresse après le déploiement qui l'attrape.

### 1.11 Les fichiers hachés d'un export statique

Vercel sert un fichier statique en `public, max-age=0, must-revalidate` : le navigateur le revalide à
chaque visite. Un nom qui porte le hachage du contenu autorise `public, max-age=31536000, immutable`,
et **seulement lui** — sur un nom qui ne change pas avec le fichier, les visiteurs garderaient un an
l'ancien code après un déploiement.

- **Une règle `headers` par famille de noms, dont la `source` exige le hachage dans le nom**, plutôt
  qu'un dossier entier : `/assets/(.*)` rendrait immuable le premier fichier sans hachage qui y
  entrerait. Dans une `source` (path-to-regexp), un groupe `( … )` est une expression régulière, et
  Vercel le compile en `^/assets(?:/(…))$` — lu dans la configuration que `vercel build` écrit sous `.vercel/output`, d'un build
  hors ligne.
- **Le hachage se vérifie sur l'export, pas sur la foi du nom.** Chez Expo/Metro, le bundle et la
  feuille de style portent le md5 de leur contenu ; une ressource à une échelle aussi ; les ressources
  à plusieurs échelles (`icone.<h>.png`, `icone.<h>@2x.png`) partagent le hachage du **jeu**, qui n'est
  le md5 d'aucun des fichiers.
- **Une règle de plus dans `vercel.json` est une règle de plus à reproduire** pour tout script qui sert
  l'export comme Vercel : ici `scripts/servir-export.mjs` (§2.2).

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
| **Mesure hors ligne de référence** (§1.2, §2.3 règle de mesure) | **4 421 271 octets (4,22 Mio)** le 19/10/2026, ramenée à la racine de référence et identique sur `main` après la correction des liens de partage qui se redirigeaient vers eux-mêmes (#379) et sur les six correctifs d'Expo (#381) : **+8 975** sur les 4 412 296 du 18/10/2026, et rien d'autre que le code d'`api/` — surtout la carte du module commun (+4 335 octets, copiée dans chacune des deux fonctions), le module et les deux fonctions à quelques centaines d'octets près. Les fichiers tracés dans `node_modules` sont les mêmes (58), aucune dépendance nouvelle, toujours deux fonctions. Le relevé du 18/10/2026 venait de +33 322 sur les 4 378 974 du 06/10/2026 : le module commun d'`api/`, copié dans chacune des deux fonctions, moins les copies que `partage` et `share-card` y ont perdues |

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
- **`api/_partage-commun.ts` porte ce que la page et la carte lisent d'une adresse** : la liste fermée
  de `poste`, la borne du total, la règle des kilos sous la tonne, la lecture des paramètres. Il était
  recopié dans chaque fonction, avec un test qui exigeait les deux copies identiques, par crainte du
  « chemin de compilation que rien ne rejoue » (§1.6). La crainte est levée pour ce qu'on peut jouer :
  sous `_`, `vercel build` (CLI 59.26.0) n'en fait pas une fonction et le copie dans les deux `.func` ;
  les imports en `.js` y restent `.js` ; et le `.func` Node construit, importé sous Node dans son
  répertoire, rend la carte. Ce que seul un déploiement montre est en §1.6 et §2.4. La règle du
  préfixe `_` n'est pas dans la documentation actuelle de Vercel, qui conseille de ranger les modules
  partagés **hors** d'`api/` : on la tient de l'observation, et `scripts/verifier-api.mjs` refuse tout
  fichier d'`api/` qui n'est ni une des deux fonctions ni préfixé — un module sans préfixe serait une
  route publique. Il reste dans `api/` pour le `tsconfig` des fonctions, les règles de lint d'`api/` et
  cette garde.
- **Une adresse de partage a une forme canonique, et la page comme la carte ne servent qu'elle.** La
  forme est celle que l'app produit (`urlDePartage`, `src/types/resultat.ts`) : `total` en tonnes à
  trois décimales (`4.200`), `poste` pris dans la liste fermée, `percent` entier, dans cet ordre,
  sérialisés par `URLSearchParams` (le `+` pour l'espace) — **mais l'encodage ne compte pas** : `%20`,
  un chiffre encodé, un hexadécimal en minuscules, une parenthèse ou une barre oblique en clair
  désignent la même adresse, parce que Vercel décode la chaîne avant la fonction et que son cache les
  confond, mesuré écriture par écriture (§1.10). Un `&` ou un `?` de trop se redirige encore : le cache
  les confond aussi, mais rien ne dit ce que la fonction en reçoit. Jugée au caractère près, la
  forme a fait rediriger vers lui-même tout partage portant un poste, de la fusion de ScratchMe/Ramille#378
  (l'audit du 18/10/2026) au correctif du même jour. Un test exige que chaque adresse que l'app
  produit soit déjà canonique (`scripts/postes-partageables.test.ts`) — sinon la page redirigerait
  chaque vrai partage. Trois issues, jugées avant tout rendu (le wasm de resvg n'est même pas lu) :
  - **canonique** : 200, avec un `Cache-Control` que le CDN garde (§1.10) — la page
    `public, max-age=0, s-maxage=un an, stale-while-revalidate=un jour`, la carte la même durée côté CDN
    et un an `immutable` côté navigateur, comme avant ;
  - **lisible, pas canonique** : 308 vers la forme canonique, par un chemin relatif, cacheable un jour.
    C'est un paramètre inconnu (`fbclid`, `utm_*` que les réseaux ajoutent aux liens), l'ordre, un `&`
    de trop, un zéro de tête, un total à une décimale (les liens d'avant les trois décimales), une
    valeur vide — et une valeur bien formée que l'app ne produit pas : total au-delà de 200 t, part
    au-delà de 100, libellé hors de la liste. Celles-là sont **ignorées**, comme elles l'ont toujours
    été : un lien dont le poste a été renommé continue d'ouvrir son aperçu ;
  - **illisible** : un total ou une part qui n'est pas un nombre positif (`2.4abc`, `-5`, `1e3`, `2,4`),
    un paramètre répété. On ne devine jamais le préfixe d'un texte, c'est la faille que cette forme
    ferme ; ce qu'on en fait dépend de qui lit l'adresse (`DevantLIllisible`). **La page l'ignore** :
    308 vers la forme canonique sans ce paramètre, comme un paramètre inconnu — c'est la destination du
    lien qu'une personne a reçu, et un lien recopié avec un caractère collé derrière le dernier nombre
    (`percent=58).`) ouvre encore la page, sans la part. **La carte le refuse** : 400, `no-store`, en
    texte brut — elle n'est lue qu'à l'adresse que la page écrit dans son `og:image`, toujours
    canonique, donc un illisible n'y arrive que fabriqué.

  **Ce que la forme canonique ne ferme pas.** L'espace des adresses canoniques reste de l'ordre de
  2·10⁹ (200 001 totaux × une centaine de libellés × 101 parts) : une attaque répartie qui fait varier
  le total obtient toujours un rendu par requête — environ 430 000 par jour avec 500 adresses IP et la
  règle de pare-feu de 60 requêtes par 10 minutes. La forme canonique retire les variantes gratuites ;
  ce qui borne le nombre de cartes est une signature des paramètres posée par l'app, ou un total arrondi
  dans l'adresse — ce qui change le format que l'app produit —, et c'est une décision à part. Le plafond
  du pare-feu reste la seule borne.
- **Les fichiers hachés de l'export sont immuables** (`public, max-age=31536000, immutable`) :
  `/_expo/static/*-<md5>.js|css` et `/assets/*.<md5>[@Nx].<ext>`, deux règles de `vercel.json` dont la
  `source` exige le hachage dans le nom (§1.11). Mesuré sur l'export du 18/10/2026 : le bundle, la
  feuille de style, les cinq polices et les dix-huit images portent un hachage ; les ressources à
  plusieurs échelles portent celui du jeu. Rien d'autre n'est immuable : pages HTML, `favicon.ico`,
  `robots.txt`, `sitemap.xml`, `.well-known/assetlinks.json`, le manifeste de routes d'Expo. Trois endroits le
  tiennent : `scripts/servir-export.mjs` lit désormais ces règles route par route (il refusait toute
  règle autre que `/(.*)`, et les gardes qui ouvrent l'export auraient toutes échoué),
  `controlerLeCacheImmuable` juge l'export réel à chaque PR (`verifier-rendu-export.mjs` : chaque fichier
  visé porte le md5 de son contenu, aucun fichier haché n'échappe à la règle, rien sans hachage sous
  `_expo/static` ou `assets`), et `scripts/vercel-cache-immuable.test.ts` garde la forme.
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

- **Le premier déploiement de la forme canonique et du module commun se lit en production**, avec un
  `curl -I` sans JavaScript, pour ce que `vercel build` et Node ne montrent pas (§1.6, §2.2) :
  - `/api/partage?total=4.200&poste=…&percent=50` répond **200**, pas 308 vers elle-même, et un second
    appel porte `x-vercel-cache: HIT`. **Joué le 19/10/2026 juste après la fusion de l'audit** : sans
    poste, 200 puis `HIT` ; avec un poste, 308 vers elle-même — la plateforme décode la chaîne, et la
    forme se jugeait au caractère près (§1.10). À rejouer après le déploiement du correctif ;
  - l'image de l'`og:image` de cette page répond de même 200 puis `HIT` — `curl -I` y répond 405 tant
    que seul `GET` est exporté, donc un `GET` dont on jette le corps ;
  - `/api/partage?total=4.2abc` et `/api/partage?fbclid=x` répondent un 308 vers `/api/partage`, et
    `/api/share-card?total=4.2abc` un 400 (un `GET`, comme plus haut) ;
  - un bundle de `/_expo/static/js/web/` répond `cache-control: public, max-age=31536000, immutable`,
    et `/plan` reste `max-age=0, must-revalidate` ;
  - ni `FUNCTION_INVOCATION_FAILED` ni 404 sur `/api/partage` : l'Edge a regroupé le module commun.
- **`VERCEL_GIT_PREVIOUS_SHA` est-il exposé ?** Le script écrit « repli sur HEAD^ » quand il ne
  l'est pas. Si cette ligne apparaît à chaque fois, le trou du build échoué (§1.3) est ouvert et
  il faut le savoir. (L'autre vérification de cette liste — qu'une fusion « doc seule » soit
  sautée sur le compteur et pas seulement dans le journal — est faite depuis le 16/09/2026, §2.1.)
