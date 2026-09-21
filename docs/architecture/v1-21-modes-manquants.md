# v1-21 — Les modes qui manquent, et celui qui est mal compté

> **Page de décision du chantier C4.4** ([#146](https://github.com/ScratchMe/Ramille/issues/146)),
> première des six du lot 4. Écrite le 19/09/2026. Elle ne contient aucune ligne de code : sa
> fonction est de rendre décidable ce que le chantier ne peut pas trancher seul.
>
> C4.4 est **le seul chantier du lot 4 qui corrige un chiffre.** Les cinq autres ajoutent une
> question, un écran ou une comparaison ; celui-ci change ce que le produit répond à quelqu'un qui
> a déjà répondu juste.
>
> ---
>
> **Livré le 21/09/2026.** Les quatre arbitrages (D1 à D4) sont allés dans le sens recommandé.
> Ce que le chantier a fait **au-delà** de cette page, et qui ne s'y lit donc pas :
>
> - **cinq modes et non quatre** — `train_ter` s'ajoute aux trois prévus, sur une règle écrite en
>   tête de la migration : le générique est le repli des bilans d'avant la question, et une réponse
>   reçoit un mode à elle quand elle change le facteur **ou les mots**. Par la même règle,
>   `velo_mecanique` n'existe pas ;
> - **`min_distance_km` sur les gabarits d'action**, sans quoi le gabarit VAE aurait doublé le
>   gabarit vélo au lieu de prendre la fenêtre au-dessus : jusqu'à 10 km le vélo, au-delà le VAE,
>   jamais les deux ;
> - **quatre gabarits d'action** (VAE en trajet et en sortie, autocar depuis la voiture, train
>   depuis l'autocar), demandés en cours de chantier — le §5 disait « un gabarit possible » ;
> - **les deux entorses au point de résolution unique** (`v1-27` §1) sont fermées du même geste,
>   comme cette dette le prescrivait.
>
> **Et une moitié du §3.1 reste ouverte, consignée en `v1-27` §12.16** : le bilan du RER est
> corrigé (249,2 → 88,0 kg/an, rapport 2,83 mesuré), mais le **gain** de l'action « en train »
> reste chiffré au tarif du TER. Cibler le RER demanderait de savoir où la personne habite au sens
> du réseau, et `zone_type = 'urbain_dense'` recouvre Toulouse autant que la banlieue francilienne
> — le proposer là serait le défaut exact que C3.8 a fermé. Le gabarit a donc perdu « ou en RER »
> de son libellé : on ne promet que ce qu'on chiffre.

## 1. D'où ça vient

Quatre constats de l'audit, regroupés parce qu'ils partagent une mécanique : A7-11 (le vélo à
assistance électrique n'existe pas), A7-10 (le RER est compté au tarif du TER), A7-12 (l'autocar
n'existe pas sur les voyages) et A8-15 (l'occupation d'un long trajet en voiture).

**Une des quatre est déjà livrée.** `assessment_answers.car_long_trips_occupancy` existe, son
miroir `OCCUPATIONS_LONG_TRAJET` est épinglé par un test, et `estimate_action_savings` divise bien
la base par personne depuis la contre-lecture de la vague 7 (`20260914141729`). A8-15 a été fermé
par C3.5 sans que le titre de C4.4 soit mis à jour — le chantier est donc **à trois volets et non
quatre**, ce qui change son coût et son ordre.

## 2. L'état des lieux, mesuré le 19/09/2026

Les facteurs viennent de l'endpoint ACV d'Impact CO2 (`/api/v1/thematiques/ecv/transport`, champ
`ecv` — le seul endpoint admissible, cf. `v1-07` §1.5), interrogé le jour même ; le mapping vient
de `emission_factor_sources`, relu sur le projet distant.

| Ce que le produit propose | `transport_modes.id` | Slug mappé | Facteur retenu |
|---|---|---|---|
| **Train ou RER** | `train` | `ter` | **0,027690** |
| TGV (non sélectionnable, voyages) | `train_longue_distance` | `tgv` | 0,002930 |
| Vélo | `velo` | `velo` | 0,000170 |
| Trottinette ou mobilité douce | `trottinette` | `trottinette` | 0,024900 |
| Métro ou tram | `metro_tram` | `metro`, `tramway` | 0,004360 *(moyenne des deux)* |

Et ce que l'endpoint contient et que le produit n'utilise pas :

| Nom chez Impact CO2 | Slug | Facteur ACV |
|---|---|---|
| **RER ou Transilien** | `rer` | **0,009780** |
| Intercités | `intercites` | 0,008980 |
| **Vélo à assistance électrique** | `veloelectrique` | **0,010950** |
| **Autocar thermique** | `autocar` | **0,037560** |
| Vélo cargo triporteur | `triporteurelectrique` | 0,014827 |
| Bus électrique | `buselectrique` | 0,021700 |

## 3. Ce que ça coûte, chiffré

### 3.1 Le RER : le produit promet une chose et en compte une autre

Le libellé du mode est **« Train ou RER »**. Le facteur appliqué est celui du **TER**. Il existe un
slug `rer` distinct, à **0,00978 — soit 2,83 fois moins**.

Sur un trajet domicile-travail de 20 km, cinq jours, 45 semaines (9 000 km/an) :

| Ce que la personne déclare | Ce que le produit compte | Ce qui serait juste | Écart |
|---|---|---|---|
| « Train ou RER », et elle prend le RER | **249,2 kg/an** | **88,0 kg/an** | **+ 161,2 kg, soit 2,83×** |

**Et l'erreur se propage au plan, dans l'autre sens.** `estimate_action_savings` chiffre une
substitution comme `base × (1 − facteur_substitut / facteur_courant)`. Pour « Passer deux trajets
sur cinq en train » depuis une voiture thermique, sur le même profil :

| Facteur du train | Gain annoncé |
|---|---|
| TER (aujourd'hui) | 412,4 kg/an |
| RER | 476,9 kg/an |

Le produit **sous-estime de 64,5 kg** le gain du report modal le plus réaliste d'Île-de-France,
c'est-à-dire là où il y a le plus de monde à convaincre. Les deux erreurs vont dans des sens
opposés et ne se compensent pas : l'une gonfle le bilan d'un usager du RER, l'autre rabote l'action
qu'on lui propose.

### 3.2 Le VAE : 64 fois moins que la réalité

Quelqu'un qui fait son trajet en vélo à assistance électrique n'a qu'une case à cocher, « Vélo », à
**0,000170** contre **0,010950** — **64 fois moins**. Sur 5 km, cinq jours, 45 semaines
(2 250 km/an) : **0,4 kg contre 24,6 kg**.

L'écart absolu est petit, et il faut le dire ainsi plutôt que de le dramatiser. Ce qui le rend
gênant est ailleurs, en trois points :

- il tombe sur le **profil sobre**, dont le total est de l'ordre de la dizaine de kilos — le même
  paradoxe que `household_vehicles` en `v1-19` §3 : *une réponse compte d'autant plus que
  l'empreinte est petite* ;
- le VAE est **le mode qui remplace une voiture**, celui dont la part croît le plus vite ; ne pas
  savoir le déclarer, c'est ne pas pouvoir mesurer le geste qu'on cherche à provoquer ;
- et le produit **propose** « Faire un trajet sur cinq à vélo » en chiffrant le gain au tarif du
  vélo mécanique. Quelqu'un qui le fera en VAE recevra une promesse 7,6 % trop haute (472,7 kg
  réels contre 511,5 kg annoncés, sur le profil du §3.1).

### 3.3 L'autocar : absent, et il n'est pas là où on l'attend

B3.4 (voyages longue distance) ne propose que l'avion, le train et la voiture. L'autocar existe à
**0,03756** — et c'est le chiffre qui surprend : **il émet plus au kilomètre qu'un TER**
(0,027690), et **douze fois plus qu'un TGV** (0,002930). L'intuition « le car, c'est le mode
sobre » est fausse en ACV, exactement comme l'ordre des motorisations (`hybride > thermique`), et
pour la même raison : elle mérite donc un test pgTAP qui l'épingle, sans quoi quelqu'un la
« corrigera » par réflexe.

## 4. Les décisions à prendre

### D1 — Comment on distingue le RER du TER

**Ce qui est en jeu.** Le facteur est faux pour tout usager du RER ou du Transilien, et le libellé
du mode promet déjà de les couvrir.

Trois formes possibles :

1. **Une révélation imbriquée sous « Train »** — « Lequel ? TER / RER ou Transilien / Intercités »,
   sur le patron exact de la motorisation (`commute_car_engine`) et du deux-roues
   (`commute_two_wheeler_type`).
2. **Trois entrées dans la liste des modes** — « TER », « RER ou Transilien », « Intercités ».
3. **Une seule entrée et la moyenne des slugs**, comme `metro_tram` le fait déjà pour le métro et
   le tram.

**Recommandation : la 1.** C'est la règle déjà écrite dans `CLAUDE.md` — « le mode *voiture* ne
distingue jamais la motorisation dans les listes de sélection ; une question de suivi s'affiche en
nested reveal » —, et elle vaut ici pour la même raison : une liste de modes qui gonfle est ce qui
fait abandonner un questionnaire, une question de suivi ne coûte qu'à ceux qu'elle concerne. La 3
est tentante et fausse : le métro et le tram sont à **2 %** l'un de l'autre (0,00444 / 0,00428), le
TER et le RER à **283 %** — moyenner ne réduit pas l'erreur, il la répartit sur deux populations
qui n'ont rien en commun.

**Ce qu'on casse si on se trompe.** En choisissant la 2, on allonge la liste la plus longue du
questionnaire, sur l'étape qui décide du poste dominant donc du plan. En choisissant la 3, on
laisse une erreur de 183 % en croyant l'avoir réglée — le pire des trois résultats, parce qu'il
ferme le sujet.

### D2 — Ce que « Vélo » devient

**Recommandation : une révélation imbriquée « Mécanique ou à assistance ? »**, deux réponses, sur
le même patron que D1. Le mode générique `velo` reste et garde son facteur : c'est lui que
retrouvent les bilans soumis avant la question (`resolve_mode` retombe toujours sur le générique).

**Une question de produit reste ouverte, et elle n'est pas technique** : faut-il poser la question
aussi pour la **trottinette**, qui est déjà à 0,0249 et n'a pas de variante mécanique crédible ?
La recommandation est non — une question dont une seule réponse existe n'est pas une question.

### D3 — L'autocar sur les voyages longue distance

**Recommandation : un troisième compteur « En autocar » sur B3.4**, à côté du train et de la
voiture. Coût : un champ, une ligne de calcul, un gabarit d'action possible. Ce qui rend la
décision non évidente : B3.4 est déjà l'étape la plus longue du questionnaire, et l'autocar est
**moins sobre qu'un TER**, donc l'ajouter ne donne pas au produit une histoire flatteuse à
raconter. C'est précisément pour ça qu'il faut le poser : le produit compte aujourd'hui un trajet
Paris–Lyon en car comme s'il n'avait pas eu lieu.

### D4 — Une migration ou trois

**Recommandation : une seule.** C'est la leçon payée trois fois (PR #34, #41, #48, consignée en
`TESTING.md` §2.2) : **toucher au référentiel des facteurs invalide TOUTES les valeurs attendues de
la suite pgTAP, y compris celles qui ne nomment pas le facteur touché** — et « toucher » inclut en
ajouter un. Trois migrations, c'est trois fois ce travail de recalcul, et trois occasions de CI
rouge.

## 5. Ce qu'il ne faut pas casser

- **`public.resolve_mode(mode_id, engine, type)` est le seul point de résolution**, et il est
  appelé à six endroits. Ajouter un mode sans passer par lui rendrait un nombre — le mode générique
  existe, son facteur existe — donc l'oubli serait **silencieux**.
- **Tout mode ajouté impose une ligne dans `emission_factor_sources`**, sinon il reste figé à sa
  valeur de seed pendant que tous les autres se resynchronisent chaque trimestre, en silence. Un
  test pgTAP garde ce point ; il ne garde pas que le slug soit le bon.
- **La catégorie `velo_marche` compte trois modes, et en ajouter un quatrième impose un complément
  dans `public.complement_de_maintien` ET dans sa jumelle `src/types/checkin.ts`** (C2.5), sinon le
  VAE reçoit « autrement » des deux côtés. C'est la paire SQL/TypeScript la plus facile à oublier
  de ce chantier, parce qu'elle n'a rien à voir avec un facteur.
- **Un facteur d'usage n'est jamais un facteur ACV.** Le seul endpoint admissible est
  `/api/v1/thematiques/ecv/transport`, champ `ecv` ; deux tests pgTAP épinglent la **source** de
  chaque facteur. Reprendre une valeur depuis `/api/v1/transport` sous-estimerait de 29 % une
  voiture thermique et de 457 % une électrique, sans que le garde-fou des ± 50 % puisse rien voir.
- **Le seuil des 5 kg/an tient toujours.** Un gabarit d'action « passer un long trajet en autocar »
  ne se proposera que s'il gagne plus de 5 kg — et depuis un TGV, il en **perd**.
- **`train_longue_distance` n'est pas sélectionnable au questionnaire** et ne doit pas le devenir :
  il vit dans `MODE_PREPOSITION` parce qu'il peut être le `dominant_poste_mode`, pas dans
  `src/constants/transport-modes.ts`.

## 6. Le chantier, si les quatre décisions vont dans le sens recommandé

Une migration, dans cet ordre :

1. trois modes (`train_rer`, `train_intercites`, `velo_electrique`) et un quatrième si D3 passe
   (`autocar`), chacun avec sa ligne `emission_factor_sources` et son facteur de seed ;
2. `resolve_mode` étendu — un seul point, six appels inchangés ;
3. les colonnes du questionnaire : `commute_train_type`, `leisure_train_type`, `commute_velo_type`,
   `leisure_velo_type`, `coach_long_trips_per_year` ;
4. `complement_de_maintien` et sa jumelle TypeScript ;
5. **le recalcul de toutes les assertions chiffrées de la suite pgTAP, par requête et jamais à la
   main** (`TESTING.md` §2.2).

Côté écran : deux révélations imbriquées sur le patron existant, un compteur de plus sur B3.4, et
les miroirs de valeurs admissibles dans `src/types/bilan.ts`, épinglés par un test.

**Effort : grand.** C'est le chantier le plus lourd du lot 4, et le seul dont le report a un coût
qui court — chaque bilan soumis d'ici là porte le chiffre faux, et `emission_factor(mode, date)`
garantit qu'il le gardera.
