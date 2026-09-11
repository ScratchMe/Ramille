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

Cinq briques dans l'ordre de priorité de la spec §11 : Bilan initial (2) > Onboarding (1) >
Connexion (5) > Boucle mensuelle (4) > Plan de réduction (3). Cet ordre est aujourd'hui
historique — les cinq sont livrées — mais il explique le niveau de soin, que la spec §3 donne
brique par brique : copy et framing travaillés sur 1 et 2, « fonctionnel simple » sur 3 et 4,
soin sur le **placement et le message** pour 5. La connexion a son écart assumé (`v1-04` §1,
session anonyme dès l'ouverture) : reprendre l'ordre de la spec ne remet pas son découpage.

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

- **Jest** (`npm test`) sur la logique pure côté client. La règle, plutôt qu'une liste qui se
  périme au fichier suivant : **toute dérivation pure affichée à la personne ou décidant d'une
  navigation est testée**, dans un `*.test.ts` colocalisé — l'inventaire se lit en listant
  `src/**/*.test.ts`. Quelques-uns de ces tests n'existent pas pour attraper une régression de
  code mais une régression de **jugement**, et il faut savoir qu'ils sont là avant de « corriger »
  ce qu'ils épinglent : l'invariant SDES de `carbon-reference.test.ts` (le total est la somme des
  postes), la table de vérité de `rappels.test.ts` (jumelle SQL de `reminder_channel_for`), les
  règles de voix de `mascotte.test.ts` (jamais un nombre, jamais « tu devrais »), et la conformité
  des chemins de `mascot.test.ts`.
  **Un module testé ne doit pas importer `@/lib/supabase`** — d'où la séparation `src/types/*`
  (pur, testé) / `src/lib/*` (requêtes). Le motif n'est plus l'exception au chargement : depuis
  que le client est un mandataire, il ne lève plus qu'au premier accès (voir plus bas), ce qui
  rend l'échec **plus** discret — un seul test d'une branche, pas la suite entière — donc c'est un
  argument pour garder la règle, pas pour l'assouplir. La vraie raison est en tête du module :
  il tire `@react-native-async-storage/async-storage`, `react-native` (Platform) et
  `react-native-url-polyfill/auto`, qui n'ont rien à faire dans une suite de logique pure. Deux
  modules de `src/lib` sont testés en place et le restent à cette condition : `format.ts`, pur
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

**Et le piège a un symétrique, relevé le 11/09/2026 : trois assertions de la suite échouent sur le
projet distant et passent en CI, parce qu'elles supposent une base vierge.** Les connaître évite de
« corriger » un test qui n'a rien.
- `12_usage_events` assertion 9 (« un horodatage antidaté est écrasé par celui du serveur ») lit
  `min(occurred_at)` sur **toute** la table : le projet distant porte des lignes réelles
  antérieures à sa fenêtre de cinq minutes, une stack locale neuve n'en a aucune.
- `17_rappels_canal` assertions 15 et 16 attendent un envoi **sauté** faute de secrets Vault. Sur
  le distant, `resend_api_key` et `reminder_from_address` existent : la fonction envoie vraiment, et
  la ligne passe en `sent` / le passage en `success`.
Le reste de la suite est rejouable sur le distant et c'est la façon la plus rapide de valider un
fichier pgTAP sans Docker — à condition de rejouer le **fichier entier**, bascules de
`request.jwt.claims` comprises, et de savoir que ces trois-là ne prouvent rien là-bas.

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
`satori`/`@resvg/resvg-wasm`) — carte de bilan partageable, cf. « Partager mon bilan » dans
`src/app/(tabs)/suivi/bilan.tsx`. **Une Vercel Function en runtime Node.js dans ce repo a une
checklist non négociable** (`api/package.json` en `"type": "module"`, `vercel.json` →
`functions["<chemin>"].includeFiles` pour tout asset chargé par une dépendance transitive,
`request.url` toujours relatif donc à parser avec une base factice, export **nommé**
`GET`/`POST`/… jamais `export default`, `maxDuration` à surveiller si cold start lourd) — sans
elle, une Function échoue silencieusement (`FUNCTION_INVOCATION_FAILED`/`_TIMEOUT` générique,
aucun détail côté client) sans que le code lui-même soit en cause. Détail de chaque point,
pourquoi, et comment les vrais logs runtime Vercel ont permis de les diagnostiquer :
`docs/architecture/v1-06-partage-social.md` §3.

**Routing** : `src/app/` (Expo Router, file-based), organisé autour d'une **barre à deux
onglets** depuis `v1-11`. Le groupe `src/app/(tabs)/` porte les deux seuls lieux du produit :
`plan.tsx` (le présent — action engagée, point de la période) et la pile `suivi/`, dont
`suivi/index.tsx` est l'historique et `suivi/bilan.tsx` la restitution d'un bilan
(`/suivi/bilan?id=`, `&nouveau=1` à la sortie du questionnaire). **La restitution n'est pas un
troisième lieu** : c'est la dernière page d'un flux, ou le détail d'une entrée du suivi — d'où
sa place dans cette pile, qui garde la barre visible.

Tout le reste vit hors du groupe et s'affiche en plein écran, sans barre : `/onboarding` et
`/bilan` sont des **flux**, `/compte/*` et `/connexion/*` des détours, `/confidentialite`,
`/conditions`, `/compte/suppression` et `/feedback` des surfaces publiques ou de service. Les
deux règles qui vont avec ce découpage (ajouter une route dans `(tabs)/` lui donne un onglet ;
jamais de route dynamique `[id]`) sont en § Conventions front notables, pas ici.

Le parcours : `/` route sur `/plan` si un bilan complété existe, sinon `/onboarding` → `/bilan`
(la sortie de l'onboarding vide la pile avant d'y entrer, `dismissAll()`) →
`/suivi/bilan?id=…&nouveau=1`, d'où l'on rejoint le plan. `/connexion` s'atteint depuis la
restitution — transition imposée (`resultat_transition`) et bouton délibéré (`resultat_cta`),
deux provenances que la mesure distingue — et depuis `/compte` (`compte`).
`/connexion/retrouver`, seul chemin vers un compte **existant**, s'atteint depuis quatre
endroits, énumérés par `SOURCES_RETROUVER` : l'accueil de l'onboarding (« J'ai déjà un
compte »), `/connexion/email` quand l'adresse est déjà prise, `/connexion` sur une collision
Google, et un lien de connexion arrivé en **échec** (expiré, déjà utilisé), que le layout racine
route ici avec son motif (`src/app/_layout.tsx`) — un lien valide, lui, ouvre la session et ne
passe pas par cet écran. Le compte s'ouvre par son icône (`CompteBouton`), pas par un onglet.

**`/bilan/resultat` existe toujours, et c'est exprès** : un `<Redirect>` de quinze lignes vers
`/suivi/bilan`, parce que l'adresse est citée dans `page-titles.ts`, dans l'en-tête
d'`api/partage.ts`, dans les liens déjà partagés et dans des favoris. Un lien mort silencieux
est le pire résultat d'un déplacement de fichier, et c'est la destination de la boucle de
partage — ne pas la supprimer au prochain nettoyage.

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
Son canvas est `docs/design/v1-11-navigation/`, ses écarts d'implémentation sa §7. **Trois des
quatre puces de sa §8 restent à vérifier sur appareil** : l'annonce TalkBack « Plan, onglet,
sélectionné » ; le placement de la **carte d'attente** du plan, posée au-dessus du cap de la
saison — la règle « jamais la mascotte près d'un chiffre lourd » vise l'empreinte et non une
réduction, mais si le rendu réel la fait paraître commenter le cap, elle descend sous les actions
(déplacement d'un bloc ; la puce visait la carte de période calme, remplacée par celle-ci en
`v1-12` §6.3) ; et le **lien de connexion `ramille://`**, repris plus bas avec ce qui le distingue
du lien du rappel.
Le **retour matériel Android** n'est plus à vérifier : vérifié le 09/09/2026, il quitte bien
l'app depuis `/plan` — c'est le comportement attendu d'une racine à onglets, et il ne doit pas
être « corrigé » par quelqu'un qui le prendrait pour une navigation manquante.

