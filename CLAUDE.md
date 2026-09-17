# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mécaniques de travail, et ce qu'elles ont coûté avant d'être écrites

**Ce fichier n'est pas seulement la carte du produit : c'est aussi là que se consigne la façon de
travailler**, pour qu'une leçon payée une fois ne se repaie pas à la session suivante. Tout ce qui
suit cette section décrit Ramille ; celle-ci décrit comment on y touche. Une mécanique qui n'est
écrite nulle part est une mécanique qu'un prochain passage réinventera de travers — et il n'aura
aucun moyen de savoir qu'il la réinvente.

### Les fichiers d'outil — à ouvrir sur déclencheur, pas au démarrage

Les pièges et conventions propres à **un outil** vivent dans leur propre fichier à la racine, pour
deux raisons : garder celui-ci lisible, et pouvoir **retransmettre ces apprentissages à un autre
projet** qui utilise le même outil. Chacun est coupé en « ce qui vaut partout » (portable) et
« propre à Ramille » (les chiffres, les routes — ne voyage pas).

**Seul `CLAUDE.md` est chargé automatiquement.** Les autres ne le sont pas — d'où cette table, qui
ne contient pas les règles mais **le moment d'aller les lire**. Si un déclencheur est réuni, ouvrir
le fichier avant d'agir, pas après. La forme vient d'un autre projet, où une règle de cadence
écrite dans le fichier chargé n'a pas été suivie pour autant : sortir une règle sans dire *quand*
aller la chercher, c'est l'enterrer, et le déclencheur est la moitié utile.

| Fichier | Déclencheur — ouvrir AVANT d'agir |
|---|---|
| **`VERCEL.md`** | Toute fusion sur `main` · toucher `vercel.json`, `api/`, `vercel-build` ou `scripts/vercel-ignorer-le-build.sh` · ajouter une route · affirmer quoi que ce soit sur un compteur ou une facture Vercel · mesurer le poids d'un déploiement |
| **`SUPABASE.md`** | Écrire, rejouer ou réécrire une migration · toucher à un privilège, une policy, un trigger ou un RPC · toucher à l'auth (session, lien de connexion, Redirect URLs) · un `401`, `403` ou `42501` inexpliqué · retoucher `database.types.ts` · rejouer un test pgTAP sur le distant |
| **`EXPO.md`** | Ajouter une route ou un fichier dans `public/` · toucher à `app.json`, `app.config.js`, `.env`, à l'export ou à un hook natif · **toucher à une mise en page — marge, hauteur, barre d'onglets** · un écran blanc sur web · une dépendance native, un build EAS, un `expo-doctor` rouge |
| **`TESTING.md`** | Écrire un test censé protéger une correction · **annoncer que quelque chose est vérifié** · une suite qui rougit ou verdit de façon inattendue · rejouer un fichier pgTAP sur le distant · toucher au référentiel des facteurs |
| **`FRONT.md`** | Toucher un écran, un composant ou une dérivation lue par un écran · **écrire une phrase que quelqu'un lira** · afficher un chiffre, un repère, un poste, une saison · faire parler Ramille · rendre quelque chose cliquable · toucher un état de chargement, un état vide ou un écran d'erreur · toucher au questionnaire, au plan ou au suivi |
| **`RECETTE.md`** | **Préparer une séance de recette, sur appareil ou au navigateur** · écrire ou retoucher un document de `docs/recette/` · fabriquer ou mettre à jour l'artefact web d'une recette · consigner ce qu'une séance a trouvé · prescrire un profil de test |

### Ce que la personne qui pilote a demandé

- **Elle est le Product Manager, et c'est ce qui départage les décisions** (17/09/2026). Ce qui
  touche au **produit** — ce qu'on montre, ce qu'on tait, ce qu'on demande à la personne, dans quel
  ordre on livre — lui revient, et se pose avant d'écrire. Ce qui est **technique** revient à
  l'agent : « je peux t'aider mais ça reste toi l'expert ». Le piège n'est pas de trancher soi-même
  une question technique, c'est de **présenter comme un arbitrage une question qui n'en est pas
  une** — ça fait payer un aller-retour pour rien. Et l'inverse coûte plus cher : un choix de
  produit pris seul sous prétexte qu'il a une forme technique. La bonne façon de poser une question
  de produit est celle qui a marché le 17/09/2026 sur le §7 de `v1-17` : le fait, ce qui est en jeu,
  la recommandation, et **ce qu'on casse si on se trompe** — les deux seules questions qui ont
  demandé une décision portaient chacune un piège que leur énoncé ne laissait pas voir. Cadrer,
  c'est déjà la moitié du travail.
