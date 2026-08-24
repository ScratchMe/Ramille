# TraceVerte — Architecture technique V1 (increment 6)

**Remplace le schéma bilan de `v1-01-onboarding-bilan.md` §2-3** (tables
`assessment_trips`/`assessment_trip_modes`, formules par trajet générique). La spec
fonctionnelle a été mise à jour par l'équipe design avec un niveau de détail complet
(champs B1.1→B4.3, logique conditionnelle, formule de calcul précise) — elle fait foi et
remplace mes hypothèses initiales de increment 1, qui restent dans l'historique git mais ne
décrivent plus le schéma réel.

Réf. `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md` (v2, section Brique 2) et
`docs/design/README.md` (v2, section "2 · Bilan initial").

## 1. Pourquoi un modèle différent

La spec V1 modélise le bilan comme **3 postes fixes** (domicile-travail, loisirs, voyages),
chacun calculé à partir de champs structurés précis — pas une liste ouverte de trajets
arbitraires. Le modèle "liste de trajets" de l'increment 1 était une généralisation
raisonnable en l'absence de détail, mais plus fine que ce que le produit fait réellement :
chaque utilisateur a exactement 0 ou 1 valeur par poste, jamais plusieurs trajets du même
type. `assessment_trips`/`assessment_trip_modes` sont donc supprimées au profit d'une table
`assessment_answers` à plat, un champ par question.

## 2. `transport_modes` — réaligné sur les 9 modes B1.4/B2.2

La spec liste 9 modes sélectionnables précis, différents du référentiel à 6 catégories
d'increment 1 (pas de distinction thermique/électrique pour la voiture — seulement
solo/covoiturage ; vélo et marche désormais séparés ; métro/tram et trottinette ajoutés) :

| id | label | category (inchangée, sert au matching `action_templates`) |
|---|---|---|
| voiture | Voiture | voiture |
| bus | Bus | transports_commun |
| train | Train ou RER | train |
| metro_tram | Métro ou tram | transports_commun |
| velo | Vélo | velo_marche |
| marche | Marche | velo_marche |
| deux_roues_motorise | Deux-roues motorisé | deux_roues |
| trottinette | Trottinette ou mobilité douce | velo_marche |
| avion_court_moyen_courrier | Avion (court/moyen-courrier) | avion (jamais un choix direct — calcul voyages uniquement) |
| avion_long_courrier | Avion (long-courrier) | avion (idem) |

Le covoiturage n'a pas de facteur dédié : la division par le nombre de personnes se fait
dans la formule de calcul (§4), pas via une ligne `emission_factors` séparée — cohérent avec
la méthode d'Impact CO2 elle-même (leurs valeurs "covoiturage Npersonnes" sont exactement
`solo ÷ N`, vérifié sur les données réelles).

## 3. `assessment_answers` — un champ par question B1.1→B4.3

Table 1:1 avec `assessments`. Colonnes nommées explicitement d'après la spec (pas
d'abstraction générique) : `commute_*` (section 1), `leisure_*` (section 2), `flights_*` /
`*_long_trips_per_year` (section 3), `zone_type`/`tc_access`/`household_vehicles`
(section 4, ne rentre pas dans le calcul).

**Champs conditionnels** : nullable, remplis uniquement si leur condition d'affichage est
vraie côté UI (ex. `commute_days_per_week` null si `commute_has_regular_trip = false`). Le
schéma ne force pas la cohérence conditionnelle par des contraintes SQL complexes
(CHECK croisés) — la validation de "quel champ doit être rempli selon quelle réponse"
reste côté application, qui contrôle déjà l'affichage des étapes. La distance peut être
exacte (`commute_distance_km`) ou par tranche (`commute_distance_bracket`) selon que
l'utilisateur a répondu "je ne sais pas" (B1.3).

RLS : lecture/écriture par le propriétaire du bilan (jointure sur `assessments.user_id`),
même pattern que le reste.

## 4. `compute_assessment_results()` — traduction directe de la formule spec

Fonction SQL (`security definer`, EXECUTE accordé à `authenticated`, vérifie en interne que
`auth.uid()` correspond au propriétaire du bilan — contrairement aux fonctions de génération
planifiées, celle-ci est appelée **par le client** via RPC une fois le questionnaire soumis,
donc l'API doit rester ouverte aux utilisateurs connectés, protégée par la vérification de
propriété plutôt que par `REVOKE`).