L'increment précédent, `v1-10-connexion-et-rappels.md` (06/09/2026), est livré pour ses
chantiers A à D, F **et E** ; il ne reste que G (renommage GitHub). Il portait la connexion
par lien sans mot de passe, les rappels par push, et deux correctifs livrés qui les
conditionnaient — l'étalement du pic d'envoi du lundi, et la purge des sessions anonymes qui
supprimait sur l'**âge** du compte alors que `v1-04` §3 décrit une purge sur l'**inactivité**
(corrigée, `v1-10` §2.B). Son compagnon design est `docs/design/v1-10-retrouver-son-compte/`.

**Le chantier E est livré, et vérifié sur appareil le 09/09/2026** : `v1-12-rappels.md` en est
le document, avec son canvas cliquable `docs/design/v1-12-rappels/`. Le rappel part par
**notification, par email, ou pas du tout** ; le canal se résout en un seul endroit (§3) ; le
jeton d'appareil suit la personne par RPC ; la feuille des rappels s'ouvre **une fois par
appareil** après « C'est noté », et la carte d'attente du plan a remplacé « Rien à rattraper ».
Les trois branches ont été parcourues en conditions réelles — notification reçue, email reçu,
lien du rappel ouvrant l'app et non le navigateur, réponse refermant le point (§8.1).

**Ce qui a été vérifié là, c'est le lien du rappel, pas celui de la connexion**, et les
confondre ferait croire qu'un chemin a été éprouvé alors qu'il ne l'a pas été. Le lien du
rappel pointe `https://www.ramille.fr/plan` et s'ouvre dans l'app par `assetlinks.json`. Le lien
de connexion, lui, arrive en `ramille://` depuis une messagerie, remonte par `Linking.useURL()`
dans `_layout.tsx`, et doit aboutir sur le plan barre comprise : **ce chemin n'a jamais été
exercé sur appareil** (`v1-11` §8, dernière puce), alors que c'est le seul accès à un compte
existant depuis un téléphone neuf.

**Ce que ce test a appris, et qu'aucune suite ne pouvait dire :** le canal marchait
parfaitement pendant que la boucle se cassait au dernier mètre. Appuyer sur la notification
ouvrait le plan **sans la question**, parce qu'un écran d'onglet ne charge ses données qu'une
fois par lancement — react-navigation le garde monté, et l'app survit à l'arrière-plan, qui
est exactement l'état d'où l'on revient quand une notification arrive. D'où
`useRafraichirAuRetour` (`src/hooks/use-rafraichir-au-retour.ts`) : **tout écran d'onglet dont
le contenu peut changer côté serveur doit l'utiliser**, et il écoute deux retours parce qu'il
en faut deux — le focus de l'écran, et le retour de l'app au premier plan que la navigation ne
voit pas. Un `useEffect` de montage, là, rend un écran plausible et périmé.

**Le point interroge la période ÉCOULÉE, pas celle qui commence** (C2.3, 11/09/2026) :
`generate_commute_checkins()` pose `period_start` au lundi **précédent**, `generate_extras_checkins()`
au mois précédent, et la question s'ouvre sur la période — « La semaine dernière, as-tu changé de
mode de transport pour ton trajet domicile-travail ? », « En septembre, … » (le mois écoulé est
**nommé**, il ne se dit pas « le mois dernier »). **Le moment d'envoi, lui, n'a pas bougé** : cron
le lundi 6 h et le 1er à 6 h, étalement du `send_after` inchangé (v1-12 §2.8) — c'est la période
interrogée qui recule, et confondre les deux ferait « corriger » le générateur dans le mauvais
sens. Avant, le push partait quand la semaine avait quelques heures : la seule réponse honnête
était « Non », suivie de la consolation d'échec.
Le nom du mois vit dans `public.mois_francais(date)`, appelée par le libellé de période **et** par
la question — deux copies d'une liste de douze chaînes divergent par une faute de frappe que
personne ne relit. Sa jumelle client est `MOIS_FRANCAIS` (`src/types/checkin.ts`), épinglée par un
test : `toLocaleDateString('fr-FR', { month: 'long' })` aurait évité la copie, mais Hermes peut
être construit sans ICU complet et rend alors un mois en anglais — invisible en CI, visible sur
l'appareil, dans la seule phrase qui doit correspondre mot pour mot à la notification qu'on vient
d'ouvrir. Elle lit les **caractères** de `period_start` et jamais un `Date` : `new Date('2026-09-01')`
est minuit UTC, donc août à l'ouest de Greenwich.

**La question du point a une seule source côté client, `src/types/checkin.ts`** (C2.5, 11/09/2026),
et c'est la moitié d'une paire avec `enqueue_checkin_reminders` — le rappel part sans le client, la
carte repose la question avec lui. `checkin-card.tsx` l'écrivait lui-même, au présent et avec le
libellé snapshoté : la notification disait « La semaine dernière, as-tu changé de mode de transport
pour ton trajet domicile-travail ? » et l'écran « As-tu changé de mode de transport au moins une
fois cette semaine pour Trajet domicile-travail (Voiture thermique) ? ». Sur un produit dont la
boucle consiste à appuyer sur la notification pour répondre, ce n'est pas une variante de
formulation : c'est la même question qui ne se reconnaît pas d'un écran à l'autre. C2.1 étendra ces
fonctions (l'action engagée, ses jours, la troisième réponse) plutôt que d'ouvrir un troisième
endroit.

**Le cycliste, le piéton et les loisirs rares ne reçoivent pas la même boucle** (C2.5, arbitrage D5,
`20260912140000_qui_recoit_quelle_boucle.sql`). Quatre choses à connaître avant d'y toucher :

- **C'est la catégorie du mode qui décide de la question de maintien, jamais le CO₂.** Le chantier
  proposait `commute_main_leg_co2_kg_year = 0` ; ce critère est faux depuis les facteurs ACV —
  `marche` vaut 0 mais `velo` 0,00017 et `trottinette` 0,0249 — donc il n'attraperait que les
  piétons et laisserait les cyclistes recevoir chaque lundi une question dont la seule réponse
  honnête est « Non ». `engagement_checkins.question_kind` (`changement` | `maintien`) et `.mode`
  sont **deux** colonnes parce que ce sont deux faits : le genre, que C2.1 fera grossir, et le mode
  qui remplit le texte. La catégorie `velo_marche` compte **trois** modes (`velo`, `marche`,
  `trottinette`) : en ajouter un quatrième impose un complément dans
  `public.complement_de_maintien` **et** dans sa jumelle `src/types/checkin.ts`, sinon il reçoit
  « autrement » en silence des deux côtés. Un test pgTAP épingle la liste.
- **Le « Non » d'un maintien ne reçoit jamais `checkinNon`** : cette réplique console d'un échec, et
  répondre « non » à « ton trajet s'est-il fait à vélo ? » n'en est pas un. D'où `maintienNon`, en
  visage `calm`. Le choix vit dans `repliqueDuPoint`, avec son test — jamais en ternaire dans la
  carte.
- **Le mode par défaut des loisirs « rarement » est un résiduel de calcul, et il ne nomme plus
  rien.** Le calcul reste (D5, spec §5 : 15 km, 0,25 fois par semaine) mais ses conséquences
  partent : `extras_poste_label` **et** `dominant_poste_label` disent « Loisirs du week-end
  (occasionnels) », `dominant_poste_mode` est nul (sans quoi la restitution écrivait « Tes loisirs
  du week-end **en voiture** »), et `estimate_action_savings` refuse les gabarits `leisure` — une
  action « faire une sortie sur trois à vélo » sur des sorties jamais déclarées. Les deux libellés
  partagent le mot parce que leur condition est **le même test** (`v_leisure_co2 >= v_travel_co2 ×
  0,95`), donc ils ne peuvent pas se contredire. Conséquence à connaître : **tout cycliste et tout
  profil sédentaire a désormais un plan à zéro action** — l'écran le félicite (« Tu fais déjà
  l'essentiel sur ce poste »), ce qui est juste, mais la carte du cap s'affiche encore au-dessus,
  relevé pour C3.8. Et si `household_vehicles = '0'`, le résiduel passe en **train** et non en bus :
  à 0,1224 kg/km le bus ne vaut que 14 % de moins qu'une thermique en ACV, la correction aurait été
  un non-événement (A7-13).
- **La boucle mensuelle demande une base déclarée**, sinon elle n'est pas générée :
  `extras_poste_label` est calculé sans condition, donc sans ce filtre un profil qui a répondu sortir
  rarement et n'avoir pris ni vol ni long trajet recevait chaque mois une question sur des
  déplacements qui n'existent que dans le résiduel. `generate_extras_checkins` joint donc
  `assessment_answers` — en production un bilan `completed` les porte toujours
  (`recompute_assessment_results` lève sans elles), ce sont les **fixtures de test** qui s'en
  passaient. Et un bilan à zéro nomme le poste où quelque chose est déclaré : plus de
  « Trajet domicile-travail () ».

**Un rappel par email ne part pas à l'instant où il est mis en file** : `send_after` porte un
décalage de 0 à 4 jours dérivé du hachage de l'identifiant (étalement du pic du lundi,
`v1-10` §2.B). Le push, lui, part à `now()`. Pour provoquer un rappel de test, passer par
`generate_commute_checkins()` puis `send_pending_reminders()` — le chemin du cron entier —
plutôt que d'insérer un point à la main.

