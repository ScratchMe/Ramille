# TESTING-GARDES.md — les gardes de la CI, une par une

> **Quand ouvrir ce fichier.** Toucher à une garde de la CI (`scripts/verifier-*.mjs`) ou en voir
> une rougir · jouer, étendre ou corriger le parcours réel · ajouter une constante qui recopie un
> `check` · toucher aux gabarits d'e-mail, au chemin du compte, à ce que le lecteur d'écran reçoit
> dans l'export, à la garde d'une animation ou aux migrations livrées · annoncer qu'un de ces
> chemins est vérifié.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `TESTING.md` le 01/10/2026, qui pesait 84 Ko — avec `TESTING-PGTAP.md`.
Ses sections y sont venues **telles quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la
famille, donc un renvoi « `TESTING.md` §2.x » écrit avant cette date — dans un commentaire du code,
un document daté — se retrouve ici, et la table en tête de `TESTING.md` dit où vit chaque numéro.
Tout ici est propre à Ramille : la méthode qui voyage — une garde se vérifie en la cassant — est en
`TESTING.md` §1.

---

## 2. Propre à Ramille

### 2.6 Le parcours réel, contre une vraie stack — et ce que Docker change ici

**Le trou, mesuré le 20/09/2026** : 15 147 lignes d'écrans, de composants et de hooks, et 1 485 lignes
d'entrée-sortie — **les fichiers de `src/lib` qui importent le client**, et non `src/lib` entier, qui
en compte 3 307 — n'étaient gardées par rien d'autre que la recette sur appareil. Les deux
premières suites prouvent la logique pure et la base ; entre les deux — les requêtes, les RPC, ce
que l'écran montre après une écriture — rien. Un `.eq('status', 'complete')` passait vert.

**`scripts/verifier-parcours-reel.mjs` joue le chemin nominal, et lui seul**, sur **trois profils**
depuis le 30/09/2026 — décrits plus bas ; celui-ci est le premier, tiré de
`docs/recette/premier-parcours-web.md` : onboarding → questionnaire → soumission → restitution →
plan, sans écran de compte interposé (arbitrage du 20/09/2026 : la proposition de compte que ce
paragraphe disait « refusée » n'existe plus sur ce chemin) → engagement → un point généré comme le
cron le ferait (`generate_commute_checkins()`, appelé en `service_role`) et répondu → suivi →
« Toi » et sa ligne de canal (25/09/2026, §2.12) → l'écran des pistes, où l'on choisit une action
« à la place » depuis la liste (29/09/2026, `v1-32` : le seul chemin qui passe le remplacement depuis
cet écran), puis où l'ordre n'a pas bougé — le seul moment où ça se voit, l'action engagée n'étant
plus au rang 1 → suppression du compte, sans une ligne derrière. Après chaque écriture il relit la base **comme la personne**
(PostgREST sous sa session, donc sous la RLS) : 4 231 kg, 1 920 kg sur le poste dominant, les
pistes d'`ATTENDU`, toutes, dans l'ordre et au kilo près, l'engagement et ses jours, le point et sa question figée. Sur
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

Et c'est aussi ce qui rend **pgTAP exécutable ici** (`npx supabase@2.117.0 test db`, ou
`node scripts/rejouer-la-ci.mjs base`, `TESTING.md` §2.13) : le `BEGIN`/`ROLLBACK` sur le projet distant n'est
plus la seule validation d'un fichier pgTAP, et ce n'est pas la meilleure — le distant porte des
données que certaines assertions ne supportent pas (`TESTING-PGTAP.md` §2.3). Cette phrase prescrivait un `db reset`
« si des parcours ont laissé des comptes » : c'est la parade que `TESTING-PGTAP.md` §2.3 a écartée le 21/09/2026,
une base qui a servi ne devant pas faire rougir pgTAP. Le rejeu reconstruit bien la base, mais pour
une autre raison — qu'elle soit celle des migrations de l'arbre.

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

**Puis il refait un bilan en voiture** (27/09/2026, `v1-27` §4). Sa carte « Plan et Suivi » n'est
pas refermée, et le nouveau bilan donne au même cycle ses premières actions : « Ton premier plan »
est due le même jour — la seule paire de cartes d'ouverture que l'écran empilait. Les exclusions
elles-mêmes sont épinglées dans Jest sur toutes les combinaisons d'états (`cartesDuPlan`) ; cette
étape garde une partie de ce que Jest ne voit pas — **deux** des huit arguments que l'écran lui passe,
`carteDuPremierPlan` et `carteDesDeuxLieux`. L'en-tête du script nomme les six autres, que rien ici ne
garde.

