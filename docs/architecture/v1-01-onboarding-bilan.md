# TraceVerte — Architecture technique V1 (increment 1/2)

> ⚠️ **Le schéma du bilan décrit en §2-3 (tables `assessment_trips`/`assessment_trip_modes`,
> formules par trajet générique) est obsolète, remplacé par `v1-05-bilan-v2.md`** suite à la
> mise à jour de la spec fonctionnelle avec le détail complet des champs B1.1→B4.3. Le reste
> de ce document (stack, onboarding, RLS générales) reste valide. Conservé pour l'historique
> des décisions, pas comme référence du schéma actuel.
>
> ⚠️ **Le §5 est obsolète lui aussi** (extension du bandeau le 11/09/2026, constat A11-16) :
> aucun des accès qu'il annonce comme nécessaires n'existe, et le bandeau ci-dessus ne doit pas
> le couvrir par défaut. La **clé API Impact CO2** s'est révélée inutile — l'endpoint répond en
> HTTP 200 sans clé, et `sync_emission_factors()` l'appelle sans en-tête d'authentification (cf.
> `v1-07-audit-facteurs-et-suivi.md` §1.1 et §1.5). Le **token EAS en secret GitHub `EXPO_TOKEN`**
> et le **service account Google Play** n'existent pas non plus : `v1-10-connexion-et-rappels.md`
> §10 a retenu la voie « Build from GitHub » depuis expo.dev et la publication depuis la console
> Play, et le seul workflow du dépôt ne référence aucun secret Expo. Ce qui reste vrai du §5 est
> la mise en garde « ne pas coller le token dans le chat », et le fait qu'une décision d'accès se
> consigne. Le registre à jour de ce qui fait marcher Ramille hors du dépôt est
> `docs/exploitation/README.md`.

**Périmètre de ce document** : Brique 2 (Bilan initial) + socle minimal Brique 1 (Onboarding).
Les briques 3 (Plan) et 4 (Boucle mensuelle) sont volontairement laissées hors de cet
increment — elles seront spécifiées une fois ce socle validé, en respectant l'ordre de
priorité donné par la spec fonctionnelle (2 > 1 > 4 > 3).

Réf. spec fonctionnelle : `specfonctionnelleappcarbonetransportv1.md`.

## 0. Stack validée

| Couche | Outil |
|---|---|
| Frontend (mobile + web, un seul codebase) | Expo (React Native + Expo Router) |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS) |
| Déploiement web | Vercel |
| Build/publish mobile | EAS — **Google Play uniquement** en V1, pas d'App Store |

## 1. MCD — vue d'ensemble (increment 1)

```
profiles (1) ───< assessments (1) ───< assessment_trips ───< assessment_trip_modes >─── transport_modes
                        │                                                                      │
                        └──(1)── assessment_results ──(dominant_trip_id)──> assessment_trips    │
                                                                                                  │
                                                                        emission_factors ─────────┘
```

- `profiles` étend `auth.users` (géré par Supabase Auth) en 1:1.
- Un `assessment` peut contenir plusieurs `assessment_trips` (commute, weekend, voyage annuel).
- Un `assessment_trip` peut impliquer plusieurs modes (intermodalité) via `assessment_trip_modes`.
- `assessment_results` stocke le résultat calculé et le pointeur vers le trajet dominant —
  jamais recalculé à la volée côté client, pour garder un résultat stable même si les
  facteurs d'émission évoluent plus tard.

## 2. Tables

### `profiles`
1:1 avec `auth.users`. Porte le contexte structurel (spec §5) — sert à ne pas traiter un
profil rural sans alternative comme un mauvais élève dans la restitution.

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK, FK → auth.users(id) |
| zone_type | text | check in ('rural','urbain') |
| tc_access | text | check in ('bon','limite','aucun') — accès perçu aux transports en commun |
| cadence_type | text | check in ('season','rolling_quarter'), default `'season'` — **paramètre réservé pour la brique 3**, stocké dès maintenant pour ne pas migrer le profil plus tard |
| onboarding_completed_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

RLS : `auth.uid() = id` en lecture/écriture, aucun accès cross-user (pas de comparaison
sociale — cohérent avec le non-goal §2).

### `transport_modes` (référentiel, lecture seule côté app)

