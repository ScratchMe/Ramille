# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le produit

TraceVerte est une app de sensibilisation à l'empreinte carbone des transports, pour la
France (public et interface exclusivement en français, y compris tout code produit :
messages d'erreur, commentaires métier, contenu). V1 = Google Play uniquement (pas d'App
Store, pas de Sign in with Apple).

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

**Toucher à un facteur d'émission invalide TOUTES les valeurs attendues de la suite pgTAP,
pas seulement celles qui citent ce facteur.** Une quinzaine d'assertions chiffrées sont
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

La connexion (Google via `linkIdentity()`, email/mot de passe via `updateUser()`) **convertit
la session anonyme en session permanente en conservant le même `user_id`** — jamais
`signInWithOAuth`/`signUp`, qui créeraient un utilisateur distinct et perdraient le
rattachement du bilan déjà stocké. Voir `src/lib/auth.ts`. Sur natif, le flux OAuth suit le
pattern Expo documenté par Supabase : `makeRedirectUri()` + `WebBrowser.openAuthSessionAsync`
(`skipBrowserRedirect`) + `QueryParams.getQueryParams()` + `supabase.auth.setSession(...)`.

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
`public.resolve_car_mode(mode_id, engine)` résout vers les modes correspondants avant tout
lookup de facteur/libellé dans `compute_assessment_results` ; moteur non renseigné (bilans
soumis avant ces migrations) retombe sur le générique `voiture`. Voir
`supabase/migrations/20260904090000_car_engine.sql` puis `20260905140000_motorisation_hybride.sql`.

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

**Canal de retour** (`feedback`, issue #29) : la seule table où un client écrit du texte
libre. Comme chaque visiteur reçoit une session anonyme dès l'ouverture, ouvrir l'INSERT à
`authenticated` revient à l'ouvrir à quiconque sait appeler l'API — d'où le trigger
`enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et les bornes de longueur.
**Attention en écrivant des tests dessus** : ce trigger `before insert` se déclenche AVANT
l'évaluation des CHECK et lève lui aussi un `23514`, donc toute assertion sur la contrainte de
longueur doit venir avant la saturation du quota, sinon elle passe sans rien éprouver.

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
- **`react-native-web` : un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0`
  explicite pour pouvoir rétrécir sous sa largeur intrinsèque** — sinon un texte voisin
  (unité, label) peut être partiellement recouvert/coupé. Voir
  `src/components/bilan/numeric-field.tsx` et `src/components/auth/text-field.tsx`.
- **`Alert.alert(...)` sur web retombe sur `window.alert()`, qui n'invoque pas fiablement
  `onPress`** — pour tout flux qui doit exécuter une action après fermeture de l'alerte,
  utiliser un état de composant inline (écran à plusieurs états visuels) plutôt qu'un
  callback de bouton d'`Alert`. Voir `src/app/connexion/email.tsx` et
  `src/app/connexion/mot-de-passe-oublie.tsx`.
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
- Le wizard du bilan (`src/app/bilan/index.tsx` + `src/components/bilan/steps/*`) dérive
  entièrement sa navigation ("Étape N sur M", saut conditionnel d'étapes) de l'état courant
  des réponses via `isStepVisible`/`nextStep`/`previousStep`/`isStepComplete` dans
  `src/types/bilan.ts` — pas de machine à états séparée à maintenir en parallèle.
- `bilan/resultat.tsx` a deux variantes de libellé pour le poste dominant, jamais
  interchangeables : `dominantHeadline()` (2ᵉ personne, "Tes voyages…", affichée à l'écran,
  adressée à l'utilisateur) et `dominantShareLabel()` (neutre, sans pronom, transmise à
  `/api/partage` — lue par les destinataires du lien partagé, pas par l'utilisateur qui
  partage). Voir `docs/architecture/v1-06-partage-social.md` §2.
