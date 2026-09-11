# Ramille — les conventions de la maison

Ramille est une app française de sensibilisation à l'empreinte carbone des transports :
un questionnaire en neuf étapes → une restitution chiffrée → un plan (une action engagée par
saison, avec une intention) → un point régulier → un suivi. **Tout est en français, au
tutoiement** : libellés, messages d'erreur, contenu. Une maquette en anglais est hors sujet.

Ramille est **aussi le nom de la mascotte** : produit et personnage ne font qu'un.

## Les deux voix, et il ne faut pas les mélanger

**Le produit** parle en voix neutre et porte les chiffres. Il énonce des faits sans les
qualifier : « 0,6 t au-dessus de la moyenne en France », jamais « c'est trop ». Les titres
d'écran sont des phrases en casse de phrase : « Ton plan », « Où tu te situes ».

**Ramille** (composants `Mascot`, `RamilleDit`) parle à la première personne, court, au
tutoiement. Trois règles, tenues par un test dans le dépôt :

- **jamais un nombre dans sa bouche** — les chiffres restent au produit, et c'est ce qui
  garantit qu'elle ne commente jamais une empreinte ;
- jamais « tu devrais », jamais « il faut » ;
- jamais un accord qui genre (« Tu t'y es engagé » → « Ton engagement »).

Exemples justes : « Bien joué — chaque changement compte. » · « Pas cette fois-ci. Rien
d'obligatoire, on se repose la question au prochain point. » · « Je te fais signe lundi. »

**La mascotte n'apparaît jamais à côté d'un chiffre lourd** — ni près du total d'empreinte,
ni près des kilos d'une action, ni près du cap de la saison. Y mettre un visage serait
commenter, et le produit ne commente pas.

## Ce que le produit ne fait jamais

- **Aucune mécanique d'échec** : pas de streak, de série cassée, de score, de badge, de
  période manquée. Une période sans réponse n'apparaît pas du tout. « Changer d'avis » libère
  sans rien compter. Une hausse d'empreinte est un fait, jamais une faute.
- **Aucune couleur d'alerte** : pas de rouge, pas d'orange, pas d'icône d'avertissement. Il y
  a **un seul accent**, le vert forêt `--color-accent`, et il marque **ce qui est dominant ou
  actionnable** — jamais un verdict.
- Pas de dégradé, pas d'image de fond, pas de texture, pas de glassmorphisme. Quasi aucune
  ombre : seul le bouton Google en porte une. Les seules transparences sont le voile de
  feuille (`--color-scrim`) et l'action estompée à 0,72 — qui reste cliquable.
- Pas d'emoji, pas de caractère unicode en guise d'icône. Pas de point d'exclamation en
  dehors d'une réplique de Ramille.
- Pas de célébration, pas de confetti, pas de son. L'animation est rare et signifiante.
- **Pas de bibliothèque d'icônes** : trois tracés dessinés dans le dépôt (onglet Plan, onglet
  Suivi, compte), plus la coche de l'action engagée. N'en invente pas un quatrième.

## Les chiffres

- Sous la tonne, on affiche des **kilos arrondis** ; au-dessus, le dixième de tonne. Sans
  cette bascule, tout ce qui vaut moins de 50 kg s'affiche « 0,0 t ».
- Le repère 2050 s'appelle **« Repère »**, jamais « Objectif » : aucune source publique ne
  donne d'objectif 2050 par poste individuel, c'est une dérivation. Il n'apparaît qu'une fois
  qu'on est passé sous la moyenne française — au-dessus, c'est un gouffre.
- **Le nombre de paliers restants ne s'affiche jamais.**
- Les facteurs d'émission sont ceux de l'ADEME en **ACV complète** (usage + fabrication).

## Les erreurs

Ton neutre, dans la page, jamais une alerte. On dit **ce qui est attendu** plutôt que ce qui
est faux, et on n'affirme jamais un fait sur les données de la personne :

> « Cette adresse semble incomplète. » · « L'envoi n'a pas abouti. Vérifie l'adresse et
> réessaie. » · « Ton bilan n'a pas pu être affiché. Il n'est pas perdu, réessaie dans un
> instant. »

Hors ligne, **on ne dit jamais « tu n'as rien »** : c'est une affirmation sur ses données, pas
un constat de lecture.

## Composer un écran

- **Deux onglets, et deux seulement** : Plan (le présent) et Suivi (l'historique). Tout le
  reste n'est pas un lieu — le questionnaire et l'onboarding sont des **flux** plein écran
  sans barre, le compte est un **détour**. Un troisième onglet est presque toujours une erreur.
- Un écran d'onglet porte `BandeHaute` en haut (52 px, le nom centré, `CompteBouton` à
  droite) et `BarreOnglets` en bas. **Le nom, pas le visage** : la mascotte n'est pas un logo
  d'en-tête.
- Un écran de questionnaire, c'est `StepShell` : en-tête `ProgressHeader`, contenu défilant,
  **pied collant** hors défilement pour le bouton principal. `manque` reçoit un fragment
  (« la distance d'un aller »), le composant écrit « Il manque encore … ».
- Le bouton principal est pleine largeur (54 de haut, rayon 27). Dans une rangée
  Retour + Suivant, Retour garde sa largeur et Suivant porte `flex`.
- **Désactivé = fond élément + texte tertiaire**, jamais une opacité — et le libellé ne change
  pas : ce qui manque se dit à côté.
- Les listes de choix exclusifs sont des `ChoiceRow` ou des `ModeListItem`, jamais des boutons.
  Une précision qui dépend d'un choix (`PrecisionMode`) s'ouvre **juste sous l'item choisi**,
  à un seul niveau — la profondeur coûte plus cher en abandon qu'une puce de plus.
- Deux registres de carte : **neutre** (fond élément sans bordure, ou bordure 1 px sur blanc)
  et **saillante** (bordure accent 2 px + fond teinté + étiquette majuscule à pastille-coche)
  — la saillante dit quelle action porte l'engagement, et il n'y en a qu'une par saison.
- Contenu large au maximum 800 px sur web.

## Accessibilité

Un texte cliquable est un `TextLink`, jamais un `Pressable` autour d'un texte : le libellé
annoncé **est** le texte affiché, et la cible fait 44 px sans déplacer le texte. Les listes de
choix exclusifs s'annoncent en `radio`, seul rôle qui dit « sélectionné ». La mascotte et les
illustrations sont masquées aux lecteurs d'écran — elles accompagnent un texte qui dit déjà
tout.

## Où lire la suite

`guidelines/readme.md` porte les fondations complètes (palette exacte, échelle typographique,
rayons, hauteurs, iconographie, la géométrie de la mascotte). Chaque
`components/<groupe>/<Nom>/<Nom>.prompt.md` porte l'usage attendu du composant, avec un
exemple tiré du produit réel.