| Colonne | Type | Contrainte |
|---|---|---|
| id | text | PK (code stable, ex. `voiture_thermique`) |
| label | text | ex. "Voiture (thermique)" |
| category | text | `voiture` \| `deux_roues` \| `transports_commun` \| `train` \| `avion` \| `velo_marche` |

### `emission_factors` (référentiel versionné)

Versionné pour que le résultat d'un bilan passé reste reproductible même si les facteurs
sont mis à jour plus tard.

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| transport_mode_id | text | FK → transport_modes |
| kg_co2_per_km | numeric(8,4) | |
| source | text | default `'ADEME Base Empreinte (via API Impact CO2)'` |
| source_ref | text | nullable — id/nom du mode côté API source, pour traçabilité |
| valid_from | date | |
| | | unique(transport_mode_id, valid_from) |

**Source retenue (question ouverte spec §9 tranchée)** : **ADEME Base Empreinte** (ex-Base
Carbone), consommée via l'**API Impact CO2** (`impactco2.fr`, projet officiel de
l'incubateur ADEME/DINUM, endpoint `GET /api/v1/transport`) plutôt qu'une saisie manuelle —
c'est la source publique de référence en France, régulièrement mise à jour par l'ADEME
elle-même, donc pas de valeur à maintenir/justifier nous-mêmes.

**Mécanisme de mise à jour** : un job planifié (Supabase Edge Function + `pg_cron`, cadence
trimestrielle — les facteurs ADEME ne bougent pas plus souvent) interroge l'API et fait un
upsert dans `emission_factors` avec `valid_from` = date du run. Aucune valeur n'est jamais
écrasée : un ancien bilan reste calculé avec les facteurs en vigueur à sa date, cf. §3.
Aucune valeur n'est codée en dur dans le document ou l'application — la table se peuple au
premier déploiement via ce même job (voir §5 pour la clé API requise).

**Mapping prévu** `transport_modes.id` → mode Impact CO2 (à finaliser au moment du seed,
l'API expose une liste de modes plus fine que notre référentiel V1 — ex. plusieurs variantes
de voiture par gabarit/motorisation à regrouper sous `voiture_thermique` / `voiture_electrique`) :
`voiture_thermique`, `voiture_electrique`, `deux_roues_motorise`, `bus`, `train`,
`avion_court_moyen_courrier`, `avion_long_courrier`, `velo_marche`.

### `assessments`

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| status | text | check in ('in_progress','completed') |
| submitted_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

### `assessment_trips`

Un trajet déclaré. Distance toujours saisie **aller simple** — la formule applique le
aller-retour, pas de champ ambigu à gérer côté UI.

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| assessment_id | uuid | FK → assessments |
| trip_type | text | check in ('commute','weekend','annual') |
| label | text | nullable — libellé humain, ex. "Trajet domicile-travail", réutilisé tel quel dans le wording du check-in mensuel (brique 4) |
| distance_km | numeric | aller simple |
| frequency_unit | text | check in ('per_week','per_month','per_year') |
| frequency_value | numeric | |
| trip_scope | text | nullable, check in ('national','international') — uniquement pour `annual` |

### `assessment_trip_modes`

Supporte l'intermodalité (ex. voiture + train sur un même trajet déclaré).

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| assessment_trip_id | uuid | FK → assessment_trips |
| transport_mode_id | text | FK → transport_modes |
| share_percent | numeric | default 100, check between 0 and 100 — somme des parts d'un même trip = 100 (contrainte applicative) |

### `assessment_results`

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| assessment_id | uuid | FK unique → assessments |
| total_co2_kg_year | numeric | |
| dominant_trip_id | uuid | FK → assessment_trips |
| computed_at | timestamptz | |

RLS sur `assessments`, `assessment_trips`, `assessment_trip_modes`, `assessment_results` :
accès restreint au propriétaire via jointure sur `user_id = auth.uid()`.

`transport_modes` et `emission_factors` sont des référentiels non sensibles (aucune donnée
utilisateur) : lecture ouverte à `anon` et `authenticated`, pas de raison de les cacher
avant connexion.

## 3. Formules de calcul

