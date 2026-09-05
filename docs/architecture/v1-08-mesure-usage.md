# TraceVerte — Architecture technique V1 (increment 13 — mesure d'usage)

**Statut : acté, en production.** Décision du 05/09/2026, en réponse à l'issue #30.

---

## 1. Pourquoi pas d'outil tiers

L'issue demandait d'arbitrer entre PostHog, Plausible/Umami et un système maison, et posait
explicitement que le choix d'outil devait être validé **avant** toute instrumentation.

Le constat qui a décidé : **tous les axes de segmentation demandés étaient déjà en base.**

| Axe demandé par l'issue | Où il vit déjà |
| --- | --- |
| Zone d'habitation | `assessment_answers.zone_type` |
| Accès aux transports en commun | `assessment_answers.tc_access` |
| Poste dominant | `assessment_results.dominant_poste` |
| Cadence du plan | `profiles.cadence_type` |
| Réponses aux boucles d'engagement | `engagement_checkins.response` / `.status` |
| Compte rattaché ou anonyme | `auth.users.is_anonymous` |

Un outil tiers aurait reçu tout cela **en copie** pour permettre de le recroiser ailleurs, au
prix d'un sous-traitant supplémentaire à déclarer dans `/confidentialite`, d'un DPA, et selon
sa configuration d'une bannière de consentement — pour un produit dont la spec §0 dit qu'il est
« un projet de conviction, pas un produit de rétention à optimiser ».

Ce qui manquait réellement tenait en une douzaine d'événements : **où les gens décrochent**.
C'est le seul fait qu'aucune table n'enregistre, par construction — quelqu'un qui abandonne à
l'étape 4 du questionnaire ne laisse rien derrière lui.

## 2. La règle : on n'instrumente jamais ce que le schéma enregistre déjà

Trois événements ont été explicitement écartés, et un test pgTAP interdit de les réintroduire :

- `bilan_submit` → c'est `assessments.submitted_at` ;
- `checkin_answer` → c'est `engagement_checkins.response` ;
- `feedback_submit` → c'est la table `feedback`.

Dupliquer un fait, c'est se garantir deux chiffres qui divergeront le jour où l'un des deux
chemins échoue — et n'avoir alors aucun moyen de savoir lequel a raison.

Corollaire appliqué au même moment : `plan_action_open` avait été déclaré en prévision de
l'étape 6b, puis **retiré avant la mise en service** parce que rien ne l'émettait. Un
événement déclaré et jamais émis ne se lit pas « pas encore instrumenté », il se lit **zéro**,
c'est-à-dire comme un fait sur les utilisateurs.

## 3. Ce qui est enregistré

Onze événements, référencés dans `public.usage_event_types` (clé étrangère depuis
`usage_events.name`) et miroir dans `src/types/analytics.ts` :

`app_open` · `onboarding_step_view` · `onboarding_complete` · `bilan_step_view` ·
`resultat_view` · `resultat_share` · `connexion_view` · `connexion_success` ·
`connexion_dismiss` · `plan_view` · `suivi_view`

**Ajouter un événement impose les deux côtés** : une ligne dans le référentiel par migration,
et une entrée dans le type TS. Sans la migration, la clé étrangère rejette l'insert et
l'événement est perdu en silence ; sans le type, le code ne compile pas. Même mécanique que
`emission_factor_sources` pour les facteurs.