**Et il finit par retirer ses deux bilans** (27/09/2026, C4.7, `v1-22`). Le bilan en voiture
d'abord : c'est lui qui porte le plan, et le profil **s'y engage avant** — sans quoi rien ne gardait
l'argument `engagement` de l'appel, et la confirmation pouvait taire l'action sans qu'un test rougisse.
La confirmation dit donc que le plan repart du précédent **et** nomme l'action suivie ; la base relit
le statut `withdrawn`, un plan revenu à zéro action et l'action archivée en `retrait` ; et l'adresse dit « Ce bilan a été
retiré. » **après un rechargement** — c'est là que parle la lecture par identifiant, et plus l'état
posé par le geste. Puis le seul qui reste : la confirmation ne parle plus de plan, l'écran rejoint
l'onboarding, et la marque `traceverte.a_un_bilan.v1` est **lue posée avant**, effacée après — sans la
première moitié, une clé mal nommée rendrait la seconde vraie par accident. Le troisième cas (retirer
un bilan qui ne porte pas le plan) n'est pas joué ici : `34_retirer_un_bilan.test.sql` le tient.

Le second profil tourne dans un **contexte de navigateur neuf**, et c'est structurel : « premier »
veut dire premier **sur cet appareil** (C5.7), et les marques vivent dans le stockage. Le rejouer
dans le même contexte éprouverait un appareil qui a déjà tout vu.

