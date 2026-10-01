# TESTING-PGTAP.md — la suite pgTAP, le distant et les valeurs chiffrées

> **Quand ouvrir ce fichier.** Écrire, corriger ou rejouer un test pgTAP — en CI, en local ou sur le
> projet distant · toucher au référentiel des facteurs d'émission · une assertion chiffrée qui
> rougit · une assertion qui passe en CI et échoue sur le distant.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `TESTING.md` le 01/10/2026, qui pesait 84 Ko — avec `TESTING-GARDES.md`.
Ses sections y sont venues **telles quelles**, et **gardent leur numéro** : il reste unique dans la
famille, donc un renvoi « `TESTING.md` §2.x » écrit avant cette date — dans un commentaire du code,
un document daté — se retrouve ici, et la table en tête de `TESTING.md` dit où vit chaque numéro. La
§1 vaut sur n'importe quel projet pgTAP ; la §2 est propre à Ramille.

---

## 1. Ce qui vaut sur n'importe quel projet

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

**Le corollaire sur les valeurs :** des dizaines d'assertions chiffrées sont réparties
dans une dizaine de fichiers — la commande ci-dessous les liste, et c'est elle qui fait foi, pas
un compte écrit ici —, et beaucoup dérivent d'un facteur sans le nommer.
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
« corriger » un test qui n'a rien. La liste ci-dessous en garde une fermée, pour mémoire ; **le
nombre de celles qui restent ne s'écrit pas** — il s'est déjà périmé deux fois, la seconde le
27/09/2026 quand les fichiers de la purge l'ont rejointe.
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
- `16_purge_anonyme_inactivite` et `36_cohortes_avant_la_purge` (son assertion 18) fabriquent soixante sessions
  muettes pour déclencher la garde de volume de la purge, dont le seuil vaut `max(50, 20 %)` des
  comptes anonymes. **Au-delà de 240 comptes anonymes en base, soixante ne suffisent plus**, et le
  passage supprime au lieu de bloquer. Le compte qui décide est celui de la base, pas du fichier
  (relevé par la contre-lecture du lot 6, 27/09/2026).
- `35_mot_de_la_veille`, **sa section 8, et c'est le plus dangereux de la liste** : ses passes
  d'envoi (`send_pending_reminders()`, `envoyer_les_notifications('veille')`) prennent **toute la
  file réelle** due, pas seulement ses fixtures. Sur le distant, de vrais emails partiraient par
  Resend et de vraies notifications par Expo — et le `rollback` remettant ces lignes en attente, le
  cron suivant les renverrait : des doublons chez de vraies personnes. Et après 18 h 30 à Paris, elle
  enverrait aussi les mots de vrais comptes que la section 6 vient de mettre en file, puisqu'elle ne
  repousse que ceux de ses fixtures. **Ce fichier ne se rejoue jamais en entier sur le distant** ;
  ses sections 1 à 7 et 9 à 13 ne font que mettre en file, dans la transaction annulée, et se
  valident seules (relevé par la contre-lecture de C4.2, 28/09/2026 — l'en-tête du fichier
  renvoyait ici avant que cette ligne n'existe).
- `37_vues_de_l_administration`, **mais seulement à partir du 20/06/2027** : ses cohortes
  fabriquées naissent il y a 300 et 420 jours (et W+14, qui n'a que des purgés), soit avant le premier
  compte de la production (le 09/09/2026) — jusqu'au jour où ces dates le rattrapent. Ses assertions sur les totaux (états des
  rappels, départs) se lisent en écart à un relevé fait avant les fixtures et tiennent partout ;
  celles par semaine d'arrivée croiseraient alors de vrais comptes. Reculer les dates ne suffit pas :
  au-delà de douze mois, la purge des `app_open` rend toute la cohorte « borne basse », et
  l'assertion 7 ne garde plus rien.
Le reste de la suite est rejouable sur le distant et c'est la façon la plus rapide de valider un
fichier pgTAP sans Docker — à condition de rejouer le **fichier entier**, bascules de
`request.jwt.claims` comprises, et de savoir que celles-là ne prouvent rien là-bas.

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
(`MESURE.md` §3).

**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites. Après la
saturation du quota, c'est le trigger `before insert` qui refuse — il s'exécute avant
l'évaluation des CHECK et lève lui aussi un `23514`. Et depuis la session d'un tiers, c'est la
RLS (`42501`). Elle doit donc venir avant le remplissage du quota **et** sous la session du
propriétaire. Plus généralement, pour valider un test pgTAP en base, rejouer la **séquence
entière** du fichier, bascules de `request.jwt.claims` comprises — un scénario extrait de son
contexte ne reproduit pas le rôle sous lequel il tournera.
