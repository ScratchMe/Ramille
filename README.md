# TraceVerte

App de sensibilisation à l'empreinte carbone transport. Voir `docs/architecture/` pour les
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
```

## Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet Supabase `TraceVerte-v1`.
Après toute migration, régénérer `src/lib/database.types.ts` (types TypeScript du schéma).