**Et un troisième depuis le 30/09/2026, sans aucune boucle** (`v1-27` §12.22 et §12.23) : ni trajet,
ni sorties régulières, ni voyage — aucun point ne viendra. Trois textes le savent depuis ce jour (la
carte des deux lieux, la carte d'attente, la carte du suivi sans point répondu), et les deux
premiers profils ont chacun une boucle : le côté « sans boucle » n'était gardé que par Jest, sur les
dérivations, pas par l'écran qui leur passe les boucles lues au serveur. Il ne fait que ça — un
questionnaire minimal, le plan, le suivi —, relit d'abord sa prémisse au serveur
(`mes_boucles_a_venir` vide), et part lui aussi d'un contexte neuf. **Ce qu'aucun des trois ne
joue** : la carte d'un point répondu dont la boucle s'est arrêtée, qui demande un point généré puis
un nouveau bilan dans la même période — la dérivation et la carte sont gardées par Jest, l'appel de
l'écran ne l'est par rien.

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
kilos ayant été ajoutée sans elle — ce que `TESTING.md` §1.1 interdit, et que seule une relecture du diff a vu :
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
dans la stack ; `supabase db reset` remet la base à neuf — seulement si personne d'autre ne s'en
sert, d'autres copies de travail pouvant la partager. Le rejeu (`TESTING.md` §2.13), lui, la redémarre sous verrou.

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
et dans le module. **Éprouvé en le cassant** (`TESTING.md` §1.1), douze mutations datées en tête du script —
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
  Seuls `produit.md` et `v1-27` y entrent, parce que le dépôt les tient à jour. **Les cinq fichiers
  de sujet sortis de `CLAUDE.md` le 01/10/2026** (`BILAN.md`, `PLAN.md`, `BOUCLE.md`, `COMPTE.md`,
  `MESURE.md`), et les morceaux de `FRONT.md` et de `TESTING.md` sortis le même jour (`FRONT-*`,
  `TESTING-*`), y sont inscrits un par un : la liste est déclarée, et un fichier qu'on oublierait d'y
  ajouter perdrait sa garde sans que rien ne rougisse — mesuré en l'en retirant. **Le kit de design
  y entre depuis le 26/09/2026, sous-dossiers compris** (`docs/design/design-system/`, un miroir
  tenu), et les extensions de documents, de feuilles et d'images avec lui : son index citait deux
  fichiers `.md` qui n'existaient nulle part, qu'un contrôle limité au code ne pouvait pas voir.
  Un répertoire cité seul lui échappe encore — sans extension, rien ne distingue un chemin d'un
  mot. **Les consignes Claude écrites pour Ramille y entrent le 27/09/2026** : les sous-agents de
  `.claude/agents/`, et les skills qu'aucun plug-in importé ne revendique. Le partage se lit dans
  l'`installation.json` de chaque plug-in, donc un skill neuf de Ramille est lu sans qu'on l'ajoute,
  et un plug-in neuf est écarté sans qu'on l'y retire — ses skills citent leurs propres chemins. Et
  **le soir même, les chemins commençant par un point ont cessé d'être sautés** : aucun renvoi vers
  `.claude/` ni `.github/` n'était vérifié, y compris vers ces consignes-là. Seul un chemin relatif
  au document (`./`, `../`) l'est encore.
- **La comparaison se fait sur un suffixe de segment**, pas sur le nom de base : `plan/index.tsx`
  doit pouvoir se distinguer de `suivi/index.tsx`, sans quoi un déplacement de dossier passerait.
  Deux formes s'y ajoutent, chacune avec sa raison en tête du script : le chemin **servi**
  (`/.well-known/assetlinks.json`, dont le fichier vit sous `public/`) et le nom **lisible** d'une
  migration, sans son horodatage généré — cette dernière est bornée à `supabase/migrations/`.
- **Il compare à ce que git suit, jamais au disque** (26/09/2026). Il parcourait le système de
  fichiers, donc un dossier de build ignoré par git mais présent sur le poste (`ds-bundle/`) faisait
  résoudre en local un renvoi que la CI refusait : vert chez soi, rouge en CI. La liste vient
  désormais de `git ls-files` (suivis, plus les fichiers neufs pas encore ajoutés), et un fichier
  généré qu'un document cite — `expo-env.d.ts` — se déclare en tolérance, avec sa raison.
- **Une tolérance qui ne couvre plus rien fait rougir le contrôle**, et c'est la seconde moitié du
  script. Une liste d'exceptions est exactement ce qui pourrit : celle qui a perdu son objet
  attend qu'un vrai écart porte le même nom pour le couvrir à son tour. Chaque entrée porte donc
  sa raison, et le passage vert les compte.

**Éprouvé en le cassant** (`TESTING.md` §1.1), une mutation par branche : un chemin déplacé dans `CLAUDE.md`,
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
éprouve ce qui suit — les deux premières assertions sont des chemins heureux, les autres gardent
un refus, une absence ou une indistinction, et la 6 vérifie aussi qu'on arrive au compte. La liste
fait foi dans l'en-tête du script ; elle est recopiée ici, dans son ordre, pour être lue :

1. le code rattache une adresse — jusqu'à une session non anonyme, et la base relue derrière — **en
   passant par la reprise depuis « Toi »**, c'est-à-dire en quittant l'écran de code entre l'envoi
   et la saisie ;
2. il rouvre un compte depuis un **navigateur neuf**, c'est-à-dire le cas que le lien ne pouvait
   pas faire (en PKCE il ne valait que là où il avait été demandé) ; et une adresse **sans compte**
   y ouvre quand même la saisie du code (la non-divulgation, nommée plutôt que subie : sans elle,
   le défaut se manifestait par un timeout) ;
3. un code d'un flux **ne vaut pas** dans l'autre — c'est ce qui rend sûr de montrer le même écran
   de code dans les deux contextes ;
4. aucun des deux e-mails ne porte de lien ;
5. une URL portant des jetons valides ne fait pas basculer de compte (celle-là garde PKCE, pas le
   code) ;
6. les deux branches de `/connexion/email` — adresse libre, adresse déjà prise — sont
   **indistinguables à l'écran** (21/09/2026, `v1-28` §7.1), et la branche « prise » ramène bien
   au compte existant.

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
  garde ne vérifiait. La leçon est celle de `TESTING.md` §1.1, sous une forme de plus : **une moitié positive
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
- **Le parcours réel vérifie les groupes à chaque étape** — du questionnaire de chaque profil, de la
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
- **Le parcours réel joue le clavier là où il faut une session** : les jours de l'engagement — Espace coche sans faire défiler, Entrée décoche (une seule activation), une
  barre maintenue coche une fois (la répétition) — et « Toi », seul écran de ce parcours où une ligne
  de canal se rend (la feuille des rappels ne s'ouvre sur web qu'avec une adresse rattachée) : la
  ligne « Par email » hors d'atteinte est désactivée, jamais cochée, **sans opacité**, son titre en
  texte tertiaire (lu dans `theme.ts`) et son détail à 4,5:1 au moins ; Espace choisit « Sans rappel »,
  et la base relue le confirme.

Les mutations sont datées en tête de chaque script. Deux choses restent hors de portée : **ce que
TalkBack annonce d'un groupe imbriqué**, et la position dans la série (« 2 sur 9 ») que Chromium
calcule mais que son protocole de débogage n'expose pas — la garde lit le groupe le plus proche dans
le DOM, et l'arbre d'accessibilité l'a confirmé une fois à la main, pas plus.

### 2.14 Une animation se garde image par image, avec et sans la préférence

Écrit le 27/09/2026 avec les transitions (`docs/architecture/v1-30-les-transitions.md`). Une
animation ne se juge pas au repos : une étape qui entre et une étape posée d'emblée finissent au
même endroit. Deux gardes la relèvent **à chaque image** (`requestAnimationFrame`), avec un outil
écrit une fois pour les deux, `scripts/relever-par-image.mjs` :

- `scripts/verifier-etats-export.mjs`, **section J**, sans réseau : la barre d'onglets au démarrage,
  l'étape du questionnaire et son rail, une précision qui s'ouvre, le fondu des onglets ;
- le même script, **section K** (29/09/2026, `v1-31`), sans réseau lui aussi : **les deux défilements
  de l'écran du mode**, lus par la mesure `defilement` — vers ce qui manque au toucher du « Suivant »
  en attente (les tranches des sorties finissent 16 au-dessus du pied) et à l'ouverture d'une
  précision (la boîte du vélo, à 360 × 800), chacun en chemin puis posé sous la préférence ; et
  autour d'eux ce qui ne s'anime pas mais ne se voit qu'une fois l'app montée : la ligne « Il manque
  encore … », la couleur de l'intitulé lue dans `theme.ts`, le focus, le filet du pied, l'Entrée
  maintenu qui ne coche rien, le brouillon rouvert qui ne défile pas ;
- `scripts/verifier-parcours-reel.mjs`, ce qui demande des données : la barre au « Compris », la
  carte du point qui change de hauteur et qui garde la sienne au retour sur le plan, la feuille du
  re-bilan, **le défilement jusqu'à « C'est noté » sur l'écran des pistes** (depuis le 29/09/2026,
  `v1-32` : lu **dans la fenêtre** de défilement par la mesure `defilement`, avec une carte déjà
  ouverte au-dessus ; il défile en glissant et **juste assez** — « C'est noté » finit à moins de
  100 px du bas de la fenêtre, et c'est cette moitié qui a fait tomber la mutation du défilement
  mesuré trop tôt, là où « le titre jamais sous la bande » ne la voyait pas ; sous la préférence, il
  se pose d'un coup. Que le titre ne passe jamais sous la bande est d'abord gardé par les tests de
  `defilementPourMontrer`, `src/types/mouvement.test.ts`) — et **le second profil entier sous
  « réduire les animations »**.

