# Brief pour Claude Design — l'écran du mode : une liste trop longue, et ce qui manque qui se lit mal

Écrit le 28/09/2026, à partir de la ligne 02.10 de la recette web du même jour
([`v1-13`](../../architecture/v1-13-audit-et-chantiers.md) §15), de l'issue
[#289](https://github.com/ScratchMe/Ramille/issues/289) et de la vérification sur appareil §11.19, qui posait la question depuis la livraison de C4.4 : **l'écran du mode est-il devenu
pénible ?** La personne qui pilote a répondu **oui**, et a nommé deux gênes — ce sont elles que ce
brief donne à résoudre, et elles seules :

1. **la longueur de la liste** ;
2. **ce qui manque se lit mal** — la ligne « Il manque encore… », collée au bouton grisé, est la
   seule indication de ce qui reste à faire.

Deux autres gênes possibles ont été proposées et **pas retenues** : les sous-questions en cascade
(« Voiture (covoiturage) » en ouvre deux) et le fait que changer d'avis efface la sous-réponse. Le
canvas n'a pas à les résoudre ; s'il les règle en passant, tant mieux, s'il les aggrave, c'est un
défaut.

**Ce brief demande l'UX autant que l'UI.** Ce n'est pas « resserrez les rangées » : c'est le geste de
quelqu'un qui choisit comment il va au travail, précise ce qu'on lui demande de préciser, et doit
comprendre sans chercher ce qui l'empêche d'avancer.

## 1. L'écran tel qu'il est, mesuré

Mesuré sur la production le 28/09/2026, à **390 × 844** (un téléphone courant), questionnaire à
l'étape 3 sur 9 :

| | Rien de choisi | « Voiture (covoiturage) » choisi |
|---|---|---|
| Hauteur de la liste des neuf modes | **502 px** | **918 px** |
| Zone qui défile : visible / contenu | 656 / **772 px** | 656 / **1 188 px** (1,8 écran) |
| « Il manque encore… » | « … ton mode de transport. » | « … la motorisation. » |

- **L'écran défile déjà avant qu'on ait rien choisi** : les neuf modes, sous la question et le
  bandeau d'étape, ne tiennent pas dans les 656 px visibles.
- **Cinq des neuf modes ouvrent une précision** sous eux, dans la liste (`PrecisionMode`) : « Voiture
  (seul) » (motorisation, quatre réponses), « Voiture (covoiturage) » (motorisation **et** nombre de
  personnes), « Deux-roues motorisé » (quatre types), « Train » (TER, RER ou Transilien, Intercités)
  et « Vélo » (mécanique, à assistance). La précision s'ouvre **sous l'élément choisi** et l'écran
  défile de lui-même pour la montrer.
- **« Il manque encore… »** est une ligne de **14 px, gris `textTertiary`, graisse 400**, dans la
  zone collante du bas, 43 px au-dessus d'un « Suivant » grisé. Elle nomme ce qui manque
  (`manqueDeLEtape`), mais ni où c'est ni comment y aller. Elle n'a pas de rôle d'alerte, et c'est
  voulu (ce n'est pas un échec).
- Même écran, même mécanique, pour le second mode (étape 4, « Lequel ? », sept modes) et pour le
  mode des sorties (étape 6, quatre modes puis « Voir les autres modes »).

## 2. Ce qui existe déjà, et qu'il ne faut pas redessiner en double

- **`StepShell`** : le cadre de chaque étape — bandeau, question, contenu qui défile, zone collante
  avec « Il manque encore… » et les boutons. Une réponse pour l'étape du mode vaut pour les neuf
  étapes : ce qui change « ce qui manque » change `StepShell`, pas un écran.
- **`GroupeDeChoix`, `ModeListItem`, `PrecisionMode`** : la liste est un groupe de boutons radio
  nommé, et la précision vit **dans** le groupe de son mode. C'est une règle d'accessibilité gardée
  par le parcours réel (`v1-29`, 25/09/2026) : un lecteur d'écran doit savoir à quelle question
  répond « Thermique ».
- **`FeuilleDuBas`** existe (la feuille des rappels, le nouveau bilan). Si le canvas propose d'y
  poser une précision, c'est ce composant, pas un second.
- **Le lien « Ton mode n'est pas dans la liste ? Dis-le-nous. »** reste : c'est la seule porte vers
  un mode manquant.

## 3. Ce qui ne se discute pas

- **Les neuf modes restent** : chacun change le calcul — un facteur d'émission à lui, ou, pour
  « Voiture (covoiturage) », le même facteur partagé entre les passagers —, et en retirer un le
  fausse. **La voiture ne se découpe pas par motorisation dans
  la liste** : « Voiture (seul) » et « Voiture (covoiturage) », puis la motorisation, **quatre
  réponses au même niveau** — jamais un second niveau « rechargeable ou non ? », la profondeur
  coûtant plus en abandon qu'une puce de plus (`CLAUDE.md`, « Base de données », le paragraphe du mode « voiture »).
- **Une précision ouverte est obligatoire** : sans elle, le calcul retomberait sur le mode générique,
  ce que C3.4 à C3.6 et C4.4 ont corrigé. Le canvas peut changer **où** et **quand** on la donne, pas
  la rendre facultative.
- **Ce qui manque ne se dit jamais comme une erreur** : pas de rouge (le produit n'en a pas), pas de
  « Champ obligatoire », pas d'alerte à chaque frappe. C'est une étape pas encore finie, pas une faute.
- **Une seule couleur d'accent, cibles de 48 px, Spline Sans** pour toute phrase adressée à la
  personne (`v1-29`, 24/09/2026). **Ramille ne dit jamais un nombre.**
- **Pas d'icônes** aujourd'hui dans le dépôt ; en proposer est une décision de système, à défendre
  comme telle.

## 4. Le mandat — ce que le canvas peut changer

- **La densité de la liste** : hauteur des rangées (sans passer sous 48 px de cible), regroupement
  visuel des modes (motorisés, transports en commun, actifs), ce qui se voit avant de défiler.
- **La place des précisions** : sous le mode (aujourd'hui), dans une feuille, ou en tête d'écran une
  fois le mode choisi — à condition de garder la règle d'accessibilité du §2.
- **La façon de dire ce qui manque** : où elle se lit, à quelle taille, et si elle **mène** à ce qui
  manque (un geste qui fait défiler jusqu'à la précision, par exemple).
- **Le lien entre le bouton grisé et la raison** : aujourd'hui deux objets voisins ; ils peuvent
  devenir un seul.

## 5. Ce qu'on ne veut pas voir

- Un **assistant en plus d'étapes** qui ferait passer le questionnaire de neuf à douze écrans pour
  raccourcir celui-ci : l'étape indique « Étape 3 sur 9 », et l'abandon se paie à chaque écran.
- Un **menu déroulant** ou une liste qu'il faut ouvrir pour voir les modes : la personne doit voir
  son mode sans chercher.
- Une ligne « il manque » **en rouge**, en majuscules, ou qui apparaît avant qu'on ait eu le temps
  de répondre.
- Des précisions **pré-remplies** par défaut : c'est exactement l'erreur que la question des vols
  courts a corrigée le 27/09 (un défaut choisi sans que personne l'ait dit).

## 6. Les écrans à dessiner

À **390 px** de large, et à **360 px** pour vérifier ce qui passe :

- l'étape du mode, **rien de choisi** ;
- **« Voiture (covoiturage) » choisi**, précisions vides — le cas le plus long ;
- le même, **une précision remplie sur deux** : ce qu'on voit de ce qui manque ;
- **« Train » choisi et précisé** : l'état « prêt à continuer » ;
- et, si la réponse touche `StepShell`, une autre étape (les vols, par exemple) pour montrer que la
  façon de dire ce qui manque tient ailleurs.

## 7. Questions ouvertes pour la session

- Neuf modes peuvent-ils tenir **sans défiler** à 390 × 844, sous la question, sans descendre sous
  les 48 px de cible ?
- « Ce qui manque » doit-il **pointer** vers la précision (défilement, mise en évidence) ou la
  **montrer** là où l'œil est déjà ?
- Si le bouton grisé porte la raison, que devient-il pour un lecteur d'écran, qui annonce déjà
  « Suivant, indisponible » ?

## 8. Pour voir l'état actuel

`www.ramille.fr`, en navigation privée : « Découvrir mon impact », puis l'onboarding jusqu'au
questionnaire, « Oui », cinq jours et 20 km — on arrive sur l'étape du mode. Le **profil 1** de
[`docs/recette/le-compte-et-les-modes.md`](../../recette/le-compte-et-les-modes.md) la traverse
avec un train précisé et un vélo en second mode. Le design system est dans
[`docs/design/design-system/`](../design-system/) et s'invoque comme skill (`ramille-design`) ; en cas
d'écart avec le code, **le code gagne**.
