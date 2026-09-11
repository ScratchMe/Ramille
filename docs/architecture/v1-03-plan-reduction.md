# TraceVerte — Architecture technique V1 (increment 3/3)

> ⚠️ **Le schéma décrit en §3 et la mécanique décrite en §5-§6 sont obsolètes** (bandeau posé le
> 11/09/2026, constat A11-8). Le §3 décrit `plan_cycles.dominant_trip_id` en clé étrangère vers
> `assessment_trips`, table supprimée le 24/08/2026 par `v1-05-bilan-v2.md`, et `action_templates`
> comme un couple (`transport_mode_category`, `action_text`) : la table porte aujourd'hui `poste`,
> `segment`, `operation`, `share`, `trips`, `substitute_mode_id`, `requires_tc`, `requires_car`,
> `detail_kind`. Le §6 décrit une génération de plan par catégorie de mode qui n'existe plus, et
> `plan_actions` a depuis gagné les colonnes d'engagement posées par `commit_plan_action`.
> **Références à jour** : `v1-07-audit-facteurs-et-suivi.md` §3.3 et les migrations
> `20260905130000_actions_chiffrees.sql` (actions chiffrées, `estimate_action_savings`) et
> `20260905190000_engagement_action.sql` (engagement par RPC).
>
> **Le §2 (cadence : saisons météorologiques) reste en vigueur**, et c'est la décision que ce
> document conserve. Deux nuances à connaître : la comparaison « mon été contre mon été
> précédent », donnée ici comme bénéfice principal du choix, **n'a jamais été construite** (aucun
> écran ne compare deux saisons homologues, cf. A11-4) — la raison décisive était le calcul
> trivial en SQL, dite juste en dessous ; et `cadence_type = 'rolling_quarter'` est un **mécanisme
> dormant**, complet côté serveur mais qu'aucun écran n'ouvre (A8-16, cf. CLAUDE.md § Base de
> données). Conservé pour l'historique des décisions, pas comme référence du schéma actuel.

**Périmètre** : Brique 3 (Plan de réduction), dernière brique de la spec V1. Niveau d'effort
"fonctionnel simple" (spec §3). Clôture le socle de spec fonctionnelle §4-§7.

Réf. spec fonctionnelle §6.

## 1. Principe

Un cycle de plan par utilisateur et par période (saison ou trimestre glissant, selon
`profiles.cadence_type` — déjà anticipé en increment 1), avec un cap de réduction et 1 à 2
actions suggérées, ancrés sur le trajet dominant du dernier bilan complété.

## 2. Cadence : saisons météorologiques (pas astronomiques)

La spec laisse ouvert saison vs trimestre glissant, avec "saisons calendaires" en piste
privilégiée pour permettre la comparaison "mon été vs mon été précédent" (spec §6).
**Choix tranché ici** : saisons **météorologiques** (blocs de 3 mois calendaires pleins —
hiver = déc/jan/fév, etc.) plutôt qu'astronomiques (équinoxes/solstices, dont les dates
varient chaque année). Raison : même bénéfice de comparaison saison-sur-saison, calcul
trivial en SQL (pas de table de dates astronomiques à maintenir), conforme au niveau
"fonctionnel simple" demandé.

| Saison | Période |
|---|---|
| Hiver | 1er décembre → dernier jour de février |
| Printemps | 1er mars → 31 mai |
| Été | 1er juin → 31 août |
| Automne | 1er septembre → 30 novembre |

Trimestre glissant (`cadence_type = 'rolling_quarter'`) : ancré sur la date du bilan complété
de l'utilisateur, blocs de 3 mois calendaires depuis cette date.

## 3. Tables

### `plan_cycles`

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| cadence_type | text | **snapshot** de `profiles.cadence_type` au moment de la génération |
| period_label | text | ex. "Été 2026", "Trimestre 1 (depuis le 03/01/2026)" |
| period_start | date | |
| period_end | date | |
| dominant_trip_id | uuid | FK → assessment_trips |
| trip_label | text | snapshot, même rationale que `monthly_checkins.trip_label` |
| baseline_co2_kg_year | numeric | snapshot de la contribution CO2 annuelle du trajet dominant (cf. §4) |
| target_reduction_pct | numeric | cap de réduction, cf. §5 |
| created_at | timestamptz | default now() |
| | | unique(user_id, period_start) |

