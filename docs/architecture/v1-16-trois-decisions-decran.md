# v1-16 — Trois décisions d'écran, ou ce que le produit décidait à la place de la personne

**Date** : 15/09/2026. **Statut** : page de décision, avant tout code — c'est la règle du lot 4
(`v1-13` §7). **Chantiers** : les trois constats d'écran de la recette sur appareil du 14/09/2026,
[#177](https://github.com/ScratchMe/TraceVerte/issues/177) (§12.2),
[#178](https://github.com/ScratchMe/TraceVerte/issues/178) (§12.3) et
[#179](https://github.com/ScratchMe/TraceVerte/issues/179) (§12.4). Le quatrième, §12.5, est parti
le matin même en C4.5 ([`v1-15`](v1-15-hors-ligne.md)).

**Ce que ce document tranche** : où se pose la taille du covoiturage du trajet quotidien, ce que
vaut un binaire auquel personne n'a répondu, et ce qu'on doit à quelqu'un à qui l'on montre une
action. **Ce qu'il ne tranche pas** : la hiérarchie à trois rangs du plan, qui reste (C4.6), et le
`limit 2` du serveur, qui est parti avec elle.

---

## 1. Le fil commun, et ce qui n'en fait pas partie

Deux des trois constats disent la même chose sous deux formes : **le produit prend une décision à
la place de la personne, et ne le lui dit pas.**

- §12.3, le binaire du second mode arrive **déjà répondu** « Non ». Personne n'a rien décidé, et le
  chiffre en dépend.
- §12.4, le plan **montre** des actions chiffrées sur lesquelles on ne peut pas s'engager. Il a
  décidé, pour la personne, lesquelles des leviers qu'il lui présente lui sont permis.

§12.2 n'est pas de cette famille : c'est une incohérence de placement, héritée de C3.5. Elle est
dans la même page parce qu'elle vit dans les deux mêmes fichiers que §12.3 et qu'elle doit passer
avant — pas parce qu'elle raconte la même histoire.

**Le lien avec C3.4 / C3.5 / C3.6 est direct, et il vaut d'être nommé** : ces trois chantiers-là ont
retiré au calcul trois questions qu'il se posait tout seul, sous une règle écrite une fois pour les
trois — « laisser le choix facultatif reviendrait à garder le défaut pour tous ceux qui passent sans
répondre ». §12.3 est **la quatrième occurrence de ce motif**, restée en place parce qu'elle
préexistait à la règle. On applique la règle, on n'en invente pas une.

## 2. Le relevé de fichiers, et l'ordre qui en sort

Refait le 15/09/2026, parce que la colonne « Parallèle ? » de `v1-13` §2.3 est une intention et
s'est trompée quatre fois de suite.

| Fichier | 12.2 | 12.3 | 12.4 |
|---|:--:|:--:|:--:|
| `src/components/bilan/steps/commute-mode.tsx` | ● | | |
| `src/components/bilan/steps/commute-extra.tsx` | ● | ● | |
| `src/types/bilan.ts` | ● | ● | |
| `src/types/bilan.test.ts` | ● | ● | |
| `src/app/bilan/index.tsx` | | ● | |
| `src/lib/bilan-history.ts` | | ● | |
| `src/types/plan.ts` / `.test.ts` | | | ● |
| `src/app/(tabs)/plan.tsx` | | | ● |

**12.2 et 12.3 partagent trois fichiers, dont les deux qui portent le plus de sens.** Elles
s'enchaînent, 12.2 d'abord : elle **retire** de `commute-extra.tsx` le bloc du haut, et 12.3 réécrit
celui qui restait juste en dessous. Dans l'autre sens, le second chantier réécrirait un fichier que
le premier vient de réorganiser.

**12.4 est réellement disjointe** — aucun fichier en commun, et c'est la première fois de ce dépôt
qu'un relevé confirme la colonne au lieu de la démentir. Elle peut donc partir à n'importe quel
moment ; elle partira en dernier, tout arrivant dans la même livraison.

## 3. Décision 1 (§12.2) — la taille du covoiturage rejoint l'option qu'elle décrit

**Décidé : on rapatrie.** Le produit pose trois fois « vous êtes combien dans la voiture ? » et la
présente de deux façons — sous l'option choisie pour les sorties (`leisure-detail.tsx`) et les longs
trajets (`long-trips.tsx`), en tête de **l'écran suivant** pour le trajet quotidien
(`commute-extra.tsx`). C'est un reste d'avant C3.5, qui a introduit le motif imbriqué pour les deux
nouvelles sans reprendre l'ancienne.

Le motif imbriqué gagne, et pas par majorité : **la question décrit la voiture qu'on vient de
choisir**, exactement comme la motorisation qui s'ouvre déjà là. La séparer du choix, c'est demander
à la personne de se souvenir d'un écran à l'autre de quelle voiture on parle. `precision-mode.tsx`
porte déjà la raison, et elle n'est pas cosmétique.

Trois conséquences, dont une qui ne se voyait pas :

- la condition passe de `manqueDeLEtape('commute_extra')` à `manqueDeLEtape('commute_mode')`, après
  la motorisation et dans le même ordre que les sorties — « on nomme ce qu'il reste à faire, dans
  l'ordre où on le rencontre » ;
- le composant devient `PrecisionChiffres`, celui des deux jumelles, au lieu d'une rangée de `Chip`
  et d'un `radiogroup` écrits sur place. La contre-lecture du 14/09 avait aligné les **rôles
  d'accessibilité** des trois questions sans voir que le placement divergeait ; le rapatriement fait
  disparaître la copie plutôt que de la tenir d'accord une fois de plus ;
- **et `commute-extra.tsx` récupère un titre d'écran qu'il n'avait pas toujours.** Le `screenTitle`
  y était porté par le bloc du covoiturage, qui est **conditionnel** : quelqu'un qui ne covoiture pas
  voit déjà aujourd'hui cet écran commencer par un `subtitle`, sans titre. Le chantier ne crée donc
  pas ce défaut, il le referme — la question du second mode devient le titre, pour tout le monde.

## 4. Décision 2 (§12.3) — le troisième état vit dans le questionnaire, pas dans le schéma

**Décidé : `commute_second_mode_used` devient `boolean | null` côté client, et la colonne reste
`not null`.** C'est le point de la décision, et il n'est pas évident : l'issue supposait une
migration.

Le défaut d'abord. `EMPTY_BILAN_ANSWERS.commute_second_mode_used` vaut `false`, donc sur un
questionnaire vierge **« Non » est coché** avant que quiconque ait décidé, et `manqueDeLEtape` ne
bloque pas — on traverse la question sans la voir. Le défaut penche du mauvais côté : « je n'ai pas
de second mode » **sous-estime** l'empreinte d'un trajet intermodal, sur le poste qui décide du
poste dominant, donc du plan.

**Pourquoi pas de migration.** `null` ne décrit pas un bilan, il décrit un questionnaire en cours :
un bilan soumis a toujours une réponse, parce que l'étape est visible exactement quand la question
s'applique. Rendre la colonne nullable importerait dans le schéma un état transitoire d'écran, et —
c'est le vrai argument — la branche SQL du calcul est `if a.commute_second_mode_used and
a.commute_second_mode is not null`, où un `null` se comporte **exactement comme `false`**.
L'ambiguïté qu'on retire de l'écran reparaîtrait en base, muette, à l'endroit précis où elle fausse
un total. Le `not null` dit quelque chose de vrai ; on le garde.

Ce qui suit de ce choix :

- **`manqueDeLEtape('commute_extra')` refuse `null`**, en tête de l'étape — c'est la première chose
  que l'écran demande. Un re-bilan prérempli arrive avec une vraie réponse et ne bute pas ;
- **les deux chips n'ont rien à changer.** Elles sont écrites `=== true` et `=== false`, pas en
  vérité-vraie, donc `null` n'en coche aucune. C'est de la prudence d'un autre jour qui paye ici ;
- **`normaliserReponses` garde ses `false` là où ils veulent dire « effacé », et gagne un `null` là
  où il veut dire « à redemander ».** La distinction est la décision, en petit : sans trajet
  régulier (`commute_has_regular_trip === false`) la question ne s'applique pas, donc `false` ;
  quand un retour en arrière rend le second mode identique au mode principal, la règle actuelle
  répond **« Non » à la place de la personne** — exactement le défaut du chantier, dans un autre
  habit — donc `null`, et l'étape se redemande ;
- **l'insert coalesce, et ce repli est inatteignable.** `?? false` parce que le typecheck l'exige
  (la colonne est `not null` dans `database.types.ts`, et c'est le seul garde qui voit cette
  dérive), mais aucune des deux branches ne peut le produire : étape visible ⟹ complète, étape
  invisible ⟹ `normaliserReponses` a écrit `false`. On l'écrit quand même, et on écrit pourquoi ;
- **un brouillon écrit avant ce changement garde son `false`**, et on ne saura jamais s'il était une
  réponse ou un défaut. C'est le coût assumé : rien dans le brouillon ne distingue les deux, et
  l'app n'est pas publiée — la population concernée est celle des appareils de développement.

## 5. Décision 3 (§12.4) — l'insistance reste, la permission devient totale

**Décidé : les trois rangs restent, et toute action affichée devient engageable.** C4.6 a posé deux
cartes pleines, deux cartes estompées derrière « Voir d'autres pistes · N », puis des lignes simples.
Les lignes n'ont pas de bouton : sur un plan à six actions, deux leviers réels sont affichés,
chiffrés — et inatteignables.

**La hiérarchie n'est pas le problème et ne bouge pas.** « Une liste de six cartes pleines ne
présente plus un choix, elle présente un catalogue » reste vrai, et `pistesDuPlan` n'est pas touchée.

Ce qui tombe est **la porte de sortie écrite dans le rendu** :

> « Elles ne portent pas de bouton — s'engager sur l'une d'elles demande d'abord de la faire
> remonter, ce que le prochain re-bilan fait si le poste bouge. »

Elle demande à la personne de **changer sa vie pour que l'app la réordonne**. Or C4.6 existe
précisément parce que « l'autonomie de la personne s'exerçait sur deux leviers et les autres
restaient invisibles » (A13-18, arbitrage D18). Elle s'exerce aujourd'hui sur quatre, pas sur toutes
celles qu'on lui montre — le chantier a déplacé la frontière sans la retirer, et la phrase justifiait
la nouvelle frontière au lieu de la relever.

**La ligne s'ouvre en carte, sur place.** `carteDaction` est déjà une fabrique — elle rend la carte
pleine et la carte estompée, qui ne diffèrent que par leur opacité — donc déplier une ligne, c'est
l'appeler. Quatre points :

- **l'insistance porte alors la hiérarchie, la permission ne la porte plus.** Une ligne reste une
  ligne tant qu'on ne la touche pas : le plan continue de dire ce qu'il recommande ;
- **plusieurs lignes peuvent être ouvertes à la fois.** Un accordéon qui referme la précédente
  reprendrait d'une main ce qu'il vient de donner, et comparer deux leviers est exactement ce qu'on
  vient de rendre possible. L'état est local à l'écran et non persisté, comme `pistesDepliees` :
  c'est un geste de lecture, pas une préférence ;
- **une ligne qui ne porte qu'un nombre ne donne aucune raison d'être touchée**, et ce dépôt n'a pas
  de jeu d'icônes — l'affordance est donc un mot, et c'est « Choisir », celui que le produit emploie
  déjà pour ce geste (« Choisir une action », « Choisir une autre action » sur la carte d'ouverture).
  Il disparaît avec la ligne quand la carte s'ouvre, celle-ci portant son propre contrôle ;
- **la ligne devient un `Pressable` portant plusieurs textes**, donc elle prend un
  `accessibilityLabel` qui les recompose — la règle est déjà écrite dans CLAUDE.md pour la bannière
  du suivi. **Pas d'`accessibilityState`**, contrairement à ce que cette page annonçait avant
  l'écriture : la ligne n'est pas un contrôle qui bascule, elle est **remplacée** par la carte, donc
  un état « déplié » ne serait jamais annoncé que faux. Le libellé finit par « Choisir », qui dit
  ce que le toucher fait, et le gain s'y énonce « par an » — ce que l'œil déduit de la colonne et
  qu'une lecture à voix haute ne peut pas ;
- **elle passe à la cible de 44 px**, en hauteur et non en `hitSlop` : les rangées se touchent
  (`gap: 0`), donc des marges invisibles se recouvriraient et le bord entre deux lignes deviendrait
  ambigu ;
- **« Replier » referme aussi les cartes ouvertes.** Sans cette remise à zéro, redéplier ferait
  réapparaître des cartes là où le lien promet des lignes.

## 6. Ce qu'il ne faut pas casser

- **La règle de placement des précisions** (`precision-mode.tsx`) : une précision s'ouvre **sous**
  l'élément qui la déclenche, jamais après la liste. Le seul écart du dépôt est la distance ouverte
  des loisirs, et sa raison est écrite sur place (une rangée de puces n'a pas d'élément sous lequel
  se glisser).
- **`manqueDeLEtape` reste la seule liste de conditions**, `isStepComplete` en dérivant. Deux listes
  tenues en parallèle divergeraient en silence.
- **`normaliserReponses` reste idempotente**, et n'invente jamais une réponse : elle n'efface que ce
  qu'aucune question de l'écran ne porte plus. Le `null` de §12.3 n'est pas une invention — c'est le
  retrait d'une réponse que personne n'a donnée.
- **`pistesDuPlan` et ses deux constantes ne bougent pas** (§12.4) : le chantier porte sur ce que
  l'écran permet, pas sur ce qu'il classe.
- **Le `limit 2` ne revient pas dans le SQL.** C'est ce que C4.6 a retiré, et l'affichage décide
  depuis.

## 7. Ce qui ne se prouve qu'à la recette

Aucun des trois ne se vérifie par une suite de tests, et c'est à mettre dans la prochaine séance —
celle qui jouera aussi §11.5, débloquée par C4.5 le matin même :

- **§12.2** : que la taille du covoiturage se lise bien comme une précision de l'option, et que
  l'écran suivant ne paraisse pas vide avec sa seule question ;
- **§12.3** : qu'un questionnaire **vierge** arrive sur B1.6 sans rien de coché et que « Suivant »
  reste inactif — le constat d'origine avait failli partir à l'envers, ce qui avait été vu à l'écran
  (« Oui » coché) étant le préremplissage d'un re-bilan et non le défaut ;
- **§12.4** : qu'une ligne dépliée en carte reste lisible au milieu des autres, et que s'engager
  depuis là fasse bien remonter l'action en tête au rafraîchissement.
