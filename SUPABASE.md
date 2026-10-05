# Supabase — conventions et pièges

Ce que Ramille a appris de Supabase — Postgres, RLS, Auth, PostgREST, `pg_cron`, le CLI et les
outils MCP. La **§1 vaut sur n'importe quel projet Supabase** ; la **§2** porte les migrations, les
fonctions et les incidents propres à Ramille, et ne voyage pas. L'histoire complète est dans
`CLAUDE.md` (mécaniques et règles du produit) et dans les documents
`docs/architecture/v1-0N-*.md` que chaque paragraphe cite.

> **Quand lire ce fichier** : avant d'écrire, de rejouer ou de réécrire une migration · avant de
> toucher à un privilège, une policy, un trigger ou un RPC · avant de toucher à l'auth (session,
> lien de connexion, Redirect URLs) · devant un `401`, un `403` ou un `42501` inexpliqué · avant
> de retoucher `src/lib/database.types.ts` · avant de rejouer un test pgTAP sur le distant.

---

## 1. Ce qui vaut sur n'importe quel projet Supabase

### 1.1 Auth : rattacher, jamais recréer

- **Une session anonyme se convertit en gardant son `user_id`** — `linkIdentity()` pour un
  fournisseur OAuth, `updateUser({ email })` pour une adresse — et **jamais**
  `signInWithOAuth()` ou `signUp()`, qui créent un utilisateur distinct et perdent tout ce que
  la session anonyme avait écrit.
- **Le seul chemin vers un compte *existant* depuis un appareil neuf est `signInWithOtp` avec
  `shouldCreateUser: false`.** Sans ce drapeau, une page qui prétend supprimer un compte en
  fabrique un. Et **une adresse inconnue répond `422 otp_disabled`, qu'il faut traiter comme un
  succès** : distinguer les deux fait de l'écran un moyen de savoir qui utilise le produit.
- **Une limite d'envoi se reconnaît au code** (`over_email_send_rate_limit`), jamais au message —
  celui de Supabase ne contient pas le mot « rate ».
- **`AuthRetryableFetchError` n'est pas réservé à l'échec de `fetch`** : `lib/fetch.js` d'`auth-js`
  porte `NETWORK_ERROR_CODES = [500…504, 520…530]` et lève ce même nom pour chacun. Une garde
  « panne de transport » couvre donc les 5xx, et son message dit « n'a pas abouti », pas « n'est
  pas partie ». Corollaire pour les tests : un 500 fabriqué **sans `name`** n'éprouve rien, le
  SDK ne produit jamais cette forme.
- **`getSession()` remonte l'erreur de rafraîchissement** (`GoTrueClient.__loadSession`), donc
  « pas de session » recouvre trois situations : aucune session (créer), **jeton refusé** (ne pas
  créer — on donnerait un compte vide à qui en a un) et **panne de transport** (ne pas créer non
  plus, ne rien reprocher, réessayer au prochain lancement). **Mais pas au démarrage, mesuré le
  01/10/2026** (`auth-js` 2.116) : sur un jeton d'accès déjà expiré dont le rafraîchissement est
  refusé, l'initialisation retire elle-même la session (`_callRefreshToken`, `_removeSession`) avant
  le premier `getSession()`, qui ne voit alors ni session ni erreur — **exactement comme une première
  ouverture**. Rien de ce que rend `auth-js` ne les sépare : il faut que l'app sache, par une marque
  à elle, que l'appareil portait un compte. **Et l'événement ne suffit pas** : `SIGNED_OUT` part bien
  au retrait (mis en file pendant l'initialisation — `_pendingInitNotifications` — puis délivré une
  fois `initializePromise` résolue, avant la suite de `getSession()`), mais une session **anonyme**
  refusée — purgée, révoquée — le déclenche à l'identique, et l'événement, tenu en mémoire, ne survit
  pas à un redémarrage. Ramille : `src/lib/marque-de-compte.ts`, corrigé le 02/10/2026, `v1-27` §12.27.
- **La création de session est un « lis puis écris », donc elle s'enveloppe dans un
  partage de promesse en vol.** Deux appels lancés dans le même rendu lisent tous les deux « pas
  de session » avant que l'un n'ait écrit : deux comptes anonymes, dont un orphelin qui consomme
  le quota, gonfle les statistiques de nouveaux visiteurs et peut recevoir le jeton d'appareil.
  Rien ne le signale.
- **Un jeton d'appareil se réenregistre à chaque changement d'utilisateur**
  (`onAuthStateChange`), pas seulement au démarrage — un lien de connexion ouvre la session d'un
  utilisateur *différent* de la session anonyme qui venait de l'enregistrer.
- **`signOut()` sans argument est global** (`options = { scope: 'global' }` dans `GoTrueClient`) :
  le serveur ferme **toutes** les sessions du compte, et les autres appareils perdent la leur au
  premier rafraîchissement de jeton. Une sortie « de cet appareil » s'écrit
  `signOut({ scope: 'local' })`, qui ne révoque côté serveur **que** la session courante puis vide
  le stockage. **Toute portée appelle `/logout`** (lu dans `_signOut` d'auth-js 2.116) : après la
  suppression de l'utilisateur, le serveur répond donc 403 quelle que soit la portée — le jeton
  désigne un utilisateur qui n'existe plus —, et `auth-js` l'avale en vidant tout de même le
  stockage. Ce 403 est attendu, et il ne se corrige pas par la portée. **Et une erreur n'est pas une
  session restée ouverte** : sur une panne de transport, `auth-js` ferme la session locale **puis**
  rend l'erreur ; ce qui dit si l'on est encore connecté est `getSession()`, relu après. Relevé à
  Ramille les 29 et 30/09/2026, sur les deux sorties du compte (`src/lib/compte.ts`).

### 1.2 La liste des Redirect URLs est une frontière de sécurité

Elle décide à quelles adresses Supabase accepte de **remettre une session** — un lien de
connexion renvoie les jetons dans le fragment de l'URL d'arrivée. Une entrée trop large est donc
une prise de contrôle de compte : `https://*.vercel.app/**` autorise **tout le domaine
`vercel.app`**, où n'importe qui déploie en trois minutes, et un tiers peut demander un lien pour
l'adresse de quelqu'un d'autre en pointant l'arrivée chez lui. Deux règles : **jamais de joker
sur un domaine qu'on ne possède pas** (un motif de preview porte au moins le suffixe de compte —
et même lui ne fait que resserrer, §2.5) ; **une entrée morte se retire**, parce qu'elle ne se lit
pas « obsolète » mais « autorisé ». Rien dans le code ni dans la CI ne voit cette liste : elle se
vérifie en la lisant, entrée par entrée, et le relevé se consigne (`docs/exploitation/redirect-urls.md`).

### 1.3 PostgREST : trois choses qu'un code d'erreur ne dit pas

- **`PGRST303` n'est pas « jeton en avance »**, c'est toute la famille des claims, expiration
  comprise. Le seul refus qui se répare en attendant — « JWT issued at future », un écart
  d'horloge entre Auth et PostgREST, où l'horloge de l'appareil n'entre nulle part et où
  rafraîchir aggrave — se reconnaît donc **au code ET au message**, et se rejoue au plus deux
  fois. Le réessai est sûr parce que le contrôle du jeton précède l'exécution ; ne pas l'étendre
  aux autres refus. Et le corps se lit sur une **copie** (`clone()`), sinon toutes les erreurs
  deviennent illisibles, en silence, sur les seuls chemins où personne ne regarde.
- **Deux clés étrangères vers la même table imposent de nommer la relation** dans un `select`
  imbriqué (`table!nom_de_la_fk(…)`) : sans le nom, PostgREST refuse (« more than one
  relationship was found ») et l'écran ne charge plus du tout. Seul le typecheck sur la chaîne
  du `select` l'attrape.
