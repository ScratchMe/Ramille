# v1-31 — L'écran du mode : une liste qui tient, et ce qui manque qui mène quelque part. Plan d'implémentation

> **Écrit le 29/09/2026.** Ce document est apparié au dossier de design
> [`docs/design/v1-31-l-ecran-du-mode/`](../design/v1-31-l-ecran-du-mode/), comme
> [`v1-17-densite-du-plan.md`](v1-17-densite-du-plan.md) l'est au sien. Le canvas date du 28/09/2026
> (PR [#291](https://github.com/ScratchMe/Ramille/pull/291)) et répond au brief de l'issue
> [#289](https://github.com/ScratchMe/Ramille/issues/289), l'écran du mode jugé pénible à la recette
> web (`v1-13` §11.19 et ligne 02.10).
>
> Le document traduit le canvas en chantiers, assez précisément pour qu'un autre agent les livre : les
> fichiers, l'ordre, les gardes et les mutations qui les éprouvent. **Il ne contient aucun code.**
>
> Les valeurs, la copy et la géométrie sont dans le
> [`HANDOFF.md`](../design/v1-31-l-ecran-du-mode/HANDOFF.md), qui en est la **seule source**. Ce
> document ne les recopie que pour dire qui les lit. Ce qu'il tranche en plus est technique : §2 le
> dit, et §9 le consigne comme écart au handoff.
>
> L'état d'avancement est en §10. Il se tient à jour pendant le travail, pas après coup.

## 1. Ce que ça change pour la personne

**Aujourd'hui**, mesuré sur l'export de `main` le 28/09/2026 (brief §1) :

- **La liste déborde.** Les neuf modes sont des rangées de 53 dp. Dès qu'une précision s'ouvre,
  la liste passe sous le pied collant.
- **Ce qui manque ne mène nulle part.** La ligne « Il manque encore … » s'écrit en gris dès
  l'arrivée, collée à un bouton grisé.
- **L'écran a l'air fini alors qu'il ne l'est pas.** Sur l'étape des sorties, la question de la
  distance est entière sous le pied : c'est le défaut d'appareil du 07/09/2026.

**Après** :

- **Les neuf modes tiennent sans défiler**, à 390 × 844 comme à 360 × 800, rangés en trois
  familles.
- **Une précision qui passerait sous le pied fait remonter l'écran** juste assez.
- **Un filet en haut du pied dit qu'il y a une suite.**
- **Toucher le « Suivant » gris mène à ce qui manque** : l'écran y défile, le focus s'y pose, la
  question passe en vert, et la ligne devient un lien vers elle.

Rien ne se dit avant qu'on l'ait demandé.

## 2. Ce que ce document tranche, en plus du handoff

Les trois décisions de produit sont au handoff (« Ce que le canvas tranche ») et ne se rediscutent
pas ici. Ce qui suit est technique, donc de la responsabilité de l'agent (`CLAUDE.md`, « Ce que la
personne qui pilote a demandé »). Les points 2.1 à 2.8 précisent le handoff ou s'en écartent, et §9
les reporte. Les points 2.9 et 2.10 sont des lectures du handoff, écrites pour qu'on ne les tranche pas
autrement.

### 2.1 L'ordre vit dans une liste ordonnée, jamais dans l'ordre des clés d'un objet

Le handoff range l'ordre de « Lequel ? » dans « les clés de `TRANSPORT_MODE_LABELS` ». L'ordre des
clés d'un `Record` est un accident : une clé ajoutée plus tard irait en queue sans que rien ne le
dise. **L'ordre se déclare donc une fois**, dans une liste littérale et ordonnée de
`src/constants/transport-modes.ts` : les huit `TransportModeId`, chacun avec sa famille, dans l'ordre
des familles puis dans l'ordre de la famille.

- **« Lequel ? »** (`commute-extra.tsx`, qui itère aujourd'hui `Object.keys(TRANSPORT_MODE_LABELS)`)
  itère cette liste.
- **`COMMUTE_MODE_CHOICES`, `LEISURE_MODE_CHOICES_PRIMARY` et `LEISURE_MODE_CHOICES_MORE` restent
  des tableaux littéraux**, réordonnés à la main et **vérifiés** contre la liste par un test (§6.1).
  Ils ne dérivent pas d'elle : la section H de `scripts/verifier-etats-export.mjs` lit le premier
  mode révélé dans la source, par une expression régulière, et un `.mjs` ne peut pas importer le
  TypeScript (§4.1).
- **`TRANSPORT_MODE_LABELS` garde ses clés dans l'ordre d'aujourd'hui.**

Un corollaire à connaître : le test de propriétés de `normaliserReponses` (`src/types/bilan.test.ts`)
tire ses modes dans `Object.keys(TRANSPORT_MODE_LABELS)`. Réordonner ces clés changerait ses 6 000
tirages. Si quelqu'un le fait un jour et que le test rougit, **c'est un défaut réel que l'ancien
ordre ne tirait pas**, pas un test à recaler.

### 2.2 Une précision, un composant : `BoiteDePrecision` porte le dépli, la boîte et son ouverture

Le handoff crée `BoiteDePrecision` et laisse à `PrecisionMode` et `PrecisionChiffres` « une variante
sans boîte ». Ce document va plus loin :

- **`PrecisionMode` et `PrecisionChiffres` ne dessinent plus jamais de boîte.** Ils deviennent un
  intitulé et son `GroupeDeChoix`.
- **`BoiteDePrecision` porte toujours la boîte**, qu'elle contienne un groupe ou deux. Elle porte
  aussi le `Depliage` qui l'ouvre, et l'annonce de son ouverture au défilement (§4.7).

Deux raisons :

- **Deux façons de dessiner la même boîte divergent.** C'est la leçon de `CarteDePiste` en C5.2.
- **Le défilement à l'ouverture ne vaut que pour ce qui précise un choix, pas pour tout `Depliage`.**
  Les modes que « Voir les autres modes » révèle s'ouvrent aussi par un `Depliage`, et ils ne doivent
  pas faire défiler l'écran : le focus va au premier révélé, qui est à la place du lien, donc déjà
  en vue.

**Le mécanisme est une prop de `Depliage`**, disons `suivieALOuverture`, qui annonce sa hauteur finale
et sa place à `StepShell` (§4.7). Un `Depliage` sans elle n'annonce rien. Elle a trois appelants, et
la liste est **fermée** :

- **`BoiteDePrecision`**, sous chaque choix qui ouvre une précision : un mode des trois étapes qui en
  posent, un second mode dans « Lequel ? », la série « En voiture » des longs trajets ;
- **la boîte « Lequel ? »**, sous le « Oui » du second mode. Elle garde son fond et ses marges
  d'aujourd'hui ;
- **le champ « Environ combien, pour un aller ? »**, sous la rangée des tranches des sorties.

Les deux derniers ne sont pas des précisions de mode, mais ils s'ouvrent sous le doigt exactement
comme elles : la règle du handoff (« l'écran remonte si elle passerait sous le pied ») s'y applique à
la lettre.

**La borne** qu'aucune ouverture ne franchit (§4.7) est le haut du choix qui l'a déclenchée, 8 px sous
le bord : le mode choisi, le « Oui », la rangée des tranches, ou la série de puces « En voiture ».

**Une boîte à deux groupes partout où un choix ouvre deux précisions.** Le handoff en nomme trois : le
covoiturage du trajet, celui des sorties, et la voiture des longs trajets. **Il en oublie une
famille** : dans « Lequel ? », un second mode en voiture, en deux-roues, en train ou à vélo ouvre son
type **puis** « Quelle part du trajet fais-tu ainsi ? » (`commute-extra.tsx`, deux `Depliage` séparés
aujourd'hui). Ce second mode reçoit une seule boîte à deux groupes, comme les trois autres. Deux
boîtes feraient partir deux annonces dans la même image, sans règle pour dire laquelle gagne. Les
autres seconds modes n'ouvrent que la part : une boîte, un groupe.

### 2.3 Ce qui manque est nommé par un champ logique

`manqueDeLEtape` rend `{ champ, phrase } | null`, avec les mêmes phrases dans le même ordre (handoff,
écart 15). Le type du champ se déclare, **`ChampDuBilan`**, dans `src/types/bilan.ts`. C'est le nom de
la colonne, sauf quand deux colonnes répondent à la même question : la distance du trajet se saisit
en kilomètres **ou** par tranche, et l'étape n'en montre qu'une. Elle devient
`distance_du_trajet`, et l'étape enregistre sous ce nom ce qu'elle affiche.

Deux tables fermées l'accompagnent. Relevées le 29/09/2026 dans `manqueDeLEtape`, elles sont à
**vérifier contre le code du jour**, pas à recopier :

| Étape | Champs que `manqueDeLEtape` peut rendre | Question principale (jamais marquée) |
|---|---|---|
| `commute_has_trip` | `commute_has_regular_trip` | `commute_has_regular_trip` |
| `commute_days_distance` | `commute_days_per_week`, `distance_du_trajet` | `commute_days_per_week` |
| `commute_mode` | `commute_mode`, `commute_car_engine`, `commute_two_wheeler_type`, `commute_train_type`, `commute_velo_type`, `commute_carpool_size` | `commute_mode` |
| `commute_extra` | `commute_second_mode_used`, `commute_second_mode`, `commute_car_engine`, `commute_two_wheeler_type`, `commute_train_type`, `commute_velo_type`, `commute_second_mode_share` | `commute_second_mode_used` |
| `leisure_frequency` | `leisure_frequency` | `leisure_frequency` |
| `leisure_detail` | `leisure_mode`, `leisure_car_engine`, `leisure_two_wheeler_type`, `leisure_train_type`, `leisure_velo_type`, `leisure_carpool_size`, `leisure_distance_bracket`, `leisure_distance_km` | `leisure_mode` |
| `flights` | `flights_short_per_year` | `flights_total_per_year` (ne manque jamais : vaut 0 par défaut) |
| `long_trips` | `car_long_trips_engine`, `car_long_trips_occupancy` | aucune : le titre ne porte pas de groupe |
| `context` | `zone_type`, `tc_access`, `household_vehicles`, `teletravail` | aucune : les quatre questions ont chacune leur intitulé |

« Le titre ne se marque jamais » devient une dérivation (`seMarque(etape, champ)`), testée pour les
neuf étapes. L'écran ne la tranche jamais en ternaire.

**Le titre reçoit la marque comme tout intitulé, et c'est `seMarque` seule qui l'en empêche.**
`TitreDEtape` lit l'ancre de la question principale et applique sa `marque`, qui vaut toujours faux.
Un titre « jamais marqué » qu'on ne brancherait pas rendrait la garde muette : l'assertion « le titre
n'a pas changé de couleur » passerait aussi sur une `seMarque` fautive (§6.4).

### 2.4 C'est `StepShell` qui décide d'avancer, et `handleNext` le vérifie encore

Aujourd'hui, `StepShell` reçoit `nextDisabled` et c'est le `disabled` du bouton qui empêche
d'avancer : `handleNext` (`src/app/bilan/index.tsx`) ne vérifie rien. Le « Suivant » en attente
n'étant plus `disabled`, les rôles changent :

- **`StepShell`** reçoit `manque` (le champ et sa phrase). Il n'appelle `onNext` que si `manque` est
  nul ; sinon, il demande (§4.6). **Son « Suivant » n'a plus aucun `disabled`.**
  - Pendant l'envoi, `StepShell` n'est pas rendu du tout : `if (submitting) return <CalculEnCours />`
    le remplace. Le libellé « Enregistrement… », `nextDisabled={submitting || …}` et
    `manque={submitting ? null : …}` sont donc des branches mortes aujourd'hui.
  - Ce qui empêche une double soumission est le verrou `soumissionEnCours`, une `useRef`, et il ne
    bouge pas.
  - L'implémentation retire ces branches, ou les garde en les disant inatteignables, mais ne leur
    confie rien.
- **`handleNext`** sort tout de suite si l'étape est incomplète. C'est une seconde garde, et elle
  n'est pas du zèle : sur la dernière étape, `handleNext` soumet. Une régression de `StepShell`
  suffirait sinon à soumettre un bilan incomplet. La base n'en refuserait qu'une partie : une part
  du second mode absente passe (`commute_second_mode_share` est nullable, le calcul retombe sur la
  moitié), c'est-à-dire exactement le défaut que C3.4 a fermé.
- **À la dernière étape, elle vérifie toutes les étapes visibles, pas seulement la courante.** Ce
  défaut préexiste, relevé à la contre-lecture du 29/09/2026 :
  - sur web, `/bilan?etape=context` se tape ;
  - sur un questionnaire vierge, la validation du paramètre accepte l'étape du contexte ;
  - trois réponses puis « Voir mon bilan » soumettent un bilan fait des replis de l'insert
    (`?? false`, `?? 'rarely'`), dont le commentaire affirme « étape visible ⇒ complète ».

  La garde exige donc que chaque étape de `visibleSteps` soit complète. Sinon, elle ramène à la
  première qui ne l'est pas, par le même chemin que « Retour ». Le « Suivant » en attente y dira ce
  qui manque. Refuser en silence laisserait un bouton qui ne fait rien.

### 2.5 Les ancres : chaque champ s'enregistre auprès de `StepShell`

`StepShell` fournit un contexte, et chaque étape y enregistre ses champs par un crochet,
`useAncreDuChamp(champ)`, qui rend trois choses :

- **le bloc**, la référence de ce qu'il faut amener en vue : l'intitulé et son groupe, ou le champ
  de saisie ;
- **la cible du focus** : l'option cochée du groupe, ou sa première, ou le champ de saisie
  lui-même ;
- **`marque`**, vrai quand ce champ est celui qui manque, que la demande est active et que
  `seMarque` l'autorise.

Cinq conséquences :

- **`Chip`, `ChoiceRow` et `NumericField` reçoivent une prop `ref`**, comme `ModeListItem` (une prop
  ordinaire depuis React 19). Relevé le 29/09/2026 : aucun des trois ne transmet de référence
  aujourd'hui, et c'est le composant qui rend le groupe qui sait quelle option est cochée.
  **Celle de `NumericField` va au `TextInput`**, pas à la `View` qui l'encadre : sur web, `focus()`
  sur une `div` sans `tabIndex` échoue sans bruit.
- **Un champ de saisie reçoit le focus de saisie, pas seulement celui du lecteur d'écran.** Sur
  natif, `donnerLeFocus` n'envoie qu'un événement d'accessibilité (`src/lib/focus.ts`) : sans
  TalkBack, rien ne se passe, et le clavier ne s'ouvre pas. Pour un champ, le geste appelle donc
  aussi `focus()` du `TextInput`.
- **Le bloc se mesure par `measureLayout`**, relativement à la `ScrollView` de `StepShell`. La
  méthode existe sur les deux plateformes, avec deux pièges :
  - **le rembourrage** : la vue `contenu` est dans un conteneur rembourré de 24 (`scrollContent`),
    donc une mesure relative à elle est décalée d'autant. La dérivation reçoit des coordonnées de
    contenu, et c'est à la mesure de les rendre justes ;
  - **l'aplatissement** : le commentaire de `StepShell` explique que `contenu` est aplati sur natif,
    donc aucune vue native n'existe pour lui. Mesurer relativement à un nœud aplati ne rend rien.
    Mesurer relativement à un nœud qui existe (`collapsable={false}`), et le vérifier sur appareil.

  Vérifier aussi sur l'export web que la méthode y rend des coordonnées de contenu et non de
  fenêtre, avant d'écrire la dérivation qui les lit.
- **Hors de `StepShell`, le crochet ne fait rien** : ses références sont inertes, `marque` est faux.
  C'est le cas de l'écran `/contexte`, qui rend `ChampsDeContexte` sans le questionnaire autour.
  **Cet écran ne change pas** : son « Enregistrer » reste désactivé tant que le contexte est
  incomplet. Ce n'est pas une étape, et le handoff ne le touche pas.
- **Un champ demandé sans ancre enregistrée** ne doit pas se taire. La ligne s'affiche quand même,
  et le focus retombe sur la cible d'aujourd'hui : le conteneur de l'étape sur web, son titre sur
  natif. En développement, un avertissement nomme le champ. C'est la forme neuve du défaut que
  `CLAUDE.md` décrit pour le télétravail (C5.4) : une question absente de l'écran mais réclamée.

### 2.6 La hauteur du pied se mesure, elle ne se suppose pas

Le handoff donne au pied 102 px sans la ligne et 158 avec. **Ces valeurs sont celles de la taille de
police normale** : une police agrandie fait passer la ligne à trois lignes. Le défilement vers ce qui
manque se calcule donc sur la hauteur du pied **mesurée**, pas sur 158 :

- **au premier geste**, la ligne apparaît et le pied grandit : le défilement attend le `onLayout` du
  pied qui suit ;
- **à un geste suivant** (la ligne touchée, ou « Suivant » touché une seconde fois après qu'on a
  fait défiler à la main), la ligne est déjà là et le pied ne change pas de hauteur. Aucun
  `onLayout` ne part, et un défilement qui l'attendrait ne se ferait jamais : il part aussitôt, sur
  la hauteur déjà connue.

Le focus, lui, part au geste, avant tout défilement (handoff, « le geste », point 1).

### 2.7 `Depliage` sépare « joue une animation » et « vient d'un geste »

Aujourd'hui, `useJoueAuMontage` confond deux faits :

- ce n'est pas le montage de l'écran ;
- les animations ne sont pas réduites.

Le `onLayout` de `Depliage` sort donc tout de suite quand il ne joue pas. Or le défilement à
l'ouverture doit connaître la hauteur finale **même sous la préférence**, où il se pose sans
s'animer (handoff, commun, dernier point). Il faut donc deux lectures :

- **« Vient d'un geste »** décide si l'on annonce la hauteur au défilement ;
- **« Joue »** (un geste, et pas sous la préférence) décide si la hauteur s'anime.

**« Vient d'un geste » ne veut pas dire « pas au montage ».** Le préremplissage d'un re-bilan arrive
**après** le montage (`src/app/bilan/index.tsx`, la lecture de `loadLastSubmittedAnswers`). Sur une
étape ouverte par `?etape=`, une précision qu'il fait apparaître s'annoncerait, et l'écran défilerait
sans que personne ait touché à rien. L'annonce n'est donc suivie que si elle suit un geste sur
l'étape : `StepShell` arme un drapeau au toucher ou à la touche sur son contenu, et le consomme à la
première annonce ou au changement d'étape. Au montage d'une étape, une précision déjà ouverte par un
brouillon ne fait **rien** défiler.

`useJoueAuMontage` est nommé dans l'en-tête de la section J de `scripts/verifier-etats-export.mjs`, par
la mutation J12 : une précision laissée jouer sous la préférence reste à hauteur nulle. L'en-tête
suit le nouveau nom, et l'assertion que J12 fait tomber doit rester verte.

### 2.8 Sous le doigt, le « Suivant » en attente prend la teinte d'une surface neutre

Le handoff dit que `enAttente` porte « l'apparence du désactivé, rien d'autre ». Telle qu'est écrite
`Button`, un bouton principal non désactivé prend `accentPressed` sous le doigt : le bouton gris
virerait au vert foncé au moment du toucher.

**Il prend `backgroundPressed`**, la teinte appuyée d'une surface neutre (`FRONT.md` §2.4). Un bouton
qui agit répond au toucher (décision n° 6 de `v1-29`), et sa teinte est celle de sa surface, pas celle
de l'accent qu'il n'a pas.

### 2.9 Pendant la demande, la ligne et la marque suivent ce qui manque

Une fois « Suivant » touché, la personne peut répondre à ce qu'on lui montre, mais aussi changer de
mode, ce qui ferme la précision réclamée et en ouvre une autre. Le handoff dit deux choses qui
tranchent ce cas :

- **« Tout cela reste jusqu'à ce que l'étape soit complète »** (décision 1). La demande ne retombe
  pas sur un changement de mode.
- **Une ligne qui nommerait une précision fermée serait fausse.** Elle dit donc ce qui manque
  maintenant, et la marque se pose sur ce champ. C'est aussi ce que joue le prototype du canvas
  (planche P).

Le focus et le défilement, eux, n'ont lieu qu'au geste. Le choix ne déplace ni l'un ni l'autre.

La phrase « Rien ne change non plus sous le doigt au moment d'un choix » décrit l'écran **avant**
toute demande, et ce document la lit ainsi. L'autre lecture, où la demande retombe dès que le champ
réclamé change, serait une décision de produit. **Elle se pose à la personne qui pilote** si la recette
au doigt trouve ce suivi gênant.

### 2.10 Entrée au clavier : la demande ne coche rien, et le second appui est un vrai choix

react-native-web active un `Pressable` au relâchement de la touche, et seulement si c'est l'élément
qui a reçu l'appui (`usePressEvents/PressResponder.js`, `keyupHandler`). Un Entrée sur le « Suivant »
en attente déclenche donc la demande au relâchement, et le focus part ensuite sur l'option : **le même
appui ne peut pas la cocher**, même maintenu.

Un second appui coche l'option qui a le focus. C'est une activation délibérée, sur une option qui
vient d'être annoncée et entourée de son anneau de focus, comme un clic sur elle. Entrée coche les
choix partout dans le produit (`FRONT.md` §2.4 : « laisse Entrée à la bibliothèque »), et en faire une
exception ici serait un autre chantier. La section K l'épingle par un cas (§6.2) : si un jour la
demande partait à l'appui plutôt qu'au relâchement, un Entrée maintenu cocherait la première option
sans décision.

## 3. Le relevé de fichiers

Fait le 29/09/2026 en lisant le code, pas supposé. Les chantiers sont en §4.

| Fichier | Chantiers qui le touchent |
|---|---|
| `src/constants/transport-modes.ts` | §4.1 |
| `src/components/bilan/mode-list-item.tsx` | §4.2 |
| `src/components/bilan/steps/commute-mode.tsx` | §4.1, §4.2, §4.3, §4.6 |
| `src/components/bilan/steps/commute-extra.tsx` | §4.1, §4.2, §4.3, §4.6, §4.7 |
| `src/components/bilan/steps/leisure-detail.tsx` | §4.1, §4.2, §4.3, §4.6, §4.7 |
| `src/components/bilan/steps/long-trips.tsx` | §4.3, §4.6 |
| `src/components/bilan/steps/flights.tsx`, `commute-days-distance.tsx`, `commute-has-trip.tsx`, `leisure-frequency.tsx` | §4.6 |
| `src/components/bilan/champs-de-contexte.tsx` | §4.6 |
| `src/components/bilan/precision-mode.tsx`, `precision-chiffres.tsx` | §4.3, §4.6 |
| `src/components/bilan/boite-de-precision.tsx` (à créer) | §4.3, §4.7 |
| `src/components/bilan/chip.tsx`, `choice-row.tsx`, `numeric-field.tsx` | §4.6 (la prop `ref`) |
| `src/components/bilan/step-shell.tsx` | §4.5, §4.6, §4.7, §4.8 |
| `src/components/button.tsx` | §4.5 |
| `src/types/bilan.ts` (+ son test) | §4.4 ; et trois commentaires qui disent « Suivant » inactif : celui de `teletravailSePose`, celui d'`avancementDeLaReprise`, l'en-tête de `manqueDeLEtape` (§4.6) |
| une dérivation neuve dans `src/types/` (+ son test) | §4.7, §4.8 |
| `src/lib/mouvement.tsx` | §4.7 |
| `src/app/bilan/index.tsx` | §4.4, §4.5 (et la garde de la dernière étape, §2.4) |
| `scripts/verifier-etats-export.mjs` | §4.1 (section H), §2.7 (l'en-tête de J), §6.2 (section K, à créer ; `ouvrir()` gagne une largeur, pour les cas à 360) |
| `scripts/verifier-parcours-reel.mjs` | §4.5 (`suivant()` et `jusquAVoirMonBilan`) |
| `docs/design/design-system/components/` | §4.9 |
| `docs/recette/le-compte-et-les-modes.md` | §7 (lignes 02.2, 02.6 et 02.10) |
| `.design-sync/previews/` | à la prochaine synchronisation, pas dans cette PR (§4.9) |

**Ce que le relevé dit** : rien n'est parallèle. `step-shell.tsx` porte quatre chantiers, et chaque
étape en porte deux à cinq. Un agent, une branche, un commit par chantier, dans l'ordre de §5.

**Ce qui tourne à côté : « Toutes les pistes »**
([`v1-32-toutes-les-pistes.md`](v1-32-toutes-les-pistes.md), planifié le même jour). Les deux
chantiers sont parallélisables, mais ils partagent des fichiers :

- **`src/components/button.tsx`** : `v1-32` le lit sans l'écrire. Le « C'est noté » de sa feuille
  d'engagement est un `Button` **désactivé**, et un changement de `Button` changerait son apparence
  sans que rien dans `v1-32` ne le dise. D'où la règle de §4.5 : `enAttente` est une prop à part, et
  **l'apparence de `disabled` ne bouge pas**. **Corrigé à la livraison de `v1-32`, le 29/09/2026** :
  `v1-32` **écrit** `button.tsx`, d'une prop — `ref`, passée au `Pressable`, pour rendre le focus à
  « Je m'y engage » quand « Annuler » le fait réapparaître sur le plan (`v1-32` §3). Rien ne change sur
  le fond — `ref` et `enAttente` ne se touchent pas, et l'apparence de `disabled` n'a pas bougé —, mais
  la signature et la décomposition de `Button` ont une prop de plus : un conflit textuel à attendre.
- **`src/lib/mouvement.tsx`** : `v1-32` lit `HauteurSuivie` et `Apparition`. Or `Apparition` décide
  de jouer par `useJoueAuMontage`, que §2.7 scinde. Son comportement ne change pas : elle joue quand
  ce n'est pas le montage de son écran **et** que les animations ne sont pas réduites, comme
  aujourd'hui.
- **`scripts/verifier-parcours-reel.mjs`**, **`docs/recette/le-compte-et-les-modes.md`**,
  **`v1-13`** et **`produit.md`** : les deux chantiers y écrivent, à des endroits différents.
- **`src/types/mouvement.ts`**, **`scripts/relever-par-image.mjs`** et **`TESTING.md` §2.14**
  (ajouté à la livraison de `v1-32`, le 29/09/2026) : `v1-32` y a posé `defilementPourMontrer` — la
  distance à défiler pour qu'une boîte finisse à une marge du bord, sans que son haut passe au-dessus
  — et la mesure `defilement`, qui lit une boîte dans sa fenêtre de défilement image par image. La
  zone de §2.6, qui descend « jusqu'à ce que le groupe finisse 16 au-dessus du pied », est la même
  règle : **la réutiliser**, plutôt qu'en écrire une jumelle qui divergerait à la première retouche.
  Et la section K s'ajoute à la liste de §2.14 que `v1-32` vient d'allonger.

Le second à passer rebalaie ces fichiers sur `main` avant de pousser (`CLAUDE.md`, « Avant de lancer
une vague »).

## 4. Les chantiers

Les numéros d'écart renvoient à la liste « Ce qui change » du handoff (seize écarts).

### 4.1 L'ordre des modes et leurs familles

**Écarts 3, 4** · **Effort** petit · **Dépend de** rien.

**Pour la personne** : le deux-roues motorisé passe de la huitième à la troisième place, et la liste
se lit en trois blocs sans intertitre. Même ordre sur « Lequel ? » et sur les autres modes des
sorties.

- **Où** :
  - `src/constants/transport-modes.ts` : la liste ordonnée par famille (§2.1), et les trois tableaux
    de choix réordonnés à la main pour la suivre ;
  - les trois étapes : les familles sont des sous-vues **sans rôle** dans le `GroupeDeChoix`. Les
    flèches du clavier ne les voient pas : `src/lib/groupe-au-clavier.ts` prend les options dont le
    groupe est **le plus proche** (`closest`).
- **La liste dépliée des sorties** : « Voir les autres modes » ajoute ses cinq modes en **un bloc
  sous les quatre premiers**, rangé par famille. Il ne les intercale pas dans les quatre. Le premier
  révélé reste à la place du lien et reçoit le focus (`FRONT.md` §2.4).
- **La garde qui deviendrait muette** : la section H de `scripts/verifier-etats-export.mjs` écrit
  « Bus » en dur comme premier mode révélé. Après le réordonnancement, c'est « Deux-roues motorisé ».
  - La première moitié de H tomberait.
  - **La seconde deviendrait muette**, et c'est le plus grave : elle vérifie qu'aucun focus n'a
    touché « Bus » au montage. Un focus volé au montage (mutation H2) passerait par le deux-roues,
    et la garde resterait verte.

  H lit donc le premier révélé dans le tableau littéral `LEISURE_MODE_CHOICES_MORE`, par le fichier
  source et une expression régulière, comme `verifier-parcours-reel.mjs` lit `theme.ts` : c'est ce
  qui oblige ce tableau à rester littéral (§2.1). Si le motif ne trouve rien, H échoue en le disant,
  plutôt que de retomber sur un nom écrit en dur. **H2 se rejoue.**
- **La section F** presse Espace sur « Bus » dans la liste du trajet, à 560 px de haut, et exige que
  la page puisse défiler sous lui. Le mode descend d'un rang et les rangées rétrécissent. Calculé et
  non mesuré : la zone reste plus courte que la liste, donc la page défile encore. La section se
  rejoue ; si sa mesure devient impossible, elle le dit elle-même (« la mesure ne peut pas se
  prendre ») et c'est sa hauteur qu'on ajuste, pas son assertion.
- **Les copies de la liste** : les `.jsx` du kit (`CommuteModeStep`, `CommuteExtraStep`,
  `LeisureDetailStep`) recopient les libellés dans l'ordre et suivent dans cette PR (§4.9). L'aperçu
  `.design-sync/previews/MissingModeLink.tsx` suit à la prochaine synchronisation.
- **À ne pas casser** : les neuf modes, la voiture non découpée par motorisation (brief §3), et les
  clés `voiture_solo` / `voiture_covoiturage`, que `leisure-detail.tsx` écrit en dur pour retrouver
  la rangée cochée.

### 4.2 Les rangées de 48 et les écarts

**Écarts 1, 2, 5** · **Effort** petit · **Dépend de** §4.1 (mêmes fichiers).

**Pour la personne** : neuf modes tiennent sous la question sans défiler. C'est la moitié de la
réponse du handoff à la question 1 du §7 ; l'autre moitié est qu'aucune ligne ne s'écrit plus à
l'arrivée (§4.6).

- **Où** : `mode-list-item.tsx`, avec `minHeight` `ControlHeight.target`, un rembourrage vertical de
  `Spacing.one` et le libellé centré, pour qu'un libellé agrandi grandisse la rangée au lieu de
  déborder. Le composant est partagé : les réponses des précisions et « Lequel ? » passent à 48
  aussi.
- **Les écarts** : 4 dans une famille, 16 entre deux familles, 4 entre deux réponses d'une
  précision. Et sur l'étape du mode, 16 entre le titre et la liste, 8 entre la liste et le lien du
  mode manquant.
- **Ce qu'il faut ouvrir avant** : `EXPO.md` §1.6. **En Yoga, les marges ne fusionnent pas** : un
  écart différent selon la frontière se pose d'un seul côté, ou par le `gap` du conteneur. L'étape
  du mode en a trois (titre–liste, liste–lien, et les familles).
- **Ce qui l'éprouve** : la vérification visuelle (§8, point 3) aux quatre cadres des planches A et
  B.

### 4.3 La boîte de précision

**Écarts 6, 7** · **Effort** moyen · **Dépend de** §4.2.

**Pour la personne** : sous « Voiture (covoiturage) », les deux questions tiennent dans une seule
boîte et dans le champ ; à 360 px, les cinq puces du nombre de personnes tiennent sur une rangée.

- **Où** : `boite-de-precision.tsx` à créer (§2.2). Retrait de 16, fond `backgroundElement`, rayon
  `Radius.field`, rembourrage 12, 16 entre deux groupes, 8 au-dessus (dans le `Depliage`) et 8
  au-dessous. `precision-mode.tsx` et `precision-chiffres.tsx` perdent leur boîte et gardent
  l'intitulé et le groupe.
- **Les boîtes à deux groupes** :
  - sous le covoiturage du trajet et sous celui des sorties (motorisation, puis nombre de
    personnes) ;
  - sous « En voiture » des longs trajets (les mêmes) ;
  - sous un second mode qui a un type, dans « Lequel ? » (le type, puis la part du trajet : §2.2).
- **La règle d'accessibilité ne bouge pas** (`v1-29`, 25/09/2026) : une boîte à deux précisions
  porte **deux** `radiogroup`, chacun nommé par sa question, posés dans le groupe du mode. Jamais un
  groupe fusionné.
- **Ce qui l'éprouve** : le parcours réel vérifie à chaque étape que tout choix répond au
  `radiogroup` nommé le plus proche et qu'aucun groupe n'en coche deux (`TESTING.md` §2.12). Une
  boîte qui fusionnerait ses deux groupes y tomberait, **mais seulement là où il passe** : aucun des
  deux profils ne choisit un covoiturage ni un second mode, et seule la boîte des longs trajets y
  est rendue avec ses deux groupes cochés. Les boîtes du covoiturage se vérifient dans la section K
  (§6.2).
- **À ne pas casser** : la précision reste **sous** l'option qu'elle précise, à l'intérieur de la
  liste (`precision-mode.tsx` dit pourquoi : elle tombait à 242 px hors champ quand elle vivait
  après la liste).

### 4.4 Ce qui manque, nommé par son champ

**Écart 15** · **Effort** petit · **Dépend de** rien. Il peut passer en premier.

- **Où** : `src/types/bilan.ts`. `manqueDeLEtape` rend `{ champ, phrase } | null` ; `ChampDuBilan`,
  les deux tables de §2.3 et `seMarque` s'y ajoutent. `isStepComplete` dérive toujours de
  `manqueDeLEtape`. `src/app/bilan/index.tsx` passe l'objet à `StepShell`.
- **Ce qui l'éprouve** :
  - les tests existants de `manqueDeLEtape` suivent la forme : les phrases ne changent pas, et une
    assertion le dit ;
  - un test de propriétés, avec le générateur à graine du test de `normaliserReponses` : sur des
    milliers de réponses tirées, le champ rendu appartient toujours à la table de son étape. C'est
    ce qui rend la table **fermée**, et ce qui rougit le jour où `manqueDeLEtape` réclame un champ
    que personne n'a déclaré ;
  - `seMarque` rend faux pour la question principale de chaque étape, et vrai pour tout autre champ
    de la table.
- **À ne pas casser** : l'ordre des réclamations, qui suit l'ordre de l'écran. La distance des
  sorties se réclame en dernier, parce qu'elle est plus bas que la précision du mode.

### 4.5 Le « Suivant » en attente

**Écart 10** · **Effort** petit · **Dépend de** §4.4.

- **Où** :
  - `button.tsx` gagne une prop `enAttente` : fond `backgroundElement`, texte `textTertiary`, et
    `backgroundPressed` sous le doigt (§2.8). Ni `disabled`, ni `aria-disabled`. **L'apparence de
    `disabled` ne change pas** : d'autres écrans la lisent, dont le « C'est noté » de la feuille
    d'engagement (§3, « Ce qui tourne à côté »).
  - `step-shell.tsx` : `nextDisabled` disparaît. Son « Suivant » n'a plus de `disabled` : les
    branches d'envoi sont mortes (§2.4).
  - `src/app/bilan/index.tsx` : les deux gardes de `handleNext` (§2.4).
- **Ce qu'il faut ouvrir avant** : `EXPO.md` §1.5. Un `aria-disabled` posé à la main sur un
  `Pressable` de react-native-web est écrasé par `disabled`, et un `aria-disabled` vrai sur un bouton
  y pose l'attribut natif, qui rend le bouton inerte. **Un bouton qui agit ne peut donc pas s'y dire
  indisponible**, et ce n'est pas un défaut à contourner : un bouton qui agit n'est pas indisponible
  au sens de WAI-ARIA (handoff, §7.3).
- **Le nom ne change jamais** : « Suivant », ou « Voir mon bilan » à la dernière étape. Un nom qui
  changerait à chaque réponse ferait réannoncer le bouton (`FRONT.md` §1.4).
- **Le parcours réel ne s'arrête plus au bon endroit.** Playwright attendait que le bouton soit
  actif avant de cliquer ; un « Suivant » en attente n'étant plus inactif, le clic part aussitôt.
  Un parcours qui avancerait sur une étape incomplète échouerait à l'étape d'après, sous un message
  qui nommerait la mauvaise cause. Dans `scripts/verifier-parcours-reel.mjs`, `suivant()` attend
  donc, après le clic, **l'une des deux issues** :
  - l'étape a changé ;
  - la ligne « Il manque encore » est apparue, en fondu. Le parcours s'arrête alors en la citant.

  **`jusquAVoirMonBilan` clique « Suivant » par `bouton()` et non par `suivant()`** : il passe par le
  même contrôle.

### 4.6 La demande : la ligne, la marque, le focus

**Écarts 8, 9, 11** (et le geste de l'écart 12) · **Effort** grand · **Dépend de** §4.4, §4.5.

**Pour la personne** : rien à l'arrivée, rien sous le doigt pendant qu'on répond. Au toucher du
« Suivant » gris, dans cet ordre :

1. le focus va à ce qui manque ;
2. l'écran y défile s'il le faut ;
3. la question passe en vert ;
4. « Il manque encore … » apparaît au-dessus des boutons, et c'est un lien vers la même question.

Tout reste jusqu'à ce que l'étape soit complète.

- **L'état** : `demande`, local à `StepShell`.
  - Il passe à vrai au toucher du « Suivant » en attente, ou de la ligne.
  - Il retombe à faux dès que `manque` devient nul, et à chaque nouvelle étape (la clé d'`entree`).
  - Tant qu'il est vrai et l'étape incomplète, **la ligne et la marque suivent ce qui manque** : un
    autre mode choisi pendant la demande fait réclamer sa précision (§2.9). Le focus et le
    défilement, eux, n'ont lieu qu'au geste.
  - Une fois retombée, un nouveau manque ne se dit qu'au prochain toucher : c'est la décision 1.
- **La ligne** : `TextLink` (`type="small"`, `weight={600}`, `themeColor="accentText"`), cible de 48,
  alignée sur les boutons, 8 au-dessus d'eux, dans une `Apparition`.
  - **Le pied a besoin de son propre `SansApparitionAuMontage`** : il est hors de celui du contenu,
    et une `Apparition` sans fournisseur se pose sans jouer (`src/lib/mouvement.tsx`).
  - **Jamais `role="alert"`** : ce n'est pas un échec, et le focus qui part vers la question fait
    déjà l'annonce.
- **La marque** : l'intitulé du champ qui manque passe en `accentText` 600, depuis sa couleur
  d'aujourd'hui. `textSecondary` pour une précision, `textTertiary` pour « Lequel ? », les intitulés
  du contexte et « Environ combien, pour un aller ? », `text` pour un sous-titre d'étape (les vols, les
  sorties, la distance du trajet). **Jamais la question principale** (`seMarque`, §2.3).
- **Le focus** : `donnerLeFocus` sur la cible de l'ancre (§2.5), **au geste**. Sur web, `preventScroll`
  laisse le défilement à `StepShell`. Quand ce qui manque se saisit au clavier, la cible est le
  `TextInput`, et le geste appelle aussi son `focus()` sur natif (§2.5) : le clavier s'ouvre, et
  c'est ce qu'on attend de lui. C'est le cas de la distance du trajet quand l'étape montre le champ
  en kilomètres (en tranches, c'est le groupe), et de « la distance d'une sortie » sous « Plus de
  30 km ».
- **Les neuf étapes s'enregistrent** (§2.3, première table) : un champ qui peut manquer doit toujours
  avoir où mener. `ChampsDeContexte` s'enregistre aussi, et son crochet ne fait rien dans `/contexte`.
- **Ce qu'il faut ouvrir avant** : `FRONT.md` §1.4 (le nom annoncé est le texte affiché) et §2.4
  (focus, `TextLink`, choix), et `src/lib/focus.ts` (la moitié native de `donnerLeFocus` n'est
  éprouvée par aucune suite).
- **À relire en passant** : les commentaires qui décrivent l'ancien comportement.
  - Dans `step-shell.tsx` : celui de la ligne, et celui de son effet de focus (« un bouton désactivé
    perd le focus »).
  - Dans `src/types/bilan.ts` : celui de `teletravailSePose`, celui d'`avancementDeLaReprise`, et
    l'en-tête de `manqueDeLEtape`, qui disent tous « Suivant » inactif ou grisé.
  - L'en-tête de la section G de `scripts/verifier-etats-export.mjs` (« le « Suivant » de l'étape qui
    arrive étant inactif »). La section G elle-même reste valide : le focus suit toujours l'étape.

### 4.7 Les deux défilements

**Écarts 12, 13** · **Effort** moyen · **Dépend de** §4.3, §4.6.

- **Une dérivation pure, dans `src/types/`, testée** (`FRONT.md` §1.1 : une dérivation qui décide de
  ce qu'on voit sort de l'écran). Elle reçoit :
  - le décalage courant et la hauteur visible de la zone ;
  - le haut et le bas de la cible ;
  - les marges : 16 au-dessus du pied, 24 sous l'en-tête ;
  - pour une ouverture, une borne : le haut du choix qui l'a déclenchée, 8 px sous le bord (§2.2).

  Elle rend le nouveau décalage, ou rien.
  - Une cible déjà entière dans la zone ne fait rien défiler.
  - Une cible sous le pied remonte juste assez pour s'arrêter 16 au-dessus.
  - Une cible plus haute que la zone s'aligne en haut.
  - Une ouverture ne fait jamais passer le choix qui l'a déclenchée au-dessus du bord : la borne
    gagne sur la marge du bas.
- **Vers ce qui manque** (écart 12) : au geste de la demande, après la mesure du pied (§2.6).
- **À l'ouverture** (écart 13) : les trois appelants de `suivieALOuverture` (§2.2) annoncent leur
  hauteur finale et leur place au premier `onLayout` d'un dépli **qui suit un geste** (§2.7).
  `StepShell` défile aussitôt, en même temps que le dépli. Le focus ne bouge pas.
- **L'animation est celle de la plateforme** : `scrollTo({ animated: true })`, qui ne prend ni durée
  ni courbe. Sous la préférence, `animated: false`.
- **Ce qu'il faut ouvrir avant** : `EXPO.md` §1.5, « La fin d'un défilement ne s'annonce pas sur
  web ». Rien ne doit attendre la fin d'un `scrollTo` animé, et une position lue pendant qu'il court
  se trompe.
- **Ce qui l'éprouve** : les tests de la dérivation. Ils ne recopient pas les chiffres des planches :
  ce sont des mesures du canvas, pas des attentes du dépôt. Et la section K (§6.2), sur deux cas des
  planches : le vélo à 360, et les sorties dont la distance est sous le pied.

### 4.8 Le filet du pied

**Écart 14** · **Effort** petit · **Dépend de** §4.7 (même lecture du défilement).

- **Où** : `step-shell.tsx`. Le trait de `bande-haute.tsx` : `StyleSheet.hairlineWidth`, couleur
  `border`, pleine largeur, en position absolue en haut du pied, donc rien ne bouge quand il
  apparaît. Sans animation.
- **Quand** : le contenu continue sous le pied au-delà de sa marge basse de 24. C'est une dérivation
  pure, à côté de celle de §4.7. Elle se relit à `onScroll` (avec un `scrollEventThrottle`) et à
  `onContentSizeChange`, et aussi quand la zone change de hauteur : la ligne qui apparaît rétrécit
  la zone de 56 px à la taille de police normale, et davantage au-delà.
- **Ce qui l'éprouve** : la section K, dans ses deux moitiés : présent sur les sorties à l'arrivée,
  absent sur une étape courte.

### 4.9 Le kit, dans la même PR

**Écart 16** (le thème sombre, sans jeton neuf) · **Effort** moyen · **Dépend de** tout le reste.

Tout est sous `docs/design/design-system/components/`.

- **Les fiches des composants touchés** :
  - `StepShell`, `ModeListItem`, `PrecisionMode`, `PrecisionChiffres`, `CommuteModeStep`, `Button` ;
  - les `.jsx` de `LeisureDetailStep` et `CommuteExtraStep`, qui recopient les listes ;
  - `LongTripsStep.jsx`, qui dessine deux boîtes sous la voiture ;
  - les `.d.ts` de `Chip`, `ChoiceRow` et `NumericField` (la prop `ref`).
- **`bilan/bilan.card.js`** : il recopie `manqueDeLEtape`, passe `nextDisabled`, et son en-tête dit
  « Suivant » inactif.
- **Les exemples d'usage des `.prompt.md`** qui passent `nextDisabled` : `CommuteHasTripStep`,
  `CommuteDaysDistanceStep`, `CommuteExtraStep` et `LeisureDetailStep`.
- **Une fiche pour `BoiteDePrecision`** (`.jsx`, `.d.ts`, `.prompt.md`), chargée par
  `components/loader.js`, avec sa ligne `// Source : src/…` en tête. Sans elle,
  `scripts/verifier-miroir-du-kit.mjs` rougit : le refus 1 sans fiche, le refus 4 sans source.
- **Ce que le miroir ne voit pas** : la justesse d'une fiche. C'est la relecture qui la tient
  (`v1-29` §5), et la contre-lecture de §8 la regarde nommément.
- **Les aperçus de `.design-sync/previews/` suivent à la prochaine synchronisation**, selon
  `.design-sync/NOTES.md` ; aucune garde de la CI ne les tient. Sept seront faux après cette PR, et
  `props-check.py` en signalera une partie :
  - `MissingModeLink.tsx`, pour l'ordre ;
  - `StepShell.tsx`, `CommuteModeStep.tsx`, `CommuteHasTripStep.tsx`,
    `CommuteDaysDistanceStep.tsx`, `CommuteExtraStep.tsx` et `Button.tsx`, qui passent
    `nextDisabled` ou `manque` en chaîne, ou décrivent l'ancienne ligne.

  Les nommer dans la description de la PR suffit à ce que la synchronisation suivante les reprenne.

## 5. L'ordre, et pourquoi une seule PR

§4.4 → §4.1 → §4.2 → §4.3 → §4.5 → §4.6 → §4.7 → §4.8 → les gardes (§6) → §4.9 → les documents
(§7). Un commit par chantier.

**Une seule PR**, pour trois raisons :

- **Le jugement au doigt porte sur l'ensemble.** La ligne 11.19 de `v1-13` se rend sur ce qui
  sortira, pas sur une moitié.
- **La liste ne tient qu'à deux conditions réunies** (handoff, §7.1) : les rangées de 48 **et**
  aucune ligne à l'arrivée. Les trois premiers chantiers seuls livreraient une liste qui déborde
  encore de la ligne.
- **Le relevé de §3 ne sépare rien** : une seconde PR réécrirait les mêmes fichiers.

## 6. Les gardes, et les mutations qui les éprouvent

### 6.1 Jest (`src/types`, logique pure)

- `manqueDeLEtape` : la forme, les phrases inchangées, la table fermée par propriétés, et `seMarque`
  (§4.4).
- Les deux dérivations de §4.7 et §4.8.
- L'ordre des listes : chaque liste est rangée par famille, dans l'ordre déclaré ; le trajet porte
  les neuf entrées ; et les deux listes des sorties couvrent ensemble tous les modes, chacun une
  fois.

### 6.2 L'export : une section K dans `scripts/verifier-etats-export.mjs`

Sans réseau, depuis un brouillon posé dans le stockage, comme les sections F, H et J. `ouvrir()`
fixe aujourd'hui la largeur à 390 : il gagne un paramètre pour les cas à 360. **Chaque moitié
positive porte sur ce que le HTML statique ne dit pas** (`TESTING.md` §2.12).

| Cas | Ce qui est relevé |
|---|---|
| Étape du mode, covoiturage, « Hybride » coché, personnes vides, 390 × 844 (planche A3) | **À l'arrivée** : aucune ligne « Il manque encore », l'intitulé des personnes dans sa couleur d'aujourd'hui. **Le « Suivant » en attente** ne porte ni `disabled` ni `aria-disabled`. **La boîte** porte deux `radiogroup` nommés par leurs questions, dont le groupe le plus proche est celui des modes (§4.3) |
| Le même, « Suivant » touché (A4) | L'étape n'a pas changé ; la ligne dit « Il manque encore le nombre de personnes dans la voiture. » ; l'intitulé est en `accentText`, **lu dans `theme.ts`**, pas recopié ; le focus est sur « 2 personnes » |
| Le même, « Suivant » activé par un Entrée **maintenu** : deux `keydown` (le second répété), puis `keyup` | La demande, comme au toucher, et **aucune option cochée** (§2.10). Un appui simple ne prouverait rien : même avec la demande partie à l'appui, le relâchement tomberait sur une option qui n'a pas reçu l'appui, et react-native-web ne l'activerait pas |
| Le même, après un défilement à la main qui remonte la question hors de la zone, la ligne touchée | La zone redescend jusqu'à la question, le focus y revient (§2.6, le geste suivant) |
| Le même, « 2 » choisi | La ligne est partie, l'intitulé a repris sa couleur ; « Suivant » mène à l'étape suivante |
| A4, puis « Retour », puis « Suivant » : on revient sur l'étape du mode, encore incomplète | **Aucune ligne** : la demande est retombée en changeant d'étape |
| Rien de choisi, « Suivant » touché (A6) | La ligne dit « Il manque encore ton mode de transport. » ; le focus est sur « Voiture (seul) » ; **le titre n'a pas changé de couleur** |
| Sorties, « Voiture (seul) » et « Thermique », distance vide, 390 × 844 (D1, D2) | **Le filet** est là à l'arrivée ; au toucher, la zone descend jusqu'à ce que le groupe des tranches finisse 16 au-dessus du pied (au pixel près), et le focus est sur « Moins de 5 km ». Image par image : des positions intermédiaires ; sous la préférence, aucune |
| Étape courte (« As-tu un trajet régulier… ») | **Pas de filet** : la moitié négative |
| Étape du mode à 360 × 800, « Vélo » touché (B6) | La zone remonte jusqu'à ce que la boîte finisse 16 au-dessus du pied, et le focus reste sur « Vélo ». Sous la préférence, posé dès la première image |
| La même étape, à 360 × 800, rouverte depuis un brouillon où « Vélo » est déjà choisi | **Rien ne défile au montage**. À 390, la boîte du vélo s'arrête au-dessus du pied (738 contre 742) : la moitié serait vraie par construction, et sa mutation ne ferait rien tomber |
| `/bilan?etape=context` sur un questionnaire vierge, les trois réponses données (le télétravail ne se pose pas sans jours de trajet), « Voir mon bilan » touché | **Rien n'est soumis** : l'écran revient à la première étape incomplète (§2.4) |

**La section H** lit son premier révélé dans la source (§4.1), et H2 se rejoue. **La section J** doit
rester verte : à 390 × 844, la motorisation sous « Voiture (seul) » s'arrête au-dessus du pied (table
du handoff, « Commun à toutes les étapes » : 506 contre 742), donc son relevé de position n'est pas
troublé par le défilement neuf.

### 6.3 Le parcours réel

`suivant()` et `jusquAVoirMonBilan` attendent l'une des deux issues d'un « Suivant » (§4.5). La
vérification des groupes, inchangée, garde la boîte des longs trajets, la seule que le parcours rend
avec ses deux groupes (§4.3).

### 6.4 Les mutations à jouer

Une à la fois, **chacune avec son propre export** (`--clear`, puis un marqueur du code courant
retrouvé dans le bundle : `EXPO.md` §1.1), **sur un fichier égal au commit** (`TESTING.md` §2.14,
point 5). Elles se consignent datées en tête de la garde qui tombe.

| Ce qu'on casse | Ce qui doit tomber, et rien d'autre |
|---|---|
| La demande vraie au montage (« d'office ») | K, A3 : une ligne à l'arrivée |
| La demande qui ne retombe pas à la complétude | K, « 2 » choisi : la ligne reste |
| La demande qui ne retombe pas en changeant d'étape | K, A4 puis « Retour » puis « Suivant » : la ligne est là |
| Le focus qui ne part pas | K, A4, A6, D2 et la ligne touchée : le focus n'est pas sur la question |
| `seMarque` qui rend vrai pour la question principale | K, A6 (le titre a changé de couleur, parce que `TitreDEtape` lit sa marque : §2.3) **et** le test Jest de `seMarque` |
| La demande partie à l'appui (`onPressIn`) et non au relâchement | K, l'Entrée maintenu : la répétition tombe sur l'option, qui se coche |
| Le défilement vers ce qui manque retiré | K, D2 : le groupe reste sous le pied |
| `animated: true` sous la préférence | K, D2 et B6 sous la préférence : une position intermédiaire |
| Le défilement à l'ouverture retiré | K, B6 |
| Le défilement à l'ouverture joué au montage | K, le brouillon au vélo |
| Le filet toujours affiché, puis jamais | K, l'étape courte, puis K, D1 |
| `disabled` remis sur le « Suivant » en attente | K, A3 (l'attribut) ; et les clics de A4, A6 et D2 ne partent plus |
| La garde de la dernière étape réduite à l'étape courante | K, `?etape=context` : une soumission part |
| La garde de l'étape courante retirée de `handleNext` | aucune garde d'export : `StepShell` n'appelle déjà pas `onNext` sur une étape incomplète, donc c'est **par construction** une seconde garde. Un test d'écran (`TESTING.md` §2.10) ne vaut que si l'on nomme une mutation qu'il fait tomber et que rien d'autre ne voit, et celle-ci en est une : écrire le test, ou consigner pourquoi on ne l'écrit pas |
| « Bus » remis en dur dans H | H, sur le premier révélé |

### 6.5 Ce qui n'est pas gardé, et qu'il ne faut pas prétendre gardé

- **Tout ce qui se passe sur natif** : TalkBack, le défilement d'Android, le clavier qui s'ouvre sur
  le champ de distance.
- **La police agrandie** : la ligne sur trois lignes, et la rangée qui grandit.
- **Les barres d'Android**, qui retirent 40 à 70 dp à la zone.

La recette les prend (§8).

## 7. Documents à tenir à jour, dans la même PR

- **`FRONT.md`** :
  - §2.6 : ce qui manque se dit au toucher, les familles, les deux défilements, le filet ;
  - §2.4 : le « Suivant » en attente n'est pas désactivé, et pourquoi ;
  - §2.12 : le défilement est animé par la plateforme et posé sous la préférence.
- **`EXPO.md` §1.5** : la conséquence, pour un bouton qui agit, de `aria-disabled` réécrit depuis
  `disabled`.
- **`TESTING.md` §2.14** : la section K dans la liste des gardes image par image.
- **`CLAUDE.md`**, le paragraphe du télétravail (C5.4) : « ne toucher que l'écran laisse « Suivant »
  inactif **pour toujours** sous un message qui nomme une question absente ». Le défaut change de
  forme : le « Suivant » en attente mènerait à une question absente (§2.5).
- **Les commentaires** : ceux de §4.6, « À relire en passant ».
- **La fiche de recette `docs/recette/le-compte-et-les-modes.md`** : ses lignes 02.2 et 02.6 attendent
  un « Suivant » qui « reste inactif », et la 02.10 décrit l'écran d'avant. Un parcours changé sans sa
  fiche se lit « non conforme » à la séance suivante (`RECETTE.md`).
- **Le kit** : §4.9.
- **Le dossier de design** : `README.md` de
  [`docs/design/v1-31-l-ecran-du-mode/`](../design/v1-31-l-ecran-du-mode/), section « Ce que
  l'implémentation corrigera par rapport au canvas ». Le canvas ne se réécrit pas.
- **`v1-13`** : la ligne 11.19 dit que l'implémentation est livrée et que le jugement au doigt
  attend le build. Et `docs/architecture/produit.md`.
- **Ce document** : §9 et §10.

## 8. Vérifier, livrer

1. `npx tsc --noEmit`, `npm run lint`, `npm test`.
2. Chaque garde neuve **éprouvée en la cassant** (§6.4), les mutations consignées dans son fichier.
3. **La vérification visuelle** : `expo export --platform web`, puis Playwright sur `dist/`, à
   390 × 844 et 360 × 800, en clair et en sombre. Elle se compare aux captures du dossier de design
   (`captures/`, `captures/sombre/`), planche par planche, **aux valeurs du handoff** et non aux
   marges du HTML du canvas (handoff, « Le DOM du canvas n'est pas celui du dépôt »).
4. La contre-lecture du diff entier par le sous-agent `contre-lecture`, en lui donnant ce document
   et le handoff.
5. `/rejouer-la-ci` (`node scripts/rejouer-la-ci.mjs`).
6. **Le poids du déploiement mesuré hors ligne** (`VERCEL.md` §1.2), comparé au dernier relevé
   (4,16 Mio le 25/09/2026). Ce chantier ne touche pas `api/` : un écart s'explique dans la PR avant
   de fusionner.
7. **Le build EAS se demande** avant d'être lancé : au plus un tous les deux jours (registre
   d'exploitation §3.3).
8. **La recette sur appareil** (`RECETTE.md`), ligne 11.19 de `v1-13` :
   - remplir l'écran du mode au doigt et répondre à la seule question — est-ce encore pénible ? ;
   - vérifier que TalkBack enchaîne le « Suivant » et le groupe qui reçoit le focus, et qu'il ne dit
     plus « indisponible » (handoff, §7.3) ;
   - vérifier que le filet se voit sur un écran réel ;
   - vérifier que les neuf modes tiennent sous les barres d'Android ;
   - vérifier que le défilement à l'ouverture ne se fait pas sentir comme un saut ;
   - refaire le tout sous « Supprimer les animations », en relançant l'app après le changement.

## 9. Les écarts, consignés

Même rôle que `v1-17` §9 : ce qui est **volontairement** rendu autrement que dessiné, avec la raison.
Un écart non consigné est un écart qu'un prochain passage « corrigera » dans le mauvais sens. Les
lignes 1 à 11 sont posées par ce document, dont les quatre dernières après sa contre-lecture ;
l'implémentation ajoute les siennes en dessous.

§2.9 et §2.10 ne sont pas des écarts : ce sont des lectures du handoff, écrites pour qu'un
implémenteur ne les tranche pas autrement. §2.9 se pose à la personne qui pilote si la recette la
dément.

| # | Le handoff ou le canvas | Ce qui est livré | Pourquoi |
|---|---|---|---|
| 1 | L'ordre de « Lequel ? » vit dans les clés de `TRANSPORT_MODE_LABELS` | Une liste ordonnée par famille, d'où les trois listes dérivent | §2.1 : l'ordre des clés d'un objet est un accident |
| 2 | Une « variante sans boîte » de `PrecisionMode` et `PrecisionChiffres` | Ils ne dessinent jamais de boîte ; `BoiteDePrecision` la porte toujours, avec son dépli | §2.2 : deux façons de dessiner une boîte divergent, et le défilement doit savoir qui l'annonce |
| 3 | Le défilement à l'ouverture « d'une précision » | Aussi « Lequel ? » et la distance libre des sorties ; jamais les modes que « Voir les autres modes » révèle | §2.2 : la règle du handoff, appliquée à tout ce qui s'ouvre sous le doigt, et une liste fermée |
| 4 | Ce qui manque est une phrase | Un champ logique et sa phrase ; la distance du trajet est un seul champ pour deux colonnes | §2.3 |
| 5 | Le pied mesure 102 ou 158 | La hauteur relevée après l'apparition de la ligne | §2.6 : une police agrandie |
| 6 | `enAttente` : « l'apparence du désactivé, rien d'autre » | Et `backgroundPressed` sous le doigt | §2.8 : sinon `accentPressed` |
| 7 | Rien sur `handleNext` | Il refuse une étape incomplète, en seconde garde ; à la dernière étape, toutes les étapes visibles | §2.4 : la dernière étape soumet, et `?etape=` permettait déjà d'y arriver avec un questionnaire vierge |
| 8 | « Une boîte pour deux précisions d'une même voiture » : trois boîtes | Quatre familles de boîtes à deux groupes, dont le second mode et sa part | §2.2 : le handoff oublie « Lequel ? », où deux dépliés séparés feraient partir deux annonces à la fois |
| 9 | `disabled` « reste pour l'envoi en cours (« Enregistrement… ») » (écart 10) | Le « Suivant » de `StepShell` n'a plus aucun `disabled` | §2.4 : `StepShell` n'est pas rendu pendant l'envoi, et c'est le verrou `soumissionEnCours` qui garde la double soumission |
| 10 | La borne : « le mode choisi » | Le choix qui a déclenché l'ouverture | §2.2 : trois ouvertures n'ont pas de mode au-dessus d'elles |
| 11 | « Vient d'un geste » lu comme « pas au montage » | Un drapeau armé par un toucher ou une touche sur l'étape | §2.7 : le préremplissage arrive après le montage |

**Trois écarts sont déjà connus du dossier de design** (son `README.md`, « Ce que l'implémentation
corrigera ») : le dépli et le défilement du prototype sont approximés, le DOM du canvas n'est pas
celui du dépôt, et les cadres n'ont pas de barre d'état. Ils ne demandent rien ici : les valeurs à
suivre sont celles du handoff.

## 10. État d'avancement

| § | Travail | État |
|---|---|---|
| — | Ce document | fait, 29/09/2026, et contre-lu le jour même (§13) |
| — | Relevé de §3 et tables de §2.3, refaits contre `main` (7dce4ae) | fait, 29/09/2026 : inchangés. `v1-32`, fusionné entre-temps, n'a touché aucun fichier du questionnaire ; il a donné à `button.tsx` sa prop `ref` (déjà noté en §3) et à `src/types/mouvement.ts` `defilementPourMontrer`, réutilisée en §4.7 |
| 4.4 | Ce qui manque, nommé par son champ | fait, 29/09/2026 : `ChampDuBilan`, `CHAMPS_DE_L_ETAPE`, `QUESTION_PRINCIPALE`, `seMarque` ; quatre mutations consignées dans `bilan.test.ts` |
| 4.1 | L'ordre et les familles, section H | fait, 29/09/2026 : `MODES_PAR_FAMILLE`, `FAMILLE_DU_MODE`, `enFamilles` et leur test ; section H lit le premier révélé dans la source, H2 rejouée |
| 4.2 | Les rangées de 48 et les écarts | fait, 29/09/2026 : mesuré sur l'export à 390 × 844 et 360 × 800, titre 82 → 178, liste 194 → 682, rangées de 48, écarts 4 et 16, lien 690 → 738 — les valeurs du handoff (A1, B1) au pixel |
| 4.3 | La boîte de précision | fait, 29/09/2026 : `BoiteDePrecision` porte le dépli et la boîte ; quatre familles de boîtes à deux groupes. Mesuré : covoiturage 302 → 650 à 390 comme à 360, les cinq puces sur une rangée à 360 ; train 470 → 674 (A2, B2, A5) |
| 4.5 | Le « Suivant » en attente, `handleNext`, `suivant()` | à faire |
| 4.6 | La demande : ligne, marque, focus, ancres | à faire |
| 4.7 | Les deux défilements, `Depliage` | à faire |
| 4.8 | Le filet du pied | à faire |
| 6 | Section K, mutations de §6.4, H2 rejouée | à faire |
| 4.9 | Le kit | à faire |
| 7 | Les documents | à faire |
| 8.1 à 8.6 | Vérifications, contre-lecture, rejeu de la CI, poids Vercel | à faire |
| 8.7 | Build EAS | à demander |
| 8.8 | Recette sur appareil (`v1-13` §11.19) | après le build |

## 11. Ce qu'il ne faut pas casser

**Ce que le brief pose comme non négociable (§3)** :

- les neuf modes ;
- la voiture non découpée par motorisation dans la liste ;
- une précision ouverte est obligatoire ;
- ce qui manque ne se dit jamais comme une erreur : ni rouge, ni `role="alert"` ;
- aucune précision préremplie.

**Et ce que le dépôt a déjà payé** :

- **La précision vit dans le groupe de son mode**, un `radiogroup` par précision (`v1-29`).
- **Le focus ne part jamais au montage** (`FRONT.md` §2.4), et `donnerLeFocus` garde `preventScroll`.
- **`normaliserReponses` n'est pas touchée.** La sous-réponse effacée quand on change d'avis est la
  gêne non retenue du brief, ni résolue ni aggravée.
- **Aucune phrase nouvelle** : la ligne dit ce que `manqueDeLEtape` dit déjà.
- **Ni jeton, ni route, ni migration.**
- **« Réduire les animations »** : rien ne s'anime sous la préférence, défilement compris.
- **L'écran `/contexte` ne change pas** (§2.5).

## 12. Comment reprendre

- **Lire, dans cet ordre** :
  - ce document ;
  - le [`HANDOFF.md`](../design/v1-31-l-ecran-du-mode/HANDOFF.md), en entier ;
  - `FRONT.md`, `EXPO.md` et `TESTING.md` aux sections que chaque chantier nomme ;
  - le skill `/mouvement`, avant §4.6 et §4.7.
- **Ouvrir le canvas** : `docs/design/v1-31-l-ecran-du-mode/Canvas.dc.html` s'ouvre dans un
  navigateur (il charge React depuis unpkg). Le prototype (planche P) se joue à 390 et 360, avec
  et sans animations. Les captures sont dans `captures/`.
- **Relever avant d'écrire** : les tables de §2.3 et de §3 datent du 29/09/2026. Un chantier fusionné
  entre-temps sur le questionnaire les invaliderait sans rien dire.
- **§10 se tient à jour à chaque commit**, pas à la fin.

## 13. La contre-lecture du 29/09/2026

Le sous-agent `contre-lecture` a relu ce plan avant sa PR. Il a rendu dix-huit constats, et tous sont
repris dans cette version. Ils sont consignés ici et non en §9 : un écart est un choix, ceux-ci sont
des fautes du plan. Les plus lourds pour l'implémentation :

- **Une famille de boîtes oubliée** : le second mode et sa part, dans « Lequel ? » (§2.2). Le
  handoff l'oubliait aussi.
- **Un clavier qui ne s'ouvrait pas** : sur natif, `donnerLeFocus` n'envoie qu'un événement
  d'accessibilité (§2.5).
- **Un défilement qui ne serait jamais parti au second geste**, parce qu'il attendait un `onLayout`
  qui ne vient pas (§2.6).
- **Une section H qui n'aurait pas pu lire une liste dérivée** (§2.1, §4.1).
- **Un défaut antérieur au plan** : `/bilan?etape=context` soumettait un questionnaire vierge
  complété de replis (§2.4).
- **Un relevé incomplet** : la fiche de recette, `bilan.card.js`, les exemples des `.prompt.md`, les
  aperçus et trois commentaires de `src/types/bilan.ts` (§3, §4.9, §7).
- **Des attendus de mutation faux**, dont un qui rendait muette la garde du titre (§2.3, §6.4).

**Un constat n'a pas été repris tel quel.** Il demandait de poser à la personne qui pilote la question
du suivi de ce qui manque pendant la demande. Le handoff y répond (« Tout cela reste jusqu'à ce que
l'étape soit complète »), et le prototype du canvas le joue : §2.9 l'écrit comme une lecture, et dit à
quelle condition elle se pose.

