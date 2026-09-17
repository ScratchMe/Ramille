# Ramille

App de sensibilisation à l'empreinte carbone transport (anciennement TraceVerte, renommée le
05/09/2026 — voir `docs/architecture/v1-09-renommage-ramille.md`). Voir `docs/architecture/` pour les
décisions techniques (stack, MCD, formules de calcul) et la spec fonctionnelle associée.

## Stack

Expo (React Native + Expo Router, mobile + web) · Supabase (Postgres + Auth + RLS) · Vercel
(web) · EAS (build/publish — Google Play uniquement en V1).

## Démarrer en local

```bash
cp .env.example .env   # renseigner EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run web             # ou: npm run android / npm run ios
```

## Vérifications

```bash
npx tsc --noEmit   # typecheck
npm run lint       # eslint (config Expo)
npm test           # tests unitaires (Jest)
```

Tests SQL (pgTAP) : `npx supabase@latest db start` puis `npx supabase@latest test db`
(nécessite Docker).

Deux suites, et la règle plutôt qu'une liste qui se périme au fichier suivant :

- **Jest** — toute dérivation pure affichée à la personne ou décidant d'une navigation est
  testée, dans un `*.test.ts` colocalisé. L'inventaire se lit en listant `src/**/*.test.ts`.
- **pgTAP** — un fichier numéroté par sujet dans `supabase/tests/database/` : fonctions de
  calcul, policies RLS, privilèges de table, crons et référentiels. L'inventaire se lit dans
  le répertoire.

Plusieurs de ces tests n'épinglent pas un comportement mais une **décision**, pour qu'elle ne
soit pas « corrigée » par réflexe (ordre ACV des motorisations, source des facteurs, invariant
SDES de la moyenne française, table de vérité du canal de rappel). Voir `CLAUDE.md` pour le
détail des deux suites et des pièges qui vont avec.

## Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1`.
Après toute migration, régénérer `src/lib/database.types.ts` (types TypeScript du schéma).

## Licence et attributions

Code sous **GNU Affero General Public License v3.0 ou ultérieure** (fichier `LICENSE`),
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

Le dépôt est public pour être **lu**. Les conventions internes (tout en français, une décision par
document daté, contre-lecture avant fusion) rendent une contribution de passage coûteuse à
intégrer : ouvrir une issue avant une pull request. Pour signaler une faille, voir `SECURITY.md`.