- **Une tâche par chantier, tenue à jour pendant le travail** et pas après coup (14/09/2026 :
  « c'est pénible de ne pas savoir où tu en es »). C'est la seule fenêtre sur l'avancement.
- **Un numéro ne se cite jamais seul.** Un lot, une issue, un chantier : on écrit à chaque fois de
  quoi il s'agit. Personne ne garde en tête ce que désigne `C3.8`.
- **Au plus un build EAS tous les deux jours** (15/09/2026), et la raison est au registre
  d'exploitation §3.3 : le quota du plan gratuit ne se lit qu'en le heurtant.
- **Pas plus de 150 Mo de Functions Storage ajoutés chez Vercel entre le 15 et le 25/09/2026**
  (15/09/2026) — c'est tout ce qui reste au **compte** Vercel, à 9,85 Go sur 10 dont 437 Mo pour
  Ramille —, et à demeure : **chaque fusion sur `main` est un déploiement qui se paie trente
  jours** (≈ 1,8 Mo — 1,76 mesuré deux fois le 16/09/2026, et c'est un plancher : `VERCEL.md`
  §1.1 dit pourquoi un écart d'une journée divisé par le nombre de fusions ment), l'agent ne peut
  pas lire le compteur, donc il se demande avant de fusionner,
  **et il demande le total du compte et la part du projet**, parce qu'une heure a été perdue à
  chercher dans un projet un facteur cinq qui était l'autre. `VERCEL.md` §2.1 et §2.3.
  Le jour même, j'avais fusionné cinq fois, dont trois fois pour de la documentation seule.

### La branche de travail

**Après une fusion, la branche se recrée en local et ne se repousse qu'au premier commit réel.**
GitHub la supprime à la fusion ; la repousser aussitôt ressuscite une branche **vide et identique à
`main`**, qui se lit « il y a du travail en cours » alors qu'il n'y en a pas. Fait trois fois le
15/09/2026 avant qu'on me le fasse remarquer : une branche ouverte doit vouloir dire quelque chose.

**Et ça ne se rattrape pas d'ici** : le proxy git de l'environnement distant refuse les suppressions
de référence — `HTTP 403` sur `git push --delete` comme sur la refspec vide. La suppression se fait
depuis GitHub. Ce n'est pas passager, donc une boucle de reprise n'y changera rien.

**Un numéro de PR s'écrit dans un document une fois obtenu, jamais avant.** Le 15/09/2026, `#186`
puis `#187` ont été écrits dans `v1-13` §10 avant d'ouvrir les PR, en pariant sur la numérotation.
Les deux paris ont tenu ; une issue ouverte entre-temps par quiconque les aurait rendus faux, et le
lien aurait pointé ailleurs sans que rien ne le signale.

### Avant de lancer une vague

Trois choses à lire dans `docs/architecture/v1-13-audit-et-chantiers.md`, la feuille de route (son
état est décrit dans [`docs/architecture/produit.md`](docs/architecture/produit.md)) : la **§11**,
qui liste ce qui reste à vérifier sur appareil et que cocher une ligne de §10 ne dit pas — chaque
ligne dit si la recette du 14/09/2026 l'a jouée, et une ligne muette n'a pas été jouée, y compris
quand le bloc qui la portait est revenu conforme sur autre chose ; la **§12**, ce que cette recette
a trouvé ; et **le relevé de fichiers, à refaire à chaque fois** — la colonne « Parallèle ? » de
§2.3 est une intention, pas un relevé. Elle s'est trompée **quatre fois** : la vague 2, annoncée
disjointe, partageait six fichiers ; la vague 3, annoncée « enchaînée », avait deux chantiers
réellement parallélisables et trois fichiers revendiqués par plusieurs, dont un par trois. Le
relevé du 15/09/2026 est le **premier** à l'avoir confirmée (`v1-16` §2), ce qui ne change rien à
la règle : il coûte dix minutes et évite qu'un chantier en écrase un autre en silence.

**Et un relevé est un instantané, donc un chantier qui CRÉE un fichier ou une fixture invalide le
sien** (17/09/2026, CI rouge de la vague 9). Le relevé disait vrai : `02_generate_plan_cycle_for_user`
ne contenait **aucune** occurrence de `teletravail`, donc C5.1 et C5.4 étaient disjoints. Puis C5.1 y
a ajouté une fixture portant `teletravail = 'oui'`, une heure avant que C5.4 n'interdise cette
valeur — et les deux chantiers se sont croisés dans un fichier qui ne les concernait ni l'un ni
l'autre au moment du relevé. La parade n'est pas de relever deux fois : c'est, **avant de pousser
une vague, de rebalayer les valeurs que la vague vient de changer sur tout le dépôt**, fixtures
comprises. Un `grep` sur le vocabulaire retiré aurait coûté dix secondes.

**Et une vague se contre-lit avant d'ouvrir sa PR** (17/09/2026). Le lot 5 est parti avec **huit
défauts**, et ils n'ont été trouvés que parce que la personne qui pilote a demandé une relecture le
soir même. Quatre d'entre eux n'étaient trouvables que comme ça : un appel fautif d'une fonction
pourtant testée, deux cartes qu'on croyait s'exclure, quatre écritures d'état après une garde
d'annulation, un commentaire orphelin décrivant un mécanisme supprimé. Ni la CI, ni le linter, ni
aucun test ne pouvait en voir un seul.

La relecture se fait **sur le diff entier de la vague**, adversairement — « qu'est-ce qui, là-dedans,
est faux, périmé, ou marche par accident ? » — et elle cherche trois familles en particulier, parce
que ce sont celles qui sont sorties : **une dérivation appelée avec le mauvais argument** (le test
garde la fonction, jamais ses appels) ; **une exclusion affirmée mais vérifiée sur une paire de
moins** ; et **une phrase qui décrit ce que le code faisait avant**. Elle a coûté une demi-heure et
rendu huit choses au premier essai.

### Éprouver plutôt qu'affirmer

**Une garde neuve se vérifie en cassant ce qu'elle garde** : remettre l'ancien défaut, tronquer le
rang, fabriquer la policy fautive — puis constater que l'assertion tombe, et seulement celle-là.
Sans ce passage on a écrit une ligne qui *pourrait* garder quelque chose ; avec, on sait laquelle.
C'est déjà la règle en §E de `03_rls_policies.test.sql`, et elle vaut partout — le compte des
mutations s'écrit dans le fichier de test, daté (`TESTING.md` §1.1).

**Une hypothèse sur les données se mesure en base, jamais au raisonnement.** L'idiome, quand il faut
écrire pour mesurer sans rien laisser : un bloc `do $$ … raise exception 'RESULTAT …' $$` —
l'exception annule toute la transaction **et** ramène le chiffre dans son message. C'est ainsi qu'on
a su qu'un profil donné rend **onze** actions au plan (15/09/2026) plutôt que de l'espérer.

### Lire un échec avant d'y répondre

**Un tube masque le code de sortie.** Une boucle de reprise bâtie sur `commande | tail` ne reprend
**jamais** : elle lit le succès de `tail`. Relevé le 15/09/2026 — trois « tentatives » de
suppression de branche n'en étaient qu'une, et le `403` n'est apparu qu'en retirant le tube.

**Un marqueur accentué absent d'un bundle minifié ne prouve rien** : `é` y est échappé en
`\u00e9`. Cherché le 15/09/2026 pour vérifier qu'un déploiement était bien passé — il l'était, et
la conclusion inverse a failli être tirée. Chercher un marqueur **ASCII** (un nom de style, une clé
d'objet), ou la forme échappée.

### Ce qui se consigne ailleurs, et pourquoi

Les réglages des comptes tiers ne vivent pas ici mais dans `docs/exploitation/`, qui est le registre
qui les rend vérifiables — rien dans le code ni dans la CI ne les voit. Deux d'entre eux pèsent sur
le **rythme de travail** et méritent d'être connus avant de planifier quoi que ce soit : le quota de
builds EAS (§3.3) et les budgets d'API GitHub (§3.8 — GraphQL et REST sont deux compteurs
distincts, donc `issue_write` peut être refusé pendant que tout le reste passe). Le troisième est
le compteur Functions Storage de Vercel (§3.2), dont la règle vit dans `VERCEL.md` parce qu'elle
est portable : c'est le seul des trois que le dépôt peut alléger lui-même, par l'Ignored Build Step.

## Le produit, en trois règles et un renvoi

**Ramille** est une app de sensibilisation à l'empreinte carbone des transports, pour la France.
Ce qu'elle est, ses cinq briques, l'état de ce qui est livré et la feuille de route vivent dans
**[`docs/architecture/produit.md`](docs/architecture/produit.md)** — à lire avant de **décider**
quelque chose, pas nécessaire pour corriger une ligne.

Trois règles, en revanche, se cassent sans qu'on ait rien décidé, donc elles restent ici :

- **tout est en français** — public, interface, et tout code produit : messages d'erreur,
  commentaires métier, contenu ;
- **le produit s'appelle Ramille, et « TraceVerte » ne doit pas revenir.** Ce nom est porté depuis
  25 ans par une entreprise alsacienne de vélo et de mobilité douce — même mot, secteur voisin,
  même public. Il vit dans `src/constants/produit.ts` (`APP_NAME`) et nulle part en dur dans un
  écran ; `api/` et les SVG le répètent en littéral, faute de pouvoir importer `src/`. **Trois
  choses gardent volontairement l'ancien nom et ne se « corrigent » pas** : les clés AsyncStorage
  (`traceverte.*` — les renommer effacerait les brouillons), les migrations déjà appliquées, et le
  projet Supabase distant, toujours `TraceVerte-v1` dans son tableau de bord. Les documents `v1-01`
  à `v1-08` en parlent aussi : ce sont des décisions datées, on ne les réécrit pas. Détail en
  `v1-09-renommage-ramille.md` ;
- **V1 = Google Play uniquement** — pas d'App Store, pas de Sign in with Apple.

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

Deux suites : **Jest** (`npm test`, logique pure côté client, `src/**/*.test.ts` colocalisés,
`TZ=Europe/Paris` forcé et ce n'est pas cosmétique) et **pgTAP** (`supabase/tests/database/*.sql`,
numérotés, un fichier par sujet, `supabase test db` — non exécutable ici sans Docker, validé par
`BEGIN`/`ROLLBACK` sur le projet distant). Les deux tournent en CI sur chaque pull request. La
règle qui décide de ce qui se teste (**toute dérivation pure affichée à la personne ou décidant
d'une navigation**), où passe la ligne entre logique pure (`src/types`) et entrée-sortie
(`src/lib`), les tests de **jugement** à connaître avant de « corriger » ce qu'ils épinglent, et
les quatre pièges de la suite Jest (doubles, fuseau, résolveurs, couverture) : `TESTING.md` §2.1 —
et sa §1 pour ce qui vaut sur n'importe quel projet.

**Le job `db-tests` compare aussi `src/lib/database.types.ts` à la base qu'il vient de
construire** (C3.12) — le fichier est tenu à la main, et le typecheck ne peut pas voir cette
dérive : `SUPABASE.md` §2.1.

**Toucher au référentiel des facteurs invalide TOUTES les valeurs attendues de la suite pgTAP,
y compris celles qui ne nomment pas le facteur touché — et « toucher » inclut en ajouter un.**
Trois CI rouges pour l'apprendre (PR #34, #41, #48) ; la méthode qui marche, recalculer chaque
assertion par une requête et jamais à la main : `TESTING.md` §2.2.

**Trois assertions de la suite échouent sur le projet distant et passent en CI, parce qu'elles
supposent une base vierge** — et une quatrième y ferait partir de vrais emails : `TESTING.md` §2.3,
à lire avant de « corriger » un test qui n'a rien.

**Dans une transaction pgTAP, `created_at` ne désigne aucune ligne, et la place d'une assertion
fait partie de l'assertion** : `TESTING.md` §2.4.

## Architecture

**Stack** : Expo (React Native + Expo Router, un seul codebase mobile+web) · Supabase
(Postgres + Auth + RLS) · Vercel (déploiement web, build via `vercel-build` →
`expo export --platform web` → `dist/`) · EAS (build/publish Android uniquement).

**`vercel.json` porte `cleanUrls: true`, et ce n'est pas cosmétique** : sans lui, toute route sans
enfants (`/suivi`, `/rappels/stop`, la restitution) répond 404 en production pendant que l'export
local est parfait — `VERCEL.md` §1.5. **Il ne se déploie plus de prévisualisation** (`git.deploymentEnabled`,
trois pièges dont `"**"` et jamais `"*"` — §1.4), la vérification visuelle du web se fait localement
par `expo export --platform web` puis Playwright sur `dist/`. **Et chaque fusion sur `main` est un
déploiement qui coûte ≈ 1,8 Mo de Functions Storage pendant trente jours** — §1.1, §2.1 et la
convention de cadence en §2.3 ; les fusions qui ne touchent que la documentation sont sautées par
`scripts/vercel-ignorer-le-build.sh` (§1.3), dont la liste blanche dit ce que le build ne lit pas.

**`api/`** : Vercel Functions, détectées automatiquement par la plateforme (dossier `/api` à
la racine, indépendant de l'export statique Expo régi par `vercel.json`) — pas de route Expo
Router. Tsconfig dédié (`api/tsconfig.json`, exclu du tsconfig racine, `types: ["node"]`) : ce
contexte tourne en Web Fetch API (Request/Response), pas dans React Native. Utilisé pour
`api/partage.ts` (runtime Edge) et `api/share-card.ts` (runtime Node.js, rendu d'image via
`satori`/`@resvg/resvg-wasm`) — carte de bilan partageable, cf. « Partager mon bilan » dans
`src/app/(tabs)/suivi/bilan.tsx`. **Une Vercel Function en runtime Node.js a une checklist non
négociable, et son échec est muet** (`FUNCTION_INVOCATION_FAILED` générique, aucun détail côté
client) : `VERCEL.md` §1.6, et le détail de chaque point avec les vrais logs qui l'ont diagnostiqué
en `docs/architecture/v1-06-partage-social.md` §3.

**Routing** : `src/app/` (Expo Router, file-based), organisé autour d'une **barre à deux
onglets** depuis `v1-11`. Le groupe `src/app/(tabs)/` porte les deux seuls lieux du produit :
`plan.tsx` (le présent — action engagée, point de la période) et la pile `suivi/`, dont
`suivi/index.tsx` est l'historique et `suivi/bilan.tsx` la restitution d'un bilan
(`/suivi/bilan?id=`, `&nouveau=1` à la sortie du questionnaire). **La restitution n'est pas un
troisième lieu** : c'est la dernière page d'un flux, ou le détail d'une entrée du suivi — d'où
sa place dans cette pile, qui garde la barre visible.

Tout le reste vit hors du groupe et s'affiche en plein écran, sans barre : `/onboarding` et
`/bilan` sont des **flux**, `/compte/*` et `/connexion/*` des détours, `/confidentialite`,
`/conditions`, `/compte/suppression`, `/rappels/stop` et `/feedback` des surfaces publiques ou de
service. Les
deux règles qui vont avec ce découpage (ajouter une route dans `(tabs)/` lui donne un onglet ;
jamais de route dynamique `[id]`) sont rappelées en fin de fichier et détaillées dans
`FRONT.md`, pas ici.

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
`docs/architecture/v1-0N-*.md`. **Et pour savoir où en est le produit** — les increments livrés, la
feuille de route, ce que la dernière recette a trouvé — :
[`docs/architecture/produit.md`](docs/architecture/produit.md), qui est un document **vivant** là
où les `v1-0N` sont datés. Ce sont des décisions actées, pas des brouillons ; chaque
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

**Un écran d'onglet ne charge ses données qu'une fois par lancement, et c'est ce qui a cassé la
boucle d'engagement au dernier mètre** (trouvé sur appareil le 09/09/2026, `v1-12` §8.1 — le canal
marchait parfaitement pendant que la boucle se cassait). Appuyer sur la notification ouvrait le plan
**sans la question** : react-navigation garde l'écran monté, et l'app survit à l'arrière-plan, qui
est exactement l'état d'où l'on revient quand une notification arrive. D'où `useRafraichirAuRetour`
(`src/hooks/use-rafraichir-au-retour.ts`) : **tout écran d'onglet dont le contenu peut changer côté
serveur doit l'utiliser**, et il écoute deux retours parce qu'il en faut deux — le focus de l'écran,
et le retour de l'app au premier plan que la navigation ne voit pas. Un `useEffect` de montage, là,
rend un écran plausible et périmé.

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

**Tout ce que la carte d'un point affiche nomme la période INTERROGÉE, bouton compris** (contre-lecture
de la vague 5, 13/09/2026). C'est le corollaire de C2.3 qu'il est le plus facile de manquer, parce que
les textes ne sont pas écrits au même endroit : deux d'entre eux nommaient encore la semaine **qui
commence**, celle dont le point ne demande rien.
- **Le troisième choix disait « Pas de trajet cette semaine »** sous une question qui ouvre par « La
  semaine dernière ». C'est la copie du canvas, rédigée avant que la période interrogée ne recule — et
  sa moitié mensuelle nommait déjà le mois **écoulé** (« Pas de voyage en septembre »), donc les deux
  moitiés d'une même ligne ne désignaient pas la même chose. Écart consigné en `v1-14` §10.
- **Le repli de `{jours}`** (un gabarit d'engagement sans jours figés) disait « Cette semaine » dans
  `checkin_question` **et** dans `composerQuestionDuPoint`, à quatorze lignes de l'ouverture correcte
  que la même fonction venait de calculer. Le correctif n'écrit pas la bonne chaîne : il fait **lire
  la variable déjà calculée**, pour qu'il n'y ait plus deux littéraux à tenir d'accord. La branche est
  défensive aujourd'hui (`commit_plan_action` exige des jours sur le poste domicile-travail, et les
  gabarits mensuels ne portent pas `{jours}`), et c'est justement pour ça qu'elle valait d'être
  corrigée : une phrase fausse que rien n'exerce attend la troisième forme d'intention qui la rendra
  atteignable.
Les deux gardes qui restent sont écrites sur l'**invariant** et non sur la phrase — le repli et le
générique ouvrent sur la même période, et le bouton nomme la période de la question — donc elles
survivent à une reformulation.

**Le gabarit de question n'arrive jamais jusqu'à la carte, et c'est structurel** : `question_template`
vit sur `action_templates`, pas sur le point, donc aucune requête de l'app ne peut le remplir. La
branche à gabarit de `composerQuestionDuPoint` est inatteignable côté client et n'existe que pour
rendre la composition **éprouvable** face à sa jumelle SQL. Corollaire : le seul chemin client qui
compose est celui d'un point d'avant C2.1, qui retombe donc toujours sur la question générique — ce
qui est exactement le libellé sous lequel ce point-là est parti. `committed_intention_days` n'est pour
cette raison **pas** rapatrié par l'écran du plan : il ne remplirait que cette branche.

**La question du point a une seule source côté client, `src/types/checkin.ts`** (C2.5, 11/09/2026),
et c'est la moitié d'une paire avec `enqueue_checkin_reminders` — le rappel part sans le client, la
carte repose la question avec lui. `checkin-card.tsx` l'écrivait lui-même, au présent et avec le
libellé snapshoté : la notification disait « La semaine dernière, as-tu changé de mode de transport
pour ton trajet domicile-travail ? » et l'écran « As-tu changé de mode de transport au moins une
fois cette semaine pour Trajet domicile-travail (Voiture thermique) ? ». Sur un produit dont la
boucle consiste à appuyer sur la notification pour répondre, ce n'est pas une variante de
formulation : c'est la même question qui ne se reconnaît pas d'un écran à l'autre. C2.1 a étendu ces
deux endroits plutôt que d'en ouvrir un troisième, et C2.4 fera de même pour la troisième réponse.

**Quand une action est engagée, la question la nomme — et elle est figée à la génération** (C2.1,
`20260912190000_point_connait_laction.sql`). « As-tu changé de mode de transport ? » posée à
quelqu'un qui s'est engagé à « faire un trajet sur cinq à vélo le mardi et le jeudi » ne referme
pas le « si-alors » qu'il a écrit : elle lui demande un résumé de sa semaine. La phrase vient
désormais du gabarit, `action_templates.question_template` (« {jours}, as-tu fait ce trajet à
vélo ? », « En {mois}, … » pour la boucle mensuelle). Six points à connaître :

- **`engagement_checkins.committed_question` est la question elle-même, figée**, comme `trip_label`
  fige le libellé. Elle est posée une fois, au moment de la génération, et `enqueue_checkin_reminders`
  comme la carte la lisent telle quelle — c'est la seule façon qu'elles ne puissent pas différer
  d'un caractère. Corollaire voulu : **changer d'action après la génération ne réécrit pas la
  question déjà posée**, et la carte le dit (« Cette question porte sur l'action que tu suivais
  alors : … »), plutôt que d'afficher une phrase qui ne correspond plus à rien. Recomposer à
  l'affichage rendrait le point incohérent avec la notification qu'on vient d'ouvrir.
- **Les quatre genres sont `engagement` | `generique` | `maintien` | `occasion`** — l'ancien
  `changement` a été renommé `generique`, parce qu'il ne décrit plus le cas général mais le
  **repli** : un gabarit sans `question_template` y retombe, jamais sur une phrase à trous. Le
  genre et le mode restent deux colonnes pour la raison de C2.5, et **`maintien` gagne sur
  `engagement`** : en pratique un cycliste a un plan à zéro action (effet de bord de C2.5), mais la
  priorité est explicite et testée plutôt que dépendante de ce hasard.
- **L'action retenue est celle du cycle qui couvre la période interrogée, appariée par poste** —
  `t.poste = 'commute'` pour la boucle hebdomadaire, `t.poste = ar.extras_poste` pour la mensuelle.
  Sans l'appariement, une action engagée sur les loisirs aurait nommé la question du trajet
  domicile-travail.
- **`public.jours_francais(smallint[])` est la jumelle SQL de `JOURS_FRANCAIS` / `joursDeLaQuestion`**
  (`src/types/checkin.ts`), **donc à toucher ensemble**, exactement pour la raison de `mois_francais`
  au paragraphe précédent. Elle joint par « ou » et non par « et » (l'intention est un choix de
  jours, pas un cumul), ne capitalise que la première lettre — `initcap` sur la liste jointe
  donnerait « Mardi Ou Jeudi » — et rend « Tous les jours » à sept jours plutôt que de les énumérer.
- **La notification ne préfixe le poste que si la question ne le nomme pas déjà.** La question
  générique finit par « … pour ton trajet domicile-travail ? » : y coller l'étiquette répétait le
  poste dans la même notification. Le `push_body` teste donc `position(etiquette in question)`.
- **La composition n'est appelable que côté serveur** : `checkin_question` et `jours_francais` sont
  révoquées de `public, anon, authenticated`. Le client ne compose que pour les points générés
  **avant** C2.1, dont `committed_question` est nul — d'où `questionDuPoint`, qui préfère toujours la
  question figée.

**Un point se répond par « oui », « non » ou « sans objet », et `response_kind` est la vérité**
(C2.4, `20260912200000_troisieme_reponse_du_point.sql`). Une semaine de congés ou un mois sans voyage
n'ont pas de réponse honnête entre oui et non : « Non » déclenche la consolation d'échec et s'inscrit
en « Non » dans le suivi, ne rien répondre laisse le point expirer — ce qui compte pour une occasion
manquée **et** fait s'espacer les rappels (C2.9). Pour un profil « deux vols par an », dix mois sur
douze devenaient une suite de « Non ». Six points à connaître :

- **Le piège n'était pas la valeur nulle, c'était le filtre qui la lisait.** `response boolean`
  reste, **dérivée** (`true` / `false` / `null`), et `loadAnsweredCheckins` écartait les lignes dont
  elle est nulle : la troisième réponse aurait été donnée puis perdue, sans message d'erreur et sans
  rien afficher dans le suivi. Tout ce qui compte « les points répondus » filtre donc
  `status = 'answered'` et lit `response_kind` — **jamais `response is not null`**. C'était déjà le
  cas de `recapDeSaison` (C2.14, qui l'avait anticipé) et de `regime_de_rappel` (C2.9, où un
  « sans objet » est un **signe de vie** : l'assertion est dans `24`, et sans elle quelqu'un qui
  répond honnêtement quatre fois verrait ses rappels s'espacer comme s'il avait disparu).
- **La dérivation est une contrainte, pas une convention**
  (`engagement_checkins_reponse_coherente`), et elle porte **deux** invariants : répondu ⟺ genre
  renseigné, et la correspondance genre/booléen. Le premier est la forme structurelle du défaut :
  une ligne `answered` sans genre est une réponse que la lecture écarte. Aucun chemin de production
  ne peut la produire — le RPC est le seul écrivain — et c'est pourquoi l'écrire coûte zéro et garde
  le jour où C4.1 ajoutera une forme de réponse. Corollaire pour les tests : **une fixture ne peut
  plus écrire `status = 'answered'` sans genre** (cinq fichiers corrigés), ce qui est une bonne
  chose — une fixture qui écrit un état que la production ne peut pas produire éprouve une fiction.
- **Le backfill passe sous le trigger, pas à travers.** `prevent_answered_checkin_update` lève sur
  toute mise à jour d'une ligne déjà répondue (C1.12) : le rattrapage des points historiques le
  désactive le temps de l'écriture et le réarme ensuite, et la contrainte n'est posée **qu'après** —
  l'ordre inverse ferait échouer l'`alter` sur les lignes pas encore rattrapées. Un contrôle de la
  migration vérifie que le trigger est bien réarmé : l'oublier défairait C1.12 en silence.
- **La signature du RPC change, elle ne s'ajoute pas** : `repondre_au_checkin(uuid, text)`, et la
  version booléenne est **supprimée**. Deux surcharges que PostgREST départage sur le type d'un
  champ JSON coûteraient plus que la migration, et une surcharge qu'aucun appel n'émet se lit
  « morte » et non « réservée » (la leçon de `p_replace` en C2.2). Ce raisonnement tient **parce que
  l'app n'est pas encore publiée sur Play** ; le jour où un client installé appelle l'ancienne forme,
  il faudra une seconde fonction nommée.
- **`analytics.engagement_by_segment` gagne `answered_sans_objet`**, et ce n'est pas du confort :
  `answered` compte les trois réponses et `answered_yes` les seuls « oui », donc l'écart entre les
  deux se lisait « non » et vient d'accueillir les « sans objet ». Sans le troisième compteur, le
  taux de réussite de la boucle baissait à chaque fois que quelqu'un répond honnêtement. Une
  assertion de `24` nomme l'égalité.
- **La carte répondue reste le temps de la période, et la borne se calcule en UTC.** Le
  renforcement vivait dans un `useState` : répondre, changer d'onglet, revenir, et il n'y avait plus
  rien — la requête du plan ne lisait que les points `pending`. Elle lit maintenant `pending` **et**
  `answered`, et `estDeLaPeriodeCourante` (`src/types/checkin.ts`) borne l'affichage, sans quoi un
  compte dont la boucle a cessé d'être générée garderait pour toujours un « Répondu lundi » et la
  promesse d'un point qui ne viendra pas. `debutDePeriodeInterrogee` est la **jumelle du `date_trunc`
  des deux générateurs**, donc elle lit l'UTC — à l'inverse de `saisonDe`, qui nomme une saison pour
  un humain et suit son calendrier local. Aligner l'une sur l'autre ferait disparaître la carte d'un
  point courant entre minuit et 6 h UTC le lundi. Le pied (« Répondu lundi. Prochain point : lundi
  21 septembre. ») est **du produit et non de Ramille** : il porte deux dates, et elle ne dit jamais
  de nombre.

`RAMILLE.checkinSansObjet` a **quatre** variantes indexées sur le **poste** et non deux sur la
boucle, écart consigné en `v1-14` §10 : la boucle mensuelle couvre les voyages *et* les sorties
depuis C2.6, et répondre « Pas de voyage, pas de question. » à quelqu'un qui vient d'appuyer sur
« Pas de sortie en septembre » serait la fausseté lisible que ce chantier-là a retirée ailleurs.

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

**Le signal « deux fois de suite » se compte sur les PÉRIODES, et il ne se déclenche qu'une fois**
(C2.10, `20260912210000_second_renforcement.sql`). Il est dans la spec §7 comme signal d'engagement
et en §9 comme indicateur de succès, `v1-02` §4 en donnait même la requête, et il n'avait jamais été
calculé nulle part — la phrase du handoff n'a jamais été affichée à personne. Trois choses à
connaître :

- **La requête de `v1-02` §4 est périmée, et elle l'est devenue en silence.** Elle prend les **deux
  dernières lignes** de la boucle et vérifie qu'elles sont répondues ; c'était juste avant que
  `20260904180000` ne close les périodes révolues en `expired` **et les garde en base**. Depuis,
  « les deux dernières lignes » peut recouvrir deux périodes séparées de trois mois de silence. D'où
  `public.periode_precedente(loop_type, period_start)` : la période se **calcule**. Un `lag()` sur
  les lignes aurait le même défaut en moins visible — vérifié sur la fixture du test `25`, qui compte
  2 par `lag()` et 1 par période.
- **C'est une paire SQL/TypeScript de plus** (`periodePrecedente`, `src/types/checkin.ts`), à
  toucher avec sa jumelle comme `mois_francais`, `jours_francais`, `poste_inserable`,
  `reminder_channel_for` et — depuis C3.12 — `analytics.bilan_funnel` / `BILAN_STEP_ORDER`, dont
  les deux moitiés s'épinglent l'une l'autre et se nomment mutuellement en commentaire : la vue
  `analytics.checkins_consecutifs` compte côté serveur, la carte affiche côté client. Le nombre de
  ces paires ne s'écrit nulle part, et surtout pas ici — il deviendrait faux à la suivante, en
  silence. Les deux
  cadences n'ont pas la même forme et c'est voulu — sept jours avant un lundi est un lundi, tandis que
  le mois est **ramené au premier** plutôt que décalé, sans quoi les deux moitiés divergeraient sur les
  fins de mois (PostgreSQL ramène le 31 mars au 28 février, `Date.UTC` le pousse au 3 mars).
- **« Jamais au-delà de deux » veut dire que le signal ne se rallume pas.** `estDeuxiemeFoisDeSuite`
  exige que la période précédente soit un « oui » **et que celle d'avant n'en soit pas un** : la phrase
  dit « Deuxième semaine de suite », donc à la cinquième elle serait fausse, et la recevoir chaque
  semaine en ferait du papier peint. Le signal marque le passage d'un geste à une habitude, puis se
  tait. `v1-14` §4.6 décrit la dérivation à deux arguments ; il en faut un troisième état pour savoir
  qu'on est à deux et pas à cinq (écart consigné en `v1-14` §10). La phrase est **voix produit et non
  celle de Ramille** — elle constate un fait sur deux périodes, et Ramille ne compte jamais.

Corollaire sur la lecture du plan : **la requête des points est bornée par une fenêtre**
(`fenetreDesPoints`, trois périodes mensuelles). Elle ne ramenait que les points `pending`, soit un ou
deux ; depuis qu'elle prend aussi les répondus (C2.4), sans borne elle ramènerait une ligne par semaine
indéfiniment. **Et depuis C2.8 elle prend aussi le début du cycle précédent, contre une coïncidence
qui aurait tenu longtemps** : le récapitulatif de la carte d'ouverture compte les points de la saison
écoulée, et trois périodes mensuelles en arrière depuis le 1er d'un mois est le 1er du mois trois mois
plus tôt — c'est-à-dire exactement le premier jour de la saison précédente. Les deux bornes tombaient
au même jour, donc l'oubli ne se serait pas vu jusqu'au jour où l'une des deux dérivations bouge (une
cadence `rolling_quarter`, elle, n'est pas alignée sur les mois et sortait déjà de la fenêtre). On
prend le minimum des deux.

**La saison a une fin et un début, et les deux se disent sur l'écran du plan** (C2.8,
`src/types/saison.ts`). `plan_cycles.period_end` et `.cadence_type` existaient depuis l'increment 3 et
n'étaient lus par **aucun** écran : le cap était annoncé sans échéance, et l'effet « nouveau départ »
était perdu quatre fois par an. Sept points à connaître, dont deux qui sont des règles :

- **La carte d'ouverture ne prend jamais la place d'un point en attente.** Le canvas la pose « à la
  place du point » ; le lien du rappel pointe `/plan`, donc masquer la question y fait ouvrir une
  notification sur un écran qui ne la porte pas — le défaut exact trouvé sur appareil le 09/09/2026
  (v1-12 §8.1), et jusqu'à deux semaines de points perdus pour qui ne touche pas ses boutons. Elle
  remplace la **carte d'attente**, Ramille parlant déjà sous elle.
- **Le récapitulatif ne dit jamais zéro et ne nomme aucun poste.** Sans point répondu la phrase
  disparaît (« 0 point répondu » nommerait les manqués, ce que `/suivi` refuse) ; sans changement, sa
  seconde moitié tombe. Et le décompte porte sur les **deux** boucles, donc « … sur ton trajet »
  serait faux pour quelqu'un dont les changements sont des voyages — même fausseté lisible que C2.6.
- **Le trait de temps mesure la saison, pas la personne** : `accentMuted` et jamais `accent`, avec sa
  légende. Il n'est pas plein le dernier jour — `period_end` étant inclus, la saison dure 91 jours et
  non 90, et il n'atteint le bout qu'une fois la période révolue, au moment où le bandeau de bascule
  prend le relais. Remplacer ce « + 1 » par un écart entre bornes afficherait « plein » un jour trop
  tôt.
- **L'écran lit deux cycles** (`limit(2)`). L'existence du précédent est ce qui distingue une bascule
  d'un premier bilan, et ses bornes sont **lues sur sa ligne** plutôt que recalculées : une cadence
  `rolling_quarter` n'a pas de saison, donc dériver les bornes d'une saison ferait compter trois mois
  calendaires qui ne sont pas les siens.
- **La carte de re-bilan dit le fait, jamais la saison.** Son titre était « Une nouvelle saison a
  commencé », ce qui pouvait être faux : elle se déclenche sur 182 jours d'ancienneté du bilan, pas
  sur une bascule, et pouvait coexister avec la puce « Cadence : Été 2026 ». La formulation
  saisonnière appartient à la carte d'ouverture. L'âge vient d'`ancienneteEnMots`
  (`src/types/suivi.ts`), **partagée par les deux écrans** qui le disent, et il s'écrit en mots — un
  ordre de grandeur, pas une mesure.
- **La puce « Cadence : … » a disparu du plan** : la période se nomme dans la carte du cap, à côté de
  sa fin, et cette carte se rend donc **même sans cap** (`baseline_co2_kg_year` peut valoir zéro).
  Nommer la période à deux endroits de l'écran était le plus sûr moyen de les voir un jour se
  contredire.
- **Les boutons de la carte sortent de `sortiesDeLouverture`**, pas d'un ternaire : le canvas suppose
  une action engagée et reconduite, alors que rien n'est engagé dans deux cas de production — dont le
  plan à zéro action de tout cycliste depuis C2.5, où proposer d'en choisir une promettrait une liste
  vide.

**Le tout premier plan dit la règle du jeu, et le trait de temps attend qu'il y ait quelque chose à
mesurer** (C5.6, `estPremierPlan` / `ouvertureDuPremierPlan` dans `src/types/saison.ts`). On arrivait
de la restitution devant deux cartes chiffrées, un cap et un trait qui avance, sans qu'un mot dise
qu'on en choisit **une** et que tout le reste du produit tient en un point régulier. Quatre points à
connaître :

- **Le signal a trois conditions, et c'est la troisième qui compte** : un seul cycle, aucune action
  engagée, et **aucune ligne dans `plan_action_commitments_archive`, quelle qu'en soit la raison**.
  Les deux premières décrivent un plan neuf ; l'archive est la seule trace de quelqu'un qui s'est
  **déjà** engagé puis a repris — « Changer d'avis » (raison `changement`) ou un re-bilan dans la
  même période (raison `rebilan`), qui remettent tous deux `committed_at` à `null` sans créer de
  second cycle. Sans elle, la carte réexplique la règle du jeu à quelqu'un qui la connaît.
- **La lecture de l'archive que l'écran faisait déjà ne peut pas servir**, et c'est le piège que le
  relevé de `v1-17` §2 a évité : celle de l'encart orphelin (C2.2) filtre sur
  `released_reason = 'rebilan'` parce qu'elle annonce un effet de bord non choisi, et elle est bornée
  à une ligne. Élargir ce filtre casserait l'encart. Le premier plan demande donc sa **propre**
  lecture, un `count` en `head` dans le même `Promise.all` (règle de C5.5). Un `count` **nul** veut
  dire « pas pu lire » et se lit « s'est déjà engagée » : des deux erreurs possibles, celle qui
  montre une carte de trop coûte moins que celle qui **retire** le trait au milieu d'une saison.
- **Le trait s'écrit `progression !== null && !premierPlan`**, et non la forme du canvas
  `(engagement || !premierPlan)` : un engagement rend déjà le signal faux par sa deuxième condition,
  donc la première moitié n'est exerçable par aucun cas. Un test épingle cette implication — le jour
  où il tombe, c'est que la forme courte est redevenue fausse. La légende disparaît **avec** le
  trait ; la période et sa fin, elles, restent.
- **Une seule carte pour deux ouvertures** (`CarteDOuverture`, ex-`CarteDeSaison`) : le canvas décrit
  le cadre de la saison et celui du premier plan de la même façon au pixel près, donc en écrire deux
  garantirait qu'ils divergent — la leçon de `CarteDePiste` en C5.2. Ce qui change est du contenu,
  dérivé dans `src/types/saison.ts`, **y compris la ligne de Ramille**, passée sans valeur par
  défaut : un repli sur « On repart pour une saison. » dirait au premier plan la seule phrase qui ne
  peut pas y être vraie. Les deux cartes ne peuvent pas coexister (l'une exige un cycle précédent,
  l'autre exige qu'il n'y en ait pas) et **remplacent toutes deux la carte d'attente, jamais un point
  en attente** — C2.8 dit pourquoi. La marque locale (`traceverte.premier_plan_vu.v1`,
  `src/lib/premier-parcours.ts`) est **booléenne** là où celle de la saison porte un identifiant de
  cycle : le premier plan n'arrive qu'une fois, et elle est nécessaire parce que le signal, lui, ne
  se referme que sur un engagement.

**La barre d'onglets attend que les deux lieux aient quelque chose à montrer** (C5.7,
`src/types/premier-parcours.ts`). Le produit proposait Plan et Suivi dès la dernière page du
questionnaire, c'est-à-dire avant qu'il y ait quoi que ce soit à suivre. La barre est masquée de la
soumission du **premier** questionnaire à la fermeture de la carte « Ton premier plan », puis elle
arrive et se nomme, une fois. Cinq points :

- **Une valeur à trois états (`questionnaire` → `barre` → `fait`), jamais deux marques booléennes.**
  Le canvas décrit une marque « effacée » à la fin du parcours, plus une seconde pour la carte des
  deux lieux ; effacée, la première ne dit plus rien, et la question que pose la carte est « la barre
  vient-elle d'arriver **sur cet appareil** ? ». Deux booléens ne distinguent pas « le parcours vient
  de finir ici » de « il n'y en a jamais eu ici », donc la carte se serait rendue à **tout le
  monde** — chaque installation existante, chaque appareil neuf d'un compte existant. Écart consigné
  en `v1-17` §9.
- **Sans marque, la barre est là**, et c'est le cas à ne pas rater : appareil neuf d'un compte
  existant, session retrouvée par lien, installation d'avant le chantier. La marque autorise une
  absence, elle ne la présume jamais — et `null` recouvre aussi « pas encore lue », donc l'état de
  départ du layout ne fait disparaître la barre de personne (la règle d'hydratation d'`EXPO.md`
  §2.2 : sur web, le rendu statique ne connaît aucun stockage). Une **valeur inconnue** se lit de
  même : c'est le seul moyen, depuis ce stockage, de retirer à quelqu'un la moitié du produit.
- **« Premier » veut dire premier sur cet appareil**, et la question se pose à la soumission, **avant**
  de poser la marque de bilan de C4.5 — c'est elle qui répond. Trois situations retombent alors du
  bon côté sans garde à écrire : un re-bilan, un appareil neuf d'un compte existant, et une
  installation d'avant le chantier.
- **L'étape vit dans le layout des onglets**, qui la partage par contexte (`usePremierParcours`) :
  c'est lui qui rend la barre, donc un écran qui réécrirait la marque dans son coin la ferait
  arriver au prochain montage et non au geste. Le questionnaire, lui, est **hors** du groupe et
  écrit directement la marque — le bon ordre, puisque le layout est monté après. Quatre chemins
  referment le premier plan et font venir la barre : « Compris » (immédiat, dans son gestionnaire),
  le premier engagement, un plan à zéro action, et une carte déjà refermée ici — les trois derniers
  passent par le chargement de l'écran, qui les ramène au même appel.
- **`tabBarStyle: { display: 'none' }` ne laisse pas de bande vide**, mesuré et non raisonné
  (`EXPO.md` §1.7) ; **l'entrée glissée de 320 ms du canvas n'est pas rendue**, faute de pouvoir
  envelopper `BottomTabBar` sans ajouter `@react-navigation/bottom-tabs` aux dépendances —
  `expo-router` l'embarque sans l'exposer. Écart consigné en `v1-17` §9.

**Un rappel par email ne part pas à l'instant où il est mis en file** : `send_after` porte un
décalage de 0 à 4 jours dérivé du hachage de l'identifiant (étalement du pic du lundi,
`v1-10` §2.B). Le push, lui, part à `now()`. Pour provoquer un rappel de test, passer par
`generate_commute_checkins()` puis `send_pending_reminders()` — le chemin du cron entier —
plutôt que d'insérer un point à la main.