Les règles, chacune payée pendant l'écriture :

1. **« En chemin » se lit sur une valeur strictement intermédiaire, jamais sur une durée.** Un runner
   lent perd des images, il n'en invente pas : « au moins une image entre le départ et l'arrivée »
   tient sur une machine chargée, « à 100 ms elle est à mi-chemin » non.
2. **Chaque garde a deux moitiés**, et la seconde n'est pas la première à l'envers : l'une prouve que
   ça bouge, l'autre que rien ne bouge sous la préférence. Celle-ci s'émule **avant** le chargement
   (`page.emulateMedia` puis rechargement, ou `reducedMotion` du contexte) : l'app ne la lit qu'au
   démarrage.
3. **Une mesure qui ne trouve pas sa cible est un échec, pas un succès** — la règle de la section A,
   reprise : « aucune image translucide » est vrai d'un titre introuvable. **Et une cible trouvée
   une fois ne suffit pas** : une moitié « rien ne bouge » ne regarde que les images où la cible
   est là, donc elle exige aussi qu'elle ne disparaisse plus une fois apparue
   (`disparaitApresEtreApparue`) : un clignotement passerait sinon pour « rien ne bouge ». Ce
   contrôle ne voit **pas** `entering`, qui masque la cible avant de la montrer — mesuré : ce
   sont le sens, le fondu et le focus qui l'attrapent. Et une mesure qui trouve sa cible par un
   nom accessible filtre la visibilité : un `aria-label` survit à `visibility: hidden`.
4. **Une garde d'animation peut trouver un défaut intermittent, et il faut la croire.** La barre du
   cycliste, sous la préférence, a été vue transparente pendant une image au premier passage et pas
   au second : c'était un vrai défaut (`EXPO.md` §1.7, « un effet n'est pas la première image »),
   corrigé à la source, puis trois passages verts d'affilée. Relancer jusqu'au vert l'aurait
   enterré.