- **Un `42501` vient soit du privilège, soit de la RLS**, et on ne le sait pas de l'extérieur —
  ce qui rend les tests de refus faciles à écrire pour rien (`TESTING-PGTAP.md` §1.7).
- **Une lecture qui échoue est rejouée, par défaut, et rien ne le dit.** `@supabase/postgrest-js`
  (2.116) rejoue tout `GET`, `HEAD` ou `OPTIONS` dont le `fetch` rejette, et ses `503` et `520`,
  trois fois, à 1, 2 puis 4 s : hors ligne, l'erreur arrive après **sept secondes**, pendant
  lesquelles l'écran dit « Chargement… ». `createClient` le règle par `db: { retry: false }`, que
  `supabase-js` transmet. Chez Ramille, c'est le réglage depuis le 01/10/2026 (`v1-33` R-5, P-3) :
  mesuré sur l'export hors ligne, le plan arrivait à son écran d'erreur à 7 989 ms, il y arrive à
  613 ms, et chaque écran porte déjà son « Réessayer ». Le coût est assumé : un raté d'une seconde
  n'est plus absorbé, les `503` et `520` non plus. Les écritures n'ont jamais été rejouées, la
  seconde chance de `PGRST303` est une couche au-dessous (`fetchAvecSecondeChance`), et `auth-js` a
  son propre régime. `src/lib/supabase.test.ts` garde le réglage et sa transmission.

### 1.4 Privilèges, policies et RPC

- **Écrire les privilèges de table dans une migration.** Le défaut de plateforme d'un projet neuf
  (et le drapeau `auto_expose_new_tables` de la stack locale, en voie de suppression) accorde
  tout à `anon` et `authenticated` sans qu'aucun fichier ne le dise ; une base reconstruite depuis
  les migrations n'accorde alors rien à personne — « permission denied » **avant** la RLS. Une
  migration qui ne contient que des `grant`/`revoke` est rejouable telle quelle, et un test
  épingle la matrice. **Ajouter une table impose un geste explicite**, et un privilège se justifie
  par un appel réel depuis l'app, jamais par « un test en a besoin ».
- **Le 30/10/2026, la plateforme cesse d'accorder d'office l'accès aux tables neuves de `public`
  sur les projets existants** (annonce reçue le 28/09/2026 ; le CLI avait basculé le
  30/05/2026, §2.2). Un dépôt qui écrit déjà ses privilèges n'a rien à changer, et trois
  choses que l'annonce ne dit pas valent d'être sues :
    * **son modèle de `grant` est un plafond, pas un point de départ** : `select` à `anon`, les
      quatre ordres à `authenticated` et à `service_role`, sur chaque table. Le recopier défait ce
      que la RLS ne sait pas faire — un `grant update` de table rend sans effet un privilège de
      colonne, et la RLS filtre des lignes, jamais des colonnes (plus bas) ;
    * **la parade que sa documentation donne ne vise que `for role postgres`, et le réglage du
      tableau de bord ne fait rien d'autre** (Integrations → Data API → Settings, « Default
      privileges for new entities » ; mesuré le 02/10/2026 après l'avoir désactivé). Il réécrit
      les privilèges par défaut de `postgres` et laisse ceux du second créateur, `supabase_admin`,
      tels quels — que `postgres` ne peut pas modifier non plus. Ce qui compte est donc le rôle
      qui **crée** chaque objet, et il ne se lit pas après coup : le propriétaire n'en est
      qu'un indice, puisqu'un changement de propriétaire garde les autres bénéficiaires de
      l'ACL. Ce qui tranche est le relevé des privilèges réels ;
    * **et une fonction neuve reste exécutable par `anon`** une fois le réglage désactivé : il
      retire `anon` et `authenticated` des privilèges par défaut du schéma, mais `EXECUTE` à
      **PUBLIC** est le défaut global de PostgreSQL, qu'un `alter default privileges … in schema`
      ne peut pas retirer (mesuré le 02/10/2026 : `proacl` nul, `anon` exécute). La quatrième
      instruction de la parade de Supabase, qui fait ce retrait `in schema public`, est donc
      sans effet. Le `revoke execute … from public` par fonction (plus bas) reste la seule
      garde en place ; une entrée globale — `alter default privileges for role postgres revoke
      execute on functions from public`, sans `in schema` — en serait une seconde, à décider à
      part, puisqu'elle vaudrait pour tous les schémas, `analytics` compris.
- **`revoke execute … from anon, authenticated` ne révoque rien** : PostgreSQL accorde `EXECUTE`
  à **PUBLIC** à la création, et les deux rôles en héritent. Il faut `from public, anon,
  authenticated`. Un `create or replace` ne préserve pas non plus l'ACL qu'on croit.
