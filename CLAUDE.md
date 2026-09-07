# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le produit

Ramille est une app de sensibilisation à l'empreinte carbone des transports, pour la
France (public et interface exclusivement en français, y compris tout code produit :
messages d'erreur, commentaires métier, contenu). V1 = Google Play uniquement (pas d'App
Store, pas de Sign in with Apple).

**Le produit s'est appelé TraceVerte jusqu'au 05/09/2026, et ce nom ne doit pas revenir** :
il est porté depuis 25 ans par une entreprise alsacienne de vélo et de mobilité douce
(traceverte.com) — même mot, secteur voisin, même public, le cumul qui fonde une action en
concurrence déloyale sans qu'aucune marque soit déposée. Ramille est **aussi le nom de la
mascotte** : produit et personnage ne font qu'un. Le nom vit dans `src/constants/produit.ts`
(`APP_NAME`) et nulle part en dur dans un écran ; `api/` et les SVG le répètent en littéral,
faute de pouvoir importer `src/`. Trois choses gardent volontairement l'ancien nom : les
**clés AsyncStorage** (`traceverte.*` — les renommer effacerait les brouillons), les
**migrations appliquées**, et le **projet Supabase distant**, toujours `TraceVerte-v1` dans
son tableau de bord. Les documents `docs/architecture/v1-01` à `v1-08` parlent de TraceVerte :
ce sont des décisions datées, on ne les réécrit pas. Détail en `v1-09-renommage-ramille.md`.

Trois briques dans l'ordre de priorité produit : Bilan initial (2) > Onboarding (1) >
Boucle mensuelle (4) > Plan de réduction (3).

## Commandes

```bash
cp .env.example .env      # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run web                # ou: npm run android / npm run ios
npx tsc --noEmit           # typecheck — à lancer après tout changement
npm run lint                # eslint (config Expo)
npm test                   # tests unitaires Jest (logique pure, cf. Tests ci-dessous)
expo export --platform web # build statique web (= script vercel-build), utile pour
                            # vérification visuelle via Playwright sans device
```

### Tests

