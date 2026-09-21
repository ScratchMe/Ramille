# Vercel — conventions et pièges

Ce que Ramille a appris de Vercel, et ce qu'un autre projet (Tour de Growth, le 15/09/2026) a
appris en payant avant nous. La **§1 vaut sur n'importe quel projet Vercel** ; la **§2** porte
les chiffres, les routes et les décisions de Ramille, et ne voyage pas. Chaque règle dit d'où
elle vient ; l'histoire complète est dans `CLAUDE.md` (mécaniques) et dans les documents
`docs/architecture/v1-0N-*.md` qu'elle cite.

> **Quand lire ce fichier** : avant toute fusion sur `main` (chaque fusion est un déploiement,
> et un déploiement se paie trente jours) · avant de toucher `vercel.json`, `api/`, le script
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
  à chercher un facteur cinq qui était un autre projet (§2.1). Demander les deux chiffres.

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
toujours pas expliqué, et qu'on budgète tel qu'il est mesuré.

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
- **Un build sauté ne crée aucun déploiement** — « No build minutes consumed, no new production
  deployment created ». Donc aucune fonction, donc rien au compteur : l'économie est réelle. Ne
  pas confondre avec un build **annulé en cours**, qui a déjà exécuté la commande de build et
  compte, lui.
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
  donc pas le bundle, c'est la cadence (§2.3).

### 1.8 Ce que l'outillage d'une session agent ne voit pas

- **L'outil MCP Vercel d'une session ne voit pas forcément le compte où vivent les projets** — sur
  Ramille, `list_deployments` a répondu 403 le 15/09/2026 ; chez Tour de Growth, l'unique équipe
  visible est restée vide. Conséquence : **l'agent ne peut pas lire les compteurs de
  consommation**, et la configuration se fait à la main dans le tableau de bord. Règle : *quand
  une ressource que je ne peux pas lire est en jeu, je demande le chiffre avant d'agir, pas
  après.*
- **La région des fonctions est un réglage de projet**, pas de code. Une région par défaut aux
  États-Unis avec une base en Europe ajoute une seconde et plus par requête ; se vérifie avec
  `x-vercel-id` sur une vraie réponse.

---

## 2. Propre à Ramille

*Cette section ne voyage pas — ce sont nos chiffres, à un instant donné.*

### 2.1 Chiffres de référence (15/09/2026, mesure hors ligne §1.2)