**Feuille de route courante : `v1-13-audit-et-chantiers.md`** (audit du 09/09/2026, 283 constats
contre-vérifiés, 54 chantiers ordonnés en cinq lots, les dix-huit arbitrages rendus le 10/09/2026 en §1, une
issue GitHub par chantier — #99 à #151 et #153 — et **le plan de livraison en huit vagues en §2.3**, dont
l'issue de suivi #154 est la vue cochable ; inventaire complet en `docs/audit/2026-09-09-inventaire.md`).
**Les vagues 1, 2 et 3 sont livrées** — le lot 0 (sécurité et exploitation) le 10/09/2026, puis le
lot 1 (bugs silencieux et textes faux, puis écrans d'onglets) le 11/09/2026. **Le jalon « publiable
sur Play » est atteint côté code** ; ce qui reste avant de publier n'est pas du code mais les
vérifications de la §11 et la checklist de `docs/exploitation/README.md`. La vague 4 (lot 2, socle
et serveur de la boucle d'engagement) est la suite.

Deux choses à lire avant de lancer une vague : la **§11**, qui liste ce qui reste à vérifier sur
appareil et que cocher une ligne de §10 ne dit pas, et **le relevé de fichiers, à refaire à chaque
fois** — la colonne « Parallèle ? » de §2.3 est une intention, pas un relevé. Elle s'est trompée
deux fois de suite : la vague 2, annoncée disjointe, partageait six fichiers, et la vague 3,
annoncée « enchaînée », avait deux chantiers réellement parallélisables et trois fichiers
revendiqués par plusieurs — dont un par trois. Le relevé coûte dix minutes et évite qu'un chantier
en écrase un autre en silence.
**Le lot 2 a son canvas Claude Design, livré le 10/09/2026** : `docs/design/v1-14-boucle-engagement/`
(brief, HANDOFF du designer, captures, README qui consigne ce que l'implémentation corrige par rapport au
canvas) et son document d'implémentation **`v1-14-boucle-engagement.md`** — la copie (§3, seule source
des nouvelles répliques de Ramille et des textes produit), la base (§4), les composants et leur chantier
propriétaire (§5), les quatre jetons de couleur (§6), les accessoires de saison de la mascotte (§7), les
écarts assumés par rapport au canvas (§10). Un chantier du lot 2 lit v1-14 avant v1-13 pour sa partie
écran. Le **design system** formalisé à cette occasion vit dans `docs/design/design-system/` et
s'invoque comme skill (`ramille-design`, `.claude/skills/ramille-design/SKILL.md`) ; c'est une
photographie du dépôt, pas une source de vérité — en cas d'écart, le code et ce fichier gagnent, et son
catalogue reprend des écrans du handoff V1 qui n'existent plus (mot de passe). Le plan précédent, `v1-07-audit-facteurs-et-suivi.md`
§4 — audit du 04/09/2026, 7 étapes (facteurs d'émission faux → boucle d'engagement cassée → suivi
dans la durée qui manque) — est entièrement livré. Son §1 corrige deux erreurs de chiffre documentées ailleurs
comme des choix assumés : l'API Impact CO2 **distingue bien** court/moyen/long-courrier (la
valeur du mode avion dépend du paramètre `km` de la requête, contrairement à ce qu'affirme le
commentaire du seed initial), et le poste voyages en train était calculé au facteur TER. Son §2
liste les défauts vérifiés (T1-T13) auxquels les autres documents renvoient.

**Ce qui fait marcher Ramille sans vivre dans le dépôt a un registre : `docs/exploitation/`**
(lot 0 du plan v1-13, livré le 10/09/2026). Son `README.md` nomme les comptes tiers — Supabase,
Vercel, EAS/Expo, Google Play, Google Cloud et le projet Firebase d'où viennent
`google-services.json` et la clé FCM v1, Resend, le registrar du domaine, GitHub — les réglages
qu'ils portent, ce qui tombe si l'un manque, la checklist à parcourir avant de publier sur Play,
et la question de continuité (tout tient à une seule personne, elle n'est pas tranchée). Son §8
est la porte d'entrée des journaux : `analytics.rappels_par_jour`, `analytics.rappels_bloques`,
`analytics.synchronisations_facteurs`, `public.reminder_send_runs`, `public.purge_runs`, chacun
avec sa requête et ce qui doit alerter. À côté : `redirect-urls.md` (la liste réelle des URL de
redirection Supabase, relevée entrée par entrée, avec ce qui doit en être retiré),
`sauvegarde.md` (le régime de sauvegarde et la procédure de restauration) et
`remontee-erreurs.md`. **Rien dans le code ni dans la CI ne voit ces réglages, et aucun de ces
journaux n'émet d'alerte** : c'est ce dossier qui les rend vérifiables, et un journal qu'on ne
sait pas où lire se lit zéro. Aucune valeur secrète n'y descend — on nomme le réglage et
l'endroit où il vit.

Deux nuances du fichier des redirections qu'il ne faut pas réécrire à l'envers : **le suffixe de
compte `-me-c4a3` resserre un motif de preview, il ne le ferme pas** (un hôte `*.vercel.app` est
alloué d'après le nom de projet, choisi librement, donc un tiers qui nomme son projet
`ramille-xxx-me-c4a3` obtient une adresse qui correspond au motif — l'ordre de préférence est :
aucune entrée de preview, sinon l'hôte exact retiré après usage, sinon le motif faute de mieux) ;
et `https://ramille.vercel.app/**` est bien notre projet aujourd'hui, mais c'est un nom dans
l'espace global `vercel.app`, donc **il se retire le jour où le projet Vercel est renommé**.

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

**`estPanneDeTransport` couvre les 5xx, et c'est assumé** (même module) : `auth-js` ne réserve
pas `AuthRetryableFetchError` à l'échec de `fetch` — son `lib/fetch.js` porte
`NETWORK_ERROR_CODES = [500…504, 520…530]` et lève ce même nom pour chacun, code du corps jeté au
passage. La non-divulgation qui reste tenue est la seule qui porte l'information : le 422
`otp_disabled` d'une adresse inconnue mène au **même** écran d'attente qu'un envoi accepté. Deux
pièges qui vont avec : un test qui fabrique un 500 **sans `name`** n'éprouve rien (le SDK ne
produit jamais cette forme — c'est ainsi qu'un commentaire a pu affirmer l'inverse du code sans
que rien ne tombe), et le message d'échec dit « n'a pas abouti » et non « n'est pas partie »,
puisque sur un 5xx la demande a bien quitté l'appareil.

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

### Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1`
(via `mcp__Supabase__apply_migration`). **Après toute migration, régénérer
`src/lib/database.types.ts`** (`mcp__Supabase__generate_typescript_types`) — le fichier n'a
pas de formateur automatique dans ce repo (pas de prettier installé), donc respecter le
style existant (guillemets doubles) en le retouchant à la main si besoin.

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
`emission_factor_sources` et `usage_event_types`. Un privilège se justifie par un appel réel
depuis `src/`, jamais par « un test en a besoin » ; et un test qui n'assure qu'un refus reste vert
après un `revoke`, « permission denied » et « violates row-level security » portant tous deux le
SQLSTATE 42501.

**La soumission écrit `in_progress` d'abord, et c'est ce qui empêche le bilan fantôme**
(11/09/2026, `20260911120000_soumission_bilan.sql`). L'ancienne séquence insérait `assessments` en
`completed` avec son `submitted_at`, **puis** les réponses, **puis** appelait le calcul : ce qui
s'arrêtait entre les deux premières laissait un bilan complété sans réponses ni résultat, et cet
état n'est pas inerte — la racine route sur `status = 'completed'`, donc elle envoyait au plan, qui
affichait « Ton plan est en cours de préparation » sans bouton et pour toujours (le cron nocturne
boucle lui aussi sur les `completed`, mais il a besoin des réponses), le préremplissage du
re-bilan ne trouvait rien, et l'entonnoir comptait un bilan soumis là où il y avait eu une panne.
`in_progress` est l'état que rien ne lit. Trois règles qui en découlent : **le passage en
`completed` précède le RPC** (`generate_plan_cycle_for_user` sélectionne les `completed`) ; la
reprise **réutilise** le bilan `in_progress` qui traîne au lieu de le supprimer — ce qui couvre
aussi l'app tuée entre deux écritures, où aucun nettoyage ne tournerait, et n'oblige pas à
accorder un `delete` sur `assessments` ; et les réponses passent donc par un `upsert`, leur clé
primaire étant `assessment_id`. Le verrou anti-double-soumission vit dans une `useRef`, pas dans
l'état d'affichage, qui ne vaut `true` qu'au rendu suivant. Côté SQL, la génération du plan est
enveloppée dans un `begin … exception … end` : les deux fonctions partagent la transaction du RPC,
donc sans cette sous-transaction un plan qui échoue emportait le résultat que le calcul venait
d'écrire.

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
`MODE_PREPOSITION` (`src/types/resultat.ts`) puisqu'il peut être le `dominant_poste_mode`.

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

**La réponse à un point de suivi passe par `repondre_au_checkin`, et `engagement_checkins` n'a
plus aucune écriture client** (11/09/2026, `20260911100000_reponse_checkin_rpc.sql`) : ni policy
d'écriture, ni privilège `update`. Le raisonnement est mot pour mot celui de `plan_actions`
ci-dessous — **la RLS filtre des lignes, jamais des colonnes** — et ce qu'une policy UPDATE
owner-scoped ouvrait ici n'était pas anodin : `trip_label` et `period_label`, les libellés
snapshotés qui existent précisément pour qu'un re-bilan ne réécrive pas un point déjà généré ;
`period_start`, la clé d'idempotence de la génération (`unique(user_id, loop_type, period_start)`
+ `on conflict do nothing`), dont la réécriture bloque ou duplique la période suivante ; `status`,
qui accepte `expired` — un point en attente pouvait disparaître de la carte du plan sans avoir été
répondu ; et `responded_at`, qui venait de l'horloge du téléphone. Le RPC pose les trois seules
colonnes d'une réponse, avec `now()` du serveur, et refuse un point déjà répondu ou clos. C'est
aussi le seul endroit où la forme de la réponse changera quand une troisième réponse (« pas de
trajet cette période ») arrivera — mais `p_reponse boolean` ne peut pas porter un troisième état :
ce sera une migration, pas un paramètre de plus.

**L'engagement sur une action passe par un RPC, jamais par une policy UPDATE.**
`plan_actions` porte des chiffres figés à la génération, et **deux gardes indépendantes les
protègent depuis le 10/09/2026** : aucune policy d'écriture — en ajouter une ouvrirait toutes les
colonnes, la RLS filtrant des lignes et jamais des colonnes — et aucun privilège d'écriture au
niveau table, `grant select` seul (`20260910110000_grants_explicites.sql`). Un ordre direct est
donc refusé par le privilège (42501) avant même d'atteindre la RLS ; jusqu'à cette date le
privilège `UPDATE` était accordé par défaut et seule l'absence de policy le rendait inoffensif.
D'où `commit_plan_action` / `clear_plan_action_commitment` (`security definer`, propriété
vérifiée à l'intérieur), et deux tests pgTAP qui épinglent le refus. Une seule action engagée par cycle
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

**`cadence_type = 'rolling_quarter'` est un mécanisme dormant, et il faut le savoir avant de le
prendre pour du code mort.** Toute la chaîne serveur existe et est testée — `rolling_quarter_bounds`,
le branchement de `generate_plan_cycle_for_user`, le snapshot `plan_cycles.cadence_type`, quatre
assertions du test 00 et le scénario B du test 02 — mais **aucun écran ne l'écrit ni ne la lit** :
les 19 profils de la base valent tous `season`, la valeur par défaut (relevé le 11/09/2026).
`v1-01` la décrivait comme un « paramètre réservé pour la brique 3, stocké dès maintenant pour ne
pas migrer le profil plus tard » ; la brique 3 est livrée depuis `v1-03` et rien ne disait pourquoi
le réglage n'a jamais été ouvert. La réponse est qu'il ne l'a pas encore été, pas qu'il a été
écarté : le handoff design le prévoit (`docs/design/README.md`, puce « Cadence : saison — été »),
donc l'ouvrir dans « Toi » serait une décision produit et non une invention. La dormance est
consignée en base sur le commentaire de la colonne (`20260912110000_detail_kind_et_cadence.sql`).

Même famille, côté plan : `action_templates.detail_kind` ne vaut plus que pour les postes
domicile-travail et loisirs. La branche `travel` d'`estimate_action_savings` construit son détail
elle-même avec `format(...)` avant d'atteindre le `case`, qui est gardé par `if v_detail is null` —
les trois valeurs de voyages étaient donc **inatteignables et masquantes** (un template de voyages
avec un `detail_kind` neuf aurait reçu le détail générique du segment, en silence). Elles ont été
retirées de la contrainte et le champ mis à `null` sur les trois templates concernés, plutôt que
branchées : les faire passer par le `case` l'obligerait à lire `v_count`, une variable locale de la
branche, et en ferait un troisième endroit où se lit la logique de segment.

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

**La même règle vaut pour une valeur de propriété, et elle est plus discrète** : la base ne valide
pas les valeurs de `props` — `check_usage_event_props` ne compte que des clés et des longueurs —
donc rien n'arrête la dérive. `connexion_view` déclarait cinq provenances dont deux qu'aucun écran
n'émettait plus, et une sixième (`compte`) que l'écran de connexion réécrivait en
`resultat_transition` faute de la reconnaître : la provenance la plus intéressante à mesurer
gonflait exactement le chiffre auquel on voulait la comparer. D'où `SOURCES_CONNEXION`
(`src/types/analytics.ts`) — **une seule liste**, qui donne le type *et* le garde
d'appartenance — et le fait que les valeurs attendues soient écrites dans la description du
référentiel, seul endroit où la base peut les porter.

**Deux mesures valent d'être connues, parce qu'elles étaient fausses d'une façon qui ne se voit
pas dans un chiffre** (11/09/2026) :
- **`app_open` part après la résolution d'`ensureSession()`, jamais au montage du layout**, et
  porte `props.origine` (`demarrage` / `retour`). `track()` renonce quand aucune session n'existe
  encore : émis au rendu, l'événement était perdu précisément sur les premiers lancements — ceux
  où la session se crée — soit un biais systématique contre les nouveaux venus, une ligne en base
  pour six vues d'étape d'onboarding. Et le second chemin n'existait pas du tout : le layout n'est
  monté qu'une fois par chargement du bundle, or le chemin nominal de la boucle d'engagement est
  une app en arrière-plan que la notification ramène devant. `retour` n'existe que sur natif.
  C'est aussi ce qui rend vraie la phrase sur laquelle `purge_stale_anonymous_accounts()` fonde sa
  fenêtre de 90 jours.
- **`connexion_demande` est l'intention, `connexion_success` le fait constaté.** L'écran email
  émettait `connexion_success` juste après `updateUser({ email })`, que `etatDuRattachement`
  classe pourtant en `a_confirmer` : `is_anonymous` ne bascule qu'au clic du lien reçu. Le chemin
  Google, lui, n'émettait qu'après une identité liée — les deux branches ne mesuraient pas le même
  fait, et leur comparaison était faussée du taux d'emails jamais confirmés, c'est-à-dire du
  chiffre qu'on voulait lire. L'écart entre les deux **est** ce taux.

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
`unique(checkin_id)` sur la boîte d'envoi — un check-in, un message, jamais deux, quel que
soit le canal et le nombre de passages du cron ; le repli push → email est une **mise à jour de
la même ligne**, jamais une seconde. Le canal effectif se résout en un seul endroit,
`reminder_channel_for()` (v1-12 §3), dont la table de vérité est **écrite deux fois** — SQL
pour ce qui part, `src/types/rappels.ts` pour ce que l'app affiche — et épinglée des deux côtés
(`17_rappels_canal.test.sql`, `rappels.test.ts`) : toucher à l'une sans l'autre est le défaut
que cette paire existe pour attraper. La préférence vit dans `profiles.reminder_channel`
(`push` / `email` / `none`, réglable depuis « Toi », **sessions anonymes comprises** — le push
n'a besoin que d'un jeton d'appareil), et elle **ne se dégrade jamais d'elle-même** : un `push`
sans jeton actif part par email sans que rien ne soit réécrit, pour que rouvrir les
notifications dans les réglages du téléphone suffise à le faire repartir. **L'envoi est inactif tant que
les secrets Vault `resend_api_key` et `reminder_from_address` n'existent pas** — la fonction
sort sans rien toucher, les rappels restent en attente, et depuis le 10/09/2026 elle le **dit** :
`public.reminder_send_runs` reçoit **une ligne par canal à chaque passage**, y compris une nuit où
rien n'attend et y compris quand un secret manque. Zéro ligne veut donc dire « le passage n'a pas
eu lieu » — cron désinscrit, job en erreur — et jamais « il n'y avait rien à envoyer » : remettre
l'un de ces `insert` sous une garde « seulement s'il y a du travail » détruirait la seule question
que ce journal existe pour trancher. Deux corollaires : le cron appelle désormais une **procédure**
qui committe entre les passes, à laquelle il ne faut ajouter ni `security definer` ni clause
`set search_path` — les deux rendent le contexte atomique et font échouer le `commit` ; et la ligne
est marquée `sent` **avant** l'appel HTTP, pour qu'un message remis au fournisseur ne reparte
jamais. Voir `v1-07` §3.1 pour la mise en
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
  **Deux formateurs, et ils ne disent pas la même chose.** `formatTonnes` (`src/lib/format.ts`)
  bascule : kilos arrondis sous la tonne, dixième de tonne au-dessus — sans quoi tout ce qui vaut
  moins de 50 kg s'affichait « 0,0 t CO₂e », c'est-à-dire les postes secondaires de n'importe quel
  bilan et la phrase « Le repère 2050 est à ta portée : 0,0 t CO₂e de moins sur l'année »,
  adressée au profil qui en est le plus près. `formatTonnesShort` (`carbon-reference.ts`) ne
  bascule pas, et c'est délibéré : il porte l'échelle de comparaison — la moyenne française, le
  repère 2050 — qui reste dans une seule unité pour que les barres se comparent. Les deux se
  lisent côte à côte dans la carte « Où tu te situes » de `suivi/bilan.tsx`, d'où la règle : **les
  lignes de repère restent en tonnes, les lignes qui sont les chiffres de la personne passent par
  `formatTonnes` sous la tonne** (« Toi », « Ton prochain palier » — sauf quand le palier *est* le
  repère 2050, où la ligne redevient un repère). Ce qui n'est **pas** réglé : au-dessus de la
  tonne, deux bilans à 1 240 puis 1 180 kg s'affichent toujours « 1,2 t » tous les deux sous une
  note « 5 % de moins » (A5-3 symptôme 1) — le remède est de dire l'**écart** en kilos côté suivi,
  jamais une forme de plus dans le formateur. Et `src/lib/format.ts` doit rester pur pour une
  raison qui ne se voit pas : `src/types/resultat.ts` l'importe, donc une dépendance ajoutée là
  ferait tomber toute la suite Jest qui en dépend.
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
- **Le vocabulaire d'un poste vit dans `src/constants/postes.ts`, et il a quatre registres qu'il
  ne faut pas fusionner.** `POSTE_LABEL` est l'étiquette nue (« Trajet domicile-travail »),
  `POSTE_SUBJECT` / `POSTE_EN_PHRASE` le sujet d'une phrase de restitution, et **`FORME_INSERABLE`
  la forme courte qui suit une préposition** (« pour ton trajet domicile-travail », « − 20 % sur
  tes voyages »). Les deux dernières se ressemblent assez pour qu'on soit tenté de n'en garder
  qu'une ; les unifier rallonge la question du point d'un « longue distance » ou change
  « sorties » en « loisirs » dans la copie validée du canvas — un test l'épingle. Avant C2.6, cinq
  phrases collaient après une préposition le libellé **snapshoté**, mode compris : « as-tu changé
  de mode de transport cette semaine pour Trajet domicile-travail (Voiture thermique) ? ».
  La jumelle SQL est `public.poste_inserable(poste, loop_type)` — écrite deux fois parce qu'un
  rappel part sans le client, **donc à toucher ensemble**, comme `reminder_channel_for`.
  Elle a imposé trois colonnes, et la raison vaut d'être connue : le serveur **décidait** du poste
  puis n'en gardait que le libellé. `assessment_results.extras_poste` (loisirs ou voyages),
  `engagement_checkins.poste` (`loop_type` ne le nomme pas : « extras » couvre les deux) et
  `plan_cycles.poste`. Se rabattre sur `loop_type` aurait remplacé une vérité laide par une
  **fausseté lisible** — « tes sorties du week-end » à quelqu'un dont le poste est les voyages.
- **La saison côté client vit dans `src/types/saison.ts`** (`saisonDe`, `recapDeSaison`), miroir
  exact de `public.season_bounds` : saisons **météorologiques**, décembre appartenant à l'hiver
  **qui commence**. Ne jamais la dériver de `plan_cycles` ni de la cadence — `rolling_quarter`
  n'a pas de saison nommée, alors que la mascotte et les regroupements du suivi suivent le
  calendrier dans les deux cas. `recapDeSaison` compte les points **répondus** et les « oui », et
  **jamais les manqués** : il n'y a volontairement aucun champ pour les dire, parce qu'un champ
  rendrait affichable ce que `/suivi` refuse de montrer. Son filtre est `status = 'answered'` et
  non `response !== null`, pour que la troisième réponse de C2.4 (« pas de trajet cette période »,
  `response = null` sur un point bel et bien répondu) y entre sans rien changer.
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
  d'elle, signé (`enqueue_checkin_reminders`). Les répliques de check-in viennent des
  maquettes validées et ne se réécrivent pas ; **la période calme fait exception** — « Rien à
  rattraper. » a été retirée le 07/09/2026 sur un retour d'usage (elle se lisait comme une
  attente déçue), remplacée par des phrases qui *disent* l'attente et nomment le jour. Elle
  peut le faire sans jamais compter, le rythme étant fixe.
  Depuis C2.5 certaines répliques sont **groupées** (`maintienNon` par mode, et C2.1 ajoutera des
  tableaux de variantes) : le test aplatit `RAMILLE` avant de l'éprouver, et il le fait parce qu'une
  valeur non-textuelle traverse `expect.stringMatching` **sans jamais matcher** — les trois règles de
  voix passeraient en silence sur une réplique groupée.
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
  `src/app/(tabs)/suivi/bilan.tsx`), à condition de lui donner un `accessibilityLabel` qui les
  recompose.