Deux suites de tests automatisés, ciblées sur la logique où un bug est le plus coûteux
(chiffre affiché à l'utilisateur, navigation du wizard) — pas encore de tests d'intégration
bout-en-bout (écrans, flux de connexion) :

- **Jest** (`npm test`) sur la logique pure côté client — aujourd'hui `src/types/bilan.ts`
  (dérivation de navigation et de complétude du wizard) et `src/types/suivi.ts` (écart entre
  deux bilans, dédoublonnage de l'historique). Colocalisés en `*.test.ts` à côté du fichier
  testé. **Un module testé ne doit pas importer `@/lib/supabase`** : son constructeur lève
  sans variables d'environnement et fait échouer toute la suite — d'où la séparation
  `src/types/*` (pur, testé) / `src/lib/*` (requêtes).
- **pgTAP** (`supabase/tests/database/*.sql`) sur les fonctions SQL de calcul —
  `compute_assessment_results`, `generate_plan_cycle_for_user`, `season_bounds`/
  `rolling_quarter_bounds` — et sur les policies RLS (isolation stricte par utilisateur en
  lecture/écriture, verrouillage des tables à écriture serveur-only, lecture publique des
  référentiels). Tourne via `supabase test db`, qui démarre une stack Postgres
  locale (Docker) à partir de `supabase/config.toml` + `supabase/migrations/` — indépendante
  du projet Supabase distant `TraceVerte-v1` utilisé pour le développement applicatif
  courant. Nécessite le CLI Supabase (`npx supabase@latest`) et Docker ; non exécutable dans
  cet environnement (pas de daemon Docker) — validé à la place via des transactions
  `BEGIN`/`ROLLBACK` sur le projet distant avant d'être figé dans ces fichiers.

Les deux suites tournent en CI (`.github/workflows/ci.yml`) sur chaque pull request.

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

## Architecture

**Stack** : Expo (React Native + Expo Router, un seul codebase mobile+web) · Supabase
(Postgres + Auth + RLS) · Vercel (déploiement web, build via `vercel-build` →
`expo export --platform web` → `dist/`) · EAS (build/publish Android uniquement).

**`vercel.json` porte `cleanUrls: true`, et ce n'est pas cosmétique.** L'export statique
d'Expo Router produit deux formes : un **répertoire** `plan/index.html` pour une route qui a
des enfants, un **fichier plat** `suivi.html` sinon. Sans `cleanUrls`, Vercel sert les
premières et renvoie 404 sur les secondes — `/suivi`, `/confidentialite`, `/feedback` et
surtout **`/bilan/resultat`**, la restitution, étaient inaccessibles en production sans que
rien ne le signale (l'export local contenait bien les fichiers, et les routes en répertoire
marchaient). Toute nouvelle route sans enfants tombe dans ce cas : si `cleanUrls` disparaît un
jour de ce fichier, la moitié de l'app repasse en 404 silencieusement.

**`api/`** : Vercel Functions, détectées automatiquement par la plateforme (dossier `/api` à
la racine, indépendant de l'export statique Expo régi par `vercel.json`) — pas de route Expo
Router. Tsconfig dédié (`api/tsconfig.json`, exclu du tsconfig racine, `types: ["node"]`) : ce
contexte tourne en Web Fetch API (Request/Response), pas dans React Native. Utilisé pour
`api/partage.ts` (runtime Edge) et `api/share-card.ts` (runtime Node.js, rendu d'image via
`satori`/`@resvg/resvg-wasm`) — carte de bilan partageable, cf. `bilan/resultat.tsx` "Partager
mon bilan". **Une Vercel Function en runtime Node.js dans ce repo a une checklist non
négociable** (`api/package.json` en `"type": "module"`, `vercel.json` →
`functions["<chemin>"].includeFiles` pour tout asset chargé par une dépendance transitive,
`request.url` toujours relatif donc à parser avec une base factice, export **nommé**
`GET`/`POST`/… jamais `export default`, `maxDuration` à surveiller si cold start lourd) — sans
elle, une Function échoue silencieusement (`FUNCTION_INVOCATION_FAILED`/`_TIMEOUT` générique,
aucun détail côté client) sans que le code lui-même soit en cause. Détail de chaque point,
pourquoi, et comment les vrais logs runtime Vercel ont permis de les diagnostiquer :
`docs/architecture/v1-06-partage-social.md` §3.

**Routing** : `src/app/` (Expo Router, file-based). Flux : `/` → `/onboarding/*` →
`/bilan` (questionnaire) → `/bilan/resultat` (restitution) → `/plan` (plan de réduction),
avec `/connexion/*` atteignable depuis la restitution et le plan, et `/suivi` (historique des
bilans et des check-ins) depuis le plan.

**Documentation de référence — à lire avant toute modification de schéma ou de flux** :
`docs/architecture/v1-0N-*.md`. Ce sont des décisions actées, pas des brouillons ; chaque
fichier documente son propre statut (ex. `v1-01` a un bandeau indiquant que son §2-3 est
obsolète, remplacé par `v1-05-bilan-v2.md` — toujours vérifier qu'un document n'a pas été
supersédé par un increment plus récent avant de s'y fier). `docs/design/` contient le
handoff design/UX d'origine (spec fonctionnelle, maquettes) — figé tel quel, jamais réécrit ;
les fichiers `v1-0N` dans `docs/architecture/` documentent les écarts assumés et révisions
produit par rapport à ce handoff (les deux plus importants : §1 de
`v1-04-authentification.md`, voir plus bas, et `v1-06-partage-social.md` — décisions du
04/09/2026 sur les leviers de croissance/engagement, ce qui reste un non-goal ferme
(comparaison entre utilisateurs) vs. ce qui a été révisé, et le détail des Vercel Functions en
runtime Node.js §3).

**Le dernier increment livré est `v1-11-navigation-et-design-system.md`** (07/09/2026, cinq
lots) : **barre à deux onglets Plan / Suivi**, le questionnaire et le compte hors de la barre,
résultat sous le suivi (`/suivi/bilan?id=`, deux entrées dérivées dans `src/types/resultat.ts`,
`/bilan/resultat` conservée en redirection), action engagée saillante, et les jetons
`TypeScale`/`Radius`/`ControlHeight` que les écrans consomment au lieu de redéclarer une taille.
Son canvas est `docs/design/v1-11-navigation/`, ses écarts d'implémentation sa §7. **Trois
points restent à vérifier sur appareil** (§8) — dont le retour matériel Android, qui doit
quitter l'app depuis `/plan` et ne pas être « corrigé ».

L'increment précédent, `v1-10-connexion-et-rappels.md` (06/09/2026), est livré pour ses
chantiers A à D et F ; il reste E (push) et G (renommage GitHub). Il portait la connexion
par lien sans mot de passe, les rappels par push, et deux correctifs livrés qui les
conditionnaient — l'étalement du pic d'envoi du lundi, et la purge des sessions anonymes qui
supprimait sur l'**âge** du compte alors que `v1-04` §3 décrit une purge sur l'**inactivité**
(corrigée, `v1-10` §2.B). Son compagnon design est `docs/design/v1-10-retrouver-son-compte/`.

**Feuille de route courante** : `v1-07-audit-facteurs-et-suivi.md` §4 — audit du 04/09/2026,
plan d'exécution ordonné en 7 étapes (facteurs d'émission faux → boucle d'engagement cassée →
suivi dans la durée qui manque). Son §1 corrige deux erreurs de chiffre documentées ailleurs
comme des choix assumés : l'API Impact CO2 **distingue bien** court/moyen/long-courrier (la
valeur du mode avion dépend du paramètre `km` de la requête, contrairement à ce qu'affirme le
commentaire du seed initial), et le poste voyages en train était calculé au facteur TER. Son §2
liste les défauts vérifiés (T1-T13) auxquels les autres documents renvoient.

**Backlog / idées identifiées mais non planifiées** : pas de fichier ROADMAP dédié — suivi via
les GitHub Issues de ce repo (ex. #27-30 : synchronisation automatique des facteurs ADEME,
trajectoire 2050 sur l'écran de restitution, canal de feedback utilisateur, tracking
d'usage/segmentation). Le jeu "pas = monnaie" évoqué le 04/09/2026 est explicitement hors
roadmap de ce repo (projet à part, voir `v1-06-partage-social.md` §1).

### Modèle d'authentification (à connaître avant de toucher à l'auth ou au bilan)

Choix architectural clé, différent de ce que suppose le handoff design : **chaque
visiteur reçoit une session Supabase Auth anonyme dès l'ouverture de l'app**
(`ensureSession()` dans `src/lib/supabase.ts`, appelée en fire-and-forget dans
`src/app/_layout.tsx`), pas un bilan stocké en local puis rattaché à la connexion. Le bilan
anonyme vit donc normalement dans `assessments`/`assessment_answers` etc., protégé par les
mêmes policies RLS owner-scoped que n'importe quel utilisateur (`user_id not null` jamais
assoupli).

La connexion (Google via `linkIdentity()`, email via `updateUser({ email })`) **convertit
la session anonyme en session permanente en conservant le même `user_id`** — jamais
`signInWithOAuth`/`signUp`, qui créeraient un utilisateur distinct et perdraient le
rattachement du bilan déjà stocké. Voir `src/lib/auth.ts`. Sur natif, le flux OAuth suit le
pattern Expo documenté par Supabase : `makeRedirectUri()` + `WebBrowser.openAuthSessionAsync`
(`skipBrowserRedirect`) + `QueryParams.getQueryParams()` + `supabase.auth.setSession(...)`.

**Il n'y a pas de mot de passe** (`v1-10` §2.D, 07/09/2026) : il n'a jamais servi — aucun
`signInWithPassword` dans le produit, zéro compte n'en portait — et la confirmation d'email
faisait déjà tout le travail. Le seul chemin vers un compte **existant** (nouvel appareil) est
`sendAccountAccessLink` (`signInWithOtp` avec `shouldCreateUser: false`), écran
`/connexion/retrouver`, atteignable depuis l'accueil de l'onboarding (« J'ai déjà un compte »)
et depuis `/connexion/email` — qui y renvoie aussi de lui-même quand `updateUser` répond
`email_exists`. Trois règles gardées par `src/types/connexion.ts` : une adresse inconnue
(`422 otp_disabled`) mène au **même** écran qu'un envoi réussi, sinon l'écran dit qui utilise
Ramille ; la limite d'envoi se reconnaît au **code** `over_email_send_rate_limit`, jamais au
message ; et un appareil qui porte déjà un bilan anonyme voit l'écran de collision avant le
formulaire — Supabase ne fusionne pas deux utilisateurs, on le dit et on laisse choisir. Sur
natif, le lien arrive hors de l'app (messagerie) et remonte par `Linking.useURL()` dans
`_layout.tsx` ; le scheme `ramille://` doit donc figurer dans les Redirect URLs Supabase.

### Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1`
(via `mcp__Supabase__apply_migration`). **Après toute migration, régénérer
`src/lib/database.types.ts`** (`mcp__Supabase__generate_typescript_types`) — le fichier n'a
pas de formateur automatique dans ce repo (pas de prettier installé), donc respecter le
style existant (guillemets doubles) en le retouchant à la main si besoin.

Le bilan (`assessment_answers`) est modélisé à plat, un champ par question B1.1→B4.3 — pas
une liste ouverte de trajets. Chaque utilisateur a exactement 0 ou 1 valeur par poste
(domicile-travail, loisirs, voyages), jamais plusieurs trajets du même type. Le mapping
`BilanAnswers` (`src/types/bilan.ts`) est un miroir direct des colonnes de la table, pour un
insert sans transformation.

Le mode "voiture" ne distingue jamais la motorisation dans les listes de sélection
(B1.4/B1.7/B2.2 restent "Voiture (seul)"/"Voiture (covoiturage)", jamais une entrée par
motorisation) — une question de suivi ("Quelle motorisation ?") s'affiche en nested reveal dès
que "voiture" est choisi, dans 3 champs indépendants (`commute_car_engine`,
`leisure_car_engine`, `car_long_trips_engine`). **Quatre réponses au même niveau** — thermique,
hybride, hybride rechargeable, électrique — et surtout pas un second niveau « rechargeable ou
non ? » : la profondeur coûte plus cher en abandon qu'une puce de plus.
**Le deux-roues motorisé suit exactement la même mécanique** (`commute_two_wheeler_type`,
`leisure_two_wheeler_type`, quatre réponses au même niveau : scooter thermique, scooter
électrique, moto petite cylindrée, moto grosse cylindrée), et pour une raison plus forte encore :
**une grosse moto émet 0,2147 kg/km, soit une fois et demie une voiture thermique** et 2,8 fois
un scooter. Les quatre étaient comptés au tarif du scooter, ce qui sous-estimait de 64 %
l'empreinte d'un motard — dans le sens qui fait passer le deux-roues pour vertueux. Un test
pgTAP épingle ce classement pour qu'il ne soit pas « corrigé » par réflexe. Piège de relevé :
l'API nomme `moto-petite` et `moto` **toutes les deux** « Moto thermique », seul le slug les
distingue. Pas de champ pour les trajets longue distance, B3.4 ne proposant que la voiture.

**Le calcul n'a qu'un seul point de résolution : `public.resolve_mode(mode_id, engine, type)`**,
qui compose `resolve_car_mode` et `resolve_two_wheeler_mode`. Ne jamais rappeler les deux
fonctions spécialisées en imbriqué dans `recompute_assessment_results` ou
`estimate_action_savings` : elles y sont appelées à six endroits, et un oubli serait silencieux
— le mode générique existe, son facteur existe, le calcul rendrait un nombre. Moteur ou type non
renseigné (bilans soumis avant ces migrations) retombe sur le générique. Voir
`supabase/migrations/20260904090000_car_engine.sql`, `20260905140000_motorisation_hybride.sql`
puis `20260905200000_cylindree_deux_roues.sql`.

**L'ordre des motorisations en ACV n'est pas celui qu'on attend, et un test pgTAP l'épingle
pour qu'on ne le « corrige » pas** : hybride (0,146579) > thermique (0,142253) > hybride
rechargeable (0,133900) > électrique (0,067365). La thermique de référence de l'ADEME est une
compacte diesel, sobre à l'usage, tandis que l'hybride non rechargeable ajoute une batterie à
fabriquer sans jamais la recharger sur le réseau. Ranger « hybride » du côté de l'électrique
par réflexe se trompe de 10 %, et dans le mauvais sens.

**Tout lookup de facteur d'émission passe par `public.emission_factor(mode_id, date)`** —
jamais un `select ... order by valid_from desc limit 1` écrit à la main. La fonction borne le
facteur à la **date du bilan** (un bilan reste reproductible après une mise à jour ADEME, cf.
`v1-01` §3), retombe sur la version la plus ancienne si le mode a été ajouté au référentiel
après le bilan, et lève une erreur explicite si le mode n'a aucun facteur — un `NULL` ici
contaminerait tout le total. Voir
`supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql`.

Cette migration porte aussi deux corrections de chiffre à connaître : le facteur **avion**
dépend du segment (court / moyen / long-courrier), relevé aux distances de référence du calcul
— `dist_flight_short` = 1500 km, donc un *moyen*-courrier au sens ADEME, et `dist_flight_long`
= 9000 km ; et le poste **voyages en train** (B3.3, « > 300 km ») utilise
`train_longue_distance` (TGV) et non le mode générique `train` qui reste le TER du
trajet quotidien B1.4. `train_longue_distance` n'est jamais sélectionnable dans le
questionnaire — il n'apparaît donc pas dans `src/constants/transport-modes.ts`, mais bien dans
`MODE_PREPOSITION` (`bilan/resultat.tsx`) puisqu'il peut être le `dominant_poste_mode`.

**Tous les facteurs portent l'ACV complète — usage + fabrication — jamais la seule phase
d'usage.** C'est la distinction la plus coûteuse du produit et elle n'est pas visible dans les
valeurs elles-mêmes : l'endpoint `/api/v1/transport` de l'API Impact CO2 renvoie des chiffres
parfaitement corrects, mais qui n'incluent pas la fabrication. Le seul endpoint à utiliser est
`/api/v1/thematiques/ecv/transport`, champ `ecv`. Un facteur d'usage seul sous-estime de 29 %
une voiture thermique, de **457 % une voiture électrique** (la batterie), et affiche le vélo à
zéro ; et il rend incomparable le total au repère national de `carbon-reference.ts`, qui est
une empreinte ACV. Deux tests pgTAP épinglent la **source** de chaque facteur et le fait que
le vélo soit non nul — le garde-fou des ±50 % ne peut rien voir ici, puisque l'erreur porte sur
l'endpoint interrogé et non sur la valeur renvoyée. Historique complet en `v1-07` §1.5.

**Les facteurs se resynchronisent seuls** : `sync_emission_factors()` (SQL pur via l'extension
`http`, pas d'Edge Function — pas de secret à gérer, même modèle que les autres crons)
interroge cet endpoint chaque trimestre et **insère une nouvelle version** dans
`emission_factors`, sans jamais écraser. Le mapping vers les **slugs** Impact CO2 vit dans
`emission_factor_sources`, pas en dur dans la fonction : **ajouter un mode au produit impose
d'y ajouter une ligne**, sinon il reste figé à sa valeur de seed en silence (un test pgTAP
garde ce point). Pour l'avion, le slug retenu doit rester cohérent avec les distances codées
dans `recompute_assessment_results` (`avion-moyencourrier` pour 1500 km,
`avion-longcourrier` pour 9000). Un écart de plus de
50 % n'est jamais appliqué automatiquement — il est signalé dans `emission_factor_sync_runs`
pour relecture. Ce journal est la seule façon de voir que la synchronisation tourne
vraiment : le mécanisme prévu dès `v1-01` §2 n'avait jamais été construit et rien ne le disait.

Le calcul du bilan est séparé en deux fonctions : `recompute_assessment_results(assessment_id)`
porte le calcul (interne, revoked de anon/authenticated, appelable côté serveur), et
`compute_assessment_results(assessment_id)` est le RPC client qui vérifie la propriété du bilan
puis délègue. Toute reprise de calcul en masse (correction de facteur, migration) passe par la
première — la seconde exige un `auth.uid()` et ne peut pas tourner hors session client.

**Les actions du plan sont des opérations, pas des phrases.** `action_templates` porte un
`poste`, un `segment`, une `operation` (`substitute` / `share_vehicle` / `remove_trip` /
`remove_day`) et sa quantité ; `estimate_action_savings(assessment_id)` les applique à un bilan
et rend les gains en kg/an, triés. Deux règles non négociables : **aucune action au gain
inférieur à 5 kg/an n'est proposée** (aux facteurs ACV, substituer une voiture par un bus urbain
ne gagne que 14 %, contre 33× pour le métro — c'est invisible sans le calcul, d'où l'absence de
tout template proposant le bus), et le **contexte B4** (`zone_type`, `tc_access`,
`household_vehicles`) filtre l'impossible : pas de transports en commun là où la personne a
répondu qu'il n'y en a pas. L'estimateur lit l'instantané par segment figé sur
`assessment_results` (`commute_main_leg_km_year`, `travel_flight_long_co2_kg_year`…) — **ne
jamais recalculer les km ailleurs**, les deux implémentations divergeraient. Les gains sont
ensuite figés sur `plan_actions`, comme `assessment_results` fige le bilan.

**L'engagement sur une action passe par un RPC, jamais par une policy UPDATE.**
`plan_actions` porte des chiffres figés à la génération, et `authenticated` a déjà le privilège
`UPDATE` au niveau table (grant Supabase par défaut) — inoffensif tant qu'aucune policy UPDATE
n'existe, mais **en ajouter une ouvrirait toutes les colonnes** : la RLS filtre des lignes,
jamais des colonnes. D'où `commit_plan_action` / `clear_plan_action_commitment`
(`security definer`, propriété vérifiée à l'intérieur), et un test pgTAP qui épingle qu'un
`update` direct sur `saving_kg_year` reste sans effet. Une seule action engagée par cycle
(index unique partiel), intention obligatoire, en jours de la semaine pour le poste
domicile-travail et en échéance fermée pour les autres — jamais de saisie libre.

Deux mécanismes de génération server-side qu'il faut garder synchronisés si on les touche :
- `generate_plan_cycle_for_user(p_user_id)` (security definer, revoked de anon/authenticated)
  génère le plan de réduction d'un utilisateur. Appelée à la fois par le cron nightly
  `generate_plan_cycles()` (boucle sur tous les utilisateurs) et directement à la fin de
  `compute_assessment_results()`, pour que le plan existe immédiatement après soumission
  d'un bilan plutôt que d'attendre le prochain passage du cron.
- Cadence du plan de réduction : saisons **météorologiques** (blocs calendaires de 3 mois,
  pas astronomiques) par défaut, ou trimestre glissant ancré sur la date du bilan si
  `profiles.cadence_type = 'rolling_quarter'`.

`assessment_results` fige le résultat calculé au moment du bilan (jamais recalculé à la
volée côté client) — même logique pour `engagement_checkins.trip_label`, snapshotté pour ne
pas changer rétroactivement le wording d'un check-in déjà généré si l'utilisateur refait un
bilan plus tard.

**Mesure d'usage** (`usage_events`, issue #30, cf. `v1-08-mesure-usage.md`) : **on n'instrumente
jamais ce que le schéma enregistre déjà.** Pas d'événement `bilan_submit` (c'est
`assessments.submitted_at`), `checkin_answer` (c'est `engagement_checkins.response`) ni
`feedback_submit` — dupliquer un fait garantit deux chiffres divergents le jour où l'un des
chemins échoue, et un test pgTAP interdit de les réintroduire. Les axes de segmentation
(`zone_type`, `tc_access`, poste dominant, cadence) sont **déjà en base** : c'est ce qui a écarté
PostHog. La liste des événements vit dans `public.usage_event_types` avec une clé étrangère
depuis `usage_events` — **ajouter un événement impose une ligne par migration ET une entrée dans
`src/types/analytics.ts`**, sinon l'insert est rejeté et l'événement perdu en silence (même
mécanique que `emission_factor_sources`). Un événement déclaré mais qu'aucun code n'émet doit
être retiré : il ne se lit pas « pas encore instrumenté », il se lit **zéro**.

Trois pièges vérifiés en construisant cette table, tous silencieux :
- **Un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
  `security definer`.** `usage_events` n'a aucune policy de lecture ; sans `security definer`, le
  `select` de comptage du garde-fou de volume ne voyait rien depuis `authenticated` et le quota
  ne se déclenchait **jamais**. Corollaire pour les tests : remplir un quota sous `postgres` par
  commodité, c'est le tester dans le seul rôle où il ne sert à rien.
- **`revoke execute ... from anon, authenticated` ne révoque rien** : PostgreSQL accorde
  `EXECUTE` à **PUBLIC** à la création, et les deux rôles en héritent. Il faut
  `from public, anon, authenticated` — sans quoi n'importe quel visiteur appelait
  `/rest/v1/rpc/purge_usage_events`.
- **Le contexte B4 vit dans `assessment_answers`, et nulle part ailleurs.** `profiles` portait
  des colonnes homonymes `zone_type`/`tc_access` héritées du schéma initial, avec un vocabulaire
  *différent* (`urbain`/`aucun` au lieu de `urbain_dense`/`periurbain`/`rural` et `inexistant`) :
  une vue d'analyse branchée dessus segmentait 136 utilisateurs sur `NULL` sans lever d'erreur.
  Elles ont été supprimées (`20260905180000`), avec `profiles.onboarding_completed_at` qu'aucun
  code n'écrivait. Vérifier qu'une colonne est *alimentée* avant de s'y fier — et se méfier des
  valeurs de statut écrites de mémoire (`assessments.status` vaut `completed`, jamais
  `submitted` ; c'est aussi ce que teste la racine de l'app pour router vers le plan).
  **Une colonne vide n'est pas une colonne morte** : `emission_factor_sync_runs.detail`,
  `notification_outbox.last_error`, `commute_carpool_size` et `commute_distance_bracket` sont
  toutes nulles en base et parfaitement vivantes. Ce qui qualifie une colonne morte, c'est
  qu'aucun code ne l'écrit.

**Suppression de compte et export** (`delete_my_account`, `export_my_data`) : bloqueur Google
Play — toute app permettant de créer un compte doit offrir un chemin de suppression **dans**
l'app, et Ramille en crée un dès l'ouverture, session anonyme comprise. Play exige **en plus**
une URL web atteignable sans l'app : `/compte/suppression`.

Cette page a imposé la seule fonction du produit qui **connecte à un compte existant** au lieu
d'en rattacher un (`sendAccountAccessLink`, lien à usage unique par email). Tout le reste de
`src/lib/auth.ts` lie une identité à la session anonyme courante — ce qui ne peut pas aider
quelqu'un qui a désinstallé l'app et arrive dans un navigateur neuf, où `ensureSession` vient
de lui créer une session anonyme **vide qui n'est pas son compte**. Deux garde-fous non
négociables : `shouldCreateUser: false` (une page de suppression qui fabrique des comptes
serait le contraire de ce qu'elle affiche), et **aucune réponse différenciée** selon que
l'adresse a un compte ou non — une adresse inconnue renvoie un 422 `otp_disabled` qu'il faut
traiter comme un succès, sinon la page devient un moyen de savoir qui utilise Ramille. La
limite d'envoi, elle, se reconnaît au **code** `over_email_send_rate_limit` : le message de
Supabase ne contient pas le mot « rate ».

Et le piège central, dérivé dans `src/types/compte-suppression.ts` : **une session anonyme
vide n'est pas un compte à supprimer.** Sans le test « porte-t-elle au moins un bilan ? », la
page effacerait la session créée par sa propre ouverture et annoncerait une suppression qui
n'a rien supprimé. Le test épingle aussi qu'une session anonyme portant déjà une adresse non
confirmée (entre `updateUser({ email })` et le clic de confirmation) n'est **pas** un compte
rattaché. **La suppression
efface une seule ligne, `auth.users`, et laisse la cascade faire le reste** : une fonction qui
énumérerait les tables deviendrait fausse à la prochaine migration, en silence. Ne jamais
rattacher une table à `profiles` avec autre chose que `on delete cascade` — un test pgTAP
vérifie la chaîne niveau par niveau. L'export est `security definer` pour une autre raison :
`usage_events` n'ayant aucune policy de lecture, une fonction en `security invoker` rendrait un
export silencieusement incomplet.

**Canal de retour** (`feedback`, issue #29) : la seule table où un client écrit du texte
libre. Comme chaque visiteur reçoit une session anonyme dès l'ouverture, ouvrir l'INSERT à
`authenticated` revient à l'ouvrir à quiconque sait appeler l'API — d'où le trigger
`enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et les bornes de longueur.
**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites. Après la
saturation du quota, c'est le trigger `before insert` qui refuse — il s'exécute avant
l'évaluation des CHECK et lève lui aussi un `23514`. Et depuis la session d'un tiers, c'est la
RLS (`42501`). Elle doit donc venir avant le remplissage du quota **et** sous la session du
propriétaire. Plus généralement, pour valider un test pgTAP en base, rejouer la **séquence
entière** du fichier, bascules de `request.jwt.claims` comprises — un scénario extrait de son
contexte ne reproduit pas le rôle sous lequel il tournera.

**Rappel par email** : `enqueue_checkin_reminders()` remplit `notification_outbox` à chaque
génération de check-in, `send_pending_reminders()` (cron quotidien 7h UTC) l'envoie via
l'extension `http`. **La garantie anti-relance de la spec §7 est structurelle** :
`unique(checkin_id)` sur la boîte d'envoi — un check-in, un email, jamais deux, quel que soit
le nombre de passages du cron. Quatre conditions d'éligibilité, toutes nécessaires : compte
rattaché, email **confirmé**, rappels non désactivés (`profiles.email_reminders_enabled`,
opt-out réglable depuis `/suivi`), check-in encore `pending`. **L'envoi est inactif tant que
les secrets Vault `resend_api_key` et `reminder_from_address` n'existent pas** — la fonction
sort sans rien toucher, les rappels restent en attente. Voir `v1-07` §3.1 pour la mise en
service.

La boucle mensuelle (brique 4) est en réalité **deux boucles indépendantes**, toutes deux
proposées à tout utilisateur concerné (l'UI recommande de se concentrer sur le poste
dominant sans jamais fermer l'autre) : une hebdomadaire ancrée sur le trajet domicile-travail
(`loop_type = 'commute'`, générée par `generate_commute_checkins()`) et une mensuelle ancrée
sur le poste "extras" — loisirs ou voyages, quel que soit celui qui pèse le plus, même
départage que la décision dominante du bilan (`loop_type = 'extras'`, générée par
`generate_extras_checkins()`). Les deux écrivent dans la même table `engagement_checkins`
(contrainte `unique(user_id, loop_type, period_start)`), lisent les libellés snapshotés par
`compute_assessment_results` sur `assessment_results.commute_poste_label` /
`.extras_poste_label`, et sont plannifiées par `pg_cron` séparément (lundi 6h pour la boucle
hebdo, 1er du mois 6h pour la boucle mensuelle). Voir
`docs/architecture/v1-02-boucle-engagement.md`.

### Conventions front notables

- **Tout repère chiffré affiché à l'utilisateur vit dans `src/constants/carbon-reference.ts`**,
  jamais en dur dans un écran : moyenne française, objectif 2050, décomposition par poste,
  repère transport. **Une seule source statistique, le SDES** (décomposition par postes de
  consommation, données 2017) : le total affiché est *défini* comme la somme des postes, jamais
  recopié d'ailleurs. C'est délibéré — il circule au moins quatre chiffres officiels pour « la
  moyenne d'un Français », dont deux contradictoires sur le site de l'ADEME lui-même (9,1 t et
  9,3 t), et une première version mélangeait ce 9,3 t avec la ventilation SDES. Ne pas
  « rafraîchir » le total avec une valeur plus récente sans reprendre aussi la ventilation :
  l'arbitrage complet est en `v1-07` §3.4 et un test épingle l'invariant. Seule exception, la
  cible 2050 (2 t, ADEME) — un objectif normatif ne concurrence pas une mesure.
  `TARGET_2050_TRANSPORT_T` est une **dérivation** explicitement signalée — aucune source
  publique ne donne d'objectif 2050 par poste d'empreinte individuelle — d'où le libellé
  « Repère » et non « Objectif » à l'écran.
- **Le palier de la restitution est le cap de la saison, jamais une marche inventée**
  (`src/types/palier.ts`). La barre « Repère 2050 » lui a cédé sa place : afficher 15,8 t à côté
  de 0,6 t donnait un rapport de 1 à 26 que le texte ne rattrape pas, et 2050 tient désormais
  en mots. Deux mécaniques ont été écartées sur les données réelles et ne doivent pas revenir :
  la trajectoire linéaire (le pas dépend du point de départ — −609 kg/an à 15,8 t contre
  **−6 kg/an** à 0,76 t) et les marches absolues partagées (première marche à −82 %). Le repère
  2050 réapparaît **dès qu'on passe sous la moyenne française** (`showsTarget2050`) : au-dessus
  c'est un gouffre, en dessous un horizon crédible à un facteur 2 à 4. Quand le palier tombe
  pile sur le repère, c'est le **repère** qui est affiché — c'est l'objectif final, pas une
  étape. Être déjà sous le repère ne coupe pas la proposition : la marche reste offerte, dans un
  registre de contribution (« ce que tu n'émets pas laisse de la marge ailleurs ») et jamais
  d'exigence. **Le nombre de paliers restants ne s'affiche jamais.**
- **Les pages légales (`/confidentialite`, `/conditions`) partent d'un fait juridique qu'il ne
  faut pas « corriger » par réflexe : le produit est édité par un particulier, à titre non
  professionnel et sans but lucratif.** L'article 6 III-2 de la LCEN autorise alors à ne
  publier que les coordonnées de l'hébergeur, et le médiateur de la consommation (code de la
  consommation L612-1) ne s'applique pas du tout — il ne vise que les professionnels. D'où
  l'absence assumée de statut juridique, d'adresse postale, d'immatriculation et de directeur
  de la publication. Seul le RGPD (art. 13) reste incompressible : nom et coordonnées du
  responsable de traitement, regroupés dans `src/constants/editeur.ts` — un seul endroit à
  remplir, jamais de mention en dur dans un écran. Ce régime tomberait si le projet devenait
  une activité professionnelle.
- **La mascotte ne se redimensionne pas proportionnellement : sa géométrie est calculée**
  (`src/types/mascot.ts`, `mascotFaceGeometry`), et `src/components/mascot.tsx` ne fait que
  dessiner ce qu'elle rend. Le visage vit dans un `viewBox` 0 0 100 100, donc une unité vaut
  `size / 100` pixels : au trait nominal de 3,2 unités, la bouche mesurait **0,70 px** à
  `size={22}` dans l'en-tête du questionnaire et l'antialiasing n'en laissait qu'une tache
  grise — la mascotte y coûtait sa place sans rien rendre. La compensation optique épaissit
  donc les traits à mesure que `size` diminue (les positions ne suivent qu'à 20 %, sinon
  l'œil sort de la feuille), et sous `MASCOT_MIN_FACE_SIZE` le composant rend la feuille
  seule plutôt qu'un visage illisible. Ne jamais réintroduire de chemin SVG figé dans le
  composant, et ne jamais passer un `size` inférieur à cette constante. Deux pièges vérifiés :
  le point de contrôle d'une quadratique est à **2×** la flèche voulue (s'y tromper double la
  courbure des yeux, ce que ni le typecheck ni les assertions de lisibilité ne voient — seul
  un rendu visuel l'a montré, d'où le test de conformité aux chemins d'origine), et arrondir
  `50 ± offset` casse la symétrie d'un centième, d'où l'arrondi sur l'écart et non sur la
  coordonnée. Les joues affleurent le bord de la silhouette dès la taille nominale : le
  visage est découpé par un `clipPath`, sans quoi elles flottent hors du vert.
  **Elle parle, et tout ce qu'elle dit vit dans `src/constants/mascotte.ts`** (`RAMILLE`),
  rendu par `RamilleDit` — jamais une phrase écrite dans un écran. Trois règles, gardées par
  un test : première personne et tutoiement ; **jamais un nombre dans sa bouche** (les
  chiffres restent au produit, c'est ce qui garantit qu'elle ne commente jamais une
  empreinte) ; jamais « tu devrais » ni « il faut ». Les rappels par email sont un mot
  d'elle, signé (`enqueue_checkin_reminders`). Les répliques de check-in et de période calme
  viennent des maquettes validées et ne se réécrivent pas.
  Cinq expressions, **aucune négative et il ne faut pas en ajouter** : `calm`, `happy`,
  `encouraging`, `thinking` (attente du calcul — seule asymétrie assumée, le regard est décalé
  d'une unité) et `resting` (périodes calmes de `/suivi`). Un second registre s'obtient sans
  redessiner, par la prop `tilt` : une feuille penchée regarde, une feuille droite accompagne.
  **La mascotte n'apparaît jamais à côté d'un chiffre lourd** — ni près du total, ni près d'une
  empreinte élevée : y mettre un visage serait commenter, et le produit ne commente pas.
- **Un texte cliquable passe par `TextLink`, jamais par un `Pressable` enveloppant un
  `ThemedText`.** L'audit T11 avait relevé **zéro attribut d'accessibilité dans tout `src/`**, et
  ce motif y comptait pour une vingtaine d'occurrences. Le composant existe pour que le libellé
  annoncé **soit** le texte affiché — un `accessibilityLabel` recopié à côté du texte visible
  finit toujours par ne plus lui correspondre — et pour porter la cible tactile de 44 px sans
  déplacer le texte. Trois règles qui vont avec : les titres sont annoncés comme en-têtes
  **par leur `type`** (`title`/`subtitle` dans `ThemedText`), pas écran par écran ; les listes
  de choix exclusifs (`ModeListItem`, `ChoiceRow`) sont des `radio` et non des `button`, seul
  rôle qui annonce « sélectionné » ; et la mascotte comme les illustrations sont masquées
  (`aria-hidden`, `accessibilityElementsHidden`) — elles accompagnent un texte qui dit déjà
  tout. Un `Pressable` nu reste légitime quand la cible porte plusieurs textes (la bannière de
  `bilan/resultat.tsx`), à condition de lui donner un `accessibilityLabel` qui les recompose.
- **Un lien qui doit compter pour un moteur de recherche passe par `Link` d'Expo Router, jamais
  par un `onPress`.** `react-native-web` rend un `onPress` sur du texte en `<div>` : cliquable
  pour un humain, inexistant pour un crawler. Et il ne suffit pas que l'ancrage soit correct, il
  doit se retrouver dans le HTML **statique** — à vérifier dans `dist/*.html` après
  `expo export`, même piège silencieux que `cleanUrls`. Seul cas aujourd'hui : le lien vers la
  page personnelle de l'éditeur (`EDITOR_CV_URL`) au pied des deux pages légales, qui sont les
  seules surfaces publiques du produit (leurs URL sont données à Google Play et à l'écran de
  consentement Google). Le sens du lien est délibéré — Ramille vers le CV — et il ne porte
  pas de `nofollow`.
- **`react-native-web` : un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0`
  explicite pour pouvoir rétrécir sous sa largeur intrinsèque** — sinon un texte voisin
  (unité, label) peut être partiellement recouvert/coupé. Voir
  `src/components/bilan/numeric-field.tsx` et `src/components/auth/text-field.tsx`.
- **`Alert.alert(...)` sur web retombe sur `window.alert()`, qui n'invoque pas fiablement
  `onPress`** — pour tout flux qui doit exécuter une action après fermeture de l'alerte,
  utiliser un état de composant inline (écran à plusieurs états visuels) plutôt qu'un
  callback de bouton d'`Alert`. Voir `src/app/connexion/email.tsx` et
  `src/app/connexion/retrouver.tsx`.
- Persistance locale (brouillon de bilan, préférences UI comme "a déjà vu la proposition de
  connexion") via AsyncStorage — explicitement device-local, pas de sync multi-device tant
  que le compte n'est pas rattaché. Voir `src/lib/bilan-draft.ts`, `src/lib/connexion-prefs.ts`.
- Le questionnaire se préremplit dans cet ordre : **brouillon local > dernier bilan complété >
  vide** (`src/lib/bilan-history.ts`). Le brouillon prime car il est plus récent par
  construction. Un re-bilan prérempli est ce qui rend le suivi dans la durée praticable — sans
  lui, comparer deux bilans demandait de retaper les neuf étapes.
- La logique **pure** du suivi (écart entre deux bilans, dédoublonnage par jour, ancienneté)
  vit dans `src/types/suivi.ts`, séparée des requêtes de `src/lib/bilan-history.ts` : importer
  `@/lib/supabase` dans un module testé le fait échouer hors environnement configuré. Même
  découpage que `src/types/bilan.ts`.
- **L'écran `/suivi` n'a aucune mécanique d'échec** : ni streak, ni série cassée, ni score. Une
  période sans réponse n'y apparaît pas du tout (les check-ins non répondus sont clos en
  `expired` côté serveur et jamais relus). On compte les fois où la personne a répondu, jamais
  celles où elle a laissé passer — et une hausse d'empreinte est toujours présentée comme un
  fait, jamais comme une faute.
- **La barre d'onglets ne porte que deux destinations, et le reste n'est pas un lieu.** Le
  groupe `src/app/(tabs)/` contient le plan et la pile du suivi ; tout ce qui vit ailleurs
  s'affiche en plein écran, sans barre — le questionnaire et l'onboarding sont des flux, le
  compte est un détour, les pages légales des surfaces publiques. Ajouter une route dans
  `(tabs)/` lui donne un onglet : c'est presque toujours une erreur. **Ne jamais créer de route
  dynamique `[id]`** : l'export statique exige `generateStaticParams`, sans quoi la page n'est
  pas produite et Vercel répond 404 sans rien signaler — d'où `?id=` partout.
- **Un écran d'onglet mesure ses affichages avec `useTrackFocus`, jamais `useTrackView`.**
  react-navigation garde l'écran monté quand on change d'onglet : au montage, l'événement ne
  part qu'une fois par session. Le compteur ne tombe pas à zéro, ce qui se verrait — il rend un
  chiffre plausible et faux.
- **Les tailles et rayons qui se répètent vivent dans `TypeScale`/`Radius`/`ControlHeight`**
  (`src/constants/theme.ts`), consommés par les types `screenTitle`/`salient`/`cardTitle`/`body`
  de `ThemedText`. Une taille unique reste en dur là où elle vit — la nommer serait du bruit.
  Deux titres valent 30 px, la même valeur que `salient` qui nomme un **chiffre** : ils restent
  en dur, ce type sur un titre encoderait une fausse équivalence. `title`/`subtitle` (48/32)
  sont les tailles du handoff initial, qu'aucun écran n'affiche sans les surcharger.
- Le wizard du bilan (`src/app/bilan/index.tsx` + `src/components/bilan/steps/*`) dérive
  entièrement sa navigation ("Étape N sur M", saut conditionnel d'étapes) de l'état courant
  des réponses via `isStepVisible`/`nextStep`/`previousStep`/`isStepComplete` dans
  `src/types/bilan.ts` — pas de machine à états séparée à maintenir en parallèle.
- `bilan/resultat.tsx` a deux variantes de libellé pour le poste dominant, jamais
  interchangeables : `dominantHeadline()` (2ᵉ personne, "Tes voyages…", affichée à l'écran,
  adressée à l'utilisateur) et `dominantShareLabel()` (neutre, sans pronom, transmise à
  `/api/partage` — lue par les destinataires du lien partagé, pas par l'utilisateur qui
  partage). Voir `docs/architecture/v1-06-partage-social.md` §2.
