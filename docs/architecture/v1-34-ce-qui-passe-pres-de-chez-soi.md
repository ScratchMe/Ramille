# v1-34 — Ce qui passe près de chez soi : la zone, le métro, le tram et le RER

> **Page de décision, écrite le 02/10/2026** à la demande de la personne qui pilote : « grouper le
> sujet de l'aide à la question de la zone avec le sujet du RER ». Aucune ligne de code n'est
> écrite. Le chantier commence quand les décisions du §5 sont rendues ; elles se consignent au §8.
> Chaque chiffre de cette page a été relevé le 02/10/2026, en base de production ou dans le code, et
> la source est donnée à côté.

## 1. D'où ça vient

Deux fils que la même cause relie.

- **L'aide sous la zone** (`v1-33` D4, tranchée le 02/10/2026). La ligne d'aide a été alignée sur ce
  que le plan fait de la réponse : « Urbain dense : une grande ville et sa proche banlieue, là où
  passent métro ou tram. » Le coût accepté le même jour : une banlieue sans métro ni tram qui choisit
  « Périurbain » perd aussi l'action des sorties en transports en commun. Le commentaire du code le
  dit sans détour (`src/components/bilan/champs-de-contexte.tsx`) : « La vraie correction serait une
  question à part sur le métro et le tram — une migration, pas une phrase. »
- **Le RER** (`v1-27` §12.16, 21/09/2026). Le RER n'est jamais proposé comme action, faute de savoir
  où l'on habite ; l'action « Passer deux trajets sur cinq en train » est chiffrée au tarif du TER.
  La condition de réouverture écrite : « une question de région, ou n'importe quelle réponse qui
  distingue l'Île-de-France ».

**La cause commune** : le plan décide quels transports en commun sont plausibles à partir d'un
classement (la zone) et d'un jugement (l'accès « bon, limité, inexistant »), jamais à partir de ce
qui passe réellement près de chez la personne.

## 2. Ce que les deux réponses décident aujourd'hui

| Ce qui les lit | `zone_type` (« Dans quel type de zone vis-tu ? ») | `tc_access` (« Comment sont les transports en commun près de chez toi ? ») |
|---|---|---|
| **Les actions du plan** (`estimate_action_savings`) | « Passer deux trajets sur cinq en métro ou en tram » et « Prendre les transports en commun pour deux sorties sur cinq » ne sont proposées qu'en `urbain_dense` | Les trois actions de transport en commun — les deux précédentes et « Passer deux trajets sur cinq en train » — sont écartées sur `inexistant`, et seulement sur cette valeur |
| **La moyenne française à la restitution** (`recompute_assessment_results`, `mobility_constrained`) | Rural **et** accès limité : la personne est comptée comme contrainte, et la barre de la moyenne ne se montre pas | Accès `inexistant` : contrainte, quelle que soit la zone |
| **La phrase du plan** (`motsDuContexte`, `src/types/plan.ts`) | « zone urbaine dense »… | « bon accès aux transports en commun »… |
| **Les segments de la mesure** | `analytics.user_segments`, et les quatre vues qui groupent par segment : `bilan_funnel_by_segment`, `engagement_by_segment`, `engagement_action_by_segment`, `checkins_consecutifs` | Les mêmes cinq vues |

Les deux actions de métro ou tram substituent le facteur `metro_tram` ; celle du train substitue
`train`, qui vaut aujourd'hui le facteur du TER.

**En production, le 02/10/2026** : douze bilans complétés, sept en « Périurbain » avec un accès
limité, cinq en « Urbain dense » avec un bon accès.

## 3. Trois défauts

1. **La zone décide à la place de la personne.** Une ville moyenne desservie par un tram se range,
   d'après l'aide, en « Périurbain », et perd l'action du métro ou du tram. Une proche banlieue sans
   métro qui se range en « Urbain dense » se voit proposer un métro qu'elle n'a pas. Et celle qui se
   range en « Périurbain » perd l'action des sorties : c'est le coût accepté le 02/10/2026.
2. **Le RER n'est jamais proposé, et le train est chiffré au TER.** Le facteur du TER vaut
   0,02769 kg par km, celui de « RER ou Transilien » 0,00978, soit 2,83 fois moins
   (`public.emission_factor`). Sur le profil de référence de `v1-21` §3.1 (20 km, cinq jours,
   45 semaines, voiture thermique), « deux trajets sur cinq en train » annonce **412,4 kg/an** au
   tarif du TER, là où le RER en donnerait **476,9** : 64,5 kg/an de moins, en Île-de-France, là où
   il y a le plus de monde à convaincre.
3. **« Bon, limité, inexistant » est un jugement, pas un fait.** La réponse ne dit pas quel
   transport passe : elle n'écarte des actions que sur « inexistant », et laisse l'action du train à
   qui a répondu « limité » parce qu'il ne passe qu'un car deux fois par jour.

## 4. La recommandation

**Remplacer la question de l'accès par une question factuelle, et décider les actions de transport
sur ce qui passe plutôt que sur la zone.** Même nombre de questions dans le questionnaire.

