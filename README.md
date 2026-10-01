# Ramille

**Une app de sensibilisation à l'empreinte carbone des transports, pour la France.** On y fait un
bilan de ses trajets en quelques minutes, on choisit **une** action chiffrée dans un plan qui tient
une saison, et un point régulier — une question par semaine ou par mois, par notification ou par
e-mail — demande si on l'a tenue. Ramille est aussi le nom de la mascotte qui accompagne le
parcours.

Le produit s'appelait TraceVerte jusqu'au 05/09/2026 (`docs/architecture/v1-09-renommage-ramille.md`).
La V1 vise **Google Play uniquement**, et le web (`www.ramille.fr`).

**Où en est le produit** — ce qui est livré, ce qui reste ouvert, ce qui reste à vérifier avant de
publier : [`docs/architecture/produit.md`](docs/architecture/produit.md), §2.

## Stack

Expo (React Native et Expo Router, un seul code pour Android et le web) · Supabase (Postgres, Auth,
RLS, `pg_cron`) · Vercel (export statique du web, et deux fonctions dans `api/`) · EAS (builds
Android). Node 22 (`.nvmrc`).

## Démarrer en local

```bash
cp .env.example .env    # EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run web             # ou : npm run android
```

## Vérifier

Les vérifications rapides, celles qu'on lance après chaque changement :

```bash
npx tsc --noEmit        # typecheck
npm run lint            # ESLint (configuration Expo, et les règles du dépôt)
npm test                # Jest
```

La CI en fait davantage à chaque pull request — l'export web et ses gardes, les fonctions d'`api/`
rendues sous Node, pgTAP, le parcours réel — et **`node scripts/rejouer-la-ci.mjs` les rejoue
toutes en local**, ou seulement celles qu'on nomme (`TESTING.md` §2.13). Les deux dernières
demandent Docker et le CLI Supabase à la version que la CI épingle, `npx supabase@2.117.0` — jamais
`@latest`.

Trois suites, et la règle plutôt qu'une liste qui se périme au fichier suivant :

- **Jest** — toute dérivation pure affichée à la personne ou décidant d'une navigation est testée,
  dans un `*.test.ts` colocalisé sous `src/` ; s'y ajoutent quelques tests d'écran
  (`src/tests/ecrans/`) et ceux des scripts (`scripts/*.test.ts`) ;
- **pgTAP** — un fichier numéroté par sujet dans `supabase/tests/database/` : calcul, policies RLS,
  privilèges, crons, référentiels. `npx supabase@2.117.0 db start`, puis
  `npx supabase@2.117.0 test db` ;
- **le parcours réel** — le chemin nominal joué par Playwright contre une vraie stack Supabase
  locale, la base relue après chaque écriture, sur plusieurs profils (`TESTING.md` §2.6, qui donne
  aussi les commandes) : ce qui garde les écrans et les requêtes, que les deux autres suites ne
  voient pas.

Plusieurs de ces tests n'épinglent pas un comportement mais une **décision**, pour qu'elle ne soit
pas « corrigée » par réflexe : l'ordre ACV des motorisations (une hybride émet plus qu'une
thermique, et c'est juste), la source des facteurs, la moyenne française de référence, la table de
vérité du canal de rappel. Le détail des suites et de leurs pièges : `TESTING.md`.

## Base de données

Les migrations vivent dans `supabase/migrations/` et s'appliquent au projet Supabase que le dépôt
appelle `TraceVerte-v1` (son tableau de bord affiche `TraceVerte`). **Après toute migration,
`src/lib/database.types.ts` se retouche à la main**, et la CI le compare à la base qu'elle vient de
construire (`SUPABASE.md` §2.1).

## La documentation

- **[`CLAUDE.md`](CLAUDE.md)** est la carte du projet : la façon de travailler, les règles qui se
  cassent sans qu'on ait rien décidé, l'architecture en bref, et **une table qui dit quel fichier
  ouvrir avant de toucher à quoi**. C'est par là qu'on commence.
- **Les fichiers d'outil**, à la racine — [`SUPABASE.md`](SUPABASE.md), [`EXPO.md`](EXPO.md),
  [`VERCEL.md`](VERCEL.md), [`TESTING.md`](TESTING.md), [`RECETTE.md`](RECETTE.md), et
  [`FRONT.md`](FRONT.md) pour l'écran et ce qu'il affiche — portent les pièges de chaque outil,
  coupés entre ce qui vaut partout et ce qui est propre à Ramille.
- **Les fichiers de sujet**, à la racine aussi — [`BILAN.md`](BILAN.md), [`PLAN.md`](PLAN.md),
  [`BOUCLE.md`](BOUCLE.md), [`COMPTE.md`](COMPTE.md), [`MESURE.md`](MESURE.md) — portent les
  règles de chaque brique du produit, toutes propres à Ramille.
- **`docs/architecture/`** : [`produit.md`](docs/architecture/produit.md), document vivant (ce qui
  est livré, la feuille de route), et les décisions datées `v1-NN-*.md`, qui ne se réécrivent pas —
  dont [`v1-13`](docs/architecture/v1-13-audit-et-chantiers.md), l'audit et ses chantiers, et
  [`v1-27`](docs/architecture/v1-27-dette-technique.md), le relevé de dette.
- **`docs/exploitation/`** : le registre de ce qui fait marcher Ramille sans vivre dans le dépôt —
  comptes tiers, réglages, sauvegarde, journaux à relire.
- **`docs/design/`** : le handoff d'origine, figé, les canvas de chaque increment, et le design
  system (`docs/design/design-system/`).
- **`docs/recette/`** : les feuilles des séances de recette, au navigateur ou sur appareil.

## Licence et attributions

Code sous **GNU Affero General Public License v3.0 ou ultérieure** — `AGPL-3.0-or-later`,
fichier `LICENSE` —
© 2026 Antoine Berthaud. C'est une licence **copyleft** : toute version modifiée se
redistribue sous la même licence, en conservant les mentions de paternité — et son **§13**
étend l'obligation au réseau, donc exploiter une version modifiée comme service web oblige à en
offrir le code source aux utilisateurs.

**La licence porte sur le code, pas sur le nom.** Elle ne concède aucun droit sur « Ramille »,
sur la mascotte ni sur l'identité visuelle : une version modifiée se distribue sous un autre nom.

Les **facteurs d'émission** viennent de la **Base Empreinte de l'ADEME**, consommés via l'API
Impact CO2 (`impactco2.fr`, incubateur ADEME) : tous portent l'ACV complète (usage + fabrication),
et chaque version enregistrée garde sa source dans `emission_factors.source`. Les conditions de
réutilisation de ces données relèvent de l'ADEME, pas de la licence de ce dépôt — voir `NOTICE`.

Le dépôt est public pour être **lu** : lecture bienvenue, **pull requests non attendues** — il n'y
a pas d'équipe derrière, et les conventions internes (tout en français, une décision par document
daté, contre-lecture avant fusion) rendent une contribution de passage coûteuse à intégrer. La
licence donne le droit de forker et de modifier ; ce qui n'est pas promis, c'est du temps de
relecture. Ce qui est **toujours utile** : un rapport — une incohérence, un chiffre qui ne
correspond pas au calcul. Détail dans `CONTRIBUTING.md` ; pour une faille, `SECURITY.md`.