- **Un lien qui doit compter pour un moteur de recherche passe par `Link` d'Expo Router, jamais
  par un `onPress`.** `react-native-web` rend un `onPress` sur du texte en `<div>` : cliquable
  pour un humain, inexistant pour un crawler. Et il ne suffit pas que l'ancrage soit correct, il
  doit se retrouver dans le HTML **statique** — à vérifier dans `dist/*.html` après
  `expo export`, même piège silencieux que `cleanUrls`. Seul cas aujourd'hui : le lien vers la
  page personnelle de l'éditeur (`EDITOR_CV_URL`) au pied des deux pages légales, qui sont les
  seules surfaces publiques du produit (leurs URL sont données à Google Play et à l'écran de
  consentement Google). Le sens du lien est délibéré — Ramille vers le CV — et il ne porte
  pas de `nofollow`.
- **Ce que `api/` duplique de `src/` doit être tenu des deux côtés, et la liste est courte.**
  Les Vercel Functions ne peuvent pas importer `src/` (tsconfig dédié, runtime Web Fetch API) :
  `APP_NAME` y est un littéral, et depuis le 11/09/2026 **la règle des kilos sous la tonne** aussi.
  L'oubli ne se voit d'aucun côté pris séparément : quand `formatTonnes` a basculé en kilos sous
  1 t, le message de partage s'est mis à dire « 40 kg CO₂e » pendant que l'aperçu et l'image
  gardaient « 0,0 t CO₂e » — les deux chiffres du même partage se contredisaient, sur la seule
  surface publique du produit, et aucune des deux suites de tests ne regarde les deux à la fois.
  Toucher à un formatage affiché impose donc de chercher son jumeau dans `api/`.
