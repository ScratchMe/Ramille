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
  (dérivation de navigation et de complétude du wizard). Colocalisés en `*.test.ts` à côté du
  fichier testé.
- **pgTAP** (`supabase/tests/database/*.sql`) sur les fonctions SQL de calcul —
  `compute_assessment_results`, `generate_plan_cycle_for_user`, `season_bounds`/
  `rolling_quarter_bounds`. Tourne via `supabase test db`, qui démarre une stack Postgres
  locale (Docker) à partir de `supabase/config.toml` + `supabase/migrations/` — indépendante
  du projet Supabase distant `TraceVerte-v1` utilisé pour le développement applicatif
  courant. Nécessite le CLI Supabase (`npx supabase@latest`) et Docker ; non exécutable dans
  cet environnement (pas de daemon Docker) — validé à la place via des transactions
  `BEGIN`/`ROLLBACK` sur le projet distant avant d'être figé dans ces fichiers.

Les deux suites tournent en CI (`.github/workflows/ci.yml`) sur chaque pull request.

## Architecture

**Stack** : Expo (React Native + Expo Router, un seul codebase mobile+web) · Supabase
(Postgres + Auth + RLS) · Vercel (déploiement web, build via `vercel-build` →
`expo export --platform web` → `dist/`) · EAS (build/publish Android uniquement).

**Routing** : `src/app/` (Expo Router, file-based). Flux : `/` → `/onboarding/*` →
`/bilan` (questionnaire) → `/bilan/resultat` (restitution) → `/plan` (plan de réduction),
avec `/connexion/*` atteignable depuis la restitution et le plan.

**Documentation de référence — à lire avant toute modification de schéma ou de flux** :
`docs/architecture/v1-0N-*.md`. Ce sont des décisions actées, pas des brouillons ; chaque
fichier documente son propre statut (ex. `v1-01` a un bandeau indiquant que son §2-3 est
obsolète, remplacé par `v1-05-bilan-v2.md` — toujours vérifier qu'un document n'a pas été
supersédé par un increment plus récent avant de s'y fier). `docs/design/` contient le
handoff design/UX d'origine (spec fonctionnelle, maquettes) ; les fichiers `v1-0N` dans
`docs/architecture/` documentent les écarts assumés entre ce handoff et l'implémentation
réelle (le plus important : §1 de `v1-04-authentification.md`, voir plus bas).

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
volée côté client) — même logique pour `monthly_checkins.trip_label`, snapshotté pour ne
pas changer rétroactivement le wording d'un check-in déjà généré si l'utilisateur refait un
bilan plus tard.

### Conventions front notables

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
- Le wizard du bilan (`src/app/bilan/index.tsx` + `src/components/bilan/steps/*`) dérive
  entièrement sa navigation ("Étape N sur M", saut conditionnel d'étapes) de l'état courant
  des réponses via `isStepVisible`/`nextStep`/`previousStep`/`isStepComplete` dans
  `src/types/bilan.ts` — pas de machine à états séparée à maintenir en parallèle.
