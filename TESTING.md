# Tests — conventions et pièges

Ce que Ramille a appris en écrivant ses trois suites (Jest sur la logique pure, pgTAP sur la
base, et le parcours réel contre une vraie stack depuis le 20/09/2026). La **§1 vaut sur n'importe quel projet** ; la **§2** porte les fichiers, les chiffres et les
pièges propres à Ramille, et ne voyage pas. L'histoire complète est dans `CLAUDE.md` (mécaniques)
et dans les documents `docs/architecture/v1-0N-*.md` que chaque paragraphe cite.

> **Quand lire ce fichier** : avant d'écrire un test censé protéger une correction · avant
> d'**annoncer que quelque chose est vérifié** · quand une suite rougit ou verdit de façon
> inattendue · avant de rejouer un fichier pgTAP sur le projet distant · avant de toucher au
> référentiel des facteurs.

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
qui a été ainsi vérifié (§2.2).


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

### 1.7 pgTAP : cinq pièges d'une transaction

- **`now()` est l'horodatage de début de transaction.** Deux lignes écrites par le même appel
  portent le même `created_at`, et `order by created_at limit 1` retombe sur l'ordre du tas : une
  assertion juste peut tirer *l'autre* ligne et réussir là où elle attend un refus. Capturer
  l'identifiant dans un `set_config`, ou ordonner sur une colonne réellement distincte.
- **La place d'une assertion fait partie de l'assertion.** Posée après une section qui écrit une
  ligne à la main, elle lit un état que nulle mise en file n'a produit — et valider l'assertion
  seule, avec ses propres fixtures, ne reproduit pas cet état. Elle vit juste après ce qui produit
  ce qu'elle lit, avec un commentaire qui dit pourquoi elle ne doit pas bouger.
- **Rejouer la séquence entière du fichier**, bascules de rôle (`request.jwt.claims`) comprises :
  un scénario extrait de son contexte ne reproduit pas le rôle sous lequel il tournera.
- **Une assertion de refus peut passer sans rien éprouver de deux façons** : un trigger `before`
  qui refuse avant les `check` (même SQLSTATE `23514`), ou la RLS depuis la session d'un tiers
  (`42501`). L'ordre des assertions et le rôle courant décident de ce qui est éprouvé. Même chose
  pour un privilège : « permission denied » et « violates row-level security » portent tous deux
  `42501`, donc un test qui n'assure qu'un refus reste vert après un `revoke`.
- **Une fixture ne peut pas écrire un état que la production ne peut pas produire** (une ligne
  « répondue » sans réponse, un horodatage choisi que le serveur pose lui-même) : quand une
  contrainte ou un trigger arrive, les fixtures qui le faisaient tombent, et c'est une bonne
  chose — elles éprouvaient une fiction.

Et une base **vierge** n'est pas la base **distante** : une assertion qui lit `min()` sur toute
une table, ou qui attend un envoi *sauté* faute de secret, passe sur l'une et échoue sur l'autre.
Les connaître évite de « corriger » un test qui n'a rien (§2.3).

---

## 2. Propre à Ramille

### 2.1 Les suites, et où passe la ligne