- **Une valeur `EXPO_PUBLIC_*` peut disparaître du bundle sans que rien ne bronche.**
  `babel-preset-expo` remplace `process.env.EXPO_PUBLIC_X` par sa valeur littérale — **sauf**
  quand l'accès est écrit directement comme valeur d'une propriété d'objet dont la clé porte ce
  même nom, où il rend `void 0` (vérifié en A/B, `.env` inchangé entre les deux exports). Lire
  la variable dans un `const` d'abord, jamais la replier dans une expression. Le typecheck
  passe, les tests passent, l'export réussit, et l'app démarre sur une configuration vide :
  `scripts/verifier-configuration-export.mjs` garde ce point en CI, même famille que les gardes
  `cleanUrls` et titres de page.
- **La configuration Supabase absente ou fautive s'affiche, elle ne plante plus.**
  `src/lib/supabase.ts` ne lève plus au chargement du module mais à la première utilisation
  (mandataire) : le contrat ne change pas — aucun écran ne fonctionne sans configuration — mais
  le layout racine peut rendre `ConfigurationManquante` au lieu de laisser l'app s'ouvrir et se
  refermer sans un mot, ce qui n'était lisible **nulle part** sur un build natif de production.
  La dérivation vit dans `src/types/configuration.ts` (module pur, testé), qui refuse aussi une
  URL portant un chemin — `.../rest/v1` collé à la place de l'URL du projet a coûté un cycle de
  build. L'écran s'adresse à la personne qui développe : ni la voix de Ramille, ni la mascotte.