**Hors ligne, la racine route au lieu de lever, et c'est une marque locale qui l'y autorise** (C4.5,
15/09/2026, `v1-15-hors-ligne.md`). La moitié « session expirée » du chantier était **déjà livrée**
par C2.11, et **l'instantané local du plan est resté hors périmètre** — il serait un troisième
endroit où vivent les chiffres de la personne, ce que ce dépôt refuse partout ailleurs ; `v1-15` §7
dit à quelles conditions le rouvrir. Sept points à connaître :

- **La coupure de transport se reconnaît à `status === 0`, jamais à l'absence de `code`**
  (`lireLeBilan`, `src/types/demarrage.ts`). C'est le critère que l'audit proposait, et il est faux :
  le `catch` du transport de `@supabase/postgrest-js` rend bien une erreur sans `code`, mais **trois
  autres chemins** du même paquet en rendent une sans `code` avec un statut réel — un corps non-JSON
  sur une réponse 2xx, un corps d'erreur illisible, un 404 au corps vide. Les classer « pas de
  connexion » ferait taire un serveur qui a parfaitement répondu. Le mauvais critère est rendu
  **inexprimable** — la fonction ne reçoit pas de `code` du tout — et une assertion dit pourquoi.
- **La marque `traceverte.a_un_bilan.v1` n'est pas un cache : c'est ce qui autorise une phrase.**
  Sans elle, aucun écran ne peut dire « ton plan t'attend » sans affirmer ce qu'il ne sait pas — tout
  le raisonnement de C1.4. Le préfixe historique n'est pas négociable : c'est par lui que
  `src/lib/compte.ts` balaie les marques locales depuis ses **deux** sorties, suppression de compte
  **et** déconnexion de l'appareil, ce qui resserre le risque de marque fausse au seul appareil
  restauré depuis une sauvegarde (`allowBackup` est absent d'`app.json`, donc vrai par défaut).
- **Elle n'est consultée qu'en repli, jamais quand le serveur a répondu**, et c'est ce qui la rend
  sûre : une marque fausse ne peut pas contredire une vérité. Un test l'épingle, et le jour où il
  tombe, c'est que quelqu'un en a fait une seconde source de vérité.
- **Elle s'écrit à deux endroits** : sur une lecture réussie à la racine, et à la soumission du
  questionnaire. Le second n'est pas du confort — le questionnaire mène à la restitution puis au plan
  sans repasser par la racine, donc sans lui, quelqu'un qui soumet son premier bilan puis rouvre
  l'app sans réseau retomberait sur l'onboarding. Elle se pose juste après `clearBilanDraft()`, qui
  est exactement ce qui la rend nécessaire : le brouillon était jusque-là la preuve locale.
- **Hors ligne, le brouillon passe devant la marque**, à l'inverse de la règle en ligne où un bilan
  complété gagne sur un questionnaire commencé (C3.9) : le questionnaire se remplit sans réseau, le
  plan non. Le repli sans marque est `/onboarding`, qui n'affirme rien, marche hors ligne et porte
  « J'ai déjà un compte » — ce qui rend le questionnaire atteignable sans remettre « Faire mon
  bilan » sur un écran d'erreur, que C1.4 en avait délibérément retiré.
- **Aucun drapeau `horsLigne` ne descend de la racine vers le plan, et aucun bandeau n'a été écrit.**
  L'écran `erreur_reseau` de `/plan` existe depuis C1.4 et dit déjà la chose, en français, avec un
  « Réessayer » et la barre d'onglets intacte. Un drapeau serait la seule chose à devoir rester juste
  entre deux écrans, pour une information que l'onglet relit lui-même à chaque retour.
- **Un `ensureSession()` qui échoue par coupure ne fait pas interroger la base.** La racine note la
  coupure et s'arrête là : sans session, la requête partirait en `anon`, qui n'a aucun privilège sur
  `assessments`, et le `42501` se lirait « erreur serveur » alors que c'est le réseau — le défaut que
  ce chantier ferme, atteint par un autre chemin. C'est la famille d'erreurs d'`auth-js`, donc
  `estPanneDeTransport` (`src/types/connexion.ts`) et non `lireLeBilan` : les deux se côtoient dans
  la racine et les confondre ferait passer l'une pour l'autre.

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

Deux nuances du fichier des redirections qu'il ne faut pas réécrire à l'envers — le suffixe de
compte resserre un motif de preview sans le fermer, et `ramille.vercel.app` se retire le jour où
le projet Vercel est renommé : `SUPABASE.md` §2.5.

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

**`estPanneDeTransport` couvre les 5xx, et c'est assumé** — `auth-js` lève
`AuthRetryableFetchError` pour chacun d'eux : `SUPABASE.md` §2.4.

**« Pas de session » recouvre trois situations, et une seule appelle une création** (C2.11,
`src/types/session.ts`) — un jeton refusé n'en est pas une, sans quoi on donne un compte vide à
quelqu'un qui en a un : `SUPABASE.md` §2.4.

**Le lien du rappel porte `?rappel=1`, et le chemin ne doit pas bouger** (C2.11). L'email ne portait
que `/plan` : ouvert sur un ordinateur ou un téléphone neuf, il tombait sur la session anonyme que
l'app venait de créer, et le plan répondait « Ton bilan n'est pas encore fait » avec pour seul bouton
« Faire mon bilan » — et la consigne de désinscription du même email réglait la préférence d'une
session qui n'est personne. Le paramètre ne sert que là, et **seulement sans bilan local**. Une
nouvelle route à la place du paramètre aurait fait ouvrir le lien dans le navigateur sur Android :
`assetlinks.json` ne revendique nommément que `/plan`, et ce périmètre étroit est voulu (Play exige
que les pages légales et `/compte/suppression` restent atteignables **sans** l'app). Une chaîne de
requête ne fait pas partie du chemin d'un `intentFilter` ; deux assertions de `09` épinglent les deux
moitiés de la règle.

**Un jeton refusé parce qu'il est TROP NEUF n'est pas un refus, c'est une attente** (`PGRST303`
« JWT issued at future », `fetchAvecSecondeChance` dans `src/types/postgrest.ts`) — cinq choses à
savoir avant de chercher ailleurs, dont le fait que ce code couvre aussi l'expiration :
`SUPABASE.md` §2.4, et la recette pour trancher « écart d'horloge ou vrai défaut » en
`docs/exploitation/README.md` §8.6.

**La liste des Redirect URLs Supabase est une frontière de sécurité, pas une commodité de
configuration** — jamais de joker sur un domaine qu'on ne possède pas, et une entrée morte se
retire : `SUPABASE.md` §1.2 et §2.5.

### Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet distant `TraceVerte-v1` par
`mcp__Supabase__apply_migration` ; **après toute migration, `src/lib/database.types.ts` se
retouche à la main** — comment, et ce que la CI en vérifie : `SUPABASE.md` §2.1.

**Les privilèges de table sont écrits** (`20260910110000_grants_explicites.sql` ;
`supabase/config.toml` ne porte plus `auto_expose_new_tables`) : **ajouter une table impose un
`grant` ou un `revoke` explicite**, sinon elle est invisible pour l'app, en silence —
`SUPABASE.md` §2.2.

**Une policy appelle `auth.uid()` dans un sous-select, et une clé étrangère neuve veut son
index** — aucun des deux ne se voit à la lecture : `SUPABASE.md` §2.2.

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

**Le questionnaire demande désormais ce que le calcul supposait** (C3.4 + C3.5 + C3.6,
`20260914123432`). Quatre réponses s'ajoutent, toutes **obligatoires dès que leur déclencheur est
là** — laisser le choix facultatif reviendrait à garder le défaut pour tous ceux qui passent sans
répondre, ce que chacun des trois chantiers corrige. Cinq points à connaître :

- **`commute_second_mode_share` est une fraction, pas une énumération** : c'est ce que le SQL
  multiplie, et traduire trois libellés en trois nombres quelque part entre l'écran et le calcul
  serait un troisième endroit où se tromper. Le calcul attribuait exactement la moitié des
  kilomètres à chaque jambe — vélo + train sous-estimé de 44 %, parc-relais surestimé de 51 %, sur
  le poste qui décide du poste dominant donc du plan. La moitié reste le **repli** d'un bilan qui
  n'a pas répondu (`second_leg_share_default`), et c'est à ce titre que le bloc « Comment ce chiffre
  est calculé » la cite encore.
- **Le CO₂ de la seconde jambe est persisté** (`commute_second_leg_co2_kg_year`). Il était calculé,
  entrait dans le total, et n'était écrit nulle part : tout ce qui lit `assessment_results` — le
  plan en premier — ne voyait que la jambe principale, donc « Travailler depuis chez toi un jour »
  valait 128 kg au lieu de 205 sur un trajet à deux modes.
- **`normaliserReponses` porte une règle qui diverge de celle du dessus, et il ne faut pas
  l'uniformiser** : sur des loisirs « rarement », le covoiturage part là où la motorisation reste.
  Le calcul lit encore les deux, mais la motorisation décrit le **véhicule** de la personne et rend
  le résiduel plus juste, tandis que le covoiturage décrit un **trajet** qui n'est plus déclaré — et
  le garder diviserait ce résiduel, donc changerait le total d'un bilan resoumis à l'identique.
  Ce que cette règle ne garde **pas**, c'est la promesse que les bilans déjà en base rendent le même
  total : celle-là tient au défaut de la colonne (`leisure_is_carpool` n'existait pas), et
  `normaliserReponses` ne touche jamais une ligne déjà écrite.
- **Une empreinte par personne veut un facteur par personne, et la branche voyages ne l'avait pas**
  (relevé en contre-lisant la vague 7, `20260914141729`). `estimate_action_savings` chiffre une
  substitution comme `base × (1 − facteur_substitut / facteur_courant)` : pour le trajet
  domicile-travail et pour les sorties, le facteur courant est **dérivé de la paire persistée**
  (`co2 / km`), donc il hérite de la division par le covoiturage sans qu'on ait rien à écrire. Les
  voyages n'ont pas de paire à diviser — il n'existe pas de `travel_car_km_year` — donc cette
  branche lisait le référentiel, c'est-à-dire le facteur du **véhicule**, sous une base devenue
  celle d'**une personne** depuis C3.5 : « Faire un de tes longs trajets en train » annonçait 4,4 %
  de trop à trois. Le test 10 l'épingle par un **rapport** entre deux profils jumeaux et non par une
  valeur — partager divise la base par trois dans les deux cas, et ce qui sépare le juste du faux
  est que partager rend aussi le train moins intéressant.
- **`PARTS_DU_SECOND_MODE`, `TAILLES_DE_COVOITURAGE` et `OCCUPATIONS_LONG_TRAJET`
  (`src/types/bilan.ts`) sont des miroirs des `check` du schéma**, épinglés par un test : rien ne
  peut lire ces bornes depuis TypeScript, et une valeur hors bornes ne serait refusée qu'à la
  soumission, en anglais, neuf étapes trop tard.
- **`distanceSortieKm` est la jumelle de `distanceDomicileTravailKm`**, et pour le même piège : la
  colonne porte `check (leisure_distance_km > 0)`, donc un « 0 » saisi n'est pas une distance.
  `leisure_distance_km` ne survit qu'à la tranche ouverte, parce que le calcul la préfère à
  **toute** tranche (`coalesce`) : sans cette règle, quelqu'un qui saisit 120 km puis redescend sur
  « 5 à 15 km » repartirait avec 120, et la tranche affichée ne dirait plus ce que le calcul fait.

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

**Six règles de migration apprises sur le distant, et aucune ne se voit en CI** : une migration de
données ne désigne jamais une ligne par un identifiant généré (`action_text` est la clé naturelle
des gabarits) ; elle se rejoue telle quelle (`add constraint` n'est pas idempotent) ; une
substitution vérifiée reconnaît « déjà appliquée » par la présence du remplacement ; le distant
porte les corps de fonction sans les commentaires du dépôt, donc une ancre n'en contient jamais ;
rejouer un fichier ancien peut défaire une migration plus récente ; et réécrire une fonction part
de `pg_get_functiondef`, jamais du fichier qui l'a créée — `SUPABASE.md` §2.3.

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

**Aucun chemin du produit ne détruit un engagement sans en laisser une trace** (C2.2, 11/09/2026,
`20260912150000_engagement_qui_survit.sql`). Il y en avait quatre, et ils se ressemblent assez pour
qu'on en oublie un : le re-bilan dans la même période (le plus fréquent — on corrige une réponse
juste après l'avoir soumise), le changement de saison, « Changer d'avis », et **« Choisir une autre
action », dont la libération est une ligne interne de `commit_plan_action`** que rien n'affiche. Ce
qui partait : `committed_at`, `intention_days`, `intention_timing` — le seul choix personnel que le
produit demande, annulé par le second geste le plus encouragé. Quatre points à connaître :

- **`plan_action_commitments_archive` n'a qu'une seule écriture, `public.archiver_engagement`**, et
  elle prend des **valeurs** et non un `plan_action_id`. Ce n'est pas du confort : au re-bilan la
  ligne est déjà supprimée au moment où l'on sait que son gabarit n'a pas survécu, donc une fonction
  qui relirait la ligne n'archiverait **rien**, en silence, dans le cas principal du chantier. Les
  deux chemins clients passent par `archiver_engagement_de_laction`, qui délègue. `action_text` y est
  **figé** : C3.8 reformule plusieurs gabarits, et relire le libellé courant réécrirait ce que la
  personne a lu en choisissant.
- **Le re-bilan reprend l'engagement, le changement de saison le reconduit.** Les deux situations
  s'excluent dans `generate_plan_cycle_for_user` (le cycle existe déjà / il est neuf), et la capture
  précède l'upsert parce que le `delete` est irréversible. Une reconduction pose
  `plan_actions.carried_over_from` sur le cycle d'**origine** — jamais sur la ligne `plan_actions`
  précédente, qui est supprimée à chaque reconstruction et emporterait l'étiquette
  « · RECONDUIT » avec elle. La ligne de l'ancien cycle garde son propre engagement : c'est de
  l'historique, et l'index unique est **par cycle**.
- **`plan_actions` a désormais deux clés étrangères vers `plan_cycles`**, donc toute lecture
  imbriquée doit nommer la sienne : `plan_actions!plan_actions_plan_cycle_id_fkey(…)`. Sans le nom,
  PostgREST refuse la requête (« more than one relationship was found ») et l'écran du plan ne
  charge plus **du tout**. Le typecheck l'attrape, et c'est le seul garde qui le fait — la chaîne du
  `select` est analysée au niveau des types.
- **`assessments.submitted_at` vient du serveur** (trigger `stamp_assessment_submitted_at`, posé au
  seul passage en `completed`). Il venait du téléphone, et la garde d'idempotence du plan le
  comparait à un horodatage serveur : un téléphone en avance faisait reconstruire le plan à chaque
  passage du cron — donc, avant cette migration, effacer l'engagement chaque nuit. Corollaire pour
  les tests : **une fixture ne peut plus choisir `submitted_at` à l'insert**, elle insère puis met la
  date à jour (`old.status` et `new.status` valant tous deux `completed`, le trigger ne réécrit
  rien) ; et dans une transaction pgTAP où `now()` est figé, un re-bilan **rapproche** les dates au
  lieu de les écarter, donc il faut reculer explicitement l'ancien bilan **et** le `created_at` du
  cycle, sans quoi les deux gardes renvoient et les assertions passent sans rien éprouver.

**Le plan fige TOUTES les actions au gain suffisant, et c'est l'écran qui en montre deux** (C4.6,
`20260913110000_pistes_et_premier_pas.sql`). `generate_plan_cycle_for_user` portait un `limit 2` — un
choix d'écran écrit dans le SQL — qui jetait les autres leviers avant même de les écrire, alors que
`estimate_action_savings` rend déjà toutes les actions dont le gain atteint 5 kg/an, triées, et que la
colonne `rank` existe depuis l'increment 6 précisément pour que l'affichage décide. Quatre points :

- **Trois rangs à l'écran, pas deux** (`pistesDuPlan`, `src/types/plan.ts`) : deux cartes pleines,
  deux cartes estompées derrière « Voir d'autres pistes · N », puis des lignes simples. Au-delà de
  quatre cartes pleines ce n'est plus un choix qu'on présente, c'est un catalogue. Le compte est
  **dans** le libellé du lien : un lien qui ne dit pas combien il cache n'aide pas à décider de
  l'ouvrir. **Et les trois rangs disent l'insistance, jamais la permission** (recette du 14/09/2026,
  §12.4, `v1-16` §5) : les lignes simples n'avaient pas de bouton, donc le plan affichait des
  leviers chiffrés et **inatteignables**, sous une phrase qui demandait à la personne de changer sa
  vie pour que l'app la réordonne. Elles s'ouvrent désormais en carte au toucher — `carteDaction`
  étant une fabrique, déplier une ligne c'est l'appeler. Le classement n'a pas bougé, et une garde
  de **partition** dans `plan.test.ts` épingle ce dont la promesse dépend : un rang qui laisserait
  tomber une action recréerait ici, en silence, le `limit 2` que ce chantier a retiré du serveur.
- **`actionsCount` pilote encore le disclaimer et l'état vide**, mais la phrase d'intro compte
  désormais `enAvant.length` : elle décrit ce qui est devant, et dire « Deux actions » à un plan qui
  en porte cinq serait faux.
- **`first_step` est une ligne sans chiffre qui décrit un essai**, figée sur `plan_actions` comme le
  gain, et affichée **seulement une fois l'action engagée** : avant le choix, une consigne pratique se
  lit comme une charge de plus. Elle ne chiffre rien — le gain est juste au-dessus, et
  `/conditions` affirme que le produit ne fournit pas de prestation de conseil en mobilité. Deux
  balayages de la table l'épinglent (aucun gabarit sans premier pas, aucun chiffre dedans) plutôt que
  de nommer les gabarits un par un : celui qu'on ajoutera demain traverserait une liste. Le compte
  qui figurait ici s'est périmé à la vague suivante, où C3.8 en a ajouté quatre — c'est exactement
  la raison pour laquelle il ne s'écrit plus.
- **`commit_plan_action` prend `p_replace`, et son défaut refuse.** La fonction libérait et archivait
  l'engagement précédent **sans condition** (C2.2) : le geste le plus irréversible du produit partait
  en silence depuis n'importe quel appel. `p_replace = false` lève `RM001` — un SQLSTATE de la classe
  réservée aux conditions utilisateur, que le client reconnaît par son **code** et jamais par le
  message —, et l'écran relit alors le plan plutôt que de parler de réseau : ce refus veut presque
  toujours dire que l'état a changé depuis l'affichage. La signature **remplace** l'ancienne au lieu
  de la doubler, comme `repondre_au_checkin` en C2.4.

**Le plan ne propose plus l'impossible, et la règle qui l'en empêche vaut pour les filtres à
venir** (C3.8, `20260914131144`). Le filtre de contexte ne lisait qu'une valeur sur trois —
`requires_tc` n'écartait les transports en commun que sur `tc_access = 'inexistant'` —, donc
« Passer deux trajets sur cinq en métro ou en tram » arrivait **en tête** du plan d'un profil rural
à desserte limitée : le gain était juste, l'action impossible. Six points :

- **Une condition qu'on ne peut pas évaluer n'est pas remplie** : sans réponse, on ne propose pas.
  C'est l'inverse du choix de C3.1 (`mobility_constrained` nul **montre** la barre de la moyenne
  française), et l'asymétrie est le raisonnement — là-bas ne pas savoir faisait **cacher** un
  repère, ici cela ferait **proposer** une action implausible.
- **`action_templates.zones_admissibles` et `.teletravail_admissible` sont des listes de valeurs
  admissibles**, `null` valant « pas de condition ». Pour le télétravail ce n'est pas du style : il
  y a **deux seuils**, un jour se tenant avec « un jour » et deux jours demandant « deux ou plus ».
  Un tableau **vide** n'est pas un tableau absent — `= any('{}')` est faux pour toute valeur, donc il
  écarte tout le monde là où `null` n'écarte personne ; un test l'interdit.
- **Le métro et le tram sont bornés à `urbain_dense`, le train et le RER ne le sont pas**, et c'est
  la moitié qu'il ne faut pas « uniformiser » : un TER dessert des communes rurales, et lui coller
  la même zone retirerait à ce profil la seule alternative qui lui reste.
- **Le télétravail se demande** (B4.4, `assessment_answers.teletravail`), et l'action s'appelle
  « Travailler depuis chez toi un jour par semaine » — « garder » supposait qu'on en avait. Le
  libellé seul ne suffisait pas : sans la question, l'action reste en tête chez les gros rouleurs
  sans alternative. La garde du `remove_day` se dérive du gabarit (`commute_days_per_week <=
  t.trips`) au lieu d'un 2 écrit en dur : retirer deux jours à qui en fait deux supprimerait 100 %
  du trajet, et le gain annoncé serait celui de ne plus travailler.
- **La question demande un nombre de jours, et « Parfois » n'existe plus** (C5.4,
  `20260917103000_teletravail_en_jours.sql`). « Peux-tu travailler depuis chez toi ? oui / parfois /
  non » posait une **possibilité** là où le produit lisait un **nombre de jours** : « Parfois » était
  un seuil déguisé en hésitation, et y répondre coûtait l'action à deux jours sans que rien ne le
  dise. Les valeurs sont `aucun` / `un_jour` / `deux_ou_plus`, la question nomme le nombre de jours
  déclaré (« Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez toi ? »), et sa
  traduction préserve le comportement — la migration le **prouve** par une table de vérité case par
  case, et `src/lib/database.types.ts` ne bouge pas (la colonne reste `text`, la base n'a aucun
  `enum`). Deux points à ne pas défaire :
  - **la question disparaît en dessous de deux jours de trajet**, parce qu'à un seul jour l'action
    supprimerait 100 % du trajet et que la garde du `remove_day` l'écarte déjà — la réponse ne
    pourrait rien changer ;
  - et **ce qui décide de l'afficher décide aussi de l'effacer et de la réclamer** :
    `teletravailSePose` (`src/types/bilan.ts`) est lue par l'écran, par `manqueDeLEtape` et par
    `normaliserReponses`, parce que B4.4 n'est pas une étape mais un **champ** de l'étape
    « Contexte », donc `isStepVisible` ne la gouverne pas. En oublier un ne coûte pas la même chose
    (`v1-17` §7.2) : ne toucher que l'écran laisse « Suivant » inactif **pour toujours** sous un
    message qui nomme une question absente ; oublier `normaliserReponses` laisse partir à la
    soumission une réponse que la personne ne voit plus et ne peut plus corriger — le défaut de
    `v1-16` §4 par une autre porte.
- **Les échéances dépendent du poste** (`intentionTimingsForPoste`, `src/types/plan.ts`) : « Ce
  mois-ci » n'est pas une échéance pour un vol. Les voyages ont les leurs, les trois anciennes
  restent et sont celles des sorties. Le repli d'un poste inconnu est la liste des sorties, sans
  quoi la feuille s'ouvrirait sur rien et « C'est noté » resterait inactif sans dire pourquoi.
- **`cadreDuPlan` décide de ce que le cap a le droit de chiffrer, et de rien d'autre depuis C5.3.**
  Un plan à **zéro action** ne chiffre pas son cap — ce n'était un cas de bord qu'avant C2.5, et
  depuis, tout cycliste et tout profil sédentaire y tombe ; la carte se rend quand même, elle est
  depuis C2.8 l'endroit où la période se nomme. Le cap reste celui du poste dominant : le
  recalculer sur le total côté client ferait deux définitions d'un même chiffre.
  **Deux champs en sont partis, et ce n'est pas un allègement** : `intro` décrivait les deux cartes
  posées dessous (« Deux actions pour ton trajet domicile-travail ») en taisant les neuf autres,
  remplacée par une ligne fixe qui dit le **principe** — une action à la fois, la seule question
  qu'on se pose devant deux cartes. Et `noteDuCap` énonçait une **règle que rien n'applique** : le
  cap est une quantité à atteindre, aucun endroit du produit ne vérifie d'où vient la réduction.
  Elle était rare tant que le poste dominant remplissait les deux premières cartes ; **le
  classement de C5.1 l'aurait réveillée sur la plupart des plans**, les meilleurs leviers venant
  souvent d'ailleurs. La dérivation reste malgré son unique booléen, parce qu'il porte **deux
  causes** qu'un `||` rendrait à moitié inéprouvables.

**`action_text` est la clé naturelle du référentiel d'actions, et elle porte enfin un index
unique.** Tout le dépôt apparie les gabarits par elle — `action_templates.id` vaut
`gen_random_uuid()`, donc les identifiants diffèrent d'une base à l'autre — et rien ne le
garantissait ; c'est aussi ce qui rend l'insert de C3.8 rejouable (`on conflict do nothing`). Deux
pièges de la même famille : **`transport_mode_category` n'existe plus** sur cette table (supprimée
par `20260905130000` une fois la reprise de données faite), donc un insert recopié depuis ce
fichier-là échoue ; et un gabarit ajouté doit porter `question_template` **et** `first_step`, que
deux balayages épinglent sans nommer personne.

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

Trois pièges vérifiés en construisant cette table, tous silencieux — les deux premiers sont des
pièges Postgres, détaillés en `SUPABASE.md` §2.2 :
- **Un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
  `security definer`**, sinon le quota ne se déclenche jamais — `SUPABASE.md` §2.2.
- **`revoke execute ... from anon, authenticated` ne révoque rien** : il faut
  `from public, anon, authenticated` — `SUPABASE.md` §2.2.
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
énumérerait les tables deviendrait fausse à la prochaine migration, en silence. **Parcourue une fois
pour de bon le 14/09/2026**, en clôture de la recette sur appareil : un compte réel supprimé depuis
`/compte/suppression`, puis neuf tables relevées pour son identifiant — zéro ligne partout,
`auth.users` comprise. Ne jamais
rattacher une table à `profiles` avec autre chose que `on delete cascade` — un test pgTAP
vérifie la chaîne niveau par niveau. L'export est `security definer` pour une autre raison :
`usage_events` n'ayant aucune policy de lecture, une fonction en `security invoker` rendrait un
export silencieusement incomplet.

**Canal de retour** (`feedback`, issue #29) : la seule table où un client écrit du texte
libre. Comme chaque visiteur reçoit une session anonyme dès l'ouverture, ouvrir l'INSERT à
`authenticated` revient à l'ouvrir à quiconque sait appeler l'API — d'où le trigger
`enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et les bornes de longueur.
**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites — `TESTING.md` §2.5,
qui dit aussi pourquoi un fichier pgTAP se rejoue en séquence entière.

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

**Les rappels s'espacent d'eux-mêmes, et ce qui s'espace est le message — jamais le point**
(C2.9, `20260912170000_rappels_qui_s_espacent.sql`). `public.regime_de_rappel(user_id, loop_type)`
rend `normal` / `espace` / `silence` en comptant les points clos `expired` **depuis le dernier signe
de vie** — le plus récent d'une réponse et d'un `app_open` —, et `enqueue_checkin_reminders()` s'en
sert dans sa clause `where`. Quatre points sans réponse font passer à **au plus un message par mois
calendaire**, tous canaux et toutes boucles confondus ; huit font taire. Cinq choses à ne pas
« corriger » :
- **le point continue d'être généré** — l'app doit pouvoir montrer la question à qui revient après
  six mois, et supprimer la génération effacerait l'historique de la boucle ;
- **deux seuils et non un** : sans le second, « espace » serait un **état terminal** pour la boucle
  mensuelle, qui est déjà à ce rythme ;
- le plafond du régime espacé compte sur `created_at` de la boîte d'envoi et non sur `sent_at`,
  sinon la décroissance ne s'appliquerait **pas du tout** tant que l'expéditeur n'est pas
  configuré ;
- `regime_de_rappel` est `security definer` pour une raison non décorative : `usage_events` n'a
  aucune policy de lecture, donc le comptage des `app_open` ne verrait rien depuis `authenticated`
  — même piège que le garde-fou de volume de cette table, et un compteur qui ne compte rien ne
  déclenche jamais ;
- **quelqu'un qui ouvre l'app chaque semaine sans jamais répondre ne se fait jamais taire**, et
  c'est voulu : `app_open` est un signe de vie, et le chantier visait le compte **désinstallé**, pas
  le lecteur silencieux. Avec la période écoulée de C2.3, le point ouvert lundi porte un
  `period_start` d'une semaine plus tôt, donc une ouverture du lundi est toujours postérieure et le
  point ne compte pas. Corollaire rassurant : ouvrir le lien de l'email **sur un appareil où l'on
  n'est pas connecté** émet l'`app_open` de la session anonyme de cet appareil, jamais celui du
  compte — le compteur du compte n'est donc pas remis à zéro par quelqu'un qui n'y est pas entré ;
- et la mise en file est appelée **une fois par point** : le plafond mensuel est un `not exists`,
  donc deux points du même compte insérés par un seul `insert` ne se verraient pas l'un l'autre.
  Le cas n'existe pas en production (le générateur clôt la période précédente avant d'insérer, et
  les deux boucles sont mises en file par deux appels), et un test qui le fabriquerait
  n'éprouverait rien.

**La sortie ne passe pas par l'app, parce que celle-ci a justement pu être désinstallée**
(`desinscrire_des_rappels(uuid)`, page `/rappels/stop?jeton=…`). L'ancienne consigne de l'email
renvoyait à « Toi » : inutilisable sans l'app, et **pire** sur un appareil neuf, où elle réglait la
préférence de la session anonyme vide que l'ouverture venait de créer. Le jeton vit sur la ligne
d'outbox, ne sert qu'une fois, et ne peut rien d'autre que couper les rappels du compte qui a reçu
ce message-là. C'est **le seul RPC qui écrit et que `anon` peut appeler** — les autres fonctions
accessibles à ce rôle n'ont jamais été révoquées du `PUBLIC` de leur création, et sont toutes pures
(`emission_factor`, `resolve_*`, `season_bounds`, les deux `check_*`) ; ici le `grant` est explicite
et le jeton *est* l'autorisation. Trois pièges :
- **le jeton est écrit explicitement dans l'`insert`** de la mise en file. Laissé au `default` de la
  colonne, il aurait tiré un second uuid, différent de celui que le corps du message venait
  d'afficher : un lien mort au premier clic, sans qu'aucune des deux moitiés ait l'air fausse ;
- la réponse **ne distingue jamais** un jeton inconnu d'un jeton déjà utilisé (même non-divulgation
  que `/connexion/retrouver`), et la page vérifie la **forme uuid** avant d'appeler — sans quoi un
  lien tronqué par une messagerie recevrait un `22P02`, c'est-à-dire l'écran de panne et une
  invitation à réessayer un lien qui ne marchera jamais (`src/types/desinscription.ts`) ;
- **c'est une écriture sans session et sans limite de débit, et c'est le bon compromis.** Le
  `feedback` a son `enforce_feedback_rate_limit` parce qu'il stocke du texte libre ; ici il n'y a
  rien à stocker, rien à lire en retour, et la réponse ne distingue aucun échec — marteler l'endpoint
  avec des uuid au hasard ne rend qu'une recherche d'index et `false` (122 bits à deviner). Brider une
  désinscription coûterait plus que l'abus qu'on éviterait : quelqu'un qui veut arrêter de recevoir
  doit réussir du premier coup. Ne pas « corriger » cette asymétrie avec `feedback`.
- **`List-Unsubscribe-Post` n'est pas envoyé, et son absence est épinglée par un contrôle de la
  migration.** L'annoncer engage l'URL à accepter un POST sans confirmation ; `/rappels/stop` est
  une page de l'export statique, qui ne peut pas y répondre — l'ajouter par symétrie ferait échouer
  le geste **en silence**, là où l'en-tête seul fait ouvrir le lien dans un navigateur (RFC 8058).
  Corollaire : la branche email de `send_pending_reminders` n'évalue son corps que si les secrets
  Vault existent, donc **aucune suite ne l'exerce** — ni la CI, où ils manquent, ni le distant, où
  les rejouer ferait partir un vrai email. L'en-tête a été éprouvé en évaluant la même expression à
  la main sur une vraie ligne d'outbox.
  **Et cette décision est désormais éprouvée, pas seulement raisonnée** (15/09/2026, `v1-13` §7, C4.9).
  La recette avait constaté que Gmail n'affiche **aucun** bouton « Se désabonner » au-dessus du rappel ;
  l'expérience qui devait trancher a été faite — un message avec les **deux** en-têtes, même expéditeur
  de production, même boîte que le témoin de la veille, seule la paire d'en-têtes changeant — et il n'y
  a **toujours** pas de bouton. Donc l'en-tête manquant n'était pas la cause, et une fonction `api/`
  qui répondrait au POST n'aurait rien produit : le chantier s'est fermé sans une ligne de code. La
  cause la plus probable est la classification de Gmail en courrier de masse, qui dépend du volume — ce
  qui donne la **condition de réouverture** : si le domaine se met à envoyer pour de vrai, la paire
  d'en-têtes peut redevenir la contrainte restante, et le chantier se rouvre tel qu'il est écrit en §7.
  D'ici là, la sortie que le produit contrôle est le lien imprimé dans le corps, et elle marche —
  vérifiée sur appareil : navigateur, refus calme au second clic, préférence sur « Aucun ».

**Les reprises de jeton d'appareil laissent une trace** (`push_tokens.reprises`,
`derniere_reprise_le`, `proprietaire_precedent`). La reprise reste **inconditionnelle** — décision
de `v1-10` §3.4, inchangée : sans elle, les rappels partiraient au nom d'un utilisateur fantôme au
moment où une session anonyme devient un compte. Ce qui manquait était de pouvoir le *constater* :
un jeton repris deux cents fois dirait un appareil partagé ou une boucle, et c'est la seule question
que ces trois colonnes servent à trancher. Dans le `on conflict do update`, `push_tokens.user_id`
désigne la ligne **existante** et `excluded` la ligne proposée — s'y tromper lirait la nouvelle
valeur, donc ne compterait jamais rien.

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
### Conventions front notables → `FRONT.md`

**Cette section vit désormais dans [`FRONT.md`](FRONT.md)**, sorti d'ici le 17/09/2026 où il pesait
545 lignes sur 1 911 — 29 % du seul fichier qu'une session charge à chaque fois. Même motif que les
quatre autres fichiers d'outil : ce qui est propre à **un sujet** s'ouvre sur déclencheur, et la
table en tête de ce fichier dit lesquels.

Ce qui y est : les repères chiffrés et leurs trois formateurs, le palier, le vocabulaire des postes
et ses quatre registres, la saison côté client, la mascotte — sa géométrie, ses saisons et tout ce
qu'elle dit —, l'accessibilité, les deux onglets et leurs états de chargement, le questionnaire, le
suivi, la persistance locale, et ce que `api/` duplique de `src/`.

**Deux règles restent ici parce qu'elles se cassent sans qu'on ait ouvert un écran** :

- **ne jamais créer de route dynamique `[id]`** — l'export statique exige `generateStaticParams`,
  sans quoi la page n'est pas produite et Vercel répond 404 sans rien signaler, d'où `?id=`
  partout ;
- **ajouter une route dans `src/app/(tabs)/` lui donne un onglet**, et le produit n'en a que deux.
  C'est presque toujours une erreur : un flux, un détour ou une surface publique vit hors du
  groupe.
