# Brief pour Claude Design — l'étape du contexte : des aides qui prennent de la place

Écrit le 03/10/2026, à partir de la capture de l'étape que la décision D8 de
[`v1-34`](../../architecture/v1-34-ce-qui-passe-pres-de-chez-soi.md) soumettait à la personne qui
pilote avant la fusion. D8 prévoyait Claude Design si la capture ne convainquait pas. Elle n'a pas
convaincu :

> « Faisons intervenir Claude Design. Ne serait-ce que pour savoir comment bien afficher l'aide. Ça
> commence à prendre de la place. »

**Le premier sujet du brief est donc l'affichage des deux lignes d'aide**, et la place qu'elles
prennent sur une étape qui défile déjà. Deux autres sujets viennent avec, parce qu'ils se voient sur les
mêmes captures et touchent les mêmes composants : la façon dont une rangée **à cocher** se distingue
des rangées à choix unique, et la marque d'une puce cochée, qui fait bouger ses voisines.
Un quatrième, plus petit, vient d'un autre écran et a été joint ensuite : un bouton en attente qui
disparaît sur l'encart gris où il est posé (§4.5).

**Ce brief demande l'UX autant que l'UI.** La personne arrive à la dernière étape d'un questionnaire
de neuf. On lui pose quatre questions sur l'endroit où elle vit. Elle doit comprendre sans chercher
ce que veut dire « Périurbain » et ce qu'elle doit cocher, puis finir.

## 1. L'étape telle qu'elle est, mesurée

