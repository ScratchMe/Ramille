# v1-34 — Ce qui passe près de chez soi : la zone, le métro, le tram et le RER

> **Page de décision, écrite le 02/10/2026** à la demande de la personne qui pilote : « grouper le
> sujet de l'aide à la question de la zone avec le sujet du RER ». **Décidée le même soir** (§8) :
> toutes les recommandations sont suivies, sauf D4. Le chantier commence aussitôt (D7).
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

> **Tranché autrement le 02/10/2026** (§8) : les bilans de production sont des bilans de test, donc pas
> de règle d'avant. La recommandation ci-dessous reste pour mémoire.

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

**Le 02/10/2026, par la personne qui pilote** : « D4 -> les bilans actuels ne sont que des tests donc
on s'en fiche. sinon OK ».

- **D1, D2, D3, D5, D6, D7 et D8 : les recommandations sont suivies.** La question de l'accès est
  remplacée par la question factuelle et sa ligne d'aide ; l'action RER prend la place de l'action
  train quand « RER ou Transilien » est coché ; l'accès se déduit (rien → inexistant ; bus ou train
  sans métro, tram ni RER → limité ; métro, tram ou RER → bon) ; l'aide sous la zone redevient une
  définition ; le chantier passe avant le premier build de production ; une capture de l'étape tient
  lieu de canvas.
- **D4 : pas de règle d'avant.** Les douze bilans de production sont des bilans de test. La nouvelle
  règle vaut donc pour tous, et un bilan qui n'a pas la nouvelle réponse ne reçoit plus aucune action
  de transport en commun : une condition qu'on ne peut pas évaluer n'est pas remplie (`PLAN.md` §1).
  Ce qu'on accepte : les plans de test perdent ces actions à leur prochaine génération, jusqu'à une
  réponse donnée dans l'écran « Contexte » ou dans un nouveau bilan.

**Le 03/10/2026, sur la capture de l'étape** (D8), deux décisions de plus.

- **La question de la zone reste.** Posée par la personne qui pilote en voyant la capture : « pourquoi
  on garde la première question ? […] Ça ne fait pas double emploi ? ». La question remplacée était
  celle de l'accès, pas celle de la zone, et la zone ne décide plus aucune action (§4). Mais elle reste
  la seule à distinguer la campagne de la banlieue pour une même réponse « bus seul », et c'est ce qui
  décide de la comparaison à la moyenne française (`mobility_constrained` : rural **et** accès limité).
  La retirer imposait une nouvelle règle, et les deux possibles cassaient chacune quelque chose :
  « contraint » seulement sur « Rien de tout ça » montrait la moyenne à qui vit à la campagne avec une
  gare TER ; « contraint » sans métro, tram ni RER la cachait à toute banlieue desservie en bus.
  Réponse : « on garde la question de la zone par contre, tu as raison ».
- **La capture ne suffit pas : Claude Design intervient**, comme D8 le prévoyait. « Faisons intervenir
  Claude Design. Ne serait-ce que pour savoir comment bien afficher l'aide. Ça commence à prendre de
  la place. » Le brief : [`docs/design/v1-34-l-etape-du-contexte/BRIEF.md`](../design/v1-34-l-etape-du-contexte/BRIEF.md).
- **La fusion n'attend pas le canvas**, à rebours de la lettre de D8 (« avant la fusion »). Posée le
  même soir : fusionner le chantier dès qu'il est vert et contre-lu, et livrer la réponse de Claude
  Design dans sa propre PR, **avant le premier build de production** (D7 tient) ; ou tenir la PR
  jusqu'au canvas, au risque de conflits avec ce qui arrive sur `main`. Réponse : « ok je suis ta
  reco ». Ce qu'on accepte : le web de production montre l'étape des captures en attendant, et il n'y
  a que des comptes de test.
- **Deux recommandations de la synchronisation de design, acceptées le même jour** (« OK pour toutes tes
  recommandations ») : le « C'est noté » en attente qui se fond dans l'encart gris du choix des jours
  rejoint le brief (§4.5) plutôt qu'une correction faite à la main ; et les conventions que Claude Design
  lit disent désormais comment une série à cocher se compose — sans quoi le canvas risquait de
  redessiner la question des transports en choix unique.
- **Le brief est parti à Claude Design le même jour** : un canvas,
  <https://claude.ai/artifact/7yxeHrHFuUKYuoRjJcuNBN> (privé). Ses options, la recommandation comprise,
  attendent la décision de la personne qui pilote avant toute PR.
- **Les recommandations du canvas sont retenues, le même jour** : « Ok pour tes recos sur le canvas, go
  pour l'implémentation ». Ce qui est livré est au §10.

## 9. Ce que le chantier a livré, et ce qu'il a tranché en chemin

