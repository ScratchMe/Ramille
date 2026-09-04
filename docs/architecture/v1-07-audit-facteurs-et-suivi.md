# TraceVerte — Architecture technique V1 (increment 12 — audit facteurs d'émission et suivi dans la durée)

**Périmètre** : audit technique et fonctionnel de l'ensemble du produit, mené le 04/09/2026 à
la demande produit (« qu'est-ce que tu améliorerais, techniquement et fonctionnellement ? »),
avec pour grille de lecture les trois objectifs fondateurs — **provoquer une prise de
conscience**, **déclencher un changement d'habitude**, et **accompagner ce changement dans la
durée**, toujours sur un registre encourageant et jamais culpabilisant.

Ce document a deux rôles : (1) consigner les constats **vérifiés** de l'audit, pour ne pas
les redécouvrir, et (2) acter le plan d'exécution ordonné qui en découle. Les increments
suivants (`v1-08`+) documenteront chacun leur propre implémentation ; ici on fige le
diagnostic et l'ordre de traitement.

Réf. `spec-fonctionnelle-app-carbone-transport-v1.md`, `v1-01` §2-3 (facteurs d'émission),
`v1-02` (boucle d'engagement), `v1-03` (plan de réduction), `v1-05` (calcul du bilan).

---

## 1. Facteurs d'émission ADEME — trois constats, dont deux erreurs de calcul réelles

La source retenue en increment 1 (**ADEME Base Empreinte via l'API Impact CO2**) n'est pas
remise en cause : c'est la bonne source, publique, officielle et maintenue par l'ADEME
elle-même. Ce sont son exploitation et son entretien qui posent problème.

### 1.1 L'API distingue bien court / moyen / long-courrier — le seed a conclu l'inverse

`20260823130000_seed_emission_factors.sql` affirme en commentaire : « l'API n'expose qu'UN
seul facteur avion ("Avion trajet court"), pas de distinction court/moyen vs long-courrier ».
**C'est faux.** Le facteur `id=1` de `/api/v1/transport` est le seul de la liste dont la valeur
**dépend du paramètre `km`** de la requête — l'API applique elle-même le bon segment de vol.
Le seed a été construit à `km=100` uniquement, d'où la conclusion erronée.

Vérifié le 04/09/2026, endpoint `GET https://impactco2.fr/api/v1/transport?km=<km>&displayAll=1`
(répond en HTTP 200 sans clé) :

| `km` demandé | `name` renvoyé pour `id=1` | valeur ÷ km |
|---|---|---|
| 100 | Avion trajet court | 0,2242 kg/km |
| 800 | Avion trajet court | 0,2242 kg/km |
| **1 500** | **Avion trajet moyen** | **0,1843 kg/km** |
| **9 000** | **Avion trajet long** | **0,1776 kg/km** |

Tous les autres modes renvoient une valeur strictement proportionnelle à `km` (facteur
constant) — l'avion est le seul cas particulier, ce qui explique qu'il soit passé inaperçu.

**Conséquence** : `avion_long_courrier` porte aujourd'hui la valeur court-courrier (0,2242),
soit une **surestimation de 26 %** du poste le plus lourd du bilan pour les profils
« voyages » (9 000 km × 0,2242 = 2 018 kg au lieu de 1 598 kg — **+420 kg par vol
long-courrier**). Le court/moyen-courrier est lui aussi trop haut : le produit modélise ces
vols à 1 500 km (`dist_flight_short`), distance à laquelle l'ADEME retient 0,1843 et non
0,2242, soit **+22 %**.

**Décision** : les facteurs avion doivent être relevés **aux distances de référence que le
produit utilise réellement** dans son calcul (1 500 km et 9 000 km), pas à une distance
arbitraire. Cette règle vaut aussi pour le job de synchronisation (§2).

### 1.2 Le train longue distance est calculé au facteur TER — facteur 10 d'erreur

`compute_assessment_results` applique `transport_mode_id = 'train'` au poste voyages :

```sql
v_travel_train := a.train_long_trips_per_year * dist_train_long  -- 800 km
  * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'train' ...);
```

Or `'train'` porte la valeur **TER** (0,0229 kg/km), alors que la question B3.3 vise
explicitement les trajets **« >300 km »** — c'est-à-dire du TGV (0,0023) ou de l'Intercités
(0,0058). Un aller-retour longue distance est donc compté **18,3 kg au lieu de 1,8 kg**.

C'est le pire endroit possible pour se tromper : le produit veut faire percevoir que le train
est sans commune mesure avec l'avion et la voiture, et ce bug écrase précisément cet écart.
Le même mode `'train'` sert par ailleurs le libellé « Train ou RER » du bilan quotidien
(B1.4), où le TER est un choix défendable — les deux usages doivent être séparés.

**Décision** : introduire un mode dédié au poste voyages (référence **TGV**, mode
majoritaire des trajets >300 km en France), et laisser le mode quotidien `'train'` sur TER.
Aucun changement de question côté utilisateur.

### 1.3 Aucune synchronisation : les facteurs sont figés depuis le seed

État réel de `public.emission_factors` sur `TraceVerte-v1` au 04/09/2026 : **une seule
version par mode**, `valid_from = 2026-08-24` (sauf les deux moteurs voiture ajoutés le
04/09). `cron.job` ne contient que `generate-plan-cycles`, `purge-stale-anonymous-accounts`,
`generate-commute-checkins` et `generate-extras-checkins` — **aucun job de facteurs**.

Le mécanisme de mise à jour trimestrielle décrit dès `v1-01` §2 n'a jamais été construit
(suivi par l'issue #27). Le schéma est prêt (`unique(transport_mode_id, valid_from)`,
versionnement par date), il n'est simplement jamais alimenté.

**Construit à l'étape 2** (migration `20260904160000`), avec trois écarts assumés par rapport
à ce que `v1-01` §2 anticipait :

- **SQL pur, pas d'Edge Function.** `v1-01` supposait qu'un appel HTTP imposait de sortir de
  Postgres. L'extension `http` (synchrone) rend l'Edge Function inutile : pas de secret à
  partager entre le cron et la fonction, pas de déploiement séparé, et le même modèle que
  tous les autres mécanismes serveur du produit (`v1-02` §3). Trois requêtes par trimestre
  vers une API publique ne justifient pas une brique de plus.
- **Le mapping vit en table** (`emission_factor_sources`), pas en dur dans la fonction :
  ajouter un mode au produit ne doit pas demander de réécrire la synchronisation. Sa colonne
  `reference_km` porte la règle du §1.1 — les deux modes avion sont relevés à 1500 et 9000 km,
  tous les autres à une distance neutre.
- **Un journal** (`emission_factor_sync_runs`) et **un garde-fou**. Le journal parce qu'une
  synchronisation qui ne tourne pas est autrement indétectable — c'est très exactement ce qui
  s'est passé ici. Le garde-fou parce qu'un écart de plus de 50 % s'explique bien plus
  probablement par une rupture côté API (renumérotation d'id, changement d'unité) que par une
  révision de la Base Empreinte : une telle valeur est **signalée pour relecture humaine, pas
  appliquée**. Appliquer aveuglément fausserait le bilan de tous les utilisateurs sans que
  personne ne s'en aperçoive, sur le seul chiffre dont dépend la crédibilité du produit.

Auto-vérification à la mise en service : la première exécution réelle contre l'API a relevé
les 13 modes et trouvé **zéro écart** avec les valeurs en place — ce qui valide d'un coup le
mapping des identifiants Impact CO2 et la règle des distances de référence.

### 1.4 Piège à corriger **avant** d'activer la synchronisation

Les huit lookups de facteur de `compute_assessment_results` sont écrits ainsi :

```sql
(select kg_co2_per_km from public.emission_factors
 where transport_mode_id = ... order by valid_from desc limit 1)
```

C'est-à-dire **toujours le facteur le plus récent**, jamais « le facteur en vigueur à la date
du bilan » que `v1-01` §3 promet explicitement (« un ancien bilan reste calculé avec les
facteurs en vigueur à sa date »). Tant qu'il n'existe qu'une version par mode, le bug est
invisible. Le jour où le job de synchronisation tourne, tout recalcul d'un ancien bilan
dérive silencieusement, et la promesse de reproductibilité tombe.

**Décision** : ajouter `and valid_from <= <date du bilan>` à tous les lookups **avant** la mise
en place du job, jamais après. *Fait à l'étape 1* : les huit sous-requêtes sont remplacées par
`public.emission_factor(mode, date)`, qui porte la borne en un seul endroit — la fonction de
calcul étant de toute façon réécrite, il aurait été absurde de repasser sur les huit
occurrences une seconde fois à l'étape 2.

---

## 2. Défauts techniques vérifiés

Classés par gravité. Tous constatés dans le code ou en base, pas déduits.

| # | Constat | Où | Gravité |
|---|---|---|---|
| T1 | Facteur avion long-courrier = court-courrier (§1.1) | `emission_factors` | **Chiffre faux** |
| T2 | Poste voyages en train calculé au TER (§1.2) | `compute_assessment_results` | **Chiffre faux** |
| T3 | Facteurs jamais rafraîchis (§1.3) | absence de job | **Chiffre qui vieillit** |
| T4 | Lookup de facteur non borné à la date du bilan (§1.4) | `compute_assessment_results` | Latent |
| T5 | Les check-ins `pending` s'accumulent sans expiration | `plan/index.tsx:84` + crons | **Ton du produit** |
| T6 | Refaire son bilan ne met pas à jour le plan | `generate_plan_cycle_for_user` | **Cœur produit** |
| T7 | « Modifier mes réponses » repart d'un questionnaire vide | `bilan/resultat.tsx` → `bilan/index.tsx` | Friction |
| T8 | Division par zéro → `NaN %` affiché | `bilan/resultat.tsx:179` | **Écran cassé** |
| T9 | Section B4 collectée et jamais utilisée | `assessment_answers`, `profiles` | Friction inutile |
| T10 | `target_reduction_pct` (le cap −20 %) n'est lu par aucun écran | `plan/index.tsx` | Fonctionnalité morte |
| T11 | Zéro attribut d'accessibilité dans tout `src/` | tous les `Pressable` | Exclusion |
| T12 | Pas de suppression de compte ni d'export | — | **Bloqueur Play Store** |
| T13 | Division covoiturage appliquée aussi à la jambe du second mode | `compute_assessment_results` | Mineur |

**T5 — détail.** `plan/index.tsx` lit `.eq('status','pending')` sans filtre de période ni
limite, et `generate_commute_checkins()` crée une ligne par semaine indéfiniment pour tout
utilisateur ayant un bilan complété. Un utilisateur qui revient après huit semaines voit donc
**huit cartes identiques** posant la même question. Un mur de devoirs non faits : exactement
le registre que la spec §2 et §7 cherchent à éviter.

**T6 — détail.** `on conflict (user_id, period_start) do nothing` : si quelqu'un refait son
bilan après avoir changé de mode de transport, son plan reste ancré sur l'ancien poste
dominant et l'ancienne baseline **jusqu'à trois mois** (durée de la saison). C'est le
changement — la raison d'être du produit — qui n'est pas reflété.

**T8 — détail.** `dominant_poste_co2_kg_year / total_co2_kg_year` avec un total à 0 :
atteignable par un profil 100 % vélo/marche sans avion ni trajet longue distance. La personne
qui fait déjà tout bien tombe sur un écran cassé — le plus mauvais accueil possible pour le
profil que le produit devrait féliciter.

**T9 — détail.** `zone_type`, `tc_access` et `household_vehicles` n'apparaissent nulle part
ailleurs que dans l'insert du questionnaire (recherche exhaustive sur `src/`), et les colonnes
`profiles.zone_type` / `profiles.tc_access` ne sont **jamais écrites**. Trois questions de
friction pour zéro valeur produit — alors que la spec §5 les justifie explicitement par
« éviter de traiter un profil rural sans alternative comme un mauvais élève ». C'est le
levier anti-culpabilisation le mieux identifié du produit, et il est inerte.

---

## 3. Écarts fonctionnels — la partie « durée » n'existe pratiquement pas

Les briques 1 et 2 (onboarding, bilan) sont au niveau de soin que la spec §3 demande. Le
diagnostic porte sur ce qui vient après le premier résultat.

### 3.1 Aucun canal de retour (bloquant pour l'objectif d'accompagnement)

`pg_cron` génère fidèlement un check-in chaque lundi et chaque 1er du mois… que personne ne
verra tant que l'utilisateur n'ouvre pas l'app de lui-même. `v1-02` §5 assume ce choix
(« visible in-app à la prochaine ouverture, point »), défendable pour poser le socle.

Mais avec un horizon 2050 et un objectif explicite d'accompagnement dans la durée, **une
boucle d'engagement sans mécanisme de rappel est une boucle théorique**. Le non-goal de la
spec §7 vise la *relance insistante et répétée après une réponse négative* — pas l'existence
d'un rappel périodique. Un email mensuel n'entre pas en conflit avec lui.

**Décision** : construire un canal de rappel, en commençant par l'email (l'adresse existe déjà
pour les comptes rattachés, coût d'infra quasi nul), le push Expo restant un increment
ultérieur. Opt-out explicite, une fréquence alignée sur celle du check-in, jamais plus.

**Construit à l'étape 5** (migration `20260904200000`), en SQL pur comme la synchronisation
ADEME :

- **Une boîte d'envoi** (`notification_outbox`) plutôt qu'un envoi direct depuis la
  génération. Elle sépare « qui doit être prévenu » — décision produit, testable — de
  « l'email est parti » — appel réseau, faillible. Un fournisseur indisponible ne fait perdre
  aucun rappel.
- **La garantie anti-relance est structurelle** : `unique(checkin_id)` sur la boîte d'envoi.
  Un check-in ne peut donner lieu qu'à **un seul** email, quel que soit le nombre de passages
  du cron. Ce n'est pas une précaution applicative qu'on pourrait contourner par erreur, c'est
  une contrainte de la base. Le non-goal de la spec §7 vise la relance insistante après une
  réponse négative, pas l'existence d'un rappel périodique.
- **Quatre conditions d'éligibilité**, toutes nécessaires : compte rattaché (une session
  anonyme n'a pas d'adresse), email **confirmé** (on n'écrit jamais à une adresse simplement
  déclarée), rappels non désactivés, et check-in encore en attente.
- **Opt-out, pas opt-in** : le rappel n'est pas une promotion, c'est le mécanisme même de la
  brique 4, et quelqu'un qui rattache son compte demande précisément à ce que son suivi lui
  survive. Désactivable en un geste depuis l'écran de suivi.

### Ce qui manque pour que le premier email parte

L'envoi ne peut pas être terminé sans une décision et deux actions de compte, hors du code :

1. **choisir un fournisseur d'envoi** — `send_pending_reminders()` est écrite pour l'API
   Resend (`POST /emails`), choix provisoire volontairement isolé dans cette seule fonction ;
2. **vérifier un domaine d'envoi** côté fournisseur, sans quoi il refuse d'écrire à des
   adresses arbitraires ;
3. **déposer deux secrets dans Vault** : `resend_api_key` et `reminder_from_address`.

Tant que ces secrets sont absents, `send_pending_reminders()` **ne fait rien** : les rappels
restent en attente, aucun n'est perdu, aucune tentative n'est consommée (comportement testé).
C'est l'état du projet aujourd'hui. Le reste du pipeline — éligibilité, mise en file,
anti-relance, réglage utilisateur — est construit et vérifié.

Le push Expo reste hors scope : `v1-02` §5 le décrit comme une brique d'infra à part entière
(tokens par device, credentials Google Play), et l'email couvre le besoin sans rien de tout ça.

### 3.2 Rien ne s'accumule, donc rien ne se voit

On répond au check-in, la carte disparaît, il ne reste rien. Le « signal d'engagement : 2
check-ins consécutifs » de la spec §7 n'est calculé nulle part. Aucun écran ne montre
l'historique des bilans, alors que `assessments` supporte explicitement plusieurs bilans dans
le temps et que `engagement_checkins` conserve toutes les réponses.

**Décision** : un écran « Mon suivi » — historique des check-ins, historique des bilans,
évolution de l'empreinte. C'est de la lecture de données déjà présentes, pas une nouvelle
brique de schéma. Strictement **soi vs son propre historique**, jamais vs d'autres
utilisateurs : conforme au non-goal ferme de la spec §2, et à la révision du 04/09/2026
(`v1-06` §1) qui rouvre les mécaniques de progression **non comparatives**.

Corollaire : **proposer un re-bilan périodique (~6 mois), prérempli**. « Ton empreinte est
passée de 3,1 à 2,7 t » est le moment de renforcement le plus fort que ce produit puisse
offrir, et il est aujourd'hui inatteignable (T7).

**Construit à l'étape 4.** L'écran `/suivi` montre l'évolution de l'empreinte bilan après
bilan, l'écart avec le précédent, et les check-ins auxquels la personne a répondu. Deux règles
de fond y sont tenues :

- **Aucune mécanique d'échec.** Pas de streak, pas de série cassée, pas de score. Une période
  sans réponse n'apparaît pas comme un manquement — elle n'apparaît pas du tout (les check-ins
  non répondus sont clos en `expired` par l'étape 3 et jamais relus ici). Ce qui est compté,
  ce sont les fois où la personne a répondu, pas celles où elle a laissé passer. La révision du
  04/09/2026 (`v1-06` §1) rouvre les mécaniques de progression **non comparatives** ; elle ne
  rouvre pas les mécaniques punitives.
- **Une hausse n'est jamais une faute.** `variationNote()` dit le fait et ajoute « une année
  n'est pas l'autre » : un bilan qui monte peut venir d'un déménagement, d'un changement de
  travail ou d'un voyage familial.

Le questionnaire se préremplit désormais depuis le dernier bilan complété (priorité :
brouillon local > dernier bilan > vide), avec un bandeau qui le dit. Au passage, « Modifier
mes réponses » devient « Refaire mon bilan » : le libellé promettait une édition alors que le
questionnaire insère toujours un nouveau bilan. L'historique ne garde qu'un point par jour —
corriger une réponse juste après avoir soumis créait sinon deux barres à la même date, ce qui
se lit comme un bug plutôt que comme une correction.

Le check-in quantitatif (§3.6) reste à instruire : il n'est pas dans cette étape.

### 3.3 Le plan de réduction est décoratif

Trois manques, par ordre d'impact :

1. **Actions non chiffrées.** « Passe 30 % de tes trajets au train » ne dit rien. « 1 trajet
   sur 5 en train = **−180 kg/an**, soit −8 % de ton empreinte » est actionnable. Toutes les
   données nécessaires sont déjà en base (`baseline_co2_kg_year`, `dominant_poste_mode`,
   `emission_factors`) : c'est un calcul, pas une brique.
2. **Aucun engagement possible.** Le plan est en lecture seule. Permettre de *choisir* une
   action et d'y attacher une intention d'implémentation (« le mardi et le jeudi ») est le
   levier comportemental le mieux établi, pour le coût d'une table.
3. **Le cap n'est pas affiché** (T10).

Ces trois points restent dans l'esprit « fonctionnel simple » de la spec §3 : aucune mécanique
de sous-objectifs, aucun plan mois par mois.

### 3.4 La trajectoire 2050 doit être progressive, pas frontale

Aujourd'hui la restitution affiche une barre statique à 0,5 t face à 2,9 t. Présenté brut, un
écart ×6 décourage — précisément l'effet que la spec §4 cherche à éviter (« l'écart à 2050 est
abstrait et lointain, et le registre anxiogène tend à paralyser plutôt qu'à mobiliser »).

**Décision** : décliner la trajectoire en **paliers atteignables** (« ton palier de cette
année »), qui transforment un gouffre en marche franchissable. Traité avec l'issue #28.

Au passage : `FRANCE_AVERAGE_TRANSPORT_T = 2.9` et `TARGET_2050_TRANSPORT_T = 0.5`
(`bilan/resultat.tsx`) sont des placeholders codés en dur, marqués « à confirmer ». Ce sont
les deux repères sur lesquels repose tout le message de la restitution : à sourcer avant mise
en production.

### 3.5 Deux points de ton

- « **Tu es à 150 % de la moyenne française** » (`bilan/resultat.tsx:180`) est un jugement
  déguisé en fait. À reformuler, et à ne pas afficher du tout pour les profils structurellement
  captifs (rural, TC inexistants) une fois le contexte B4 exploité (T9).
- **2,9 t reste abstrait.** Des équivalences concrètes rendent le chiffre saisissable — l'API
  Impact CO2 expose un endpoint dédié à cet usage.

### 3.6 Piste retenue : rendre le check-in quantitatif

« Combien de fois ? » (0 / 1-2 / 3+) coûte exactement le même geste que « oui/non », et permet
de recalculer une empreinte **vivante** entre deux bilans — sans GPS, sans trahir le non-goal
du tracking passif (spec §2), et sans auto-évaluation floue (spec §7 exige un fait précis :
un décompte en est un). À instruire au moment de l'étape 4.

---

## 4. Plan d'exécution ordonné

L'ordre suit une règle simple : **d'abord ne plus afficher de chiffres faux**, ensuite réparer
la boucle existante, ensuite seulement construire ce qui manque.

| Étape | Contenu | Traite | Statut |
|---|---|---|---|
| 1 | Facteurs avion long-courrier et train longue distance | T1, T2, T4, T13 | **fait** — migration `20260904140000` |
| 2 | Synchronisation ADEME automatisée | T3, #27 | **fait** — migration `20260904160000` |
| 3 | Expiration des check-ins périmés, regénération du plan au re-bilan, `NaN`, formulation | T5, T6, T8, §3.5 | **fait** — migration `20260904180000` |
| 4 | Écran « Mon suivi » + re-bilan prérempli | T7, §3.2 | **fait** — `src/app/suivi.tsx`, `src/types/suivi.ts` |
| 5 | Canal de rappel email | §3.1 | **fait** — migration `20260904200000` (envoi en attente d'un fournisseur, cf. §3.1) |
| 6 | Actions chiffrées et sélectionnables + exploitation du contexte B4 | T9, T10, §3.3 | à faire |
| 7 | Trajectoire 2050 par paliers, suppression de compte, accessibilité | T11, T12, §3.4, #28 | à faire |

T13 (covoiturage appliqué au second mode) est corrigé au passage de l'étape 1, la fonction
étant de toute façon réécrite.

Les issues #29 (canal de feedback) et #30 (tracking d'usage) restent suivies séparément :
utiles, mais elles n'améliorent ni un chiffre ni l'accompagnement, et n'ont donc pas de place
dans cet ordonnancement.

## 5. Advisors Supabase — triage du 04/09/2026

Relus sur les deux catégories à la demande produit. Consigné ici pour ne pas re-trier les
mêmes lignes à chaque passage : ce qui reste remonté est **connu et voulu**, sauf la dernière
ligne.

### Corrigé

- `function_search_path_mutable` sur `resolve_car_mode` → `search_path` explicite (migration
  `20260904160000`). Plus remonté.

### Volontaire — ne pas « corriger »

| Signalement | Pourquoi c'est voulu |
|---|---|
| `auth_allow_anonymous_sign_ins` sur `assessments`, `assessment_answers`, `assessment_results`, `engagement_checkins`, `plan_cycles`, `plan_actions`, `profiles` (WARN ×7) | C'est le modèle d'authentification du produit, pas un trou : chaque visiteur reçoit une session anonyme dès l'ouverture (`v1-04` §1) et son bilan vit sous les mêmes policies owner-scoped que n'importe quel compte. Les policies sont toutes en `user_id = auth.uid()` — un utilisateur anonyme ne voit que ses propres lignes. L'advisor signale le motif, pas une fuite. |
| `authenticated_security_definer_function_executable` sur `compute_assessment_results` (WARN) | Volontaire et documenté (`v1-05` §4) : ce RPC est appelé par le client après soumission du questionnaire, donc il doit rester ouvert à `authenticated`. La protection est la vérification de propriété du bilan **dans** la fonction, pas un REVOKE. Le calcul lui-même vit dans `recompute_assessment_results`, elle bien révoquée. |
| `rls_enabled_no_policy` sur `emission_factor_sync_runs` (INFO) | C'est l'objectif : RLS active **sans** policy = rien n'est lisible côté client. Journal d'exploitation, pas une donnée produit. |
| `auth_allow_anonymous_sign_ins` sur `cron.job` / `cron.job_run_details` (WARN ×2) | Schéma de Supabase lui-même, sa policy restreint déjà au propriétaire du job. Pas à nous. |
| `unindexed_foreign_keys` sur `assessment_answers.commute_mode` / `.commute_second_mode` / `.leisure_mode` et `assessment_results.dominant_poste_mode` (INFO ×4) | Les quatre pointent vers `transport_modes`. **Aucune requête du produit ne filtre ni ne joint sur ces colonnes** — les libellés se lisent par clé primaire de `transport_modes`. La table référencée est un référentiel de 13 lignes qui ne bouge qu'en migration. Quatre index de plus coûteraient à chaque insertion de bilan pour un gain de lecture nul : on ne les crée pas. À revoir si un écran vient un jour filtrer les bilans par mode. |
| `unused_index` sur `plan_actions_action_template_id_idx` (INFO) | « Jamais utilisé » sur une base qui compte une douzaine de bilans de test ne veut rien dire. Cet index couvre la jointure `plan_actions → action_templates` que l'écran `/plan` traverse à chaque affichage. Conservé. |

### Écarté pour cette V1

`auth_leaked_password_protection` (WARN) : la vérification des mots de passe compromis contre
HaveIBeenPwned est désactivée. Pertinente sur le principe — le produit propose bien une
connexion email + mot de passe (`v1-04` §2) — mais **réservée au plan payant Supabase**.
Décision produit du 04/09/2026 : on ne la prend pas pour cette V1. Cet advisor continuera donc
à remonter, c'est attendu ; à réévaluer le jour où le projet passe sur un plan payant pour
d'autres raisons.

Aucun autre signalement ne demande d'action à ce jour.

## 6. Non-goals réaffirmés par cet audit

Rien dans ce plan ne rouvre les non-goals de la spec §2 :

- **Aucune comparaison ni classement entre utilisateurs.** L'écran « Mon suivi » (§3.2) est
  strictement soi vs son propre historique. Le repère « moyenne française » qui existe déjà
  est une statistique nationale, pas un autre utilisateur.
- **Aucun tracking GPS ou passif.** Le check-in quantitatif (§3.6) reste déclaratif et ancré
  sur un moment de décision conscient.
- **Aucun streak, point ni badge.** La progression proposée est une mesure (kg, tonnes,
  paliers), pas une récompense extrinsèque ; un palier manqué ne casse rien et ne s'affiche
  pas comme un échec.
- **Aucune preuve causale d'impact.** Les chiffres d'évolution sont présentés comme une
  estimation déclarative, jamais comme une mesure d'impact prouvée.