> **Près de chez toi, qu'est-ce que tu pourrais prendre ?**
> *Coche tout ce qui passe assez souvent pour t'en servir.*
>
> [ Métro ou tram ]  [ RER ou Transilien ]  [ Train (TER, Intercités) ]  [ Bus ]  [ Rien de tout ça ]

« Rien de tout ça » exclut les autres réponses. Ce que chaque réponse ouvre :

| Coché | Ce que le plan peut proposer |
|---|---|
| Métro ou tram | « Passer deux trajets sur cinq en métro ou en tram » ; « Prendre les transports en commun pour deux sorties sur cinq », chiffrée au métro ou tram |
| RER ou Transilien | **Une action neuve**, « Passer deux trajets sur cinq en RER », chiffrée au facteur du RER (D3) ; l'action des sorties, chiffrée au RER si le métro ou le tram n'est pas coché |
| Train (TER, Intercités) | « Passer deux trajets sur cinq en train », chiffrée au TER comme aujourd'hui |
| Bus | Rien : un bus ne gagne que 14 % sur une voiture aux facteurs ACV, et aucune action ne le propose (`PLAN.md` §1) |
| Rien de tout ça | Rien |

**La zone ne décide plus aucune action.** Elle garde la phrase du plan, les segments de la mesure et
sa part dans la moyenne française. **L'accès n'est plus demandé : il se déduit** (D5), ce qui garde
intactes la moyenne française, la phrase du plan et les cinq vues de la mesure.

## 5. Les décisions à rendre

Chacune dans la forme habituelle : le fait, ce qui est en jeu, la recommandation, et ce qu'on casse
si on se trompe.

### D1 — Remplacer la question de l'accès, plutôt qu'en ajouter une

- **Le fait.** La question de l'accès ne décide qu'une chose dans le plan : écarter les transports en
  commun sur « inexistant ». La question factuelle le fait aussi (« Rien de tout ça »), et mieux.
- **Ce qui est en jeu.** La longueur du questionnaire, qui se remplit en 2,1 minutes en médiane
  (douze bilans mesurés le 02/10/2026).
- **Recommandation.** Remplacer.
- **Ce qu'on casse si on se trompe.** En ajoutant, chaque personne répond à une question de plus
  pour trois actions, et les deux questions se contredisent dès que quelqu'un coche « Métro ou
  tram » après avoir répondu « Accès limité ».

### D2 — Le texte de la question et ses cinq réponses

- **Le fait.** La question proposée au §4. « RER ou Transilien » est déjà le libellé du mode dans le
  questionnaire depuis C4.4 (`transport_modes`, `train_rer`) : les mêmes mots aux deux endroits.
- **Ce qui est en jeu.** La fréquence. Un village desservi par deux TER par jour a une gare, mais ne
  peut pas faire deux trajets sur cinq en train.
- **Recommandation.** La ligne d'aide « Coche tout ce qui passe assez souvent pour t'en servir » :
  c'est la personne qui juge, comme elle juge aujourd'hui entre « bon » et « limité ».
- **Ce qu'on casse si on se trompe.** Sans la ligne d'aide, on propose le train à qui a une gare et
  pas de train utile : le défaut que C3.8 a fermé (« le plan ne propose plus l'impossible »).

### D3 — Une action RER à part entière, à la place de l'action train

- **Le fait.** La question d'un point de suivi est figée à la génération : « {jours}, as-tu fait ce
  trajet en train ? ». Le mot de la veille aussi : « Demain, tu as prévu de faire ton trajet en
  train. »
- **Ce qui est en jeu.** Un Francilien qui s'engage à prendre le RER doit s'entendre demander s'il
  a pris le RER, et voir le gain du RER.
- **Recommandation.** Une action « Passer deux trajets sur cinq en RER », avec sa question, son mot
  de la veille et son premier pas. **Quand « RER ou Transilien » est coché, elle prend la place de
  l'action train** au lieu de s'y ajouter.
- **Ce qu'on casse si on se trompe.** Avec les deux à la fois, la même personne voit deux
  substitutions du même trajet dans ses pistes. Avec une seule action train chiffrée selon la
  réponse, le point de suivi demande « en train » à quelqu'un qui prend le RER.

### D4 — Les bilans déjà faits

- **Le fait.** Aucun des douze bilans de production n'aura la nouvelle réponse. La règle du plan est
  qu'une condition qu'on ne peut pas évaluer n'est pas remplie (`PLAN.md` §1, C3.8).
- **Ce qui est en jeu.** Le plan des personnes qui ont déjà un bilan.
- **Recommandation.** Garder la règle d'avant (zone et accès) tant que la nouvelle réponse manque.
  L'écran « Contexte » (`/contexte`) pose la nouvelle question, et y répondre fait passer à la
  nouvelle règle ; le bilan suivant la pose aussi.
- **Ce qu'on casse si on se trompe.** En appliquant la nouvelle règle sans réponse, les actions de
  métro, de tram et de train disparaissent du plan des douze personnes à sa prochaine génération,
  sans qu'elles aient rien changé.

### D5 — L'accès se déduit de la nouvelle réponse

- **Le fait.** L'accès sert aussi à la moyenne française (la barre se cache pour une personne
  contrainte), à la phrase du plan et à cinq vues de la mesure.