- **Un état qui diffère entre le serveur et le client doit démarrer à la valeur du serveur et
  changer après hydratation** — sinon le DOM garde l'attribut `style` du HTML statique pour
  toujours. L'hydratation ne vérifie que le texte : elle adopte les attributs tels quels. Une
  largeur lue dans `Dimensions` dès le premier rendu client (390) laisse React croire qu'il
  tient déjà `width: 390` alors que le HTML dit `0px`, et rien ne le corrige jamais — ni
  `onLayout`, ni `key`, ni le compilateur. C'est ce qui a fait échouer la première tentative
  du pager d'onboarding (v1-11 §9.10). `useSyncExternalStore` avec un instantané serveur
  distinct fait voir le passage à React ; `useWindowDimensions` ne le fait pas.
- **Une réponse rendue impossible par une autre réponse s'efface dans `normaliserReponses`, et
  nulle part ailleurs** (`src/types/bilan.ts`, appliquée après chaque `update` du questionnaire et
  à la relecture d'un brouillon). Trois écrans tenaient trois listes de remises à zéro, qui
  divergeaient déjà : changer le mode principal effaçait la motorisation sans regarder si le
  **second** mode était encore une voiture ; « Non » à B1.1 oubliait le type de deux-roues ; et
  choisir comme mode principal celui déjà pris en second laissait les deux jambes sur « voiture »,
  la ligne n'apparaissant plus nulle part et la moitié du trajet étant facturée au tarif solo.
  Deux règles : la fonction est **idempotente** (elle s'applique aussi à un brouillon écrit avant
  ces règles), et ce qui décide d'effacer un champ est **ce que le calcul lit encore**, pas ce que
  l'écran affiche — la branche « rarement » des loisirs en est l'exemple, commentée sur place.
- **La virgule est un séparateur décimal, et la traiter comme un caractère à jeter coûtait un
  facteur dix.** Le champ de distance filtrait tout ce qui n'était pas un chiffre : « 3,5 » ne
  donnait ni erreur ni refus, il donnait **35**. Le clavier numérique d'Android propose une
  virgule, et l'erreur porte sur le poste le plus lourd de la majorité des bilans, multiplié par
  deux fois le nombre de jours et par quarante-cinq semaines. D'où `nettoyerSaisieNumerique` /
  `saisieVersNombre` / `afficherNombreSaisi` (`src/types/bilan.ts`) : la virgule est **conservée
  telle quelle** sous les doigts de la personne, la conversion se fait à part, et un second
  séparateur est ignoré sans jeter ses chiffres. Et un « 0 » saisi n'est pas une distance — la
  colonne porte `check (commute_distance_km > 0)`, donc la complétude de l'étape et l'insert
  lisent la **même** définition, `distanceDomicileTravailKm`.
- **`ensureSession()` est enveloppée dans `uneSeuleFois` (`src/types/une-seule-fois.ts`), et ce
  n'est pas du confort : sans elle, deux comptes anonymes.** La fonction fait un « lis puis
  écris » ; deux appels lancés dans le même rendu — le layout racine et la racine de l'app —
  lisent tous les deux « pas de session » avant que l'un n'ait écrit. Six des treize comptes de la
  base étaient dans ce cas. Rien ne le signalait : l'app marche, elle laisse un compte orphelin
  qui consomme le quota de créations anonymes, gonfle d'un facteur proche de deux toute
  statistique de nouveaux visiteurs, et peut recevoir le jeton d'appareil à la place du compte
  gagnant. Seules les promesses **en vol** sont partagées, donc le contrat ne change pas : un appel
  tardif relit bien l'état courant, dont dépend la re-vérification avant l'écriture du bilan.
- **Le jeton d'appareil se réenregistre à chaque changement d'utilisateur, pas seulement au
  démarrage.** `register_push_token` *reprend* le jeton à son propriétaire précédent, et il n'y
  avait aucun appel ailleurs qu'au lancement : le lien de `/connexion/retrouver` ouvre la session
  d'un utilisateur **différent** de la session anonyme qui venait d'enregistrer le jeton, si bien
  que l'appareil restait inscrit au nom de celui qu'on vient de quitter — et recevait ses rappels
  jusqu'au prochain démarrage à froid. Le garde vit hors du composant (`onAuthStateChange` émet à
  chaque rafraîchissement de jeton, soit toutes les heures) et **ne se valide qu'après le succès**
  de l'appel, sinon un échec réseau le referme sur l'état qu'il devait corriger.
