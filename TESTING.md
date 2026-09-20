# Tests — conventions et pièges

Ce que Ramille a appris en écrivant ses deux suites (Jest sur la logique pure, pgTAP sur la
base). La **§1 vaut sur n'importe quel projet** ; la **§2** porte les fichiers, les chiffres et les
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

### 2.1 Les deux suites, et où passe la ligne

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

Les deux suites tournent en CI (`.github/workflows/ci.yml`) sur chaque pull request.

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

**Et le piège a un symétrique, relevé le 11/09/2026 : trois assertions de la suite échouent sur le
projet distant et passent en CI, parce qu'elles supposent une base vierge.** Les connaître évite de
« corriger » un test qui n'a rien.
- `12_usage_events` assertion 9 (« un horodatage antidaté est écrasé par celui du serveur ») lit
  `min(occurred_at)` sur **toute** la table : le projet distant porte des lignes réelles
  antérieures à sa fenêtre de cinq minutes, une stack locale neuve n'en a aucune.
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

**Le trou, mesuré le 20/09/2026** : 15 143 lignes d'écrans et de composants et 1 216 lignes
d'entrée-sortie (`src/lib`) n'étaient gardées par rien d'autre que la recette sur appareil. Les deux
premières suites prouvent la logique pure et la base ; entre les deux — les requêtes, les RPC, ce
que l'écran montre après une écriture — rien. Un `.eq('status', 'complete')` passait vert.

**`scripts/verifier-parcours-reel.mjs` joue le chemin nominal, et lui seul**, sur le profil de
`docs/recette/premier-parcours-web.md` : onboarding → questionnaire → soumission → restitution →
proposition de compte refusée → plan → engagement → un point généré comme le cron le ferait
(`generate_commute_checkins()`, appelé en `service_role`) et répondu → suivi → suppression du
compte, sans une ligne derrière. Après chaque écriture il relit la base **comme la personne**
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
recette — voiture, vols, huit pistes. Le second est un **cycliste dont le plan ne porte aucune
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

**Éprouvé en le cassant, le 20/09/2026**, six mutations sur l'arbre de travail, chacune suivie d'un
export — puisque le code est dans le bundle — et remise en place par l'opération inverse. Trois sur
le premier profil : un filtre écrit de mémoire (`'complete'`), un RPC au mauvais nom
(`commit_plan_actions`), la réponse au point vers un RPC au mauvais nom ; le parcours s'arrête
respectivement au plan, à l'engagement et au point, en nommant l'étape et la requête refusée. Trois
sur le second : la carte du premier plan rendue malgré un plan à zéro action, le cap qui chiffre
quand même, la félicitation reformulée.

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

**Dix-sept endroits du code recopient une contrainte de la base** — une puce du questionnaire, un
`.eq('status', …)`, une union de littéraux. Rien, depuis TypeScript, ne peut lire ce que la colonne
accepte : la convention était donc d'épingler chaque miroir par un test Jest portant les mêmes
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
et dans le module. **Éprouvé en le cassant** (§1.1), huit mutations datées en tête du script — dont
la dernière est venue d'une contre-lecture du diff plutôt que d'une idée de départ : une colonne
peut porter **deux** contraintes bornantes, et n'en lire qu'une ferait affirmer au contrôle le
contraire de ce que la base applique.