| | Valeur |
|---|---|
| Fonctions physiques par déploiement | 2 — `api/share-card` (Node.js, 63 fichiers) et `api/partage` (Edge) |
| Poids de `share-card` sur disque | 3,95 Mo + 0,38 Mo de `hb.wasm` via `includeFiles` = 4,33 Mo |
| Poids de `share-card` **retenu par Vercel** | **1 595 453 octets ≈ 1,6 Mo** (export du tableau de bord, 15/09/2026 — l'archive compressée, 37 % du disque) |
| Poids de `partage` | 0,03 Mo sur disque ; l'export du tableau de bord ne lui donne aucune taille (Edge) |
| **Poids par déploiement, mesuré sur le compteur** | **1,76 Mo**, deux fois (16/09/2026, voir ci-dessous) — et c'est un **plancher** |
| Fusions sur `main`, 16/08 → 15/09 | 82, dont **13 doc seule** (16 %) |
| Fusions du seul 15/09 | 5 (PR #186 à #190), dont **3 doc seule** (#188, #189, #190) |
| **Compteur Functions Storage du compte** | **9,85 Go sur 10 Go le 15/09/2026** (relevé par Antoine sur *Usage*), tous projets confondus — pas de baisse avant au moins dix jours. **Relevé suivant : 9,88 Go le 21/09/2026**, voir le bloc daté plus bas |
| **Part de Ramille** | **437,53 Mo** le 15/09/2026, soit ≈ 273 déploiements à 1,6 Mo en dix jours de vie du projet (82 fusions de production et ~190 prévisualisations, une par push jusqu'au 15/09 à midi). **472,8 Mo le 21/09/2026** |
| Budget fixé par Antoine | **≤ 150 Mo ajoutés entre le 15/09 et le 25/09/2026** — c'est tout ce qui reste avant la limite. **35,3 Mo consommés au 21/09**, dont ≈ 115 à 125 Mo de marge réelle sur le compte |

> **Réconcilié le 15/09/2026, en deux temps.** Le premier relevé — « 9,85 Go sur 10 » — ne se
> déduisait ni de 1,6 Mo × 82 fusions (131 Mo) ni de 4,4 Mo × (fusions + prévisualisations) : il
> manquait un facteur cinq, cherché une heure dans le nombre de déploiements et dans ce que Vercel
> compte. Il était dans le **dénominateur** : 9,85 Go est le compteur du **compte**, et Ramille
> n'en représente que 437,53 Mo — le reste est Tour de Growth, dont chaque déploiement pèse
> ~47 Mo. 437,53 Mo ÷ 1,6 Mo ≈ 273 déploiements en dix jours, ce que l'historique rend plausible
> (82 fusions de production, 158 commits atteignables hors branches écrasées, une prévisualisation
> par push jusqu'au 15/09 à midi). **Le chiffre par déploiement de l'export est donc le bon.**

> **Corrigé le 16/09/2026 : le compteur dit 1,76 Mo, pas 1,6.** Deux intervalles ne contenant
> **qu'un seul déploiement** ont été relevés, et les deux donnent exactement le même écart :
> 437,53 → 439,29 Mo (la fusion de la PR #191, arrivée au compteur pendant la nuit) et
> 439,29 → 441,05 Mo (la fusion de la PR #201). Entre les deux, deux fusions « doc seule » (#192
> et #200) n'ont **rien** ajouté — c'est la mesure de l'Ignored Build Step sur le compteur
> lui-même, et non sur le journal de déploiements.
>
> **L'écart avec l'export n'est pas expliqué, et on ne l'explique pas à la place de la mesure.**
> 1 595 453 octets valent 1,5955 Mo décimaux ou 1,5216 Mio : ni l'un ni l'autre ne fait 1,76, et
> `partage` n'a aucune taille dans l'export. Les deux pistes plausibles — l'export ne compte pas
> tout ce que le compteur retient, ou l'affichage arrondit autrement — n'ont pas été départagées.
> Ce qui est mesuré, c'est l'écart du compteur, et **c'est lui qu'on budgète**.
>
> **Et c'est un plancher, pas une valeur exacte** : le compteur est une somme **glissante**, donc
> un intervalle d'un jour peut aussi voir sortir un déploiement vieux de trente jours. Un tel
> retrait **diminue** l'écart observé, jamais l'inverse.
>
> Corollaire sur la réconciliation du 15/09 ci-dessus : elle divisait un écart **net** d'une
> journée par un nombre de fusions, donc elle mélangeait les ajouts et les retraits de la fenêtre.
> Un écart mesuré sur **un** déploiement ne fait pas ce mélange — c'est la seule forme de mesure à
> laquelle se fier ici, et la règle portable est en §1.1.

> **Relevé du 21/09/2026 : 9,88 Go sur 10 pour le compte, 472,8 Mo pour Ramille** (Antoine, six
> jours après le précédent). Ce que ça dit, et ce que ça ne dit pas :
>
> - **Ramille a ajouté 35,3 Mo, et c'est un ajout PUR** — pas un net. Le projet Vercel a été créé
>   vers le 05/09, donc à la date du relevé **aucun de ses déploiements n'est encore sorti** de la
>   fenêtre de trente jours. C'est la seule situation où un intervalle de plusieurs jours se lit
>   sans le mélange que §1.1 interdit, et elle prendra fin le 05/10.
> - **Le compte, lui, n'a monté que de 30 Mo** (9,85 → 9,88) pendant que Ramille en ajoutait 35,3.
>   L'écart est du **retrait** : de vieux déploiements de l'autre projet sortent de la fenêtre.
>   C'est cohérent avec « Ramille est le seul projet qui déploie en ce moment » (Antoine).
> - **Ce qui reste avant la limite : ≈ 120 Mo**, et la précision de l'affichage compte — « 9,88 »
>   est arrondi au centième, donc la vraie valeur est entre 9,875 et 9,885, soit **115 à 125 Mo**.
>   L'incertitude vaut à elle seule trois fusions : on budgète sur la borne basse.
> - À 1,76 Mo la fusion, 115 Mo valent **≈ 65 fusions**. La convention de deux fusions de code par
>   jour (§2.3) en consomme une dizaine d'ici au 25/09, soit ~18 Mo. **La contrainte n'est plus
>   serrée** — et elle ne l'est plus parce que l'autre projet s'est arrêté, pas parce qu'on a été
>   économe. Elle se resserrerait au premier déploiement qu'il reprendrait.
>
> **Et une prédiction, parce qu'elle change la façon de lire le compteur en octobre.** Les 472,8 Mo
> de Ramille sont dominés par la **salve initiale** — ≈ 273 déploiements entre le 05 et le 15/09,
> dont ~190 prévisualisations, une par push, jusqu'à ce que `git.deploymentEnabled` les coupe
> (§2.2). Cette salve sort de la fenêtre **entre le 05 et le 15/10**, donc la part de Ramille doit
> **chuter de ~400 Mo** sur cette période, pour se stabiliser autour de (cadence × 30 jours ×
> 1,76 Mo) — soit ≈ 106 Mo à deux fusions par jour, et moitié moins à une. Le compteur de Ramille
> n'est pas monotone : il plafonne. **Si la chute n'a pas lieu à ces dates, c'est le modèle qui est
> faux**, et il faudra reprendre la mesure avant d'en tirer une règle de cadence.

Ce que le budget vaut en déploiements de Ramille : ≈ 94 — **si l'autre projet ne fusionne pas** ;
trois de ses fusions suffisent à consommer les 150 Mo. Un déploiement de Ramille est bon marché,
mais le compte est à 98 % : rien ne déploie sans nécessité (§2.3). Première estimation, avant les
relevés : 4,4 Mo par déploiement d'après le disque ; l'export l'a divisée par 2,7 (§1.2).

Répartition du poids de `share-card` : `@resvg/resvg-wasm` 2,48 Mo (57 %), `hb.wasm` 0,38,
`@shuding/opentype.js` 0,37, `satori` 0,36, `fflate` 0,17, `linebreak` 0,14, les deux polices
Spline Sans 0,11, `harfbuzzjs` (JS) 0,08, `react` 0,06 ; le reste sous 0,05.

> Tour de Growth avait relevé un compteur proche de sa mesure disque (47 Mo affichés pour 43,5
> mesurés) ; chez Ramille le rapport est de 37 %. Les deux sont vrais : un bundle Next.js est du
> JavaScript déjà minifié qui se compresse peu, le nôtre est un WASM de 2,5 Mo qui se compresse
> bien. **Le tableau de bord a raison**, et la mesure hors ligne sert au classement (§1.2).

### 2.2 Décisions prises, à ne pas rouvrir sans raison

- **Plus de prévisualisation** depuis le 15/09/2026 (PR #185, `git.deploymentEnabled`) : la
  vérification visuelle du web se fait par `expo export --platform web` puis Playwright sur
  `dist/`, ce que font déjà les cinq gardes d'export en CI — aucune n'a jamais interrogé Vercel.
- **Les fusions « doc seule » ne déploient plus** (`ignoreCommand` →
  `scripts/vercel-ignorer-le-build.sh`). Liste blanche, relevée contre ce que lisent
  `expo export --platform web` et les deux fonctions : `docs/`, `.github/`, `supabase/`,
  `.claude/`, `.design-sync/`, `.vscode/`, `scripts/`, `LICENSE` et les `.md` de la racine. Tout le
  reste construit, `vercel.json` et `package.json` compris. Base de comparaison :
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

### 2.3 Convention de cadence, et le budget des dix jours

Chaque fusion sur `main` coûte **≈ 1,8 Mo** pendant trente jours (1,76 mesuré, §2.1). Entre le 15 et le 25/09/2026,
**150 Mo sont tout ce qui reste au compte entier**, partagés avec un projet dont une fusion en
vaut trente de Ramille — et une limite atteinte, c'est un correctif qui ne part plus, sur les
deux projets.

**Où en est ce budget, au 21/09/2026** : 35,3 Mo consommés sur les 150, et ≈ 115 à 125 Mo de marge
réelle sur le compte (§2.1). À 1,76 Mo la fusion, c'est **une soixantaine de fusions** — la
contrainte s'est desserrée, et il faut savoir **pourquoi** avant d'en profiter : l'autre projet ne
déploie plus, donc de vieux déploiements à lui sortent de la fenêtre et compensent les nôtres. Ce
n'est pas une marge acquise, c'est une marge prêtée : elle se referme au premier déploiement qu'il
reprend. Les quatre règles ci-dessous restent donc à demeure, et la 3 garde son plafond — ce qui a
changé est la tension, pas la discipline.

Les règles, à demeure :

1. **Avant la première fusion d'une session, demander à Antoine le relevé du tableau de bord**
   (*Usage → Functions Storage*), en déduire ce qui reste, et s'y tenir. L'agent ne peut pas le
   lire (§1.8).
2. **Une PR par vague, pas une par chantier.** Une vérification complète, un push, une fusion.
   Une correction de documentation qui suit une fusion de code attend la fusion de code
   suivante — ou part seule, puisqu'elle ne déploie plus.
3. **Deux fusions de code par jour au plus** pendant la fenêtre des dix jours, et **seule une
   correction nécessaire déploie** tant que le compte est à 98 % ; ce qui peut attendre le 25/09
   attend, sur une branche. Le coût unitaire est faible, c'est la marge qui ne l'est pas, et elle
   n'est pas qu'à nous.
4. **Une fusion de documentation part seule et doit être sautée** (§1.3) : c'est gratuit, et
   chacune vérifie que le script fait ce qu'il dit.
5. **Avant chaque fusion de code, mesurer ce que le déploiement va ajouter** — `vercel build`, puis
   la somme des `.func` selon la recette de §1.2 — et **le comparer au relevé précédent**. Demandé
   le 21/09/2026, et la demande dit exactement à quoi ça sert : *« juste pour vérifier que tu n'as
   pas fait de bêtise et que le chiffre n'augmente pas soudainement sans qu'on s'en rende compte »*.
   Ce n'est donc **pas** une remesure du coût unitaire — il est connu, il a été mesuré deux fois, et
   le remesurer quinze fois est précisément ce qui a été reproché le même jour. C'est une **garde de
   non-régression** : le chiffre attendu est stable (4,33 Mo de disque le 15/09, 4,16 Mio le
   21/09 — ≈ 1,5 Mio retenus), donc ce qu'on cherche est l'**écart**, pas la valeur. Un saut veut
   dire qu'une dépendance est entrée dans `api/`, et c'est le seul moment où on peut le voir avant
   de le payer trente jours.
   Deux traces à nettoyer après coup, sans quoi elles partent dans la PR : `.vercel/` (ignoré par
   git, mais présent) et `api/package-lock.json`, que `vercel build` écrit et que le dépôt ne veut
   pas (§1.2). Un `git status` après la mesure, à chaque fois.

Ce que cette convention corrige : le 15/09/2026, cinq fusions dans la journée, dont trois qui ne
touchaient que de la documentation — le motif exact contre lequel Tour de Growth avait écrit sa
règle, et que j'ai reproduit avant de la lire.

### 2.4 Ce qu'il reste à vérifier sur le tableau de bord

- ~~**La première fusion « doc seule » après celle-ci** doit apparaître comme sautée par l'Ignored
  Build Step~~ — **vérifié le 16/09/2026, deux fois et sur le compteur** : les fusions des PR #192
  (fichiers d'outil) et #200 (recette web) n'ont pas fait bouger la part de Ramille, restée à
  439,29 Mo. C'est la preuve que le journal de déploiements ne donnait qu'à moitié.
- **`VERCEL_GIT_PREVIOUS_SHA` est-il exposé ?** Le script écrit « repli sur HEAD^ » quand il ne
  l'est pas. Si cette ligne apparaît à chaque fois, le trou du build échoué (§1.3) est ouvert et
  il faut le savoir.
- ~~**La part de Ramille après la fusion de la PR #192**~~ — **relevée le 16/09/2026** : 439,29 Mo
  avant et après, donc sautée. (Le total du compte, lui, bouge dès que l'autre projet fusionne :
  c'est pourquoi on demande toujours **les deux** chiffres.)
- **Le compteur retarde d'une nuit** : l'écart d'une fusion ne se lit pas dix minutes après, il se
  lit le lendemain. Les deux mesures de 1,76 Mo l'ont chacune confirmé.
