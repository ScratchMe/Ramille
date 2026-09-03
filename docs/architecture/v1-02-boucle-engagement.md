# TraceVerte — Architecture technique V1 (increment 2/3)

> **Statut** : §2-3 révisés le 27/08/2026 (increment 11) — la boucle unique mensuelle
> initialement documentée ci-dessous a été remplacée par **deux boucles indépendantes**
> (hebdomadaire domicile-travail + mensuelle extras), toutes deux proposées à tout
> utilisateur concerné. Voir migration `20260827090000_engagement_checkins.sql`.

**Périmètre de ce document** : Brique 4 (Boucle d'engagement), niveau d'effort "fonctionnel
simple" comme demandé par la spec §3. Brique 3 (Plan de réduction) reste hors scope de ce
document — voir `v1-03-plan-reduction.md`.

Réf. spec fonctionnelle §7 (Boucle d'engagement) et §8 (Success metrics).

## 1. Principe

Un check-in généré côté serveur (pas d'action utilisateur pour le créer), une seule question
fermée par check-in, pas de streak, pas de notification répétée (spec §7 — non-goals §2). La
spec parle d'une cadence mensuelle unique ancrée sur le trajet dominant, mais un trajet
domicile-travail se vit au rythme de la semaine, pas du mois : figer une cadence mensuelle
pour ce poste aurait produit une question qui arrive "en retard" par rapport au vécu de
l'utilisateur (5 semaines de trajets résumées en une seule question), alors que les postes
extras — loisirs occasionnels, voyages — n'ont justement de sens qu'à l'échelle du mois.

**Décision produit (27/08/2026)** : deux boucles, chacune sur sa cadence naturelle, toutes
deux proposées systématiquement — pas une alternative où l'utilisateur choisirait une seule
boucle. L'UI recommande de se concentrer sur le poste qui pèse le plus (poste dominant du
bilan) via une mise en avant visuelle, mais n'affiche jamais l'autre boucle en grisé ni ne la
masque : rien n'empêche un utilisateur au poste dominant "loisirs" de vouloir aussi suivre son
trajet domicile-travail hebdomadaire, même secondaire dans son bilan.

| Boucle | Cadence | Poste suivi | Condition d'éligibilité |
|---|---|---|---|
| `commute` | hebdomadaire (lundi) | trajet domicile-travail | `commute_has_regular_trip = true` au dernier bilan complété |
| `extras` | mensuelle (1er du mois) | loisirs **ou** voyages — le plus élevé des deux (même départage que le poste dominant du bilan) | toujours vrai (les deux questions du bilan sur loisirs/voyages sont obligatoires) |

## 2. Table

### `engagement_checkins`

Table unique, générique aux deux cadences — `loop_type` distingue les deux boucles plutôt que
deux tables séparées, pour garder une seule policy RLS et un seul écran de rendu (le contenu
de la question varie déjà par `loop_type`, cf. §3 ; dupliquer la table dupliquerait aussi
policies, trigger et types générés sans bénéfice).

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| loop_type | text | check in ('commute', 'extras') |
| period_start | date | lundi de la semaine (commute) ou 1er du mois (extras) concerné |
| period_label | text | libellé affiché, ex. "Semaine du 07/09" ou "septembre 2026" |
| trip_label | text | **snapshot** du libellé du poste concerné au moment de la génération (cf. §3) |
| status | text | check in ('pending','answered'), default `'pending'` |
| response | boolean | nullable — `true` = a changé au moins une fois, `false` = non |
| responded_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| | | unique(user_id, loop_type, period_start) |

**Pourquoi `trip_label` en snapshot plutôt qu'une jointure live** : si l'utilisateur refait un
bilan plus tard (`assessments` supporte plusieurs bilans dans le temps), le wording d'un
check-in déjà généré ne doit pas changer rétroactivement — même logique que
`assessment_results`, qui fige son résultat au moment du calcul.

**Immutabilité après réponse** : trigger `prevent_answered_checkin_update` (générique,
partagé avec l'ancienne `monthly_checkins`) refuse toute modification une fois
`status = 'answered'` — le signal d'engagement (§4) doit reposer sur une donnée stable, pas
sur quelque chose de réécrivable après coup.

RLS : lecture et mise à jour (répondre = passer `status`→`answered` + `response` +
`responded_at`) restreintes à `user_id = auth.uid()`. Pas de policy `insert` pour
`authenticated` (`revoke insert ... from authenticated, anon` explicite) — la création est
réservée aux fonctions serveur (§3).

## 3. Génération

**Libellés par poste sur `assessment_results`** : `compute_assessment_results` persiste
désormais, en plus du poste dominant global, le libellé du poste domicile-travail
(`commute_poste_label`, `null` si pas de trajet régulier) et le résultat du départage
loisirs/voyages (`extras_poste_co2_kg_year`, `extras_poste_label`) — indépendamment du poste
dominant global. Nécessaire car les deux boucles ne suivent pas forcément le poste dominant
(ex. un utilisateur dominant "voyages" a quand même un trajet domicile-travail hebdomadaire à
suivre).

**Mécanisme** : deux fonctions SQL (`public.generate_commute_checkins()` et
`public.generate_extras_checkins()`), planifiées séparément par `pg_cron`. Comme pour
l'ancienne `generate_monthly_checkins()`, aucun appel réseau, aucun secret à gérer — pure
fonction SQL plutôt qu'Edge Function.

**Logique boucle `commute`** (hebdomadaire) : pour chaque utilisateur dont le dernier bilan
complété a un trajet domicile-travail régulier (`assessment_results.commute_poste_label is
not null`), créer un check-in pour la semaine courante s'il n'en existe pas déjà un.

```sql
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
select distinct on (a.user_id)
  a.user_id, 'commute', date_trunc('week', now())::date,
  'Semaine du ' || to_char(date_trunc('week', now())::date, 'DD/MM'),
  ar.commute_poste_label
from public.assessments a
join public.assessment_results ar on ar.assessment_id = a.id
where a.status = 'completed' and ar.commute_poste_label is not null
order by a.user_id, a.submitted_at desc
on conflict (user_id, loop_type, period_start) do nothing;
```

Planification : `select cron.schedule('generate-commute-checkins', '0 6 * * 1', $$select public.generate_commute_checkins()$$);`
— chaque lundi à 6h UTC.

**Logique boucle `extras`** (mensuelle) : même schéma, sur `extras_poste_label` et
`date_trunc('month', now())`, avec libellé en français ("septembre 2026") construit à partir
d'un tableau de noms de mois codé en dur (même pattern que `season_bounds`, pour éviter la
dépendance à la locale du serveur Postgres).

Planification : `select cron.schedule('generate-extras-checkins', '0 6 1 * *', $$select public.generate_extras_checkins()$$);`
— le 1er de chaque mois à 6h UTC.

## 4. Signal d'engagement (spec §7, indicatif — pas de table dédiée)

"2 check-ins consécutifs complétés" se calcule à la demande, par boucle (`loop_type`), pas
stocké (évite une donnée dérivée à tenir synchronisée pour un signal qui n'est explicitement
pas causal) :

```sql
-- vrai si les 2 derniers check-ins de la boucle 'commute' du user sont 'answered'
select bool_and(status = 'answered')
from (
  select status
  from public.engagement_checkins
  where user_id = :user_id and loop_type = 'commute'
  order by period_start desc
  limit 2
) recent;
```

## 5. Ce qui reste volontairement hors scope

- **Notifications push** : la spec demande juste "pas de notification insistante ni
  répétée" pour la relance après réponse négative — elle n'impose pas de canal push. Ajouter
  Expo Notifications (tokens par device, credentials Apple/Google, etc.) est une brique
  d'infra à part entière que rien dans la spec ne justifie pour cette V1 : le check-in généré
  est visible **in-app** à la prochaine ouverture (écran `/plan`), point. Si un vrai besoin de
  rappel actif émerge plus tard, ce sera un increment dédié avec validation d'outil au
  préalable (Expo Push Service, gratuit, mais c'est un choix d'infra à faire valider, pas un
  a priori).
- Copy exacte du "renforcement bref" et de la "relance factuelle" au-delà de leur intention
  ("bref", "factuelle, non culpabilisante") : rédigée directement dans `CheckinCard`
  (`src/components/checkin-card.tsx`), pas de contenu éditorial séparé à valider ici.
- Un troisième palier de cadence (ex. trimestriel) pour un poste qui serait ni commute ni
  extras : la spec ne décrit que domicile-travail, loisirs, voyages — pas de quatrième poste à
  couvrir en V1.