Mesurée le 03/10/2026 sur l'export web de la branche de la PR
[#330](https://github.com/ScratchMe/Ramille/pull/330), avant sa fusion. Le trajet est régulier,
quatre jours par semaine, donc la question du télétravail se pose.

| | 390 × 844 | 360 × 800 |
|---|---|---|
| Zone qui défile : visible / contenu | 628 / **800 px** | 584 / **878 px** (1,5 écran) |
| Aide de la zone | 3 lignes, 60 px | 4 lignes, 80 px |
| Aide des transports | 2 lignes, 40 px | 2 lignes, 40 px |
| Puces des transports | 3 rangées | 3 rangées |
| Ce qui se voit sans défiler | jusqu'à la question des véhicules, ses puces coupées par le pied | jusqu'à « Rien de tout ça », coupée |

**Les deux aides font 100 px à 390, 120 px à 360**, soit plus de la moitié de ce qui dépasse à 390
(172 px).

De haut en bas :

1. **Le bandeau** : Ramille, « Contexte de mobilité », « Étape 9 sur 9 », la barre de progression.
2. **La phrase de Ramille**, posée **au-dessus** de la zone qui défile, donc fixe : « Ce qui est
   possible là où tu vis change ce que je te proposerai ensuite. »
3. **Le titre** : « Quel est ton contexte de mobilité ? »
4. **La phrase du calcul**, en `small` `textTertiary` : « Elles n'entrent pas dans le calcul de ton
   bilan. » Elle change pour qui sort rarement : le nombre de véhicules décide alors du mode de ses
   sorties, et la phrase le dit (`phraseDuCalculDuContexte`).
5. **« Dans quel type de zone vis-tu ? »** : trois puces équiréparties, Urbain dense, Périurbain,
   Rural. Sous la question, l'aide, une définition : « Urbain dense : une grande ville et sa proche
   banlieue. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village,
   la campagne. »
6. **« Près de chez toi, qu'est-ce que tu pourrais prendre ? »** : cinq puces **à cocher**, à largeur
   naturelle, qui passent à la ligne : Métro ou tram, RER ou Transilien, Train (TER, Intercités), Bus,
   Rien de tout ça. Sous la question, l'aide : « Coche tout ce qui passe assez souvent pour t'en
   servir. »
7. **« Combien de véhicules motorisés dans ton foyer ? »** : 0, 1, 2 ou plus.
8. **« Sur tes 4 jours de trajet, combien pourrais-tu travailler depuis chez toi ? »** : Aucun, Un
   jour, Deux ou plus. Seulement avec un trajet régulier d'au moins deux jours.
9. **Le pied, collant** : « Il manque encore … » au-dessus de « Retour » et « Voir mon bilan ».

Ce que les captures montrent, et que la mesure ne dit pas :

- **Une aide est plus foncée que la question qu'elle explique.** La question est en 14 px, graisse
  500, `textTertiary` (#5E655F). L'aide est en 14 px, graisse 500, `textSecondary` (#39403B). C'était
  voulu pour une seule aide (`v1-33` D4 : « un cran au-dessus de l'intitulé tertiaire »). Avec deux,
  l'étape se lit en deux blocs de texte sombre, et les questions passent au second plan.
- **Au défilement, l'aide de la zone vient se coller sous la phrase fixe de Ramille**, sans
  séparation, et se lit comme sa suite (capture `390-5`).
- **« Urbain dense » passe sur deux lignes à 360**, et sa rangée grandit d'autant.
- **La rangée à cocher ne se distingue des autres que par la forme de ses puces** (des pilules à
  largeur naturelle, là où les autres sont équiréparties) et par son aide. C'est le premier choix
  multiple du questionnaire, et le premier avec une réponse exclusive.

## 2. Ce qui existe déjà, et qu'il ne faut pas redessiner en double

- **`ChampsDeContexte`** porte les quatre questions, et il sert **deux écrans** : cette étape, et
  l'écran `/contexte`, qui corrige le contexte depuis le plan sans refaire de bilan. Là, pas de
  `StepShell`, pas de Ramille, une introduction à lui et un bouton « Enregistrer ». Une réponse pour
  l'étape vaut pour les deux.
- **`StepShell`** : le cadre de chaque étape, avec son bandeau, la zone qui défile et le pied
  collant. « Il manque encore … » y **mène** depuis `v1-31` : au toucher de « Voir mon bilan », la
  question qui manque passe en `accentText` 600 et le focus va à sa puce cochée, ou à la première.
- **`GroupeDeChoix`** nomme chaque série par sa question. C'est un `radiogroup` pour un choix unique
  et un `group` pour la rangée à cocher. Il sait aussi ranger une série en grille (`colonnes`, un
  maximum de colonnes égales, utilisé pour les jours de la semaine).
- **`Chip`** a deux formes, la pilule à largeur naturelle et la puce équirépartie. Une puce cochée a
  le fond accent plein, le texte `onAccent` et la graisse 600. Elle sert sur neuf écrans.
- **`FeuilleDuBas`** existe déjà, pour les rappels et le nouveau bilan. Si le canvas pose une aide
  dans une feuille, c'est ce composant, pas un second.

## 3. Ce qui ne se discute pas

- **Les quatre questions restent.** La question des transports a remplacé celle de l'accès (Bon,
  Limité, Inexistant) le 02/10/2026. La zone a été **gardée** le 03/10/2026 : elle est la seule à
  distinguer la campagne de la banlieue pour une même réponse « bus seul », et c'est ce qui décide de
  la comparaison à la moyenne française (`v1-34` §8).
- **Les mots sont décidés** : les questions (`v1-33` D4), l'aide de la zone (`v1-34` D6) et celle des
  transports (`v1-34` D2). Le canvas peut changer **où**, **quand**, **à quelle taille** et **dans
  quelle couleur** une aide se lit, et si elle se lit d'emblée ou à la demande. Il ne change pas ses
  mots. S'il pense qu'un mot doit changer, il le pose comme une question à part (§7).
- **« Rien de tout ça » exclut les autres, dans les deux sens.** La cocher décoche tout le reste ;
  cocher autre chose la décoche. Plus rien de coché, c'est pas de réponse. La rangée reste des cases à
  cocher dans un groupe nommé, jamais un `radiogroup`.
- **Une aide qu'on ne voit pas d'emblée reste atteignable au lecteur d'écran**, et jamais au seul
  survol : il n'y a pas de survol sur un téléphone.
- **Une seule couleur d'accent, des cibles de 48 px, Spline Sans** (`v1-29`). **Ramille ne dit jamais
  un nombre.** **Pas d'icônes** aujourd'hui dans le dépôt : en proposer une (un « ? », une coche) est
  une décision de système, à défendre comme telle.
- **Ce qui manque ne se dit jamais comme une erreur** : pas de rouge, pas de « Champ obligatoire ».
- **Le web est en thème clair**, forcé (`src/hooks/use-theme.ts`) : la palette sombre n'est pas
  validée. Les planches se dessinent en clair.

## 4. Le mandat : ce que le canvas peut changer

1. **L'affichage des deux aides.** C'est la demande. Où elles se posent (sous la question, sous les
   puces, dans une feuille, derrière un geste), leur taille, leur graisse, leur couleur, leur rapport
   à la question qu'elles expliquent, et leur séparation d'avec la phrase fixe de Ramille au
   défilement.
2. **La densité de l'étape** : les écarts entre les questions, la façon dont les cinq puces des
   transports se rangent (trois rangées aujourd'hui), et ce qui se voit avant de défiler à 390 × 844.
3. **La marque d'une puce cochée.** La graisse 600 élargit le libellé de 3 à 4 px. Dans la rangée
   qui passe à la ligne, une voisine saute alors à la ligne suivante au toucher : mesuré entre 343 et
   347 px de large sur « Métro ou tram » et « RER ou Transilien », à 303 et 304 px sur « Train (TER,
   Intercités) », et ailleurs avec une police agrandie. Trois réponses possibles :
   - garder la graisse, et le code réserve la place du gras ;
   - ne plus la changer, et le fond et la couleur du texte portent seuls la sélection ;
   - une autre marque, comme une coche, ce qui est une icône (§3).

   La réponse vaut pour **toutes** les puces du produit.
4. **Le choix multiple qui se reconnaît.** La rangée dit-elle assez, par sa forme et son aide, qu'on
   peut cocher plusieurs réponses, et que « Rien de tout ça » est à part ?
5. **Un bouton en attente posé sur un encart gris** — un constat d'un autre écran, joint à ce brief le
   03/10/2026 par la personne qui pilote. Au plan, quand on s'engage sur une action à jours sans en
   cocher aucun, « C'est noté » est **en attente** (`Button enAttente`) : il agit, et son toucher fait
   apparaître « Choisis au moins un jour. ». Son apparence est celle du désactivé, le fond
   `backgroundElement` — **le même gris que l'encart du choix des jours** dans lequel il est posé. Le
   bouton n'a plus de bord : il reste un libellé gris flottant à côté d'« Annuler »
   (`plan-c-est-note-en-attente.png`). Le questionnaire n'a pas ce défaut, son « Suivant » en attente
   est posé sur la page blanche. La question : **comment un bouton en attente se dessine sur une
   surface grise** — et la réponse vaut pour `Button`, donc partout où un bouton se pose dans un encart.
   Ce qui tient : l'apparence d'un bouton qui ne peut pas encore aboutir, jamais une opacité, le
   libellé qui ne change pas, et un bouton qui reste touchable.

## 5. Ce qu'on ne veut pas voir

- **Une étape de plus** pour alléger celle-ci : « Étape 9 sur 9 » ne devient pas 10.
- **Un menu déroulant** pour les transports, ou une liste qu'il faut ouvrir pour voir les réponses.
- **Une aide réécrite** sans le dire.
- **Une définition de la zone qu'il faut aller chercher pour répondre juste**, sans que rien ne dise
  qu'elle existe. Elle est là parce que « Périurbain » est un mot d'urbaniste (`v1-33` D4) ; cachée,
  elle ne sera pas lue.
- **Un second composant** pour `/contexte`.

## 6. Les écrans à dessiner

À **390 × 844**, et à **360 × 800** pour vérifier ce qui passe. Le trajet est régulier, quatre jours,
donc les quatre questions sont posées :

- l'étape, **rien de répondu** ;
- l'étape **remplie** : Périurbain ; Métro ou tram et Bus ; 1 ; Un jour ;
- **« Rien de tout ça » cochée** après Métro ou tram et Bus ;
- **« Voir mon bilan » touché**, la zone répondue, les transports non : ce que montre « Il manque
  encore ce qui passe près de chez toi » ;
- **l'écran `/contexte`** avec les mêmes réponses, pour montrer que la réponse tient sans `StepShell` ;
- si la marque d'une puce cochée change : **un autre écran à puces** (les jours et la distance du
  trajet, ou les longs trajets), pour montrer qu'elle tient ailleurs ;
- **le choix des jours de l'engagement, rien de coché, « C'est noté » touché** (§4.5), et le même
  choix avec deux jours cochés, pour voir le bouton passer de l'attente au principal.

## 7. Questions ouvertes pour la session

- Les quatre questions peuvent-elles tenir **sans défiler** à 390 × 844 ? Sinon, qu'est-ce qui
  défile, et la personne sait-elle qu'il y a une suite ?
- **La définition de la zone doit-elle rester visible d'emblée**, ou seulement quand on hésite ?
  Avec quel signe qu'elle existe ?
- **L'aide des transports appartient-elle à la question ou aux puces** ? Elle dit « assez souvent
  pour t'en servir » : c'est une règle de réponse, pas une explication du mot.
- **Gras, pas gras, ou coche** pour une puce cochée (§4.3) ?
- La phrase de Ramille, le titre et la phrase du calcul : **trois lignes avant la première question**.
  Peuvent-elles se resserrer sans rien perdre ? À traiter seulement si ça libère la place que les
  aides demandent.

## 8. Pour voir l'état actuel

**L'étape est en production depuis la fusion de la PR #330, le 03/10/2026** : `www.ramille.fr`, en
navigation privée, « Découvrir mon impact », puis le questionnaire jusqu'à l'étape 9. Le brief a été
écrit juste avant, et ses captures, prises sur la branche, font référence, à 2× dans `captures/avant/` :

| Capture | Ce qu'elle montre |
|---|---|
| `390-1-premier-ecran.png` | 390 × 844, rien de répondu, ce qui se voit sans défiler |
| `390-2-etape-entiere-vide.png` | l'étape entière, fenêtre étirée, rien de répondu |
| `390-3-etape-entiere-remplie.png` | la même, remplie |
| `390-4-rien-de-tout-ca.png` | « Rien de tout ça » cochée après Métro ou tram et Bus |
| `390-5-il-manque-voir-mon-bilan-touche.png` | « Voir mon bilan » touché, les transports sans réponse ; l'aide de la zone collée sous Ramille |
| `360-1-premier-ecran.png` | 360 × 800, rien de répondu |
| `360-2-etape-entiere-vide.png` | l'étape entière à 360, rien de répondu |
| `360-3-etape-entiere-remplie.png` | la même, remplie : Urbain dense, RER ou Transilien et Train |
| `plan-c-est-note-en-attente.png` | au plan, le choix des jours, rien de coché, « C'est noté » touché (§4.5) — rendu du kit |

Les fenêtres étirées montrent l'étape entière d'un seul tenant : le blanc au-dessus des boutons vient
de là.

Le composant est dans le kit, [`ChampsDeContexte.jsx`](../design-system/components/bilan/ChampsDeContexte.jsx).
**Le projet Claude Design « Ramille » a cette version depuis la huitième synchronisation**, le
03/10/2026 : `ChampsDeContexte` et `ContextStep` y montrent la question des transports, et
`ActionCommitment` / `DemandeSansJour` le bouton en attente du §4.5. Ses conventions disent aussi,
depuis ce jour-là, comment une série à cocher se compose. En cas d'écart entre le kit et le code,
**le code gagne**.