Deux suites de tests automatisés, ciblées sur la logique où un bug est le plus coûteux
(chiffre affiché à l'utilisateur, navigation du wizard) — pas encore de tests d'intégration
bout-en-bout (écrans, flux de connexion) :

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
  Les écrans n'y sont pas — ils ne sont pas testés, par décision, et les lister à 0 % à chaque
  passage noierait la carte. 79 % des lignes au 14/09/2026.
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
  Deux modules de `src/lib` sont testés en place et le restent à cette condition : `format.ts`, pur
  (et importé par `src/types/resultat.ts`, donc une dépendance ajoutée là ferait tomber toute la
  suite qui en dépend, par un lien que rien n'affiche), et `bilan-draft.ts`, dont le test double
  AsyncStorage parce que c'est l'entrée-sortie elle-même qu'il éprouve.
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
  courant. Nécessite le CLI Supabase (`npx supabase@latest`) et Docker ; non exécutable dans
  cet environnement (pas de daemon Docker) — validé à la place via des transactions
  `BEGIN`/`ROLLBACK` sur le projet distant avant d'être figé dans ces fichiers.

Les trois suites tournent en CI (`.github/workflows/ci.yml`) sur chaque pull request — la
troisième, le parcours réel, a sa §2.6.

### 2.2 Le référentiel des facteurs et les assertions chiffrées

**Toucher au référentiel des facteurs invalide TOUTES les valeurs attendues de la suite pgTAP,
pas seulement celles qui citent le facteur touché — et « toucher » inclut en AJOUTER un.**
Le fichier `07` porte trois gardes qui balaient les tables entières (tout mode a une source,
toute source a un facteur, tout facteur porte l'ACV complète) : quatre modes ajoutés les
traversent sans être nommés nulle part. C'est ainsi que la CI est tombée une troisième fois
(PR #48). En particulier, `emission_factors.source` doit valoir **exactement**
`'ADEME Base Empreinte — ACV complète (via API Impact CO2)'` : ce n'est pas une étiquette
décorative mais le seul endroit où l'on enregistre quel endpoint a été interrogé — la valeur
seule ne distingue pas un facteur ACV d'un facteur d'usage, les deux endpoints renvoyant des
nombres également plausibles.

**Le corollaire sur les valeurs :** Une quinzaine d'assertions chiffrées sont
réparties dans `01`, `05`, `06` et `08`, et beaucoup dérivent d'un facteur sans le nommer.
Chercher l'ancienne valeur littérale dans les fichiers ne suffit donc pas — c'est ainsi que
la CI est tombée deux fois (PR #34, puis PR #41). La méthode qui marche : lister toutes les
assertions (`grep -n '::numeric,' supabase/tests/database/`), recalculer chacune **par une
requête sur la base** plutôt qu'à la main, et n'écrire dans le test que des valeurs ainsi
vérifiées. Le piège se referme d'autant plus facilement que la validation sur le projet
distant passe : celui-ci est déjà migré, il ne rejoue pas les scénarios des tests.

### 2.3 Ce que le projet distant ne prouve pas

**Ce piège avait un symétrique LOCAL, et il est fermé depuis le 21/09/2026.** Relevé le
20/09/2026 : la suite pgTAP ne passait pas sur une stack locale qui avait déjà servi les gardes de
bout en bout. Le parcours réel et le chemin du compte émettent de **vrais** `usage_events` — et
l'assertion 9 de `12_usage_events` lisait `min(occurred_at)` sur **toute** la table. Cinq minutes
plus tard, elle échouait, avec le message exact d'un défaut d'horodatage côté serveur alors que
rien n'était cassé.

La parade prescrite ici était `supabase db reset` avant `supabase test db`. **Ce n'était pas la
bonne**, et ce paragraphe a mis un jour à s'en apercevoir : le défaut n'était pas dans
l'environnement mais dans l'assertion, qui balayait la table entière là où elle ne parle que de la
ligne qu'elle vient d'écrire. Elle est bornée au fixture, dont l'identifiant ne peut pas venir de
la production — ce qui ferme du même geste le cas local **et** le cas distant plus bas. Vérifié en
désarmant `usage_events_stamp_time` : la version bornée tombe toujours sur ce qu'elle garde.

La leçon vaut au-delà de cette ligne : **une garde qui rougit pour une raison étrangère à ce
qu'elle garde n'est pas un désagrément d'environnement, c'est un défaut de la garde** — elle finit
« corrigée » de travers, ou ignorée, ce qui revient au même. Le réflexe de prescrire une
manipulation à l'appelant est le mauvais ; on borne l'assertion.

**Et le piège a un symétrique, relevé le 11/09/2026 : des assertions de la suite échouent sur le
projet distant et passent en CI, parce qu'elles supposent une base vierge.** Les connaître évite de
« corriger » un test qui n'a rien. Elles étaient trois ; **il en reste deux depuis le 21/09/2026**,
et le nombre ne s'écrit plus en titre pour qu'il ne se périme pas une seconde fois.
- ~~`12_usage_events` assertion 9~~ — **fermée le 21/09/2026**, elle est bornée au fixture et passe
  désormais des deux côtés (mesuré : zéro ligne pour cet uuid sur le distant, contre 254 réelles).
  Elle reste listée parce qu'une exception retirée d'une liste se réinvente : la prochaine
  assertion qui balaiera une table entière aura ce précédent-ci en face d'elle.
- `17_rappels_canal` assertions 15 et 16 attendent un envoi **sauté** faute de secrets Vault. Sur
  le distant, `resend_api_key` et `reminder_from_address` existent : la fonction envoie vraiment, et
  la ligne passe en `sent` / le passage en `success`.
- `09_checkin_email_reminders` pour la même raison — et avec un **effet de bord** : ses trois appels
  à `send_pending_reminders()` feraient partir de vrais emails vers des adresses `@test.local`, donc
  un rebond qui coûte de la délivrabilité au domaine. Ce fichier ne se rejoue pas en entier sur le
  distant ; ce qui s'y valide se valide en sautant ces appels (ils ne touchent pas au corps du
  message, seulement au statut).
Le reste de la suite est rejouable sur le distant et c'est la façon la plus rapide de valider un
fichier pgTAP sans Docker — à condition de rejouer le **fichier entier**, bascules de
`request.jwt.claims` comprises, et de savoir que ces quatre-là ne prouvent rien là-bas.

### 2.4 Deux pièges de rédaction pgTAP

**`created_at` ne désigne aucune ligne dans une transaction pgTAP, et un `order by` dessus rend un
ordre arbitraire.** `now()` est l'horodatage de **début de transaction** : deux lignes écrites par le
même appel le portent à l'identique, et `order by created_at limit 1` retombe sur l'ordre du tas.
Relevé le 11/09/2026 dans le fichier `22` (C2.9), où le « second clic » sur un lien de désinscription
pouvait tirer l'**autre** message et donc réussir là où l'assertion attend un refus — l'assertion
était juste, c'est la désignation de la ligne qui ne l'était pas, et elle passait en CI comme au
premier rejeu. Capturer l'identifiant ou le jeton une fois dans un `set_config`, ou ordonner sur une
colonne réellement distincte.

**La place d'une assertion dans un fichier pgTAP fait partie de l'assertion, et valider l'assertion
seule ne vaut rien.** Relevé le 11/09/2026 : les deux assertions C2.11 du fichier `09` avaient été
posées en **fin** de fichier, après la section du journal qui écrit une ligne d'outbox **à la main**
— donc un corps que nulle mise en file n'a produit. La première échouait, la seconde passait sans
rien éprouver, et la validation sur le distant n'avait porté que sur elles deux avec leurs propres
fixtures, ce qui ne reproduisait pas cet état. Elles vivent maintenant juste après la mise en file
qui produit la ligne qu'elles lisent, avec un commentaire qui dit pourquoi elles ne doivent pas
bouger. La conjonction est le vrai piège : le fichier dont on a le plus besoin de rejouer la
séquence entière est précisément celui qu'on ne peut pas rejouer en entier sur le distant.

### 2.5 Le canal de retour : deux façons de passer sans rien éprouver

Le contexte : `feedback` est la seule table où un client écrit du texte libre, gardée par le
trigger `enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et des bornes de longueur
(`CLAUDE.md`, « Canal de retour »).

**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites. Après la
saturation du quota, c'est le trigger `before insert` qui refuse — il s'exécute avant
l'évaluation des CHECK et lève lui aussi un `23514`. Et depuis la session d'un tiers, c'est la
RLS (`42501`). Elle doit donc venir avant le remplissage du quota **et** sous la session du
propriétaire. Plus généralement, pour valider un test pgTAP en base, rejouer la **séquence
entière** du fichier, bascules de `request.jwt.claims` comprises — un scénario extrait de son
contexte ne reproduit pas le rôle sous lequel il tournera.

### 2.6 Le parcours réel, contre une vraie stack — et ce que Docker change ici

**Le trou, mesuré le 20/09/2026** : 15 147 lignes d'écrans, de composants et de hooks, et 1 485 lignes
d'entrée-sortie — **les fichiers de `src/lib` qui importent le client**, et non `src/lib` entier, qui
en compte 3 307 — n'étaient gardées par rien d'autre que la recette sur appareil. Les deux
premières suites prouvent la logique pure et la base ; entre les deux — les requêtes, les RPC, ce
que l'écran montre après une écriture — rien. Un `.eq('status', 'complete')` passait vert.

**`scripts/verifier-parcours-reel.mjs` joue le chemin nominal, et lui seul**, sur **deux profils**
— décrits plus bas ; celui-ci est le premier, tiré de
`docs/recette/premier-parcours-web.md` : onboarding → questionnaire → soumission → restitution →
plan, sans écran de compte interposé (arbitrage du 20/09/2026 : la proposition de compte que ce
paragraphe disait « refusée » n'existe plus sur ce chemin) → engagement → un point généré comme le
cron le ferait (`generate_commute_checkins()`, appelé en `service_role`) et répondu → suivi →
« Toi » et sa ligne de canal (25/09/2026, §2.12) → suppression du compte, sans une ligne derrière. Après chaque écriture il relit la base **comme la personne**
(PostgREST sous sa session, donc sous la RLS) : 4 231 kg, 1 920 kg sur le poste dominant, huit
pistes dans l'ordre et au kilo près, l'engagement et ses jours, le point et sa question figée. Sur
la base construite depuis `supabase/migrations/`, ces chiffres ne dépendent d'aucune
synchronisation de facteurs. Ce qu'il ne fait **pas**, et ce n'est pas un oubli : les exclusions
de cartes et les états d'erreur restent aux dérivations de `src/types` et à
`verifier-etats-export.mjs` — un parcours qui voudrait tout voir serait fragile, et un garde-fou
fragile finit ignoré.

**En CI**, c'est le travail « Parcours réel (stack locale) » de `ci.yml` : `supabase start` — et
pas `db start` comme pour pgTAP, parce que la session anonyme vient de GoTrue et les lectures de
PostgREST —, un second export branché sur cette stack, Playwright, le script.

**En local, et dans l'environnement d'agent aussi** — contrairement à ce que ce dépôt a cru jusqu'au
20/09/2026, Docker y tourne : le démon ne démarre pas seul, mais `sudo dockerd > /tmp/dockerd.log
2>&1 &` suffit (mesuré, l'agent y est `root`). Ensuite :

```bash
npx supabase@2.117.0 start                      # ~3 min la première fois : les images
npx supabase@2.117.0 status -o env              # ANON_KEY, SERVICE_ROLE_KEY, API_URL
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=… \
  npx expo export --platform web --clear
EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
  CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verifier-parcours-reel.mjs
```

Et c'est aussi ce qui rend **pgTAP exécutable ici** (`npx supabase@2.117.0 test db`, après un
`db reset` si des parcours ont laissé des comptes) : le `BEGIN`/`ROLLBACK` sur le projet distant
n'est plus la seule validation d'un fichier pgTAP, et ce n'est pas la meilleure — le distant porte
des données que trois assertions ne supportent pas (§2.3).

**Deux profils, et le second n'est pas un doublon** (20/09/2026). Le premier est celui de la
recette — voiture, vols, dix pistes depuis C4.4 (le compte est dans le script, pas ici : il a déjà
bougé une fois). Le second est un **cycliste dont le plan ne porte aucune
action**, et ce n'est pas un cas de bord : depuis C2.5, tout cycliste et tout profil sédentaire y
tombe. C'est surtout le seul chemin où la carte « Ton premier plan » ne se rend **jamais** (elle
demande une action), donc le seul où la barre d'onglets doit arriver autrement — au premier
affichage du plan, avec la carte « Plan et Suivi ». Le premier profil, lui, passe par « Compris ».
Trois branches d'écran basculent d'un profil à l'autre, et aucune n'était jouée : la félicitation à
la place des cartes, le cap qui **ne chiffre pas** (`cadreDuPlan`, C5.3), et l'absence de l'encart de
contexte comme du lien vers les pistes.

Le second profil tourne dans un **contexte de navigateur neuf**, et c'est structurel : « premier »
veut dire premier **sur cet appareil** (C5.7), et les marques vivent dans le stockage. Le rejouer
dans le même contexte éprouverait un appareil qui a déjà tout vu.

**Deux pièges payés en l'écrivant, tous deux silencieux :**

- **Les `EXPO_PUBLIC_*` sont inlinées à la transformation, et le cache de Metro ne les met pas dans
  sa clé.** Un export qui en suit un autre garde l'URL de l'autre — l'app a appelé
  `exemple.supabase.co` pendant deux passes avec la bonne variable dans l'environnement, et
  `EXPO_NO_DOTENV=1` n'y changeait rien. `--clear` à chaque changement de configuration, et le
  `grep` de l'URL dans `dist/_expo/static/js/web/*.js` est ce qui a tranché.
- **Les pages hors champ du pager sont `inert` et `aria-hidden`, mais l'état qui les cache suit
  l'animation, pas le clic.** Deux « Continuer » cliqués trop vite touchent deux fois la même page —
  la première passe est passée, la seconde a tourné en rond. Le script attend que le défilement soit
  posé sur la page attendue, puis clique le bouton **dans la fenêtre**, pas le premier que l'arbre
  d'accessibilité rend. Même famille : la barre d'onglets masquée reste dans le DOM
  (`display: 'none'`), donc « la barre est absente » se mesure sur la visibilité, jamais sur le
  compte des libellés.

**Éprouvé en le cassant, le 20/09/2026**, sept mutations sur l'arbre de travail, chacune suivie d'un
export — puisque le code est dans le bundle — et remise en place par l'opération inverse. Trois sur
le premier profil : un filtre écrit de mémoire (`'complete'`), un RPC au mauvais nom
(`commit_plan_actions`), la réponse au point vers un RPC au mauvais nom ; le parcours s'arrête
respectivement au plan, à l'engagement et au point, en nommant l'étape et la requête refusée. Trois
sur le second : la carte du premier plan rendue malgré un plan à zéro action, le cap qui chiffre
quand même, la félicitation reformulée. **La septième est arrivée après coup**, l'assertion des
kilos ayant été ajoutée sans elle — ce que §1.1 interdit, et que seule une relecture du diff a vu :
le seuil de `valeurEtUnite` passé de `kilos < 1000` à `kilos < 10` fait tomber « 11 kg CO₂e » et
rien d'autre, le premier profil restant en tonnes à 4 231 kg.

**Et l'une d'elles a changé le script plutôt que de le confirmer.** Rendre la carte du premier plan
sur un plan à zéro action empêche aussi la barre d'onglets d'arriver — fermer la carte est ce qui la
fait venir —, donc tant que l'attente de la barre venait avant les assertions de texte, l'échec se
lisait « Timeout 20000ms exceeded » sans nommer la cause. Les assertions passent devant. Même
famille, trouvée par la troisième : `attendreTexte` rendait un délai dépassé anonyme, elle nomme
désormais le texte attendu — pour tous ses appels, pas seulement celui-là. Le compte détaillé est en
tête du script.

**Sur un échec, lire dans cet ordre** : l'étape nommée, les requêtes refusées (le script journalise
tout `4xx`/`5xx` avec le corps — un `PGRST303` « JWT issued at future » sur la première requête
d'une session est **attendu**, l'app le rejoue, cf. `src/types/postgrest.ts`), le texte visible,
puis la capture, dont le chemin est imprimé (dossier temporaire). Un parcours local qui s'arrête laisse son compte anonyme
dans la stack ; `supabase db reset` remet la base à neuf.

### 2.7 Les miroirs de `check`, comparés à la base plutôt que recopiés

**Le code recopie une contrainte de la base en bien plus d'endroits qu'on ne le croit** — une puce
du questionnaire, un `.eq('status', …)`, une union de littéraux. Rien, depuis TypeScript, ne peut
lire ce que la colonne accepte : la convention était donc d'épingler chaque miroir par un test Jest portant les mêmes
valeurs **recopiées une seconde fois**. C'est une garde du code contre lui-même, et elle ne peut
pas voir la seule chose qui compte ici : que la base ait changé d'avis. Un `check` élargi laisse le
test vert et la liste courte ; un `check` resserré laisse le test vert et la puce refusée à la
soumission, en anglais, neuf étapes trop tard. C'est arrivé une fois, en silence — `tc_access`
disait `aucun` avant de dire `inexistant`.

`scripts/verifier-miroirs-de-check.mjs` (travail `db-tests`, 20/09/2026) lit `pg_constraint` sur la
base que `supabase/migrations/` vient de construire. Quatre choses à savoir avant d'y toucher :

- **Il lit la base, jamais les migrations.** Relire le dernier `check (col in (…))` des fichiers est
  faux dès qu'une migration fait `drop constraint` puis `add constraint` — il y en a —, et dès
  qu'une colonne homonyme a vécu sur deux tables avec deux vocabulaires (`zone_type` sur `profiles`).
- **Il importe les constantes au lieu de les analyser.** Un analyseur d'`as const` par expression
  régulière est exactement là où la fragilité vit : la valeur comparée est celle que l'app utilise
  (Node retire les types, `scripts/resolveur-alias.mjs` résout `@/`). L'exception est structurelle :
  une **union de littéraux** est un type, donc effacée à l'exécution, et se lit dans le source par
  une expression régulière qui ne couvre qu'une forme — `export type X = 'a' | 'b';`. C'est aussi la
  famille que rien d'autre ne peut garder : un test Jest ne sait pas énumérer un type.
- **Trois genres, parce que trois contraintes.** `valeurs` et `type` font une **égalité
  d'ensembles**, dans les deux sens — une valeur que la base accepte et que personne ne propose est
  un écart autant que l'inverse, et c'est ainsi qu'on voit qu'une migration a ouvert une réponse que
  l'écran ne montre pas. `domaine` s'applique aux bornes numériques (`between 2 and 6`), où il n'y a
  rien à énumérer : chaque valeur proposée est **évaluée par Postgres** contre l'expression réelle
  de la contrainte, et quand la liste est un intervalle d'entiers, les deux valeurs qui l'encadrent
  doivent être **refusées** — sans quoi un plafond déplacé en base passerait inaperçu alors que la
  puce « 6+ » promet qu'il n'y a rien au-dessus.
- **Une colonne peut porter plusieurs `check`, et un seul énumère.** `engagement_checkins.response_kind`
  en a deux : celle du domaine, et celle de cohérence avec `response`, qui nomme les mêmes trois
  valeurs sans les énumérer. Seule la forme `colonne = ANY (ARRAY[…])` est lue — et deux contraintes
  énumérantes sur la même colonne font échouer le contrôle plutôt que d'en choisir une.

Ajouter un miroir, c'est ajouter **une ligne** au tableau `MIROIRS` ; le reste se lit dans la base
et dans le module. **Éprouvé en le cassant** (§1.1), douze mutations datées en tête du script —
dont la huitième est venue d'une contre-lecture du diff plutôt que d'une idée de départ : une
colonne peut porter **deux** contraintes bornantes, et n'en lire qu'une ferait affirmer au contrôle
le contraire de ce que la base applique.

**Et c'est une liste déclarée, jamais un inventaire prouvé complet.** Rien ne balaie le dépôt à la
recherche d'un miroir que personne n'a déclaré : la parade est l'habitude d'ajouter sa ligne en
écrivant la constante. `CLAUDE.md` a d'abord promis l'inverse, et la contre-lecture du soir même a
trouvé **quatre** miroirs non déclarés — `CanalPrefere` (la préférence de canal de rappel),
`IntentionTiming`, `LoopType` et `POSTES` —, tous ajoutés et éprouvés depuis. **Puis C4.4 en a
trouvé deux familles de plus le 21/09/2026**, en venant déclarer les siennes : `CarEngine` et
`TwoWheelerType`, avec les tableaux d'options qui les accompagnent. Elles étaient épinglées, mais
par des tests Jest portant les mêmes valeurs recopiées une seconde fois — précisément la garde que
cette section existe pour remplacer. Le motif se répète assez pour être nommé : **ce sont les
miroirs les plus anciens qui manquent**, écrits avant la règle, et rien ne les rappelle à personne.

Depuis la même vague, une constante s'y déclare **une fois par colonne qu'elle sert** : trois
colonnes portent le `check` de la motorisation, et rien n'oblige une migration à les faire bouger
ensemble — une déclaration unique les jugerait toutes les trois sur une. Le contrôle rend alors un
écart par colonne, ce qui dit aussi **laquelle** a dérivé.

Deux formes lui échappent **structurellement**, et il vaut mieux les connaître que de croire la
liste close :

- **une union recopiée en ligne** plutôt qu'importée depuis son `export type` — la lecture ne
  connaît qu'une forme, `export type X = 'a' | 'b';`. `loop_type` l'a été jusqu'au 20/09/2026 :
  `LoopType` existait déjà, et six endroits réécrivaient `'commute' | 'extras'` à la main, si bien
  que déclarer le miroir n'aurait gardé personne. Les six l'importent désormais — **la correction
  d'une recopie en ligne est de la rapprocher du type nommé**, le contrôle ne pouvant pas aller la
  chercher ;
- **une borne que la base confie à une fonction** plutôt qu'à une expression. `IntentionDay` (1…7)
  fait face à `check (public.check_intention_days(intention_days))` : ni littéral à énumérer, ni
  expression nommant la colonne seule, donc aucun des trois genres ne s'y applique.

### 2.8 Les renvois des documents, vérifiés à chaque PR

**La famille de défaut la plus fréquente de ce dépôt n'est pas dans le calcul : c'est une phrase
qui décrit ce que le code faisait avant.** Les quatre relectures du 20/09/2026 ont trouvé
trente-cinq affirmations fausses et **aucune** erreur de calcul, aucun mauvais argument, aucune
écriture d'état après garde. Une bonne part d'entre elles étaient des **renvois** : un seuil
annoncé dans un fichier où il ne vit pas, un test cité sous un nom qu'il n'a plus, un écran
désigné par un chemin qu'un chantier a déplacé.

`scripts/verifier-renvois-des-documents.mjs` compare les chemins cités entre accents graves dans
les **documents vivants** aux fichiers réellement présents. Il tourne dans le travail
« Typecheck & lint », sans `npm ci` ni export : il ne lit que le système de fichiers.

Celui qui l'a motivé : `CLAUDE.md` présentait le groupe d'onglets comme portant « plan.tsx … et
la pile suivi/ », alors que C5.2 avait fait du plan **une pile aussi**. (Le nom révolu est écrit
ici **sans accents graves**, et c'est une discipline que ce contrôle impose d'elle-même : un
chemin entre accents graves annonce un fichier qui existe. Citer un nom mort comme s'il était
vivant, c'est exactement ce qu'on cherche à empêcher — la garde a d'ailleurs rougi sur ce
paragraphe-ci en premier.) Le paragraphe
d'orientation le plus lu du dépôt se trompait deux fois, depuis des jours, et un `grep` l'aurait
vu en une seconde — mais personne ne le lance.

**Quatre choses à connaître avant d'y toucher :**

- **Il voit le renommage, pas le mensonge.** Un document peut nommer le bon fichier et raconter
  n'importe quoi de son contenu ; ça, seule une relecture le voit. C'est déjà la moitié de ce qui
  nous est arrivé.
- **Les documents datés sont hors périmètre**, volontairement : `docs/audit/` et les `v1-0N` sont
  des instantanés d'un jour. Un renvoi périmé y est **exact** — il dit où la chose était alors.
  Seuls `produit.md` et `v1-27` y entrent, parce que le dépôt les tient à jour. **Le kit de design
  y entre depuis le 26/09/2026, sous-dossiers compris** (`docs/design/design-system/`, un miroir
  tenu), et les extensions de documents, de feuilles et d'images avec lui : son index citait deux
  fichiers `.md` qui n'existaient nulle part, qu'un contrôle limité au code ne pouvait pas voir.
  Un répertoire cité seul lui échappe encore — sans extension, rien ne distingue un chemin d'un
  mot.
- **La comparaison se fait sur un suffixe de segment**, pas sur le nom de base : `plan/index.tsx`
  doit pouvoir se distinguer de `suivi/index.tsx`, sans quoi un déplacement de dossier passerait.
  Deux formes s'y ajoutent, chacune avec sa raison en tête du script : le chemin **servi**
  (`/.well-known/assetlinks.json`, dont le fichier vit sous `public/`) et le nom **lisible** d'une
  migration, sans son horodatage généré — cette dernière est bornée à `supabase/migrations/`.
- **Une tolérance qui ne couvre plus rien fait rougir le contrôle**, et c'est la seconde moitié du
  script. Une liste d'exceptions est exactement ce qui pourrit : celle qui a perdu son objet
  attend qu'un vrai écart porte le même nom pour le couvrir à son tour. Chaque entrée porte donc
  sa raison, et le passage vert les compte.

**Éprouvé en le cassant** (§1.1), une mutation par branche : un chemin déplacé dans `CLAUDE.md`,
et une tolérance qu'aucun document n'emprunte — puis six de plus le 26/09/2026 pour le kit et les
extensions, dont deux qui doivent rester **vertes** et le restent : sans l'extension `md`, ou sans
le kit dans le périmètre, l'écart qu'on y a posé n'est plus vu. Le détail est en tête du script.

### 2.9 Le chemin du compte, joué de bout en bout

**Le seul chemin du produit vers un compte existant n'était gardé par rien** jusqu'au 20/09/2026.
Jest ne voit pas partir un e-mail, pgTAP ne voit pas GoTrue, et le parcours réel ne joue que la
session anonyme. Quelqu'un qui change d'appareil, qui réinstalle, ou qui arrive sur
`/compte/suppression` depuis un navigateur neuf n'a que ce chemin — et le passage en PKCE du même
jour touchait ses trois branches d'un coup.

`scripts/verifier-code-de-connexion.mjs` — il portait le mot « lien » dans son nom jusqu'au passage
au code, le 20/09/2026, et a été renommé avec son sujet — demande un code **par l'écran**, lit l'e-mail réellement reçu, et
éprouve **cinq** choses dont deux seulement sont des chemins heureux :

1. le code rattache une adresse — jusqu'à une session non anonyme, et la base relue derrière ;
2. il rouvre un compte depuis un **navigateur neuf**, c'est-à-dire le cas que le lien ne pouvait
   pas faire (en PKCE il ne valait que là où il avait été demandé) ;
3. un code d'un flux **ne vaut pas** dans l'autre — c'est ce qui rend sûr de montrer le même écran
   de code dans les deux contextes ;
4. une adresse **sans compte** ouvre quand même la saisie du code (la non-divulgation, nommée
   plutôt que subie : sans cette assertion, le défaut se manifestait par un timeout) et aucun des
   deux e-mails ne porte de lien ;
5. une URL portant des jetons valides ne fait pas basculer de compte (celle-là garde PKCE, pas le
   code).

**Ce qu'aucune assertion ne peut prétendre** : que le code referme la confirmation d'une adresse
tierce. Il est un **porteur** — mesuré, un `POST /auth/v1/verify` sans aucune session confirme et
rend une session sur le compte du demandeur. Le code relève le prix du mauvais geste, il ne le
supprime pas, et l'en-tête du script le dit pour que personne ne lise l'inverse dans le vert.

**Et une mutation de gabarit exige un redémarrage de la stack** : GoTrue inline les gabarits au
démarrage du conteneur, donc modifier `supabase/templates/` sans `supabase stop && start` ne change
rien à l'e-mail envoyé — la garde reste verte, et on croit avoir éprouvé l'assertion 4. Relevé le
20/09/2026 en jouant justement cette mutation.

**Deux prérequis à connaître avant de s'étonner qu'il ne tourne pas** :

- **`[local_smtp]` doit être activé** dans `supabase/config.toml`. Il l'est depuis le 20/09/2026,
  et c'est ce qui rend ce script possible. Le collecteur est **Mailpit** et non Inbucket : le CLI
  a changé d'outil, les routes diffèrent (`/api/v1/search` contre `/api/v1/mailbox/<nom>`), et
  `supabase status -o env` publie encore la variable sous les **deux** noms — la première version
  du script prenait des 404 pour une boîte vide.
- **Il sert l'export sur le port 3000, et ce n'est pas négociable.** L'app calcule son
  `redirectTo` depuis `window.location.origin`, et GoTrue n'accepte que les origines de sa liste,
  dont `site_url = http://127.0.0.1:3000`. Sur un port au hasard, le lien retomberait sur la Site
  URL **sans rien dire**, et le script éprouverait autre chose que ce qu'il annonce.

**Et la leçon qui vaut pour n'importe quelle garde de bout en bout, payée deux fois ici.** Les
deux assertions dont le succès est une **absence** — « la session n'a pas basculé », « le lien
n'a pas ouvert de compte » — passaient toutes les deux pour la mauvaise raison :

1. elles relisaient « une » session au lieu d'attendre un **changement**, donc ramenaient
   l'ancienne avant que le SDK n'ait fini ;
2. et l'injection était lancée **pendant que l'app se routait encore** — la racine redirige côté
   client, et cette redirection emporte la navigation lancée en même temps, fragment compris.
   L'attaque n'avait donc pas lieu, et le script disait « refusée ».

Avec le flux implicite remis — c'est-à-dire la faille grande ouverte —, il restait **vert**. Une
garde dont le succès est une absence doit laisser à ce qu'elle interdit le **temps** et les
**conditions** de réussir ; sinon elle mesure son propre empressement. `TRACE_LIEN=1` imprime les
identifiants et l'URL finale, et c'est ce qui l'a montré.

### 2.10 Tester un écran — le critère, et ce que ça coûte

Un test d'écran est possible depuis le 20/09/2026 (`@testing-library/react-native`, et un
`moduleNameMapper` qui neutralise l'import CSS de `src/constants/theme.ts` — sans lui **tout**
test d'écran échoue au chargement). Le relevé de coût complet est en `v1-27` §12.11 ; ce qu'il
faut retenir ici tient en un critère et trois frottements.

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

**Trois frottements qui ne se voient pas quand on ne teste que de la logique pure** :

1. une variable citée dans une fabrique `jest.mock()` doit être préfixée `mock` — jest hisse les
   appels au-dessus des déclarations du fichier et refuse toute autre variable hors portée ;
2. `react-test-renderer` doit correspondre **exactement** à la version de React installée, sinon
   la bibliothèque refuse de se charger ;
3. le CSS, ci-dessus.

**Et le piège de fond, trouvé en mutant** : un test d'écran écrit spontanément n'affirme que des
**présences**. Il laisse alors passer tout ce qui est en trop — une phrase d'état vide rendue
au-dessus des pistes, par exemple, ne fait bouger aucune assertion de présence. Chaque branche
qu'on prétend garder demande donc sa moitié négative.

### 2.11 Les gabarits d'e-mail, comparés à leur référence

`scripts/verifier-gabarits-email.mjs`, dans le travail `Typecheck & lint` à côté de `§2.8` : ni npm
ci, ni export, ni Docker — il ne lit que des fichiers, et tombe en une seconde.

**Pourquoi il existe.** Les deux gabarits que le produit emprunte vivent à **deux endroits** :
`supabase/templates/`, la copie que GoTrue inline au démarrage de la stack locale, et
`docs/exploitation/gabarits-email.md`, la référence relisable — celle qu'on ouvre pour savoir ce que
la production envoie. Deux copies d'un même texte divergent par une faute de frappe que personne ne
relit : c'est le raisonnement de `mois_francais` et de sa jumelle `MOIS_FRANCAIS`, et celui du
tableau `MIROIRS` de §2.7.

**Et le document affirmait que cette égalité était déjà relue**, en désignant
`scripts/verifier-code-de-connexion.mjs` (§2.9) — qui rend un vrai e-mail contre la stack locale et
vérifie qu'il porte un code et aucun lien, mais **ne compare jamais le document aux fichiers**.
Relevé le 21/09/2026. Une garde promise et absente est pire qu'un commentaire périmé : le prochain
passage croit la dérive attrapée. La garde a été écrite plutôt que la phrase affaiblie.

**Trois familles d'assertion, et la troisième touche à la sécurité** :

1. le bloc ```` ```html ```` du document et le fichier disent exactement la même chose — la
   divergence est signalée avec la **ligne** et les deux versions ;
2. `supabase/config.toml` déclare chaque fichier. Sans son `content_path`, GoTrue retombe **en
   silence** sur son gabarit anglais par défaut, et §2.9 resterait verte pour la mauvaise raison ;
3. chaque gabarit porte `{{ .Token }}` et **aucune** forme de lien de confirmation
   (`{{ .ConfirmationURL }}`, `{{ .TokenHash }}`). C'est l'invariant du correctif du 20/09/2026 —
   aucun clic ne doit plus rien confirmer — et il n'était éprouvé que dans le seul travail exigeant
   Docker.

**Ce qui lui échappe**, et c'est structurel : `GABARITS` est une liste **déclarée**, comme `MIROIRS`,
donc un gabarit que personne n'y déclare lui reste invisible — aucune garde déclarative ne s'annonce
exhaustive. *Confirm signup* et *Reset Password* sont traduits dans le document et ne vivent **que**
dans le tableau de bord : aucun fichier du dépôt ne les porte. Et le tableau de bord lui-même reste
hors de portée de toute garde du dépôt, c'est le rôle de `docs/exploitation/`.

Mutations jouées le 21/09/2026 : une espace ajoutée dans le document → famille 1 tombe en nommant la
ligne ; `content_path` retiré → famille 2 ; `{{ .Token }}` remplacé par `{{ .ConfirmationURL }}` dans
le fichier → famille 3, et la 1 avec elle, le document n'ayant pas bougé.

### 2.12 Ce que le lecteur d'écran reçoit vraiment, vérifié dans l'export

Deux gardes d'export ont grandi le 24/09/2026 (`docs/architecture/v1-29-challenge-du-design-system.md`),
et pour la même raison : **ce que react-native-web transmet au lecteur d'écran ne se voit que dans
le DOM rendu** — ni le typecheck, ni Jest, ni un test d'écran ne le voient, puisqu'ils lisent les
props que le code **passe**, pas les attributs que la bibliothèque **écrit**.

- **`scripts/verifier-rendu-export.mjs` vérifie que chaque choix annonce son état** : tout élément
  de rôle `radio`, `checkbox` ou `switch` rendu porte `aria-checked`, et `/feedback` — où « Une
  idée » est choisie d'emblée — rend un `radio` **coché**. La seconde moitié n'est pas du zèle : sans
  elle, la garde passerait sur une page qui ne rend aucun choix, ou qui les rend tous
  `aria-checked="false"` écrit en dur. Le défaut qu'elle garde était le seul **critique** de l'audit :
  react-native-web 0.21 ignore l'objet `accessibilityState`, et chaque choix coché s'annonçait
  « non coché ».
- **`scripts/verifier-etats-export.mjs` gagne trois sections** : **C**, la barre d'onglets —
  chaque onglet fait au moins `ControlHeight.target`, **lu dans `theme.ts`** plutôt que recopié, et
  l'actif porte une forme pleine à 3:1 au moins quand l'inactif n'en porte aucune ; **D**, les routes
  à paramètre hydratent sans écart — une erreur d'hydratation y est **bloquante**, là où le contrôle
  de rendu la classe en avertissement par conception, et le HTML statique ne doit rien affirmer
  (`/rappels/stop` ne dit plus « plus valable », `/suivi/bilan` plus « pas pu être affiché ») ;
  **E**, le focus de l'onboarding suit la page, avec et sans « réduire les animations ».
- **Le 25/09/2026, trois de ces gardes ne prouvaient rien, et une quatrième manquait.** La moitié
  positive de `/suivi/bilan?id=` attendait « bilan », un mot que porte aussi le HTML statique
  (« Chargement de ton bilan… ») : elle passait avant comme après la correction. Elle attend
  désormais que l'écran **quitte** « Chargement » — sans nommer l'issue, qui est une copie d'erreur
  sans serveur — et qu'il ait **demandé** le bilan que l'adresse désigne. `/rappels/stop?jeton=`
  avait le même trou, son titre étant lui aussi dans le HTML : même réponse. La section E ne lisait
  le focus qu'au repos, et restait verte pendant qu'il revenait sur la page qu'on quitte : un
  journal posé avant le chargement relève désormais chaque `focusin` et chaque bascule d'`inert`
  **pendant** la transition. Et **G** tient le focus d'étape du questionnaire sur web, qu'aucune
  garde ne vérifiait. La leçon est celle de §1.1, sous une forme de plus : **une moitié positive
  doit porter sur ce que le HTML statique ne dit pas**, sans quoi elle garde le statique.

Les mutations qui les éprouvent sont datées en tête de chaque script, une par ligne, **chacune avec
son propre export** : le code est dans le bundle, donc une mutation sans export ne mute rien. Et un
export fait pendant qu'un autre tourne peut produire le bundle d'un autre arbre (`EXPO.md` §1.1) —
d'où `--clear`, et un marqueur du code courant à retrouver dans le bundle avant de conclure.

**Ce qui leur échappe, et qu'il ne faut pas prétendre gardé** : tout ce qui se passe sur natif.
`aria-checked` est mappé par React Native vers TalkBack, `announceForAccessibility` et
`sendAccessibilityEvent` n'ont d'effet que sur un appareil, et aucune de ces suites ne tourne sous
TalkBack. C'est la recette sur appareil qui les éprouve (`v1-29` §6.5).

**Et le lendemain, trois gardes de plus, parce qu'une contre-lecture de la livraison a trouvé ce que
les deux premières ne pouvaient pas voir** (25/09/2026) : un rôle juste qui ne répondait plus au geste
qu'il annonce, et des cases d'option sans groupe.

- **`verifier-etats-export.mjs`, section F — Espace coche une case d'option.** react-native-web n'active
  par Espace qu'un bouton ; depuis que les puces sont des `radio`, Espace ne cochait plus rien et
  faisait défiler la page (`src/lib/barre-d-espace.ts`). La section presse Espace sur une rangée, une
  puce et un item de mode du questionnaire, rempli hors ligne depuis un brouillon posé dans le
  stockage, et mesure **deux** choses : la case est cochée, **et rien n'a défilé**. Une mesure
  impossible — la page ne peut pas défiler sous le choix, le focus n'est pas pris — est un échec : sans
  défilement possible, « rien n'a défilé » ne prouverait rien. La mesure elle-même vit dans
  `scripts/mesurer-un-choix.mjs`, partagée avec le parcours réel.
- **Le parcours réel vérifie les groupes à chaque étape** — du questionnaire des deux profils, de la
  feuille d'engagement et de « Toi » : toute case d'option a pour groupe **le plus proche** un
  `radiogroup` nommé, toute case à cocher un `group` nommé, et **aucun `radiogroup` ne coche deux
  cases**. Les deux dernières règles viennent de ce qu'une précision vit **dans** le groupe de l'option
  qu'elle précise (`GroupeDeChoix`) : « le plus proche » attrape un groupe imbriqué qui aurait perdu son
  nom, que « un ancêtre » laisserait passer sur celui du mode ; et une précision privée de son propre
  groupe tombe dans celui du mode, **qui est bien nommé** — seule l'exclusivité la voit, le mode et la
  motorisation y étant cochés ensemble. **La première version de la garde n'avait pas cette règle, et
  son commentaire affirmait que « le plus proche » suffisait** : la mutation l'a démenti, la
  motorisation privée de son groupe n'étant vue qu'aux longs trajets, où elle n'est pas imbriquée.
  C'est une exclusion affirmée et vérifiée sur une paire de moins (`CLAUDE.md`, « Avant de lancer une
  vague »), trouvée par la seule mutation qui visait la paire manquante. Le premier profil touche
  « Oui » au second mode pour ouvrir « Lequel ? » — sans quoi aucun profil ne rend cette liste —, puis
  répond « Non » comme avant : les chiffres attendus ne bougent pas.
- **Le parcours réel joue le clavier là où il faut une session** : les jours de l'engagement, seule case
  à cocher du produit — Espace coche sans faire défiler, Entrée décoche (une seule activation), une
  barre maintenue coche une fois (la répétition) — et « Toi », seul écran de ce parcours où une ligne
  de canal se rend (la feuille des rappels ne s'ouvre sur web qu'avec une adresse rattachée) : la
  ligne « Par email » hors d'atteinte est désactivée, jamais cochée, **sans opacité**, son titre en
  texte tertiaire (lu dans `theme.ts`) et son détail à 4,5:1 au moins ; Espace choisit « Sans rappel »,
  et la base relue le confirme.

Les mutations sont datées en tête de chaque script. Deux choses restent hors de portée : **ce que
TalkBack annonce d'un groupe imbriqué**, et la position dans la série (« 2 sur 9 ») que Chromium
calcule mais que son protocole de débogage n'expose pas — la garde lit le groupe le plus proche dans
le DOM, et l'arbre d'accessibilité l'a confirmé une fois à la main, pas plus.
