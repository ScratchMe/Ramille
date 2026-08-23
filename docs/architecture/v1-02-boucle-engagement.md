# TraceVerte — Architecture technique V1 (increment 2/3)

**Périmètre de ce document** : Brique 4 (Boucle d'engagement mensuelle), niveau d'effort
"fonctionnel simple" comme demandé par la spec §3. Brique 3 (Plan de réduction) reste hors
scope — increment suivant.

Réf. spec fonctionnelle §7 (Boucle d'engagement) et §8 (Success metrics).

## 1. Principe

Un check-in par utilisateur par mois, généré côté serveur (pas d'action utilisateur pour le
créer), ancré sur le **trajet dominant** identifié au dernier bilan complété
(`assessment_results.dominant_trip_id`). Une seule question fermée, pas de streak, pas de
notification répétée (spec §7 — non-goals §2).

## 2. Table

### `monthly_checkins`

| Colonne | Type | Contrainte |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| period_month | date | 1er du mois concerné (ex. `2026-09-01`) |
| dominant_trip_id | uuid | FK → assessment_trips — trajet référencé au moment de la génération |
| trip_label | text | **snapshot** du label du trajet au moment de la génération (cf. §3) |
| status | text | check in ('pending','answered'), default `'pending'` |
| response | boolean | nullable — `true` = a changé au moins une fois, `false` = non |
| responded_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| | | unique(user_id, period_month) |

**Pourquoi `trip_label` en snapshot plutôt qu'une jointure live** : si l'utilisateur refait un
bilan plus tard (`assessments` supporte plusieurs bilans dans le temps, cf. increment 1), le
wording d'un check-in déjà généré ne doit pas changer rétroactivement — même logique que
`assessment_results` qui fige son résultat au moment du calcul.

**Immutabilité après réponse** : trigger qui refuse toute modification une fois
`status = 'answered'` — le signal d'engagement (§4) doit reposer sur une donnée stable, pas
sur quelque chose de réécrivable après coup.

RLS : lecture et mise à jour (répondre = passer `status`→`answered` + `response` +
`responded_at`) restreintes à `user_id = auth.uid()`. Pas de policy `insert` pour
`authenticated` — la création est réservée à la fonction serveur (§3), cohérent avec le
traitement déjà appliqué à `assessment_results` en increment 1.

## 3. Génération mensuelle

**Mécanisme** : une fonction SQL (`public.generate_monthly_checkins()`), planifiée par
`pg_cron` le 1er de chaque mois. Contrairement à la synchronisation des facteurs d'émission
(increment 1, qui appelle une API externe et nécessite donc une Edge Function), cette
génération ne lit que des données déjà en base — pas d'appel réseau, pas de secret à gérer,
donc pure fonction SQL plutôt qu'Edge Function. Plus simple, conforme au niveau d'effort
"fonctionnel simple" demandé pour cette brique.

**Logique** : pour chaque utilisateur ayant un bilan complété (`assessments.status =
'completed'` avec un `assessment_results` associé), s'il n'existe pas déjà de
`monthly_checkins` pour le mois courant, en créer un référencant le trajet dominant du bilan
**complété le plus récent** de cet utilisateur.

```sql
insert into public.monthly_checkins (user_id, period_month, dominant_trip_id, trip_label)
select distinct on (a.user_id)
  a.user_id,
  date_trunc('month', now())::date,
  ar.dominant_trip_id,
  t.label
from public.assessments a
join public.assessment_results ar on ar.assessment_id = a.id
join public.assessment_trips t on t.id = ar.dominant_trip_id
where a.status = 'completed'
order by a.user_id, a.submitted_at desc
on conflict (user_id, period_month) do nothing;
```

Planification : `select cron.schedule('generate-monthly-checkins', '0 6 1 * *', $$select public.generate_monthly_checkins()$$);`
— le 1er de chaque mois à 6h UTC.

## 4. Signal d'engagement (spec §7, indicatif — pas de table dédiée)

"2 check-ins mensuels consécutifs complétés" se calcule à la demande, pas stocké (évite une
donnée dérivée à tenir synchronisée pour un signal qui n'est explicitement pas causal) :

```sql
-- vrai si les 2 derniers monthly_checkins du user (par period_month) sont 'answered'
select bool_and(status = 'answered')
from (
  select status
  from public.monthly_checkins
  where user_id = :user_id
  order by period_month desc
  limit 2
) recent;
```

## 5. Ce qui reste volontairement hors scope

- **Notifications push** : la spec demande juste "pas de notification insistante ni
  répétée" pour la relance après réponse négative — elle n'impose pas de canal push. Ajouter
  Expo Notifications (tokens par device, credentials Apple/Google, etc.) est une brique
  d'infra à part entière que rien dans la spec ne justifie pour cette V1 : le check-in généré
  est visible **in-app** à la prochaine ouverture, point. Si un vrai besoin de rappel actif
  émerge plus tard, ce sera un increment dédié avec validation d'outil au préalable (Expo
  Push Service, gratuit, mais c'est un choix d'infra à faire valider, pas un a priori).
- **Écran de check-in côté app** : le mécanisme serveur est la partie difficile de cette
  brique (le reste est une question fermée affichée + 2 boutons) ; l'écran suit dans un futur
  increment, pas de contenu éditorial à valider ici puisque le wording de la question est déjà
  donné par la spec elle-même (§7).
- Copy exacte du "renforcement bref" et de la "relance factuelle" : non spécifiée dans le
  document fonctionnel au-delà de leur intention ("bref", "factuelle, non culpabilisante") —
  à rédiger avec le même soin que briques 1/2 le moment venu, pas de placeholder figé en dur
  dans le schéma.