- **La RLS filtre des lignes, jamais des colonnes.** Une policy UPDATE owner-scoped sur une table
  qui porte des valeurs figées (des chiffres calculés, des libellés instantanés, une clé
  d'idempotence, un statut) ouvre **toutes** les colonnes. Une écriture qui ne doit toucher qu'à
  trois colonnes passe par un RPC `security definer` qui vérifie la propriété, et la table ne
  garde que `select` ; deux gardes indépendantes (pas de policy, pas de privilège).

  **Et quand le client doit écrire UNE colonne et une seule, le bon outil est le privilège de
  colonne**, pas un RPC de plus : `revoke update on t from authenticated;` puis
  `grant update (col) on t to authenticated;`. C'est ce que Postgres donne exactement là où la RLS
  s'arrête. Trois choses à savoir avant de s'en servir :
    * **l'ordre compte** — un `grant` de colonne s'**ajoute** au privilège de table, il ne le
      remplace pas, donc la révocation doit précéder sous peine de ne rien changer ;
    * **`information_schema.role_table_grants` ne le voit pas.** Une matrice de privilèges bâtie
      sur cette vue lit « plus aucun UPDATE » et ne dit rien de la colonne qui reste ouverte : il
      faut une assertion séparée sur `column_privileges` ;
    * **le refus est bruyant** (`42501`) mais seulement si l'ordre **nomme** la colonne interdite,
      d'où des assertions qui en écrivent une à la fois.
  Premier emploi dans ce dépôt : `assessments`, dont le client n'écrit que `status` à la
  soumission alors qu'il portait l'`update` sur les cinq colonnes, `submitted_at` et `user_id`
  comprises (`20260920160000`).
- **Et quand le client doit garder une colonne mais pas l'une de ses valeurs**, le privilège de
  colonne ne suffit plus : c'est un trigger qui refuse la **transition**, et il distingue le RPC du
  client en lisant `current_user`. Dans une fonction `security definer`, `current_user` vaut son
  propriétaire, y compris dans les triggers que ses ordres déclenchent ; depuis PostgREST, il vaut
  le rôle de la requête (`anon`, `authenticated`). Premier emploi : `assessments.status`, que la
  soumission écrit et que seul `retirer_le_bilan` peut passer à `withdrawn`
  (`20260927230411_retirer_un_bilan.sql`). Deux choses à savoir : la garde laisse passer **tous**
  les rôles serveur (`postgres`, `service_role`, les fixtures), ce qui est voulu — c'est le client
  qu'on borne ; et une garde d'**état** (« seul un bilan complété se retire ») doit s'écrire à côté,
  pas à la place, parce que sous un rôle serveur celle de rôle ne dit rien — le fichier 34 les
  éprouve séparément. **Et ce que la garde laisse passer, rien ne le complète** : un
  `update … set status = 'withdrawn'` sous `postgres` — par `execute_sql`, accordé sans confirmation
  sur la production — ne reconstruit pas le plan, et la garde d'idempotence du cron laisse ensuite
  le cycle bâti pour toujours sur un bilan retiré. **Côté serveur, on appelle donc le RPC, jamais on
  ne le réécrit à la main** : `auth.uid()` lit `request.jwt.claims`, donc dans une transaction
  `set local role authenticated` puis `set_config('request.jwt.claims', json_build_object('sub',
  '<uuid>', 'role', 'authenticated')::text, true)` suffisent — c'est ce que fait
  `34_retirer_un_bilan.test.sql`. Une liste recopiée du corps oublierait tôt ou tard une ligne (le
  désengagement du seul bilan, par exemple, qu'aucun `update` de statut ne fait).
- **Un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
  `security definer`** — sinon, depuis le rôle applicatif, le comptage ne voit rien et le quota
  ne se déclenche jamais. Corollaire pour les tests : remplir un quota sous `postgres` par
  commodité, c'est le tester dans le seul rôle où il ne sert à rien.
- **`user_id = (select auth.uid())` et jamais `user_id = auth.uid()`** : la seconde forme réévalue
  un appel volatile pour chaque ligne examinée au lieu d'une fois en initplan. Un balayage de
  test sur *toutes* les policies garde le point — éprouvé sur une policy fautive fabriquée exprès.
- **Postgres n'indexe jamais le côté enfant d'une clé étrangère.** Ça ne se voit que le jour où
  l'on supprime des parents ; si une fonction supprime et reconstruit, chaque suppression balaie
  la table enfant en entier. Ces index ne servent aucune lecture, donc le lint `unused_index` les
  signalera sans qu'il faille les retirer.
- **Une colonne vide n'est pas une colonne morte** : ce qui qualifie une colonne morte, c'est
  qu'aucun code ne l'écrit. Et une colonne homonyme avec un vocabulaire *différent* segmente sur
  `NULL` sans lever d'erreur — vérifier qu'une colonne est *alimentée* avant de s'y fier.

### 1.5 Migrations : ce que la CI ne voit pas

- **Une migration de données ne désigne jamais une ligne par un identifiant généré.** Un
  `gen_random_uuid()` diffère sur chaque base construite depuis les migrations : ce qui apparie
  sur le distant n'apparie **rien** en CI. Désigner par la clé naturelle, garantie par un index
  unique, et poser un contrôle (« aucune ligne sans la valeur attendue ») — c'est le contrôle qui
  rend l'appariement sûr, pas la relecture.
- **Une migration se rejoue telle quelle après une restauration.** `add constraint` n'est pas
  idempotent (`drop constraint if exists` devant) ; et une substitution vérifiée
  (`if occurrences <> 1 then raise`) doit reconnaître « déjà appliquée » par la **présence du
  remplacement** — jamais par la seule absence de l'ancre, qui couvrirait aussi un corps réécrit
  autrement. Le défaut ne se voit ni en CI (base neuve, un seul passage) ni au premier
  déploiement : il se voit le jour d'une restauration.
- **Le distant peut porter des corps de fonction sans les commentaires du dépôt** (un outil
  d'application qui allège). Une ancre de substitution ne contient donc **jamais** de ligne de
  commentaire, et comparer un corps installé au dépôt se fait sur des empreintes normalisées.
- **Rejouer un fichier ancien peut défaire une migration plus récente**, et la CI, qui rejoue
  tout dans l'ordre, ne le verra jamais : avant de rejouer, lister les fonctions que le fichier
  réécrit en entier (`grep -n 'create or replace function'`) et vérifier qu'aucune migration
  postérieure ne les touche ; sinon rejouer ensuite le bloc le plus récent pour chacune.
- **Réécrire une fonction existante part de `pg_get_functiondef`**, jamais du fichier qui l'a
  créée — les gardes ajoutées depuis disparaissent en silence, et seul le fichier de test qui
  possède la fonction l'attrape. Corollaire : une migration qui touche une fonction existante
  impose de rejouer le fichier de test qui la possède.
- **L'outil qui applique pose son propre horodatage, donc le nom du fichier et celui de
  l'enregistrement divergent — et la parade se joue APRÈS, pas avant.** « Appliquer sous
  l'horodatage du fichier » est une consigne qu'on ne peut pas tenir : l'appelant ne le choisit
  pas. Ce qu'on peut tenir, c'est relever l'horodatage enregistré une fois l'application faite
  (une requête sur la table de migrations du projet) et **renommer le fichier dessus** avant de
  pousser. Ce n'est pas réécrire un historique — rien d'appliqué ne change, aucun ordre ne bouge :
  c'est donner au fichier le nom de son enregistrement, pour qu'on puisse, en partant d'un
  enregistrement, retrouver le fichier qui l'a produit.
- **Une sous-requête latérale qui ne nomme pas la ligne n'est évaluée qu'au gré du plan.**
  `cross join lateral (select gen_random_uuid() as jeton) o` ne dépend d'aucune colonne : rien
  n'oblige Postgres à la refaire pour chaque ligne, et selon les statistiques il la sort de la
  boucle de jointure et la calcule une fois pour toute l'instruction — un seul jeton pour tous les
  rappels de l'exécution, refusé par l'index unique dès la deuxième ligne. Elle doit **nommer la
  ligne** (`select c.id as checkin_id, gen_random_uuid() as jeton`, et la lire) : une sous-requête
  qui dépend de la ligne se réévalue pour chacune, et Postgres ne fond pas dans la requête
  englobante une sous-requête qui porte une fonction volatile, donc les deux usages de la valeur
  lisent le même tirage. La CI ne le voit pas : sa base, petite et jamais analysée, garde l'autre
  plan (`TESTING-PGTAP.md` §1.7).
- **Un fichier de types tenu à la main dérive sans que le typecheck le voie** — il vérifie le code
  contre le fichier, jamais le fichier contre la base. Comparer en CI les **colonnes** du fichier
  à celles d'une base reconstruite (`supabase gen types typescript --local`), et jamais le
  texte : le fichier vient du distant et la CI du CLI local, un `diff` brut serait rouge dès le
  premier passage pour une raison de forme.

### 1.6 `pg_cron`, `http` et Vault

- **Un cron qui doit committer entre deux passes appelle une procédure**, à laquelle on n'ajoute
  ni `security definer` ni `set search_path` : les deux rendent le contexte atomique et font
  échouer le `commit`.
- **Un journal de passage reçoit une ligne à chaque passage, y compris quand il n'y a rien à
  faire et quand un secret manque.** Zéro ligne veut alors dire « le passage n'a pas eu lieu »,
  jamais « il n'y avait rien à envoyer » ; mettre l'`insert` sous une garde « seulement s'il y a
  du travail » détruit la seule question que le journal existe pour trancher.
- **Une synchronisation externe en SQL pur** (extension `http`, appelée par `pg_cron`) évite une
  Edge Function et un secret de plus ; le mapping vers les identifiants distants vit dans une
  table, jamais en dur dans la fonction, sinon un ajout reste figé en silence.
- **Un envoi gardé par des secrets Vault absents n'est exercé par aucune suite** — ni la CI, où ils
  manquent, ni le distant, où le rejouer enverrait pour de vrai. Ce qui s'y vérifie s'évalue à la
  main sur une vraie ligne.

### 1.7 Les hooks d'Auth en fonction Postgres

Appris le 05/10/2026 en écrivant le « Send Email Hook » (plafonds d'e-mail, `COMPTE.md`), tout mesuré
sur la stack locale :

- **Deux secondes, et rien ne les allonge.** Auth pose `statement_timeout = 2s` avant d'appeler la
  fonction ; un `set statement_timeout` en attribut de fonction ne change rien (la minuterie court déjà),
  et le dépassement rend un `500 unexpected_failure`. Un appel HTTP synchrone s'y borne donc lui-même
  (`CURLOPT_TIMEOUT_MS`), et se mesure depuis le projet avant d'être choisi.
- **Une erreur du hook annule la transaction d'Auth, la sienne comprise** : un refus ne laisse aucune
  ligne dans un journal que le hook tiendrait. Seul ce qui réussit se consigne ; le reste se lit dans
  les journaux d'Auth.
- **L'erreur rendue arrive au client avec son `http_code` et le code `unknown`** — `{"error":
  {"http_code": 429, "message": …}}` donne `429`, `error_code: "unknown"`. Un client qui reconnaît les
  erreurs à leur code doit donc garder le statut en repli.
- **`pg_net`, l'envoi asynchrone, ouvre l'exécution à `anon` et `authenticated`, et sa file à PUBLIC**
  (accordés par `supabase_admin` ; `postgres` ne peut pas les retirer). Sans exposition du schéma `net`
  par l'API ce n'est pas exploitable, mais une clé d'API passée en en-tête y transite par une table
  lisible de tous, et un échec du fournisseur devient muet. Le synchrone (`http`) est préférable quand
  il tient dans le délai.
- **Répondre `{}` vaut succès, et Auth a déjà renouvelé le code** : un plafond « muet » (le hook ne
  renvoie rien et n'envoie rien) laisse Auth enregistrer le nouveau jeton, donc le code que la personne
  avait reçu ne vaut plus, et aucun autre n'arrive. Se taire protège la non-divulgation au prix de ce
  cul-de-sac ; refuser l'éviterait (l'erreur annule la transaction, l'ancien code reste) au prix de dire
  ce que le silence tait. Ce choix-là est un choix de produit.
- **Le hook d'envoi reçoit des types que le produit n'emprunte pas** (inscription, réinitialisation,
  notifications) : répondre `{}` sans envoyer les éteint, mais répondre une erreur dirait qui a un
  compte, puisqu'Auth ne les fait partir que pour des adresses connues. Et pour `email_change`, les
  noms des champs sont croisés (`token_hash_new` va avec l'adresse **actuelle**) : avec « Secure email
  change », un compte qui a déjà une adresse reçoit deux codes ; une session anonyme, un seul, dans
  `token`.
- **Une fonction de hook se déclare dans `config.toml` pour la stack locale** (`[auth.hook.send_email]`)
  et s'allume au tableau de bord pour le distant, qui ne lit pas ce fichier. Un secret Vault posé dans
  `[db.vault]` n'existe qu'en local : c'est ce qui permet au hook de choisir un transport de test sans
  qu'aucune valeur de production ne descende dans le dépôt.

---

## 2. Propre à Ramille

### 2.1 Migrations, types et CI

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1` — nom
du dépôt ; le tableau de bord l'affiche `TraceVerte`, et c'est sous ce nom-là qu'on le cherche —
(via `mcp__Supabase__apply_migration`). **Après toute migration, `src/lib/database.types.ts` se
retouche à la main** — on y ajoute ce que la migration a changé plutôt que de le régénérer, et
`mcp__Supabase__generate_typescript_types` ne sert que de référence à recopier. Le fichier n'a pas
de formateur automatique dans ce repo (pas de prettier installé), donc respecter le style existant
(guillemets doubles).

**Et le job `db-tests` compare aussi `src/lib/database.types.ts` à la base qu'il vient de
construire** (C3.12) : `supabase gen types typescript --local`, puis
`scripts/verifier-types-base.mjs`. Le fichier est tenu à la main — on y ajoute les colonnes plutôt
que de le régénérer, un diff de mille lignes pour trois — et **le typecheck ne peut pas voir cette
dérive** : il vérifie le code **contre ce fichier**, jamais le fichier contre la base. Une colonne
oubliée dans `Insert` rend impossible d'écrire une colonne qui existe ; une colonne fantôme laisse
écrire une colonne qui n'existe plus, et l'échec arrive à l'exécution, en anglais, chez la personne.
La comparaison porte sur les **colonnes** et jamais sur le texte : le fichier du dépôt vient du
projet distant et la CI du CLI local, donc un `diff` brut serait rouge dès le premier passage pour
une raison de forme, et finirait désarmé.

**Depuis le 20/09/2026, le bloc `Functions` est comparé aussi** — le nom de chaque fonction, le nom
de ses arguments et leur optionalité, **jamais leur type**. La raison est mesurée, pas de principe :
le générateur rend `string` pour tout argument `text` sans savoir si la fonction accepte `null`, et
`mettre_a_jour_le_contexte(p_teletravail)` l'accepte — le fichier du dépôt dit donc
`string | null`, plus juste que la sortie du générateur. Comparer les types obligerait à choisir
entre un contrôle rouge à demeure et un type faux dans le code. Ce que le contrôle ne voit pas : une
**surcharge** (deux signatures du même nom), que le générateur rend en union et que l'analyseur
ignore des deux côtés — le dépôt n'en a aucune, par décision (C2.4 et C4.6 remplacent une signature
plutôt que d'en ajouter une). L'analyseur lit les deux formes du générateur (une fonction courte sur
une ligne, une longue développée) et l'ancienne écriture `Args: Record<PropertyKey, never>` du CLI
à côté de `Args: never`, et il ne lit que le schéma `public` — le CLI émet aussi `graphql_public`,
**devant** lui, ce que le générateur du distant ne fait pas, et la première CI de ce contrôle a rougi
là-dessus. Dix mutations datées en tête du script disent ce qu'il attrape.

**Et le même travail compare les listes de valeurs** (`scripts/verifier-miroirs-de-check.mjs`,
20/09/2026) : les constantes et unions de littéraux qui recopient un `check` du schéma y sont
déclarées une par une — **déclarées, pas détectées** : un miroir absent du tableau `MIROIRS` n'est
gardé par rien, et écrire une constante qui recopie un `check` impose d'y ajouter sa ligne. Rien
depuis TypeScript ne peut lire ce que la colonne accepte. Le contrôle lit `pg_constraint` sur la base que
les migrations viennent de construire — jamais les fichiers de migration, qui mentent dès qu'une
contrainte a été remplacée ou qu'une colonne homonyme a vécu ailleurs (`zone_type` sur `profiles`).
**Corollaire pour qui écrit une migration** : changer un `check` sans suivre côté TypeScript rend ce
contrôle rouge, et c'est le but — le miroir se corrige, jamais la base. `TESTING-GARDES.md` §2.7 dit les
trois genres de comparaison, et pourquoi une union de littéraux se lit dans le source quand tout le
reste s'importe.

### 2.2 Privilèges, policies et index

**Les privilèges de table sont écrits, et `supabase/config.toml` ne porte plus
`auto_expose_new_tables`** (10/09/2026). Jusque-là aucune migration n'accordait le moindre
privilège : `anon` et `authenticated` tenaient les leurs du défaut de plateforme d'un projet
neuf, et la stack locale le rejouait par ce drapeau. Une base reconstruite depuis
`supabase/migrations/` n'accordait donc rien à personne — l'app répond « permission denied for
table … » **avant** d'atteindre la RLS — et rien dans le dépôt ne le disait. Le CLI n'expose plus
par défaut depuis le 30/05/2026 (absent et `false` suivent le même chemin de code) et supprime le
champ le 30/10/2026 : l'écrire programmerait la panne. Tout vit dans
`20260910110000_grants_explicites.sql`, qui ne contient que des `grant`/`revoke` — donc rejouable
tel quel après une restauration — et `18_grants_explicites.test.sql` épingle la matrice entière.
**Ajouter une table impose donc un geste explicite** : un `grant` dans ce fichier si l'app y
touche, ou un `revoke all privileges … from anon, authenticated` dans sa propre migration si elle
est serveur-only. Ne rien écrire la rend invisible pour l'app, en silence — même mécanique que
`emission_factor_sources` et `usage_event_types`.

**Et « invisible » était faux jusqu'au 20/09/2026 : c'était « ouverte à tous ».** Le raisonnement
ci-dessus ne regardait que les `grant` écrits dans les migrations, et oubliait
`pg_default_acl` — les privilèges que Postgres accorde **d'office** sur tout objet créé dans un
schéma. Un projet Supabase en pose deux jeux, un par créateur (`postgres` et `supabase_admin`),
et chacun donne `arwdDxtm` à `anon` et à `authenticated` : une table neuve était donc lisible,
modifiable et **supprimable** sans session, RLS inactive par-dessus le marché. Retirer
`auto_expose_new_tables` n'y changeait rien, contrairement à ce que l'en-tête de
`20260910110000_grants_explicites.sql` laissait croire : ce drapeau pilotait l'exposition
PostgREST, pas les privilèges par défaut.

Trois choses à retenir, portables :

1. **`alter default privileges` est le seul outil**, et il est borné au rôle créateur :
   `alter default privileges in schema public revoke all on tables from anon, authenticated`
   ne couvre que les objets créés par le rôle qui l'exécute. Les migrations tournant en
   `postgres`, c'est bien la moitié qui décide du sort de nos tables.
2. **`postgres` ne peut pas toucher celle de `supabase_admin`** (`permission denied to change
   default privileges`, constaté), **et le tableau de bord non plus**. Ce paragraphe a écrit
   jusqu'au 02/10/2026 qu'elle s'y désactivait : le réglage « Default privileges for new
   entities » (Integrations → Data API → Settings) a été désactivé, et le relevé de
   `pg_default_acl` montre la ligne `postgres` réécrite et la ligne `supabase_admin` intacte
   (§1.4). **Elle reste donc ouverte, et ne vaut que pour les objets que `supabase_admin`
   crée** : nos migrations, `apply_migration` comprise, et `execute_sql` tournent sous
   `postgres`, et au 02/10/2026 toutes les relations et toutes les fonctions de `public` lui
   appartenaient. Le propriétaire n'étant qu'un indice du créateur (§1.4), ce qui tranche est
   le relevé des privilèges réels — celui du 02/10/2026 rend, pour `anon` et
   `authenticated`, exactement la matrice de `18_grants_explicites.test.sql`. Ce qui rendrait
   cette moitié réelle est un objet que Supabase créerait lui-même dans `public` — une
   extension installée dans ce schéma depuis le tableau de bord, par exemple. L'en-tête de
   `20260920190000` dit encore qu'elle « se désactive au tableau de bord » : migration livrée,
   on ne la retouche pas (§2.3). Le registre porte les relevés, chiffres compris, et la
   vérification du 31/10 (`docs/exploitation/README.md` §3.1 et §5).
3. **Ni la CI ni pgTAP n'auraient vu l'oubli**, parce que la stack locale porte exactement les
   mêmes entrées que le distant. La garde qui manque est donc une **assertion**, pas une
   relecture : `31_gardes_sous_les_gardes.test.sql` en porte trois, dont une lue sur
   `pg_default_acl` lui-même — l'absence de ligne étant le bon état, Postgres la retirant quand
   il ne reste que le défaut. Un privilège se justifie par un appel réel
depuis `src/`, jamais par « un test en a besoin » ; et un test qui n'assure qu'un refus reste vert
après un `revoke`, « permission denied » et « violates row-level security » portant tous deux le
SQLSTATE 42501.

**Une policy appelle `auth.uid()` dans un sous-select, et une clé étrangère neuve veut son index.**
Les deux se sont fait prendre en contre-lisant la vague 4, et aucune ne se voit à la lecture :
- `user_id = (select auth.uid())` et `user_id = auth.uid()` se comportent exactement pareil ; la
  seconde forme réévalue un appel volatile **pour chaque ligne examinée** au lieu d'une fois en
  initplan. La policy de `plan_action_commitments_archive` était la seule du schéma à la porter.
  Le balayage de la §E de `03_rls_policies.test.sql` garde désormais le point sur **toutes** les
  policies, sans en nommer aucune — et il a été éprouvé sur une policy fautive fabriquée exprès,
  sinon il resterait vert quoi qu'il arrive.
- Postgres n'indexe jamais le **côté enfant** d'une clé étrangère. Tant que personne ne supprime de
  parent ça ne se voit pas, mais `generate_plan_cycle_for_user` **supprime et reconstruit** des
  cycles à chaque re-bilan et à chaque saison : sans index, chacune de ces suppressions balayait
  `plan_actions` en entier pour dénuller `carried_over_from`. Quatre index posés par
  `20260912180000`, deux partiels (la colonne est nulle dans l'immense majorité des lignes). Ils ne
  servent **aucune lecture** du produit, seulement les suppressions — donc le lint `unused_index`
  les signalera un jour sans qu'il faille les retirer.
- **L'inverse existe aussi, et il est mesuré** (20/09/2026) : le lint `unindexed_foreign_keys`
  signale **sept** clés étrangères sans index, toutes vers `transport_modes`
  (`assessment_answers.commute_mode`, `.commute_second_mode`, `.leisure_mode`,
  `assessment_results.commute_poste_mode`, `.dominant_poste_mode`,
  `action_templates.substitute_mode_id`, `engagement_checkins.mode`). Elles restent sans index
  **exprès** : un référentiel d'une vingtaine de lignes qu'aucun code ne supprime (le seul
  `delete from transport_modes` du dépôt est le re-seed de `20260824180000`, joué quand aucune table
  enfant n'existait), des clés en `on delete no action`, et aucune lecture du produit qui parte d'un
  mode vers ses lignes enfants — sept index n'auraient ni suppression à protéger ni requête à servir.
  L'avis les signalera à chaque passe ; ce paragraphe est là pour que le tri soit une lecture et non
  une re-décision. Ce qui le rouvre : retirer un mode du référentiel — poser les index **avant** le
  `delete`.

Deux pièges vérifiés en construisant `usage_events`, tous deux silencieux (le troisième, sur les
colonnes homonymes de `profiles`, est resté dans `CLAUDE.md`, section « Base de données ») :
- **Un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
  `security definer`.** `usage_events` n'a aucune policy de lecture ; sans `security definer`, le
  `select` de comptage du garde-fou de volume ne voyait rien depuis `authenticated` et le quota
  ne se déclenchait **jamais**. Corollaire pour les tests : remplir un quota sous `postgres` par
  commodité, c'est le tester dans le seul rôle où il ne sert à rien.
- **`revoke execute ... from anon, authenticated` ne révoque rien** : PostgreSQL accorde
  `EXECUTE` à **PUBLIC** à la création, et les deux rôles en héritent. Il faut
  `from public, anon, authenticated` — sans quoi n'importe quel visiteur appelait
  `/rest/v1/rpc/purge_usage_events`.

### 2.3 Rejouer, réécrire, désigner : ce que le distant a appris

**Le nom du fichier de migration se règle APRÈS l'application, pas avant.** `apply_migration`
**génère son propre horodatage** et l'enregistre dans `supabase_migrations.schema_migrations` : le
fichier écrit à l'avance dans `supabase/migrations/` porte donc une version que le distant ne
connaît pas, et les deux divergent en silence. La CI n'en voit rien — le job `db-tests` construit
depuis les fichiers, jamais depuis le distant — mais un `db push` ultérieur tente de rejouer une
migration déjà appliquée. Relevé le 17/09/2026 : fichier `20260917230000`, distant `20260917231133`.
La parade tient en un geste : appliquer, **relire `max(version)`**, et renommer le fichier dessus.

**Une migration livrée ne se modifie pas, et un hook le rappelle depuis le 27/09/2026**
(`scripts/proteger-les-migrations-livrees.mjs`, déclaré dans `.claude/settings.json`). Il refuse à
Edit et à Write un fichier de `supabase/migrations/` **présent dans `origin/main`**, et non un
fichier présent sur le disque : une migration en cours s'écrit en plusieurs retouches, et tant
qu'elle n'est que sur la branche elle se retouche — à charge de rejouer la retouche sur le distant
si elle y a déjà été appliquée, et de renommer le fichier comme au paragraphe précédent, ce que le
hook ne voit pas. Son message dit quoi faire à la place : une migration neuve, et pour une fonction,
partir de `pg_get_functiondef` (plus bas). Ce qu'il ne voit pas, et qu'il ne faut pas lui prêter :
le shell (`sed -i`, `git mv`), un humain, une session qui ne l'a pas chargé, et — sur un système de
fichiers insensible à la casse — un chemin écrit dans une autre casse. **La seule retouche d'une
migration livrée de toute l'histoire du dépôt** (`20260917094500_classement_du_plan.sql`, le
17/09/2026, pour qu'elle rejoue juste sur une base restaurée) était délibérée, et elle donne la
forme de l'exception, en quatre temps : elle se **décide** avec la personne qui pilote, avant
d'écrire ; elle se **fait** par une commande de shell, parce que le hook la refuse à Edit exprès ;
elle s'**inscrit** dans `supabase/retouches-de-migrations-livrees.json` — le fichier, le geste
(`modifiee` ou `supprimee`), l'empreinte du contenu accepté (`git hash-object <fichier>`, que le
refus de la CI affiche), la date, la décision et la raison ; et la PR **cite** la commande et la
décision. C'est le seul chemin, et il est écrit ici pour qu'il ne se confonde pas avec un
contournement : ce qui distingue les deux, c'est la décision et la trace.

**Et depuis le 29/09/2026 la CI voit ce que le hook ne voit pas** (`scripts/verifier-migrations-livrees.mjs`,
travail `checks`, `TESTING-GARDES.md` §2.15). Elle compare la copie de travail à la base de fusion avec
`origin/main` et refuse toute migration qui y existait et qui est modifiée, supprimée ou renommée —
par Edit, par le shell, par un humain, peu importe : elle regarde le résultat. Deux choses à ne pas
défaire. **Le journal accepte une retouche, pas un fichier** : l'entrée porte l'empreinte du contenu
accepté, donc une retouche suivante du même fichier rougit de nouveau. Et **une référence illisible
refuse** : sans `origin/main` (le `fetch-depth: 0` du `checkout` retiré), la garde ne sait plus ce qui
est livré, et elle sort en 1 plutôt que de passer. Ce qu'elle ne voit pas : un push direct sur
`main` sans PR, qu'elle n'a rien à comparer, et une migration appliquée au distant sans être livrée
dans le dépôt (`v1-27` §9).


**Aucune migration de données ne désigne une ligne par un identifiant généré, et celle qui l'a fait
n'a été rattrapée que par son propre contrôle.** `action_templates.id` vaut `gen_random_uuid()` : les
les gabarits portent des identifiants **différents** sur chaque base construite depuis
`supabase/migrations/`. Les uuid relevés sur le projet distant s'y apparient, donc la migration C2.1
passait là-bas et n'appariait **rien** en CI — tous les `question_template` restaient nuls, et c'est le
contrôle de la migration (« un gabarit sans `question_template` ») qui a fait tomber le job pgTAP.
C'est exactement l'avertissement de `mcp__Supabase__apply_migration`, et c'est la seule migration du
dépôt qui portait un uuid littéral (vérifié). La clé naturelle du référentiel est `action_text` : les
libellés sont distincts — un index unique le garantit depuis C3.8 — et les douze premiers sont
insérés littéralement par `20260905130000`. Deux corollaires : **un
fichier de test pgTAP ne désigne pas davantage un gabarit par son identifiant** (`23` a été corrigé
pour la même raison), et **un libellé mal recopié n'apparie rien** — c'est le contrôle qui rend
l'appariement par texte sûr, pas la relecture.

**Une migration doit se rejouer telle quelle, et `add constraint` n'est pas idempotent.** Corollaire
du point précédent : pour corriger l'appariement il a fallu rejouer le fichier entier sur le distant, et
il s'est arrêté sur un `42710` — une contrainte ajoutée sans `drop constraint if exists` devant. Le
défaut ne se voit ni en CI (base neuve, un seul passage) ni au premier déploiement ; il se voit le jour
d'une restauration, c'est-à-dire le plus mauvais. Même exigence que
`20260910110000_grants_explicites.sql`, « rejouable tel quel après une restauration ».

**Et une substitution vérifiée est à un coup par nature, donc elle doit reconnaître « déjà
appliquée ».** Le contrôle `if occurrences <> 1 then raise` est juste au premier passage et faux au
second : rejoué sur une base déjà corrigée, il trouve zéro occurrence de l'ancre et lève, c'est-à-dire
qu'il échoue précisément le jour d'une restauration. Les deux substitutions du dépôt le portaient
(C2.9 et la correction de la vague 5) ; toutes deux séparent maintenant les deux causes de « zéro
occurrence » par la **présence du remplacement** — déjà substitué, on sort sans rien faire ; ni l'ancre
ni le remplacement, on lève, parce que le corps a été réécrit autrement et qu'on ne devine pas. Ne
jamais reconnaître un rejeu à la **seule absence de l'ancre** : ce test-là couvrirait aussi le corps
réécrit, et la migration passerait en silence sans avoir rien fait.

**Le distant porte les corps de fonction sans les commentaires du dépôt, et la substitution
vérifiée lit le distant.** Relevé le 11/09/2026 en comparant les 47 fonctions une à une : la logique
est identique partout, mais plusieurs corps installés ont perdu les commentaires `--` que le fichier
de migration porte (`apply_migration` a reçu une version allégée). Sans conséquence sur le
comportement — et c'est un piège armé pour la suite, parce que **l'idiome de substitution vérifiée
cherche son ancre dans `pg_get_functiondef` du distant** : une ancre qui inclurait une ligne de
commentaire serait trouvée en CI (où la base est reconstruite depuis le dépôt, commentaires compris)
et introuvable sur le distant, ou l'inverse. Donc : **une ancre ne contient jamais de ligne de
commentaire**, seulement du code. Les trois ancres de la vague 4 respectent déjà la règle, et le
moyen de vérifier qu'un corps installé correspond au dépôt est de comparer les empreintes
**normalisées** (commentaires retirés, blancs réduits), pas les corps bruts.

**Rejouer un fichier de migration ancien sur le distant peut défaire une migration plus récente,
et la CI ne le verra jamais.** Relevé le 13/09/2026 en livrant C4.6 : le fichier 23 échouait sur le
distant à l'assertion du `push_body` alors qu'il passe en CI. Cause : la contre-lecture de la vague 5
avait rejoué **en entier** `20260912170000_rappels_qui_s_espacent.sql` (C2.9) pour corriger
l'idempotence d'une de ses substitutions — et ce fichier contient un
`create or replace function public.enqueue_checkin_reminders()` complet, qui a donc écrasé la version
de C2.1 (`20260912190000`), plus récente. **La CI est aveugle à ce défaut par construction** : elle
reconstruit la base dans l'ordre des versions, donc C2.1 y passe toujours après C2.9. C'est le
symétrique exact du piège déjà consigné (« la validation sur le distant passe, la CI tombe ») : ici
c'est le distant qui dérive et la CI qui a raison. Deux conséquences pratiques — **avant de rejouer un
fichier ancien, lister les fonctions qu'il réécrit en entier et vérifier qu'aucune migration
postérieure ne les touche** (`grep -n 'create or replace function public.<nom>' supabase/migrations/`
suffit), et **rejouer ensuite le bloc de la migration la plus récente** pour chacune. La réparation
est une opération sur le distant, pas un changement de code.

**Réécrire une fonction existante part de `pg_get_functiondef`, jamais du fichier qui l'a créée.**
Relevé le 11/09/2026 en livrant C2.2 : `commit_plan_action` et `clear_plan_action_commitment` ont
été reprises depuis `20260905190000`, leur migration d'origine — alors que C1.12
(`20260911100000`) leur avait ajouté trois gardes depuis. La réécriture les a donc **supprimées en
silence** : une intention et une seule, la forme d'intention qui suit le poste, et le refus
explicite au lieu d'un succès muet. Rien ne le signalait ; c'est `13_engagement_action` qui l'a
attrapé en CI, et c'est exactement ce que ce fichier existe pour faire. Corollaire : **une migration
qui touche une fonction existante impose de rejouer le fichier de test qui la possède**, pas
seulement celui du chantier en cours.

**Une colonne figée se rattrape quand c'est l'instantané lui-même qui est fautif — et seulement
là.** Relevé le 16/09/2026 en corrigeant le premier pas du vol long-courrier : la phrase vit sur
`action_templates`, mais elle est **copiée** sur `plan_actions.first_step` à la génération, et le
plan n'est reconstruit qu'au re-bilan ou au changement de saison. Corriger le référentiel sans
rattraper les lignes laisse la personne lire la phrase fautive jusqu'à sa prochaine soumission,
c'est-à-dire précisément sur la carte où le défaut a été trouvé. Le gel existe pour qu'un
changement postérieur ne rende pas le produit incohérent avec ce que la personne a lu ; quand
c'est l'instantané qui est incohérent, le rattraper restaure ce que le gel protège. La ligne
passe entre deux familles, et la distinction n'est pas de degré :

| se rattrape | ne se rattrape **jamais** ainsi |
|---|---|
| `plan_actions.first_step` — une consigne pratique, affichée **après** l'engagement | `engagement_checkins.committed_question` — une question **déjà posée**, par une notification qu'on vient d'ouvrir (C2.1) |
| | `engagement_checkins.trip_label`, `.period_label` — les libellés qui existent pour qu'un re-bilan ne réécrive pas un point généré |
| | `plan_actions.saving_kg_year`, `.saving_share_percent` — un chiffre annoncé, sur lequel quelqu'un a décidé |

Deux règles d'écriture qui vont avec : le rattrapage **apparie par la valeur** (le `where` porte
sur l'ancienne phrase), donc un second passage ne trouve rien et ne fait rien — inutile d'y mettre
le contrôle « déjà appliquée » d'une substitution de corps de fonction, et surtout ne pas lever sur
zéro ligne, qui est l'état normal d'une base neuve en CI. Et il **vérifie qu'il ne laisse rien
derrière lui** : une ligne encore porteuse de l'ancienne valeur après l'`update` veut dire que
quelque chose la réécrit, et il vaut mieux l'apprendre là que sur un écran.

### 2.4 Sessions : pannes, refus et doublons

Le modèle lui-même — session anonyme dès l'ouverture, conversion qui garde le `user_id`, pas de
mot de passe, `/connexion/retrouver` comme seul chemin délibéré vers un compte existant — est dans
`CLAUDE.md`, « Modèle d'authentification », pour ses deux paragraphes fondateurs, et dans
`COMPTE.md` pour tout le reste. Ici, ce qui s'est cassé autour.

**La non-divulgation se tient à l'écran, jamais au réseau — et c'est une limite de GoTrue, pas un
oubli** (relevé à la recette web du 28/09/2026, documenté le même jour par décision). Deux appels
répondent différemment selon qu'une adresse a un compte : `updateUser({ email })` (`422
email_exists` ou `200`) et `signInWithOtp` sans création (`422 otp_disabled` ou `200`). Les écrans
de Ramille rendent la même chose dans les deux cas — **sauf sous la limite d'envoi**, qui ne frappe
qu'une adresse à laquelle un code vient réellement de partir : demander deux fois en moins d'une
minute rend « Trop de demandes » (« coup sur coup » jusqu'au 05/10/2026, « pour le moment » depuis)
pour une adresse qui a un compte, et jamais pour une adresse qui n'en a pas (contre-lecture du
28/09/2026). On ne le masque pas, parce que masquer voudrait dire annoncer un code qui n'est pas
parti à une personne réelle, et ce sondage-là envoie un vrai e-mail au titulaire.

**Les plafonds du hook d'envoi (05/10/2026, `COMPTE.md`) ont fait l'arbitrage inverse, et ce n'est pas
une contradiction** : eux se taisent — rien ne part, l'écran annonce un envoi — parce qu'aucun e-mail
ne prévient alors le titulaire. Une première version refusait le rattachement au-delà du plafond du
compte ou du projet, et `/connexion/email` serait devenu un oracle silencieux : une adresse libre part
en rattachement (refusé), une adresse prise bascule en reconnexion (envoyée) — relevé par la
contre-lecture avant la fusion. La minute, elle, reste dite : son sondage envoie un vrai code au
titulaire, ce qui le rend visible et coûteux. **Et un échec d'envoi parle aussi** : le hook rend un
`500` (secret manquant, Resend en panne ou à court de quota) que seules les adresses connues
atteignent sur `/connexion/retrouver` et `/compte/suppression` — une adresse inconnue s'arrête avant,
en `422 otp_disabled` —, donc pendant une panne de Resend « Ta demande n'a pas abouti » contre
l'écran de code dit qui a un compte. Le SMTP de Supabase faisait déjà de même ; c'est su, pas fermé.

La console du navigateur, elle, affiche le 422, et toute session anonyme
peut appeler ces deux routes sans l'app — le hook d'envoi borne ce qui part, pas ce que la réponse dit. Aucun réglage du
service ne masque ces réponses, et une fonction serveur ne fermerait pas l'appel direct. Ce qu'il
faut en retenir avant d'écrire une ligne d'auth : **« aucune réponse différenciée » veut dire
« aucune à l'écran »**, et ne s'écrit jamais sans cette précision — le 21/09/2026, l'arbitrage a été
annoncé comme la fermeture d'un oracle qui ne l'était qu'à moitié (`v1-28` §7.1, où vit la condition
de réouverture).

**`estPanneDeTransport` couvre les 5xx, et c'est assumé** (même module) : `auth-js` ne réserve
pas `AuthRetryableFetchError` à l'échec de `fetch` — son `lib/fetch.js` porte
`NETWORK_ERROR_CODES = [500…504, 520…530]` et lève ce même nom pour chacun, code du corps jeté au
passage. La non-divulgation qui reste tenue est la seule qui porte l'information : le 422
`otp_disabled` d'une adresse inconnue mène au **même** écran d'attente qu'un envoi accepté. Deux
pièges qui vont avec : un test qui fabrique un 500 **sans `name`** n'éprouve rien (le SDK ne
produit jamais cette forme — c'est ainsi qu'un commentaire a pu affirmer l'inverse du code sans
que rien ne tombe), et le message d'échec dit « n'a pas abouti » et non « n'est pas partie »,
puisque sur un 5xx la demande a bien quitté l'appareil.

**« Pas de session » recouvre trois situations, et une seule appelle une création** (C2.11,
11/09/2026, `src/types/session.ts`). `ensureSession()` raisonnait à deux branches ; le cas qui
coûtait cher est celui du **jeton refusé** : créer une session anonyme là donne un compte **vide** à
quelqu'un qui en a un, et chaque onglet lui répond « tu n'as rien » alors que son bilan, son plan et
ses points sont intacts côté serveur. Le troisième cas, une **panne de transport**, n'appelle ni
création (on fabriquerait le même compte orphelin pour une cause passagère) ni reproche — le
prochain lancement réessaie, et rien ne s'affiche. La distinction est possible parce qu'`auth-js`
remonte l'erreur de rafraîchissement dans `getSession()` (relevé dans `GoTrueClient.__loadSession`) :
les quatre états sont atteignables, aucun n'est décoratif — **et `refusee` ne l'était pas au
démarrage jusqu'au 02/10/2026** : l'initialisation d'`auth-js` retire elle-même la session refusée,
et `getSession()` ne voit plus rien (§1). Le refus se déduit depuis d'une **marque** — « cet appareil
porte un compte rattaché » (`src/lib/marque-de-compte.ts`), posée quand une session non anonyme est
vue, effacée par les départs voulus : sans session, sans erreur, avec la marque, c'est un refus ; sans
elle, une première ouverture, l'anonyme purgé compris. Il **tient** jusqu'à ce que la personne choisisse
— une connexion, ou « Commencer un bilan sur cet appareil » (`repartirSurCetAppareil`) — et survit à un
redémarrage. `SIGNED_OUT` reste écouté pour le montrer en cours de route, et les départs voulus se
déclarent (`pendantUnDepartVolontaire`). L'écran se déduit de l'état et de la route
(`lEcranDeReconnexionSePose`, `src/types/session.ts`). Le client réel le garde, stockage et réseau
doublés, « Me déconnecter » passant par son vrai appelant : `src/lib/session-refusee.test.ts` (la
suppression, elle, par le double de `src/lib/compte.test.ts`). L'écran
`SessionRefusee` est une
**surcouche** du `Stack` et non un remplacement, à la différence de `ConfigurationManquante` : ses
deux boutons sont des navigations, et un écran rendu à la place du navigateur n'aurait aucune route
où aller.

**`ensureSession()` est enveloppée dans `uneSeuleFois` (`src/types/une-seule-fois.ts`), et ce
n'est pas du confort : sans elle, deux comptes anonymes.** La fonction fait un « lis puis
écris » ; deux appels lancés dans le même rendu — le layout racine et la racine de l'app —
lisent tous les deux « pas de session » avant que l'un n'ait écrit. Six des treize comptes de la
base étaient dans ce cas. Rien ne le signalait : l'app marche, elle laisse un compte orphelin
qui consomme le quota de créations anonymes, gonfle d'un facteur proche de deux toute
statistique de nouveaux visiteurs, et peut recevoir le jeton d'appareil à la place du compte
gagnant. Seules les promesses **en vol** sont partagées, donc le contrat ne change pas : un appel
tardif relit bien l'état courant, dont dépend la re-vérification avant l'écriture du bilan.

**Un jeton refusé parce qu'il est TROP NEUF n'est pas un refus, c'est une attente** (incident du
13/09/2026, `src/types/postgrest.ts`). PostgREST rend `401 { code: "PGRST303", message: "JWT issued
at future" }` quand l'instant d'émission du jeton est postérieur à sa propre horloge. Cinq choses
à savoir avant de chercher ailleurs :

- **l'horloge de l'appareil n'entre nulle part dans ce contrôle.** Le jeton est émis par Supabase
  Auth, qui pose `iat` à son horloge à lui, et vérifié par PostgREST contre la sienne : c'est un
  écart entre deux services de Supabase. Une pendule fausse côté utilisateur ne peut pas produire
  cette erreur, et la chercher là coûte la journée ;
- **le réflexe qu'appelle un `401` est ici le mauvais geste** : rafraîchir la session produit un
  jeton au `iat` encore plus récent, donc encore plus en avance sur l'horloge qui le refuse. Ce qui
  répare, c'est le temps qui passe ;
- **ça se répare tout seul, donc ça ne doit pas s'afficher.** Le refus frappe la **première requête
  d'une session** — la racine de l'app, l'`app_open` juste à côté, un onglet au retour — et le
  démarrage tombait alors sur « Le démarrage a échoué : JWT issued at future », un écran technique
  pour une condition d'une seconde. `fetchAvecSecondeChance` (passé en `global.fetch` du client)
  redemande **au plus deux fois**, 1 200 ms puis 2 500 ms. Le réessai est sûr parce que le contrôle
  du jeton précède l'exécution : un refus de claims garantit qu'aucune ligne n'a été lue ni écrite —
  ne pas étendre le motif à ce qui ressemblerait à une panne passagère, et surtout pas aux autres
  refus de jeton, qui ne se réparent pas en attendant et qu'un réessai masquerait derrière une
  latence ;
- **et c'est le seul refus du produit qu'on reconnaît au code ET au message** (corrigé le
  14/09/2026 en contre-lisant la vague 6). `PGRST303` n'est pas le code du jeton en avance : la table
  des erreurs de PostgREST le définit comme « JWT claims validation or parsing failed », c'est-à-dire
  **toute** la famille des claims, `exp` comprise. Reconnaître au code seul faisait donc rejouer un
  jeton **expiré** — l'état normal au réveil de l'app, un jeton d'accès Supabase vivant une heure —
  soit 3 700 ms d'attente avant que l'erreur ne sorte, exactement ce que la puce précédente interdit.
  `PGRST301` est le refus de **décodage** et ne porte jamais l'expiration, donc aucun code ne
  discrimine : la paire est la seule voie. Elle échoue **du bon côté** — une phrase reformulée par
  PostgREST désarme le réessai et l'erreur s'affiche, soit le comportement d'avant le correctif — et
  c'est ce qui autorise l'entorse à « jamais au message ». Corollaire pour les tests : une fixture
  `{ code: 'PGRST301', message: 'JWT expired' }` n'existe pas, et le garde qui l'utilisait ne gardait
  rien ;
- **le corps de la réponse est lu sur une copie** (`clone()`). Sans elle, le contrôle consommerait
  le corps et **toutes** les erreurs de l'app deviendraient illisibles — en silence, et seulement
  sur les chemins d'échec, c'est-à-dire là où personne ne regarde. Un test épingle ce point.

La recette pour trancher « écart d'horloge ou vrai défaut » est en `docs/exploitation/README.md`
§8.6 : les deux horloges à mesurer, le jeton à émettre, et la requête sur les journaux d'accès qui
donne l'ampleur. Elle commence par la version de PostgREST qu'exécute le projet — un écart
intermittent entre deux services du même fournisseur est au moins autant un défaut amont qu'un
réglage d'horloge, et c'est la première chose qu'on peut lire sans rien mesurer.

### 2.5 Les redirections

**Cette liste de redirections est une frontière de sécurité, pas une commodité de
configuration.** Elle décide à quelles adresses Supabase accepte de **remettre une session** —
un lien de connexion renvoie les jetons dans le fragment de l'URL d'arrivée. Une entrée trop
large y est donc une prise de contrôle de compte : elle portait `https://*.vercel.app/**`
(nettoyé le 09/09/2026), c'est-à-dire **tout le domaine `vercel.app`**, où n'importe qui
déploie en trois minutes. Un tiers pouvait demander un lien pour l'adresse de quelqu'un
d'autre en pointant l'arrivée chez lui : l'email partait bien de Ramille, à la bonne adresse,
et la session finissait ailleurs. Deux règles qui en découlent : **jamais de joker sur un
domaine qu'on ne possède pas** — un motif de preview doit porter le suffixe de compte
(`ramille-*-me-c4a3.vercel.app`), que personne d'autre ne peut créer ; et **une entrée morte
se retire**, parce qu'elle ne se lit pas « obsolète » mais « autorisé ». Rien dans le code ni
dans la CI ne voit cette liste : elle vit dans la configuration du projet distant, et c'est
en la lisant qu'on la vérifie.

Deux nuances du fichier des redirections qu'il ne faut pas réécrire à l'envers : **le suffixe de
compte `-me-c4a3` resserre un motif de preview, il ne le ferme pas** (un hôte `*.vercel.app` est
alloué d'après le nom de projet, choisi librement, donc un tiers qui nomme son projet
`ramille-xxx-me-c4a3` obtient une adresse qui correspond au motif — l'ordre de préférence est :
aucune entrée de preview, sinon l'hôte exact retiré après usage, sinon le motif faute de mieux) ;
et `https://ramille.vercel.app/**` est bien notre projet aujourd'hui, mais c'est un nom dans
l'espace global `vercel.app`, donc **il se retire le jour où le projet Vercel est renommé**.
*Depuis le 02/10/2026, la liste ne porte plus aucune entrée `vercel.app`* (relue par l'API de
management, `docs/exploitation/redirect-urls.md` §3.1 bis) : ces deux nuances valent pour qui
voudrait en remettre une.
