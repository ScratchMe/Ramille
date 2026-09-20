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
  plus, ne rien reprocher, réessayer au prochain lancement).
- **La création de session est un « lis puis écris », donc elle s'enveloppe dans un
  partage de promesse en vol.** Deux appels lancés dans le même rendu lisent tous les deux « pas
  de session » avant que l'un n'ait écrit : deux comptes anonymes, dont un orphelin qui consomme
  le quota, gonfle les statistiques de nouveaux visiteurs et peut recevoir le jeton d'appareil.
  Rien ne le signale.
- **Un jeton d'appareil se réenregistre à chaque changement d'utilisateur**
  (`onAuthStateChange`), pas seulement au démarrage — un lien de connexion ouvre la session d'un
  utilisateur *différent* de la session anonyme qui venait de l'enregistrer.

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
  ce qui rend les tests de refus faciles à écrire pour rien (`TESTING.md` §1.7).

### 1.4 Privilèges, policies et RPC

- **Écrire les privilèges de table dans une migration.** Le défaut de plateforme d'un projet neuf
  (et le drapeau `auto_expose_new_tables` de la stack locale, en voie de suppression) accorde
  tout à `anon` et `authenticated` sans qu'aucun fichier ne le dise ; une base reconstruite depuis
  les migrations n'accorde alors rien à personne — « permission denied » **avant** la RLS. Une
  migration qui ne contient que des `grant`/`revoke` est rejouable telle quelle, et un test
  épingle la matrice. **Ajouter une table impose un geste explicite**, et un privilège se justifie
  par un appel réel depuis l'app, jamais par « un test en a besoin ».
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

---

## 2. Propre à Ramille

### 2.1 Migrations, types et CI

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1` — nom
du dépôt ; le tableau de bord l'affiche `TraceVerte`, et c'est sous ce nom-là qu'on le cherche —
(via `mcp__Supabase__apply_migration`). **Après toute migration, régénérer
`src/lib/database.types.ts`** (`mcp__Supabase__generate_typescript_types`) — le fichier n'a
pas de formateur automatique dans ce repo (pas de prettier installé), donc respecter le
style existant (guillemets doubles) en le retouchant à la main si besoin.

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
contrôle rouge, et c'est le but — le miroir se corrige, jamais la base. `TESTING.md` §2.7 dit les
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
   default privileges`, constaté) : cette moitié-là se désactive au tableau de bord (« Default
   privileges for new entities »), et se consigne dans `docs/exploitation/`.
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
colonnes homonymes de `profiles`, est resté dans `CLAUDE.md` avec la mesure d'usage) :
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
mot de passe, `/connexion/retrouver` comme seul chemin vers un compte existant — est dans
`CLAUDE.md`, « Modèle d'authentification ». Ici, ce qui s'est cassé autour.

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
les quatre états sont atteignables, aucun n'est décoratif. L'écran `SessionRefusee` est une
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