**Constantes** (nommées dans la fonction, configurables sans migration de schéma) :

| Constante | Valeur | Usage |
|---|---|---|
| `weeks_per_year_commute` | 45 | domicile-travail |
| `weeks_per_year_standard` | 52 | loisirs |
| fréquence hebdo équivalente loisirs | 0,25 / 1 / 3 | rarement / 1×semaine / plusieurs×semaine |
| distance résiduelle loisirs si "rarement" | 15 km, mode voiture | contribution non nulle, cf. spec |
| distances voyages | 1500 / 9000 / 800 / 700 km | vol court / vol long / train longue distance / voiture longue distance |
| marge de quasi-égalité | 5 % | départage de la décision dominante |

**Poste domicile-travail** (0 si `commute_has_regular_trip = false`) :
```
distance = commute_distance_km ou milieu de tranche (commute_distance_bracket)
km_année = distance × 2 × commute_days_per_week × 45
co2 = km_année × facteur(commute_mode)
   si second mode utilisé : 50 % du km_année sur chaque mode
   si covoiturage : co2 ÷ commute_carpool_size
```

**Poste loisirs** :
```
fréquence_hebdo = 0,25 | 1 | 3 selon leisure_frequency
distance = 15 km / voiture (si "rarement") ou milieu de tranche (leisure_distance_bracket) / leisure_mode
co2 = distance × 2 × fréquence_hebdo × 52 × facteur(mode)
```

**Poste voyages** :
```
vols_courts = flights_short_per_year
vols_longs = flights_total_per_year − vols_courts
co2 = vols_courts × 1500 × facteur(avion_court)
    + vols_longs × 9000 × facteur(avion_long)
    + train_long_trips_per_year × 800 × facteur(train)
    + car_long_trips_per_year × 700 × facteur(voiture)
```

**Décision dominante** : le poste au CO2 le plus élevé. Si un autre poste est à moins de 5 %
du maximum (quasi-égalité), départage par régularité : **domicile-travail > loisirs >
voyages** — résolu entièrement côté fonction, aucun écran ni flag `user_overridden` requis
(la question ouverte de increment 1 sur le seuil d'ex-aequo est donc close : la spec a
tranché elle-même, pas besoin de la décision produit que j'avais anticipée).

**`dominant_poste_mode`** : mode principal associé, dérivé du poste dominant (mode direct
pour domicile-travail/loisirs ; sous-composante voyage la plus élevée pour "voyages").
**`dominant_poste_label`** : wording fonctionnel simple ("Trajet domicile-travail (Voiture)")
— qualité placeholder comme les increments précédents, pas la copy finale.

## 5. Impact sur `monthly_checkins` / `plan_cycles`

Les colonnes `dominant_trip_id` (FK vers `assessment_trips`) sont supprimées — la table
n'existe plus. `trip_label` (déjà un snapshot texte) suffit et vient maintenant directement
de `assessment_results.dominant_poste_label`. `generate_plan_cycles()` récupère le mode
principal via `assessment_results.dominant_poste_mode` → `transport_modes.category` pour
sélectionner les `action_templates`, au lieu de joindre `assessment_trip_modes` par part de
trajet la plus élevée — logique strictement équivalente, plus simple.

## 6. Vérifications effectuées

Testé en base avec données synthétiques (transaction annulée) : bilan complet (domicile-
travail 18km×5j×voiture, loisirs hebdo train tranche 15-30km, 2 vols dont 1 court/1 long) →
total et répartition par poste vérifiés à la main, décision dominante correcte (voyages,
vol long-courrier dominant), génération du check-in et du cycle de plan avec les bonnes
actions (catégorie "avion") en chaîne complète. `get_advisors` : uniquement les WARN déjà
connus (anonymous sign-in intentionnel, RPC `compute_assessment_results` volontairement
ouvert aux utilisateurs authentifiés).

## 7. Reste hors scope

Les 9 écrans du questionnaire (avec logique conditionnelle et barre de progression
recalculée dynamiquement) et la restitution — le schéma et le calcul sont la fondation,
l'implémentation UI suit dans un increment dédié.