5. **Une garde d'animation se corrige aussi par ses mutations, et par sa CI.** Le premier soir :
   une barre qui surgissait sans glisser passait (« en chemin » voulait dire « ailleurs qu'à
   l'arrivée », et une seule image au point de départ suffisait : c'est un saut) ; une feuille qui
   glissait tombait en disant « s'ouvre d'un coup » (react-native-web ne pose `role="dialog"` qu'à
   la fin de son animation, et la mesure cherchait le rôle) ; une précision laissée jouer sous la
   préférence restait à hauteur nulle, un cas que la garde ne savait pas nommer (J12) ; une garde
   de position passait à travers l'ancrage du défilement (point 6) ; et la mesure corrigée de la
   feuille a rougi la CI, sur une image que le `Modal` rend à opacité nulle au montage. Chaque fois,
   **imprimer les échantillons** a tranché — une fois contre l'hypothèse qu'on venait d'écrire. Et une mutation
   se joue **sur un fichier égal au commit** : un lot interrompu en avait laissé une dans la copie,
   sous deux résultats qu'il a fallu rejouer.
6. **Une position se lit à travers l'ancrage du défilement : mesurer une hauteur.** Chrome compense
   ce qui grandit **au-dessus** de la fenêtre en défilant d'autant, donc un bloc qui regrandit
   au-dessus de ce qu'on regarde ne déplace rien à l'écran. La garde du retour sur le plan lisait la
   position du cap et passait avec le défaut en place ; elle lit maintenant la hauteur de la carte
   (`decoupe`), et la mutation tombe (8 px au lieu de 153).
7. **Un défilement se provoque et se lit par `scrollTop`, jamais par la méthode `scrollTo` du nœud.**
   react-native-web la remplace sur le nœud de sa `ScrollView` par la sienne, qui prend les arguments
   de React Native : `el.scrollTo(0, 99999)` y demande `y = 0`, et ne fait rien. Relevé le
   29/09/2026, en provoquant la question sortie par le haut de la section K — le diagnostic a
   d'abord conclu que la zone ne défilait pas.
8. **Une demande qui retombe pour deux raisons ne se garde pas par un seul cas.** La demande du
   « Suivant » retombe à la complétude **et** en changeant d'étape ; « Retour » depuis l'étape du
   mode arrive sur une étape déjà complète, donc la demande y retombe par la première raison, et
   une mutation de la seconde passait — mesuré : « A4, Retour, Suivant » reste vert sous elle. La
   section K porte donc deux cas de plus : un nouveau manque après la complétude, qui est le seul à
   faire tomber la mutation de la première raison, et « Retour » depuis l'étape du mode vers des
   jours et une distance vides eux aussi, le seul à faire tomber celle de la seconde. Le premier essai partait de `?etape=context` sur un questionnaire vierge, et ne prouvait
   rien : l'étape d'avant, les longs trajets, y est complète — c'est la mutation « la demande ne
   retombe pas en changeant d'étape » qui l'a montré, en ne le faisant pas tomber (29/09/2026).

Les mutations qui éprouvent chaque moitié sont consignées dans l'en-tête de chaque garde, datées.

### 2.15 Les migrations livrées, comparées à `main` à chaque PR

**Une migration livrée ne se modifie pas, et jusqu'au 29/09/2026 seul un hook de Claude Code le
rappelait** — à Edit et à Write, et à eux seuls (`v1-27` §12.18). pgTAP ne pouvait rien y voir : il
reconstruit la base depuis les fichiers, donc un fichier livré réécrit y passe au vert, et c'est le
jour d'une restauration qu'on découvre que le fichier ne décrit plus ce que la base a vécu.

`scripts/verifier-migrations-livrees.mjs`, dans le travail `checks`, compare la copie de travail à
la **base de fusion** avec `origin/main` et refuse toute migration qui y existait et qui est
modifiée, supprimée ou renommée. Trois choses à savoir avant d'y toucher :

- **la base de fusion, pas la pointe** : une migration livrée sur `main` après le départ de la
  branche se lirait sinon « supprimée » par elle. Sur une PR, `HEAD` est la fusion que GitHub
  prépare, donc la base de fusion est la pointe de `main` qu'elle fusionne ; sur un push sur `main`,
  il n'y a rien à comparer, et la sortie le dit ;
- **`fetch-depth: 0` sur le `checkout` de `checks`**, sans quoi `origin/main` n'existe pas — et la
  garde sort alors en 1, jamais en 0 : on ne sait plus ce qui est livré ;
- **l'exception est une retouche, pas un fichier** : `supabase/retouches-de-migrations-livrees.json`
  porte l'empreinte du contenu accepté, donc la retouche suivante rougit. Le chemin complet, et qui
  la décide : `SUPABASE.md` §2.3.

Le test (`scripts/verifier-migrations-livrees.test.ts`) joue le script dans de vrais dépôts git
jetables, commit de fusion d'une PR compris ; neuf mutations datées en tête.