- **`enregistrerLeJeton()` rend un booléen, et c'est la seule chose qui peut faire passer
  `jetonActif` à vrai** (`src/lib/rappels.ts`) — une permission accordée dont l'enregistrement a
  échoué (pas d'identifiants FCM, pas de réseau, simulateur) faisait promettre au plan une
  notification que le serveur ne voyait pas. Hors du chemin `push`, `jetonActif` n'est pas touché :
  la préférence et le jeton sont deux faits distincts, et la feuille rend `prefs.jetonActif`
  inchangé quand on la referme sans rien choisir. Le booléen ne distingue pas encore « permission
  non accordée » d'un échec réseau ; le garde d'`_layout.tsx` ne rend donc le jeton à son
  propriétaire précédent que sur une exception.
- **Une absence de jeton n'accuse personne : c'est la permission qui le dit.** L'absence recouvre
  quatre situations — jamais demandée, refusée, enregistrement échoué, simulateur — qui n'appellent
  pas la même phrase. `lignesDeReglage` **et** `carteAttente` (`src/types/rappels.ts`) reçoivent
  donc la `Permission`, et « coupées dans les réglages du téléphone » ne se dit que là où quelqu'un
  les a vraiment fermées. Le corollaire est le lien « Ouvrir les réglages du téléphone » : il
  n'existe que dans l'état `fermee`, il se rend **sous la ligne qui le porte** et non après le
  groupe (détaché, il se lit comme appartenant au dernier choix), et **le retour doit réparer, pas
  seulement changer le texte** — relire la permission sans réinscrire le jeton laisse la ligne
  promettre une notification pendant que `push_tokens` porte encore son `disabled_at`, jusqu'au
  prochain démarrage à froid.
- **Le jeton de cet appareil est mémorisé en AsyncStorage** (`traceverte.jeton_appareil.v1`),
  parce que rien en base ne permet de le reconnaître : `push_tokens` est owner-scoped et une
  lecture rend les jetons de tous les appareils de la personne. C'est ce qui rend vraies les deux
  phrases « sur ce téléphone » et « on ne désactive que le sien ». Sans marque locale, on ne
  désactive rien — fenêtre de transition assumée et commentée dans `src/lib/rappels.ts`, sans
  conséquence tant que `push_tokens` est vide.
- **Le mode clair est forcé sur web, et ce n'est pas un oubli** (`src/hooks/use-theme.ts`).
  `userInterfaceStyle: light` d'`app.json` ne s'applique qu'au natif : sur web, `useColorScheme`
  lit `prefers-color-scheme` et rendait `Colors.dark` — la palette que `constants/theme.ts` décrit
  lui-même comme provisoire et jamais validée, avec un bouton principal à 3,4:1 (sous le 4,5:1 de
  WCAG AA) et une mascotte restée claire sur fond noir. La décision se prend **là**, et le
  `ThemeProvider` du layout racine porte la même en dur pour les chromes de navigation : corriger
  l'un sans l'autre laisse la moitié de l'écran dans l'autre palette.
- **`public/robots.txt` et `public/sitemap.xml` sont la cinquième garde d'export, et ils
  disparaissent exactement comme `assetlinks.json`** — sans erreur de build ni de déploiement.
  `scripts/verifier-titres-export.mjs` les vérifie ligne par ligne dans `dist/`, avec trois points
  qu'il ne faut pas défaire à moitié : la paire `Disallow: /api/` + `Allow: /api/partage` +
  `Allow: /api/share-card` (sans les deux `Allow`, un lien de bilan partagé sort en URL nue sur les
  trois réseaux, qui lisent `robots.txt` avant d'aller chercher une page) ; les pages d'application
  restent **parcourables** et portent `noindex` — interdire le crawl empêcherait un moteur de lire
  ce `noindex` ; et l'**origine canonique** a une source unique, `ORIGINE_CANONIQUE`
  (`src/constants/produit.ts`), que les deux fichiers statiques ne peuvent pas importer et que le
  script confronte par motif. La page 404 est une page exportée comme les autres : elle a sa ligne
  dans `PAGE_TITLES` (`/+not-found`), la surcharge de `TitreDePage` ne valant qu'à l'exécution.
- **Changer `.env` puis réexporter ne suffit pas à revérifier l'inlining : il faut
  `expo export --clear`.** Le cache de transformation de Metro est indexé sur le contenu des
  fichiers, pas sur les valeurs `EXPO_PUBLIC_*` : un second export réutilise le `void 0` qu'un
  premier export sans variables avait mis en cache, au bit près (même empreinte de bundle). La CI
  ne peut pas tomber dans ce piège — elle part d'un checkout neuf — mais
  `scripts/verifier-configuration-export.mjs` accuse alors en local un défaut qui n'existe pas, et
  on le cherche dans le code.
- **`react-native-web` : un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0`
  explicite pour pouvoir rétrécir sous sa largeur intrinsèque** — sinon un texte voisin
  (unité, label) peut être partiellement recouvert/coupé. Voir
  `src/components/bilan/numeric-field.tsx` et `src/components/auth/text-field.tsx`.
- **`Alert.alert(...)` sur web retombe sur `window.alert()`, qui n'invoque pas fiablement
  `onPress`** — pour tout flux qui doit exécuter une action après fermeture de l'alerte,
  utiliser un état de composant inline (écran à plusieurs états visuels) plutôt qu'un
  callback de bouton d'`Alert`. Voir `src/app/connexion/email.tsx` et
  `src/app/connexion/retrouver.tsx`.
- **Une API de module natif appelée pendant le rendu emporte toute l'app sur web.** Un hook
  s'exécute au rendu : une garde `Platform.OS` placée dans l'effet arrive trop tard, et une
  exception dans le layout racine fait tomber l'arbre React entier — page blanche sur
  **toutes** les routes, pages légales comprises, pendant que le HTML statique est servi en
  200 avec son titre. Un hook ne peut pas être appelé conditionnellement ; un composant, si :
  c'est le motif de `RetourDeNotification`, monté sous `{estNatif && …}`. La CI l'a laissé
  passer en production le 08/09/2026 — `scripts/verifier-rendu-export.mjs` ouvre désormais
  cinq routes dans un navigateur après l'export et échoue sur une page vide ou une exception
  non rattrapée (les erreurs d'hydratation restent des avertissements). Troisième garde de la
  même famille que `cleanUrls` et l'inlining des `EXPO_PUBLIC_*` : ce qui se construit n'est
  pas ce qui s'affiche.
- **Le lien du rappel ouvre l'app grâce à un fichier servi par le site, pas par l'app.**
  `public/.well-known/assetlinks.json` (recopié tel quel dans l'export) autorise nommément
  `fr.ramille.app` à revendiquer `https://www.ramille.fr/plan`, déclaré en `intentFilters`
  `autoVerify` dans `app.json`. **La revendication est volontairement étroite** : réclamer tout
  le domaine ouvrirait aussi `/compte/suppression` et les pages légales dans l'app, alors que
  Google Play exige précisément qu'elles restent atteignables **sans** elle. Deux façons de
  casser ça en silence — le fichier qui disparaît de l'export, et l'empreinte de signature qui
  change : **Google Play resigne l'AAB avec sa propre clé**, donc l'empreinte de production
  différera de celle du keystore EAS et devra être **ajoutée** au tableau (qui en accepte
  plusieurs) au moment de la publication, sans retirer la première. `scripts/verifier-assetlinks-export.mjs`
  garde le reste.
- **Une dépendance native nouvelle impose un build**, et il n'y a aucun moyen de s'en rendre
  compte depuis le code : `expo-notifications` (v1-12) est arrivée ainsi. Le jeton d'appareil
  ne s'enregistre jamais par un `insert` — `register_push_token` le **reprend** à son
  propriétaire précédent, ce qu'une policy RLS owner-scoped ne peut pas faire au moment où une
  session anonyme devient un compte, et l'oubli serait silencieux : les rappels partiraient
  vers un utilisateur fantôme.
- Persistance locale (brouillon de bilan, préférences UI comme "a déjà vu la proposition de
  connexion", jeton d'appareil) via AsyncStorage — explicitement device-local, pas de sync
  multi-device tant que le compte n'est pas rattaché. Voir `src/lib/bilan-draft.ts`,
  `src/lib/connexion-prefs.ts`, `src/lib/notification-prefs.ts`. Toutes ces clés portent le
  préfixe historique `traceverte.` (le renommer effacerait les brouillons), et c'est par ce
  **préfixe** que `src/lib/compte.ts` les balaie à la suppression de compte. **Ne jamais
  dénombrer les clés `traceverte.*` dans un commentaire.** Le balayage se fait par préfixe
  précisément pour que le nombre n'ait pas à être juste : trois commentaires en portaient un, tous
  faux dès que le jeton d'appareil s'est ajouté. Une phrase qui compte devient fausse à la clé
  suivante, en silence — et nommer ici les occurrences fautives rendrait cette ligne-ci fausse le
  jour où on les corrige.
- Le questionnaire se préremplit dans cet ordre : **brouillon local > dernier bilan complété >
  vide** (`src/lib/bilan-history.ts`). Le brouillon prime car il est plus récent par
  construction. Un re-bilan prérempli est ce qui rend le suivi dans la durée praticable — sans
  lui, comparer deux bilans demandait de retaper les neuf étapes.
- La logique **pure** du suivi (écart entre deux bilans, dédoublonnage par jour, ancienneté)
  vit dans `src/types/suivi.ts`, séparée des requêtes de `src/lib/bilan-history.ts` : ce module
  tire AsyncStorage et `react-native`, qui n'ont rien à faire dans une suite de logique pure
  (cf. §Tests, où le motif est expliqué en entier). Même découpage que `src/types/bilan.ts`.
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
- **Les deux onglets tiennent la concurrence de la même façon**, et c'est délibérément le même
  idiome : une clé d'état qu'incrémente `rafraichir`, l'effet de chargement qui la porte en
  dépendance, et un `let cancelled` périmé dans son nettoyage (`(tabs)/plan.tsx`, repris à
  l'identique par `(tabs)/suivi/index.tsx`). Revenir sur l'onglet puis ramener l'app au premier
  plan déclenche deux chargements à quelques millisecondes d'écart, et rien ne garantit l'ordre
  des réponses : chaque nouvelle clé démonte l'effet précédent, donc seul le dernier lancé écrit,
  sans compteur de génération à maintenir. Le rappel passé à `useRafraichirAuRetour` doit être
  stable (`useCallback`), sinon son effet de focus se réabonne à chaque rendu et fait tourner
  chargement et rendu l'un dans l'autre.
- **Un écran hors ligne ne dit jamais « tu n'as rien », et il ne se fige pas non plus.** Charger à
  chaque retour transforme une lecture en échec en régression visible : tant que la lecture n'avait
  lieu qu'au montage, personne ne pouvait perdre ses barres en cours de session. Les lectures
  rendent donc `{ ok: true, data } | { ok: false }` — **jamais erreur → tableau vide**, qui se
  traduisait par « Ton suivi commence au premier bilan » à quelqu'un qui a douze bilans — et les
  deux onglets séparent trois choses : l'erreur plein écran, qui ne s'atteint **que depuis
  `loading`** (rien n'a jamais pu être lu) ; la ligne de relecture, portée par un `useState` **à
  côté** du `LoadState` et jamais dans sa variante `ok`, affichable au-dessus de n'importe quel
  écran issu d'une lecture réussie et qui n'efface rien ; et les états vides, qui restent des
  affirmations sur les données de la personne. Le drapeau logé dans `LoadState.ok` était le
  défaut : le repli détruisait alors `pending`, `no_assessment` et `empty`, c'est-à-dire « Revoir
  mon bilan » et « Faire mon bilan » — la seule entrée du questionnaire, qui se remplit pourtant
  très bien hors ligne (brouillon AsyncStorage). Deux corollaires : le « Réessayer » d'un écran
  d'erreur repasse par `loading` **dans son propre gestionnaire**, jamais dans `rafraichir` — sans
  ce passage, un second échec rend exactement le même écran et le bouton a l'air mort ; dedans, il
  ferait clignoter « Chargement… » à chaque retour au premier plan, donc à chaque arrivée par
  notification, puisque `rafraichir` est aussi le rappel de `useRafraichirAuRetour`. Et une valeur
  par défaut posée sur un échec de lecture est du même mensonge : le rythme de la boucle (`boucle`)
  vaut `null` tant qu'on ne l'a pas lu, et la carte d'attente ne s'affiche pas plutôt que de nommer
  le mauvais jour.
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
- `src/types/resultat.ts` a deux variantes de libellé pour le poste dominant, jamais
  interchangeables : `dominantHeadline()` (2ᵉ personne, "Tes voyages…", affichée à l'écran,
  adressée à l'utilisateur) et `dominantShareLabel()` (neutre, sans pronom, transmise à
  `/api/partage` — lue par les destinataires du lien partagé, pas par l'utilisateur qui
  partage). Voir `docs/architecture/v1-06-partage-social.md` §2.
  **`MODE_IDS` est un miroir tenu à la main de `public.transport_modes`**, relevé en base le
  11/09/2026. `MODE_PREPOSITION` étant un `Record` sur cette liste, le typecheck garantit la
  cohérence **interne** au fichier — un identifiant ajouté sans préposition ne compile pas — mais
  **rien** sur la correspondance avec la base : ajouter un mode au produit est une migration SQL,
  et un mode résolu côté serveur (les quatre deux-roues, les quatre motorisations, le TGV) ne
  traverse aucun fichier TypeScript. C'est le chemin qui avait laissé les quatre deux-roues
  motorisés sans préposition alors qu'ils peuvent parfaitement être le `dominant_poste_mode`. La
  garde qui manque est côté SQL et reste à écrire.