`connexion_view` distingue `resultat_transition` (l'interstitiel imposé en allant au plan) de
`resultat_cta` (un clic délibéré). Comparer les deux taux de conversion, c'est répondre à
« l'interstitiel mérite-t-il sa friction ? ».

`onboarding_complete` mérite une note : `profiles.onboarding_completed_at` existe dans le
schéma depuis la migration initiale mais **n'est écrit par aucun code du produit**. La fin de
l'onboarding se lit donc uniquement dans cet événement — c'est exactement le rôle de la mesure
d'usage.

## 4. Ce qui ne peut pas y entrer

`props` est le seul endroit où un client choisit ce qu'il écrit, et **chaque visiteur a une
session anonyme dès l'ouverture de l'app** (v1-04 §1) : ouvrir l'INSERT à `authenticated`, c'est
l'ouvrir à quiconque sait appeler l'API. `check_usage_event_props` borne donc l'objet à six
clés, valeurs scalaires uniquement, 48 caractères maximum. Aucun texte libre ne peut y entrer —
ce qui garde la table hors du champ de la réidentification, et donc dans le régime de mesure
d'audience que `/confidentialite` annonce.

`occurred_at` est écrasé par un trigger, pas seulement rempli par défaut : une horloge de
client se règle, et des événements antidatés fausseraient silencieusement tous les entonnoirs.

Aucune policy de lecture. Contrairement à `feedback`, rien dans le produit ne relit ces lignes :
une table qu'on ne peut pas lire depuis une clé anonyme est une table qu'on ne peut pas aspirer.

Rétention : douze mois glissants, purgés par cron (`purge_usage_events`, 3h30 UTC).

## 5. Trois défauts trouvés en construisant, tous silencieux

Aucun des trois n'aurait levé d'erreur. C'est la raison d'être de la vérification en base et
du test pgTAP, et c'est ce qu'il faut retenir de cet increment.

**5.1 — Le garde-fou de volume ne s'appliquait pas au rôle qu'il visait.**
`enforce_usage_events_rate_limit()` n'était pas `security definer` : elle s'exécutait sous le
rôle appelant. Or la table n'a aucune policy de lecture — le `select` de comptage à l'intérieur
du trigger ne voyait donc **rien** depuis `authenticated`, `found` restait faux, et le quota ne
se déclenchait jamais. Il ne fonctionnait que sous `postgres`, c'est-à-dire dans le seul rôle
où il est inutile. Une table écrite par n'importe quel visiteur restait sans plafond.

> **Règle : un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
> `security definer`.** `enforce_feedback_rate_limit` y échappe parce que `feedback` a une
> policy « select own ».

Le test l'a attrapé pour une raison précise : il remplissait le quota sous `postgres` par
commodité et ne tentait le dépassement que sous session cliente. Le test a été corrigé pour
remplir **sous session cliente**, sans quoi il testait le quota là où il ne sert à rien.

**5.2 — `revoke ... from anon, authenticated` ne révoque rien.**
PostgreSQL accorde `EXECUTE` à **PUBLIC** à la création d'une fonction, et les deux rôles en
héritent. L'ACL gardait son entrée `=X/`, et n'importe quel visiteur pouvait appeler
`/rest/v1/rpc/purge_usage_events` — donc effacer douze mois d'historique. Signalé par
l'advisor de sécurité Supabase, corrigé par `revoke ... from public, anon, authenticated`.

**5.3 — La vue de segmentation lisait des colonnes mortes.**
`profiles.zone_type` et `profiles.tc_access` existent depuis le schéma initial ; le schéma
bilan v2 (`20260824180100`) a déplacé le contexte B4 vers `assessment_answers` **sans les
retirer**, et plus rien ne les écrit. `analytics.user_segments` s'était branchée dessus : elle
segmentait 136 utilisateurs sur `NULL`, sans erreur, avec un résultat qui ressemble
exactement à celui d'un produit que personne n'utilise. Le premier filtre était en prime écrit
sur `status = 'submitted'`, valeur qui n'a jamais existé (la contrainte n'autorise que
`in_progress` et `completed`) — le filtre porte maintenant sur `submitted_at is not null`, qui
est un fait et non un mot.

> **Deux colonnes homonymes dont une morte sont un piège permanent.** `profiles.zone_type`,
> `profiles.tc_access` et `profiles.onboarding_completed_at` ont été supprimées le 05/09/2026
> (`20260905180000`) : 0 valeur non nulle sur 136 profils, aucune dépendance dans `pg_depend`,
> aucune occurrence dans le code client. Le balayage a aussi trouvé quatre autres colonnes
> entièrement nulles — **conservées**, parce qu'elles sont vivantes et simplement pas encore
> alimentées (`emission_factor_sync_runs.detail` et `notification_outbox.last_error` ne
> s'écrivent qu'en cas d'échec ; `commute_carpool_size` et `commute_distance_bracket` sont
> câblées de bout en bout, mais aucun des treize bilans de test n'a utilisé le covoiturage ni
> la tranche « je ne sais pas »). Une colonne vide n'est pas une colonne morte : ce qui la
> qualifie, c'est qu'aucun code ne l'écrit.
>
> Le test RLS `03` vérifiait jusque-là que `profiles.zone_type` restait `NULL` après l'UPDATE
> d'un tiers — une assertion qui passait pour la mauvaise raison, la colonne étant nulle pour
> tout le monde. Elle porte maintenant sur `cadence_type`, dont la valeur par défaut est
> `season` : « l'UPDATE n'a rien fait » se distingue enfin de « la colonne n'a jamais rien
> contenu ».

## 6. Lecture

Schéma `analytics`, non exposé par PostgREST, révoqué de `anon` et `authenticated` : ces vues
croisent les parcours de tous les utilisateurs, elles n'ont rien à faire derrière une clé
anonyme. Elles se lisent depuis le SQL editor ou le MCP.

- `analytics.user_segments` — une ligne par utilisateur, tous les axes de segmentation.
- `analytics.bilan_funnel` — utilisateurs distincts atteignant chaque étape du questionnaire.
- `analytics.bilan_funnel_by_segment` — le même, ventilé : la vue qui répond à « quels groupes
  traiter en premier ».
- `analytics.engagement_by_segment` — réponses aux boucles par segment. **Aucune donnée d'usage
  n'y intervient** : `engagement_checkins` suffit. C'est la démonstration la plus directe qu'un
  outil tiers n'aurait rien apporté sur cet axe.
- `analytics.daily_events` — volumétrie brute, pour voir que la mesure tourne vraiment ; même
  rôle que `emission_factor_sync_runs` pour la synchronisation des facteurs.

## 7. Non-goals

Inchangés, et cette mesure ne les entame pas : aucune comparaison entre utilisateurs, aucun
score, aucune segmentation renvoyée à l'utilisateur. Les entonnoirs servent à corriger le
produit, pas à en tirer un profil.