- **Ce qui est en jeu.** Garder ces trois usages sans les réécrire, ni changer qui voit la moyenne.
- **Recommandation.** Déduire l'accès ainsi :
  - « Rien de tout ça » → inexistant ;
  - bus ou train, sans métro, tram ni RER → limité ;
  - métro, tram ou RER → bon.

  La règle de la moyenne ne change pas (inexistant, ou rural et limité) : une personne en zone
  rurale qui n'a que le bus ou le train reste comptée comme contrainte, comme aujourd'hui avec
  « limité ».
- **Ce qu'on casse si on se trompe.** Avec « train » compté comme un bon accès, une personne en zone
  rurale qui a une gare cesse d'être comptée comme contrainte, et voit la moyenne française là où
  elle ne la voit pas aujourd'hui.

### D6 — L'aide sous la zone redevient une définition

- **Le fait.** La clause « là où passent métro ou tram » n'existe que parce que la zone décide du
  métro et du tram.
- **Ce qui est en jeu.** Une phrase lue par chaque personne qui répond.
- **Recommandation.** « Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa
  couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne. »
- **Ce qu'on casse si on se trompe.** En gardant la clause, on demande aux gens de se classer selon
  le métro alors que le métro ne se décide plus là. Les deux questions diraient la même chose, en
  se contredisant au premier écart.

### D7 — Le moment : avant le premier build de production

- **Le fait.** Le dernier build Android date du 14/09/2026 : un APK de test interne, dont le fichier
  a expiré le 28/09. Aucun build de production n'a encore été fait, et le compte Play n'existe pas
  encore. Le questionnaire part avec le build.
- **Ce qui est en jeu.** Ce que les testeurs du test fermé verront.
- **Recommandation.** Faire le chantier maintenant, en parallèle de la création du compte Play, et
  construire le premier build de production après lui.
- **Ce qu'on casse si on se trompe.** Après le build, il en faudrait un second en plein test :
  deux versions du questionnaire chez les testeurs, et des retours qu'on ne sait plus rattacher.
  Avant, le build attend le temps du chantier.

### D8 — Pas de canvas de design

- **Le fait.** Les puces à cocher existent déjà : ce sont celles des jours d'une intention, sur le
  plan (`src/components/plan/action-commitment.tsx`), avec le rôle `checkbox` que portent
  `src/components/bilan/chip.tsx` et `src/components/bilan/groupe-de-choix.tsx`. Ce serait en
  revanche le premier choix multiple du questionnaire, et le premier avec une réponse exclusive.
- **Ce qui est en jeu.** Le temps d'une session de design contre le risque d'une étape maladroite.
- **Recommandation.** Pas de canvas Claude Design. Une capture de l'étape, au navigateur, soumise à
  la personne qui pilote avant la fusion ; Claude Design si elle ne convainc pas.
- **Ce qu'on casse si on se trompe.** Sans canvas, une étape qui se lit mal sur un petit écran
  n'apparaît qu'à la capture, et coûte un aller-retour de plus.

## 6. Ce que le chantier touchera

**Un relevé indicatif, à refaire au lancement du chantier** : la règle d'une vague (`CLAUDE.md`)
vaut pour une PR seule.

- **La base** : une colonne de `assessment_answers` pour la nouvelle réponse, avec son `check` ; la
  déduction de `tc_access` ; une ligne neuve dans `action_templates` (l'action RER, sa question, son
  mot de la veille, son premier pas) ; les conditions des trois actions de transport en commun ;
  `estimate_action_savings` et `mettre_a_jour_le_contexte`. `recompute_assessment_results` ne change
  pas si l'accès est déduit avant qu'il le lise.
- **Le client** : `src/types/bilan.ts` (la réponse, ce qui manque, la normalisation),
  `src/components/bilan/champs-de-contexte.tsx` (la question et l'aide de la zone),
  `src/types/contexte.ts` et `src/lib/contexte.ts` (l'écran « Contexte »), `src/lib/bilan-history.ts`
  (le préremplissage d'un nouveau bilan), `src/lib/database.types.ts`, et la ligne du miroir dans
  `scripts/verifier-miroirs-de-check.mjs`.
- **Les tests** : pgTAP (les filtres du plan, l'action neuve et sa boucle), Jest, et le parcours
  réel, dont les trois profils passent par l'étape du contexte.
- **La documentation** : `BILAN.md`, `PLAN.md` §1, `BOUCLE.md`, et la fermeture de `v1-27` §12.16.

## 7. Ce que la page ne décide pas

- **Une action en bus** : le calcul ne la justifie pas (§4).
- **La fréquence de passage** : le produit ne la mesure pas, la personne en juge (D2).
- **Une question de région** : « RER ou Transilien » suffit à reconnaître l'Île-de-France pour ce
  qui compte ici. Les réseaux express hors d'Île-de-France (Léman Express, futurs RER métropolitains)
  se cochent en « Train ».

## 8. Décisions rendues

*À remplir avec la personne qui pilote.*