### `plan_actions`

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| plan_cycle_id | uuid | FK → plan_cycles |
| action_template_id | uuid | FK → action_templates |
| created_at | timestamptz | default now() |

### `action_templates` (référentiel, lecture publique)

1 à 2 actions par catégorie de mode de transport, sélectionnées automatiquement selon le
mode principal (part la plus élevée) du trajet dominant.

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| transport_mode_category | text | même valeurs que `transport_modes.category` |
| action_text | text | |

**Copy** : rédaction volontairement minimale pour cette V1 (5 catégories couvertes sur 6 —
`velo_marche` a un facteur d'émission nul donc ne peut structurellement jamais être le trajet
dominant, pas de template nécessaire). À relire avec le même soin que briques 1/2 si le
produit se confirme — pas de promesse de qualité éditoriale ici, cohérent avec le niveau
d'effort demandé par la spec pour cette brique.

## 4. Extension de `assessment_results`

Ajout de `dominant_trip_co2_kg_year numeric` (nullable, rétrocompatible) : jusqu'ici seul le
total du bilan était stocké, pas la contribution du trajet dominant isolément. Nécessaire ici
— le cap de réduction doit porter sur le poids réel du trajet ciblé, pas sur le total du
bilan (sinon un objectif "-20%" sur le total serait déconnecté d'une action qui ne porte que
sur un seul trajet parmi plusieurs).

## 5. Cap de réduction

**Valeur par défaut** : **-20%** sur la contribution annuelle du trajet dominant, calculé
comme constante nommée dans `generate_plan_cycles()` (pas de valeur magique éparpillée). Pas
de justification scientifique précise à ce stade — la spec demande explicitly "un cap
réaliste, sans mécanique sophistiquée de sous-objectifs", pas un objectif calibré
individuellement. 20% est un ordre de grandeur atteignable sur un trimestre pour un
changement de comportement partiel (ex. remplacer 1 trajet sur 5), sans être négligeable.
Reste un paramètre à ajuster sans changer le schéma.

## 6. Génération

Fonction `generate_plan_cycles()`, planifiée **quotidiennement** par `pg_cron` (contrairement
au check-in mensuel à date fixe, les limites de saison et surtout les trimestres glissants
tombent à des dates différentes par utilisateur — un check quotidien idempotent est plus
simple qu'un calcul de prochaine échéance par utilisateur).

Pour chaque utilisateur ayant un bilan complété, sans `plan_cycles` déjà existant pour la
période courante (`unique(user_id, period_start)` fait office de garde-fou) :
1. calcule les bornes de la période courante (`season_bounds()` ou `rolling_quarter_bounds()`
   selon `profiles.cadence_type`)
2. insère un `plan_cycles` référencant le trajet dominant du bilan complété le plus récent
3. sélectionne le mode principal du trajet dominant (part la plus élevée dans
   `assessment_trip_modes`) et insère 1 à 2 `plan_actions` depuis `action_templates` pour la
   catégorie correspondante

RLS : lecture par le propriétaire sur `plan_cycles`/`plan_actions`, lecture publique sur
`action_templates` (référentiel non sensible, même traitement que `transport_modes`).
Création réservée à la fonction serveur (`security definer`), même pattern que
`monthly_checkins`.

## 7. Ce qui reste hors scope

- Suivi de la progression vers le cap pendant la période (le check-in mensuel de la brique 4
  donne déjà un signal factuel — pas de mécanique de sous-objectifs supplémentaire, conforme
  au non-goal spec §2 sur les mécaniques complexes)
- Écran client : le mécanisme serveur est la partie non triviale de cette brique, l'écran
  (affichage du cap + des 1-2 actions) suit dans un increment produit dédié
