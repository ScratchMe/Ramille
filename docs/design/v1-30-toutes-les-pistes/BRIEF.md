# Brief pour Claude Design — « Toutes les pistes » : ce qu'on lit, et ce qu'on touche

Écrit le 28/09/2026, à partir du constat 14.7 de la recette du 18/09/2026
([`v1-13`](../../architecture/v1-13-audit-et-chantiers.md) §14.7) et de l'issue
[#235](https://github.com/ScratchMe/Ramille/issues/235). Ses quatre écarts à la planche A2 ont été
réparés à part (#234, livré par [#238](https://github.com/ScratchMe/Ramille/pull/238)) : **l'écran
qu'on juge ici est donc celui de la planche, livré en entier**, et ce qui reste est une question de
design, pas un patch.

**Ce brief demande l'UX autant que l'UI.** Ce n'est pas « rendez les lignes plus grandes » : c'est
le parcours de quelqu'un devant une dizaine de leviers chiffrés — les parcourir, en ouvrir deux pour
les comparer, en choisir un, revenir — et l'apparence des lignes n'en est qu'une partie.

## 1. Ce qu'on demande

1. **La taille et le poids des lignes.** Le titre d'une ligne est en `small` — **14 px** — et en
   `textSecondary` : le **contenu principal** de l'écran rendu dans la plus petite taille du système,
   dans une couleur atténuée. La recette a dit « peur que tout soit trop petit sur mobile », et le
   doute est fondé. La **cible**, elle, est bonne : une rangée mesure 52 px, au-dessus des 48 que
   `ControlHeight.target` nomme depuis le 24/09.
2. **« Choisir » ne se donne pas pour un bouton.** C'est un texte 14 px 600 `accentText`, sans cadre
   ni fond. **C'est la deuxième séance consécutive qui le trouve** : la recette du 14/09 avait
   constaté que ces lignes ne se donnaient pas pour cliquables, et le correctif d'alors — ajouter le
   mot « Choisir » — n'a pas refermé la question. **Un mot ne fait pas une affordance.**
3. **Le parcours de comparaison.** L'écran existe pour **comparer** deux leviers — c'est la raison
   écrite pour laquelle plusieurs lignes s'ouvrent à la fois — et il se referme désormais par
   « Réduire ». La question n'est pas de refaire ce mécanisme, c'est de savoir s'il **aide à
   décider** : deux cartes ouvertes à trois lignes d'écart se comparent-elles vraiment ?

## 2. Ce qui existe déjà, et qu'il ne faut pas redessiner en double

- **Le plan montre deux cartes pleines**, le meilleur levier du poste dominant en tête, puis un lien
  « **Voir toutes les pistes · N** » dont le compte est dans le libellé (`ACTIONS_EN_AVANT = 2`).
  L'écran des pistes est **une page de la pile du plan**, pas un troisième lieu.
- **La planche A2** du canvas [`v1-17`](../v1-17-densite-du-plan/HANDOFF.md) (« A2 — Toutes les pistes
  · l'écran ») : les pistes **groupées par poste**, sous une tête de groupe `small` 600
  `textTertiary` ; des lignes séparées par un filet ; une ligne qui s'ouvre **en carte sur place** et
  se referme par « Réduire » ; une ligne engagée qui **reste une ligne**, avec une pastille-coche de
  20 px et « Engagée », et ne s'ouvre pas.
- **La carte d'action** (`ActionCard`, via `CarteDePiste`) est **la même** sur le plan et dans la
  liste : ce qui est rendu deux fois s'écrit une fois. Un canvas qui dessinerait une seconde carte
  pour la liste serait à refaire.

## 3. Ce qui ne se discute pas

- **Pas de balayage à la Tinder** — envisagé le 18/09 et écarté : un paquet de cartes montre une
  chose à la fois et suppose qu'on jette ce qu'on écarte. Ici rien ne se jette — ne pas choisir une
  piste ne la retire de rien —, l'écran existe pour **présenter pendant que le plan insiste**
  (`v1-17` §2), et la comparaison est son seul intérêt. S'y ajoutent une décision prise **une fois
  par saison** et non un flux à trier, et un chemin non gestuel qu'il faudrait de toute façon en
  parallèle.
- **Toute piste listée se choisit.** Les rangs disent l'**insistance**, jamais la **permission** :
  la recette du 14/09 avait trouvé des lignes chiffrées et inatteignables, et c'est fermé.
- **Une seule couleur d'accent, pas de gamification**, cibles de 48, Spline Sans pour toute phrase
  adressée à la personne — confirmés le 24/09/2026 (`v1-29`).
- **Ramille ne dit jamais un nombre** : une liste de gains est une liste de chiffres, elle est en
  voix produit.
- **Le dépôt n'a pas d'icônes aujourd'hui.** En proposer une n'est pas interdit, mais c'est une
  décision de système — une bibliothèque de plus, pour tout le produit — et elle doit être défendue
  comme telle. Le moyen déjà disponible de dire « bouton » est un cadre : une pastille bordée
  (`Radius.chip` ou `field`).

## 4. La matière, et ce qu'elle vaut

| Ce qu'on a | Ce que c'est | Ce qu'on ne peut pas en dire |
|---|---|---|
| De **zéro à une douzaine** de pistes par plan | Toutes celles dont le gain atteint 5 kg/an, triées | Le nombre dépend du profil : un cycliste en a zéro, un gros voyageur une dizaine |
| Le **gain** de chaque piste, en kg/an | Une **estimation** figée à la génération du plan | Jamais « tu éviteras N kg » : c'est ce que l'action vaudrait si elle était tenue |
| La **part** de l'empreinte | Le gain rapporté au total du bilan | — |
| Le **poste** de chaque piste | Trajet, loisirs, voyages — c'est ce qui groupe | — |
| Le **premier pas** | Une consigne pratique sans chiffre | Il ne s'affiche **qu'une fois l'action engagée** : avant le choix, il se lit comme une charge de plus |

## 5. Le mandat — ce que le canvas peut changer

- La **typographie** des lignes : taille, graisse, couleur du titre et du gain.
- L'**affordance** de « Choisir » : cadre, position, forme — et si le mot lui-même est le bon.
- La **structure** : têtes de groupe, séparation, ce qui distingue une ligne d'une carte ouverte.
- Le **parcours de comparaison** : ouvrir, comparer, réduire, choisir — et ce qu'on voit après
  « Choisir » (la feuille d'intention existe déjà ; son déclenchement peut être revu, pas son
  contenu).

## 6. Ce qu'on ne veut pas voir

- Un balayage, un carrousel, un paquet de cartes (§3).
- Un **bouton plein par ligne** : dix boutons de la couleur d'accent feraient concurrence aux deux
  cartes du plan, qui sont l'insistance du produit.
- Une piste **masquée**, grisée comme indisponible, ou reléguée derrière un second lien.
- Un classement présenté comme un score (« meilleure piste », médailles, étoiles).

## 7. Les écrans à dessiner

À **390 px** de large, et à **360 px** pour vérifier ce qui passe sur deux lignes :

- la liste à **dix pistes** (le profil 1 de la recette, ci-dessous), rien d'ouvert ;
- la même avec **deux lignes ouvertes** pour les comparer ;
- une **ligne engagée** au milieu de la liste ;
- ce qu'on voit juste après « Choisir ».

## 8. Questions ouvertes pour la session

- Le gain doit-il être lisible **sans ouvrir** la ligne, et à quelle taille, si le titre grandit ?
- Faut-il **grouper par poste**, ou la liste gagnerait-elle à rester triée par gain, le poste en
  étiquette ?
- Sur une liste de trois pistes — le cas courant d'un petit rouleur —, l'écran a-t-il encore une
  raison d'être, ou le plan suffit-il ?

## 9. Pour voir l'état actuel

`www.ramille.fr`, en navigation privée, avec le **profil 1** de
[`docs/recette/le-compte-et-les-modes.md`](../../recette/le-compte-et-les-modes.md) : il rend
**dix pistes**, les trois postes représentés, et le seul gain à quatre chiffres du parcours. Le
design system est dans [`docs/design/design-system/`](../design-system/) et s'invoque comme skill
(`ramille-design`) ; **il est à resynchroniser vers Claude Design avant la session** (`v1-29` §5),
et en cas d'écart avec le code, **le code gagne**.