Constantes (configurables, pas en dur dans le code applicatif — table `app_config` clé/valeur
ou variables d'environnement Edge Function) :

| Constante | Valeur par défaut | Usage |
|---|---|---|
| `WEEKS_PER_YEAR_COMMUTE` | 47 | trajets `commute`, `frequency_unit='per_week'` — exclut ~5 semaines de congés/RTT |
| `WEEKS_PER_YEAR_STANDARD` | 52 | trajets `weekend`, `frequency_unit='per_week'` |
| `MONTHS_PER_YEAR` | 12 | `frequency_unit='per_month'` |

**Étape 1 — occurrences annuelles**

```
annual_occurrences =
  frequency_value × WEEKS_PER_YEAR_COMMUTE   si frequency_unit = 'per_week' ET trip_type = 'commute'
  frequency_value × WEEKS_PER_YEAR_STANDARD  si frequency_unit = 'per_week' (autres cas)
  frequency_value × MONTHS_PER_YEAR          si frequency_unit = 'per_month'
  frequency_value                            si frequency_unit = 'per_year'
```

**Étape 2 — distance annuelle du trajet (aller-retour)**

```
trip_km_year = distance_km × 2 × annual_occurrences
```

**Étape 3 — contribution par mode (intermodalité)**

Pour chaque `assessment_trip_mode` du trajet, au facteur d'émission `valid_from` le plus
récent ≤ date du bilan :

```
mode_km_year      = trip_km_year × (share_percent / 100)
mode_co2_kg_year  = mode_km_year × emission_factor.kg_co2_per_km
```

**Étape 4 — total par trajet et total annuel**

```
trip_co2_kg_year   = Σ mode_co2_kg_year (sur les modes du trajet)
total_co2_kg_year  = Σ trip_co2_kg_year (sur tous les trajets du bilan)
```

**Étape 5 — décision dominante (spec §5, ancre de la boucle mensuelle §7)**

```
dominant_trip = argmax(trip_co2_kg_year) parmi les assessment_trips du bilan
```

Le `label` du trajet dominant est réutilisé tel quel dans le wording générique du check-in
mensuel ("As-tu changé de mode de transport au moins une fois ce mois-ci pour
`{dominant_trip.label}` ?") — pas de personnalisation poussée par profil, conforme à la
spec §7.

## 4. Ce qui reste hors de cet increment

- `plan_cycles` / actions de réduction (brique 3) — cadence saison vs trimestre glissant,
  déjà anticipée via `profiles.cadence_type`.
- `monthly_checkins` (brique 4) — s'appuiera sur `assessment_results.dominant_trip_id`.
- Contenu éditorial des écrans d'onboarding (copy, framing) — relecture humaine requise
  avant prod (spec §10), hors périmètre "architecture".

## 5. Connecteurs / accès nécessaires pour la suite (pas bloquant maintenant)

| Besoin | Quand | Qui fournit |
|---|---|---|
| Token Expo (EAS) pour builder/publier en CLI sans compte GUI | Phase build mobile | Compte Expo créé — token à générer, voir mode opératoire ci-dessous |
| Clé API Impact CO2 (facteurs d'émission ADEME) | Seed initial de `emission_factors`, avant tout calcul de bilan réel | Clé gratuite à demander sur impactco2.fr — sans clé la réponse API est limitée/dégradée |
| Service account Google Play (upload AAB automatisé via EAS Submit) | Phase publication Play Store | Créé côté Google Play Console + Google Cloud |
| Rien côté GitHub / Supabase / Vercel | — | Déjà connectés dans cette session |

Rien de tout ça n'est bloquant pour le scaffold du projet et l'application du schéma DB.
La clé Impact CO2 devient nécessaire dès qu'on veut des facteurs réels (pas des zéros/placeholders)
dans `emission_factors`.

### Où récupérer le token Expo (EAS)

1. Se connecter sur `expo.dev` avec le compte créé.
2. Aller dans **Account settings → Access tokens** (`https://expo.dev/accounts/<ton-compte>/settings/access-tokens`).
3. **Create token**, lui donner un nom (ex. `traceverte-ci`).

**Ne pas coller le token dans le chat** — un token EAS a les mêmes droits que ton compte
(build, submit) et une conversation n'est pas un canal fait pour stocker un secret durable.
Le dépôt via **secret GitHub Actions** au lieu de me le transmettre directement : Settings →
Secrets and variables → Actions → **New repository secret**, nom `EXPO_TOKEN`, coller la
valeur. Les commandes `eas build`/`eas submit` que je déclencherai tourneront alors en CI
(GitHub Actions) et liront ce secret sans que j'aie jamais besoin de le voir en clair — même
principe pour le futur service account Google Play (secret `GOOGLE_PLAY_SERVICE_ACCOUNT`).
