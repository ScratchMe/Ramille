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
| 2 | Synchronisation ADEME automatisée | T3, #27 | à faire |
| 3 | Expiration des check-ins périmés, regénération du plan au re-bilan, `NaN`, formulation | T5, T6, T8, §3.5 | à faire |
| 4 | Écran « Mon suivi » + re-bilan prérempli | T7, §3.2, §3.6 | à faire |
| 5 | Canal de rappel email | §3.1 | à faire |
| 6 | Actions chiffrées et sélectionnables + exploitation du contexte B4 | T9, T10, §3.3 | à faire |
| 7 | Trajectoire 2050 par paliers, suppression de compte, accessibilité | T11, T12, §3.4, #28 | à faire |

T13 (covoiturage appliqué au second mode) est corrigé au passage de l'étape 1, la fonction
étant de toute façon réécrite.

Les issues #29 (canal de feedback) et #30 (tracking d'usage) restent suivies séparément :
utiles, mais elles n'améliorent ni un chiffre ni l'accompagnement, et n'ont donc pas de place
dans cet ordonnancement.

## 5. Non-goals réaffirmés par cet audit

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