**Livré le 03/10/2026**, dans la PR [#330](https://github.com/ScratchMe/Ramille/pull/330) : migration `20261002231530_ce_qui_passe_pres_de_chez_soi`, appliquée sur le projet distant juste avant la fusion (registre d'exploitation §7 bis), et test pgTAP `45`.

- **Le modèle** : `assessment_answers.transports_proches` (`text[]`, deux `check` : les valeurs, et
  « aucun » seul) ; un déclencheur qui range la réponse et en déduit `tc_access` ; deux colonnes de
  `action_templates`, `transports_requis` et `transports_exclus`, qui remplacent la condition de zone
  des trois actions de transport en commun ; `estimate_action_savings` qui les lit ;
  `mettre_a_jour_le_contexte` qui prend la réponse au lieu de l'accès.
- **La signature du RPC change** : l'ancienne (quatre `text`) est supprimée. Entre l'application de la
  migration et le déploiement du web, un onglet resté sur l'ancien bundle verrait l'écran « Contexte »
  refuser d'enregistrer, le temps d'un rechargement. Aucun build natif ne l'appelle (le dernier date du
  14/09/2026), et les comptes de production sont des comptes de test (D4).
- **Le même onglet soumettrait un bilan sans la réponse, en silence** : l'ancien bundle envoie
  `tc_access` et pas `transports_proches`, le déclencheur ne touche à rien quand la réponse est nulle,
  et le bilan garde l'accès répondu sans recevoir aucune action de transport en commun (D4). Aucune
  erreur ne le signale. Même fenêtre, même coût accepté : un rechargement, et des comptes de test.
- **La garde des miroirs lit une forme de plus** : `colonne <@ ARRAY[…]`, la première colonne tableau
  qu'elle sache comparer (`TESTING-GARDES.md` §2.7).

**Une précision tranchée en chemin, validée le 03/10/2026** : l'action des sorties en RER. Le §4 disait « l'action
des sorties, chiffrée au RER si le métro ou le tram n'est pas coché ». Un même libellé ne peut pas
porter deux chiffrages — `action_text` est la clé unique du référentiel —, et la question du point est
figée à la génération, comme pour D3. Le chantier a donc créé une action à part, « Prendre le RER pour
deux sorties sur cinq », proposée quand le RER est coché sans le métro ni le tram, avec sa question
« En {mois}, as-tu pris le RER pour une sortie ? ». Le comportement décidé est tenu (le gain est celui
du RER) ; seul le libellé est neuf. L'autre voie — garder l'action générique des sorties pour qui n'a
que le RER, chiffrée au métro ou au tram — gardait un libellé juste et un gain faux. Posée à la
personne qui pilote avec les phrases ci-dessous, réponse : « ok pour les deux ».

**Les phrases nouvelles, validées le même jour** — calquées mot pour mot sur leurs jumelles du train et des
sorties, « train » devenant « RER » :

| Action | Question du point | Mot de la veille | Premier pas |
|---|---|---|---|
| « Passer deux trajets sur cinq en RER » | « {jours}, as-tu fait ce trajet en RER ? » | « Demain, tu as prévu de faire ton trajet en RER. » | « Vérifie l'horaire qui te convient, puis essaie-le une fois. » |
| « Prendre le RER pour deux sorties sur cinq » | « En {mois}, as-tu pris le RER pour une sortie ? » | — (aucune action de sortie n'en a) | « Repère la ligne qui dessert ta sortie habituelle. » |

**Ce qui reste à faire hors de cette PR** : ~~remesurer les hauteurs des deux aperçus du kit
(`ChampsDeContexte`, `ContextStep`)~~ — fait à la synchronisation de design du 03/10/2026 (470 → 710 et
650 → 870, `.design-sync/NOTES.md`) ; et, à la prochaine séance
de recette, régénérer l'artefact depuis `docs/recette/premier-parcours-web.md`, dont le profil coche
désormais le bus et le train.

## 10. La réponse de Claude Design, livrée (03/10/2026)

Les trois recommandations du canvas, retenues telles quelles par la personne qui pilote :

- **La question d'abord** (brief §4.1 et §4.2), dans `ChampsDeContexte` — donc sur l'étape et sur
  `/contexte` :
  - chaque question en `default` 600 à l'encre, son aide dessous en `small` 400 tertiaire ;
  - la définition de la zone, une ligne par zone, avec les mêmes mots ;
  - « Rien de tout ça » sur sa propre ligne ;
  - et dans `StepShell`, un filet en bas de la tête dès que le contenu passe dessous
    (`contenuSousLaTete`), la tête gardant 8 sous la phrase de Ramille.
- **La puce, option B** (§4.3 et §4.4) : `Chip` garde sa graisse, 500, cochée ou non. Une puce à
  cocher porte une case de 18, avec la coche de l'action engagée (`TRACE_DE_LA_COCHE`). Elle vaut
  pour les transports et pour les jours de l'engagement, qui passent en `flex` pour que la case tienne
  dans leur cellule. La case est une forme nouvelle du système, c'est pourquoi la décision a été
  prise sur canvas.
- **Le bouton grisé posé sur un encart** (§4.5) : le fond de l'écran et un filet, avec l'encre
  tertiaire (`surfaceDuBouton`, testée). « C'est noté » passe `onPanel`.

**Ce que ça coûte, mesuré sur l'export le 03/10/2026** :
- à 390 × 844, l'étape défile toujours, ce que la page acceptait ;
- à 360 de large, la case élargit chaque pilule des transports, et « Métro ou tram » et « RER ou
  Transilien » ne tiennent plus côte à côte : une rangée de plus ;
- chaque étape du questionnaire perd 8 px de zone qui défile, au profit de la marge sous la tête.

