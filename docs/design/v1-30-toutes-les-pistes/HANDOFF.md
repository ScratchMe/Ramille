# Handoff : Ramille — « Toutes les pistes » : ce qu'on lit, et ce qu'on touche

## Overview

Ce dossier répond au brief [`BRIEF.md`](BRIEF.md), écrit le 28/09/2026 à partir du constat 14.7 de
la recette du 18/09/2026 ([`v1-13`](../../architecture/v1-13-audit-et-chantiers.md) §14.7) et de
l'issue [#235](https://github.com/ScratchMe/Ramille/issues/235) (le brief de design de l'écran des
pistes). L'écran jugé est celui que la planche A2 du canvas [`v1-17`](../v1-17-densite-du-plan/HANDOFF.md)
a dessiné et que [#238](https://github.com/ScratchMe/Ramille/pull/238) (la réparation de ses quatre
écarts) a livré en entier.

**Le numéro de ce dossier est celui que le brief lui a donné, et il est déjà pris** :
[`docs/architecture/v1-30-les-transitions.md`](../../architecture/v1-30-les-transitions.md) porte le
même. Ce handoff écrit donc « v1-30-les-transitions » pour l'un, et « ce dossier » pour l'autre ; le
document d'implémentation prendra un autre numéro.

**Une seule idée, et le reste en découle : on compare sur la liste, on touche pour choisir.** La
ligne porte ce qu'on compare — le titre à la taille du contenu, le gain aligné dessous. « Choisir »
devient une pastille bordée, et il choisit vraiment : la ligne s'ouvre en carte **directement sur la
question** de l'intention (« Quand ? », « Quels jours ? »). La liste ne se réordonne plus quand on
s'engage, reste groupée par poste, et garde sa raison d'être dès trois pistes.

Cible : `ScratchMe/Ramille`, branche `main`, React Native / Expo Router. **Aucune migration, aucune
route, aucun jeton neuf.** Tout se passe dans l'écran des pistes ; `CarteDePiste` et
`ActionCommitment` gagnent chacun deux props (s'ouvrir sur le choix, rendre la main à « Annuler ») ;
`src/types/plan.ts` perd une règle (l'engagée d'abord, pour la liste) et gagne deux dérivations
affichées (le libellé de la pastille, l'intro).

## Les cinq décisions (28/09/2026)

Posées une à une à la personne qui pilote, au format du dépôt (le fait, l'enjeu, la recommandation,
ce qu'on casse si on se trompe). Les cinq ont suivi la recommandation.

| # | La question | Ce qui est décidé | Ce qu'on a accepté de casser |
|---|---|---|---|
| 1 | Où la personne compare-t-elle : sur la liste, ou en ouvrant les cartes ? | **Sur la liste.** La ligne porte ce qu'on compare ; « Choisir » ouvre la carte directement sur l'intention ; un seul choix en cours ; la part et la base apparaissent dans la carte, au moment du choix. | **L'ouverture de plusieurs cartes, décidée en [`v1-16`](../../architecture/v1-16-trois-decisions-decran.md) §5** après la recette du 14/09 pour comparer deux leviers, et « Réduire », ajouté par #238 (la réparation de la planche A2). La question avait d'abord attribué l'ouverture multiple à cette réparation ; la contre-lecture l'a relevé, la question a été reposée avec ce cadrage, et la décision confirmée. **Le document d'implémentation dit qu'il remplace `v1-16` §5 sur ce point.** |
| 2 | Quand une action est engagée, la liste se réorganise-t-elle autour d'elle ? | **Non : l'ordre du rang toute la saison.** La ligne engagée reste à sa place, marquée ; le plan, lui, garde l'engagée en tête. | Le plan et la liste ne s'accordent plus sur leur tête quand une action est engagée — ils s'accordent sur le classement. |
| 3 | Grouper par poste, ou trier par gain ? | **Grouper par poste**, comme la planche A2. | Qui lit de haut en bas en cherchant le plus gros gain peut s'arrêter avant les 101 kg du vélo (septième ligne du profil 1). |
| 4 | À trois pistes, l'écran garde-t-il sa raison d'être ? | **Oui, dès trois**, comme aujourd'hui. | Un écran un peu mince pour le petit rouleur : deux pistes connues et une nouvelle. |
| 5 | Quand une action est engagée, comment la liste dit-elle qu'en choisir une autre la remplace ? | **La pastille le dit : « Choisir à la place »**, l'expression que le plan emploie déjà. Écartées : l'intro seule, et une phrase neuve dans la carte qui nommerait l'action remplacée. | Une liste plus lourde : « Choisir à la place » neuf fois sur le profil 1, dans des pastilles presque deux fois plus larges. |

## À propos des fichiers de design

`Canvas.dc.html` est une **référence de design créée en HTML** : un prototype qui montre l'apparence
et le comportement attendus, pas du code à copier. La tâche est de **recréer ces écrans dans le
dépôt** (`ThemedText`, jetons de `theme.ts`, `CarteDePiste`, `HauteurSuivie`) avec ses conventions.
Le fichier référence `support.js` (le runtime des `.dc.html`, copie de `docs/design/support.js`) et
les polices du kit (`../design-system/assets/fonts/`) ; il s'ouvre dans un navigateur, le runtime
chargeant React depuis unpkg. Chaque cadre porte un `data-screen-label`, et sous chaque cadre une
note de conception dit l'intention. **A1 est cliquable** : toucher une ligne l'ouvre sur le choix,
rien de coché ; choisir une échéance ou des jours active « C'est noté », qui l'engage (dans l'app, on
revient au plan : B4) ; « Annuler » la referme. Une bascule fait passer toutes les planches en thème
sombre.

## Fidélité

**Haute fidélité.** Couleurs, tailles, rayons, hauteurs et copy sont définitifs et relevés du dépôt
(`src/constants/theme.ts`, `action-card.tsx`, `action-commitment.tsx`, `pistes.tsx`,
`src/types/rappels.ts`) ; les seules nouveautés sont listées dans la page Écarts. **Les chiffres sont
réels** : les dix pistes du profil 1 de
[`docs/recette/le-compte-et-les-modes.md`](../../recette/le-compte-et-les-modes.md) et les trois d'un
petit rouleur, relevées en production le 28/09/2026 (§ « Données relevées »). Les cadres des listes
et du plan (A0, A1, A1·360, A2, A2·360, B4) sont **allongés** pour tout montrer, un pointillé « 844 »
marquant sur les listes ce que montre le premier écran au-dessus de la barre d'onglets ; les autres
(A0b, B1, B2, B3, B5, C1) sont à la taille d'un appareil, 390 × 844 ou 360 × 800, défilés jusqu'à ce
qu'ils montrent. La géométrie des lignes et des cartes a été **mesurée dans le rendu**, pas estimée.

## Planche par planche

### A0 — Aujourd'hui · la liste livrée (référence)

L'écran de #238 (la réparation de la planche A2), redessiné pour comparer. Titre en `small` 14/20
`textSecondary`, gain 14 tertiaire à droite, « Choisir » 14/600 `accentText` sans forme, têtes de
groupe `small` 600 tertiaire. Rangées de 72 px à 390, 73 avec le filet (relevé dans le DOM de la
production : la plupart des titres tiennent sur deux lignes à 14). Le premier écran montre six pistes.

### A0b — Aujourd'hui · deux cartes ouvertes (référence)

Ce qui a motivé la décision n° 1. La carte du vol long-courrier et celle de l'aller-retour en avion,
une seule ligne entre elles : la seconde sort déjà de l'écran. Mesuré dans le rendu : une carte
ouverte fait 252 px, 304 avec « Réduire », dans une fenêtre de 688 px entre la bande et la barre
d'onglets. En s'ouvrant, le gain passe de la colonne de droite (14 px) à la gauche (20 px) et quitte
l'alignement des autres.

### A1 — La liste · dix pistes, rien d'engagé (390, cliquable)

Un écran de la pile du plan (`(tabs)/plan/pistes.tsx`) ; bande haute et barre d'onglets présentes.

- **« Retour au plan »** : inchangé — `TextLink` small 600 `accentText`, `role="link"`, cible 48,
  `revenirOu('/plan')`.
- **Titre** `screenTitle` « Toutes les pistes ».
- **Intro** `body` `textSecondary`, sans engagement : « Par poste, du plus gros gain au plus petit.
  Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan. »
- **Têtes de groupe** : `POSTE_LABEL` en `TypeScale.label` (13/18, +0,3) **600**, `textTertiary`,
  **en capitales** (`textTransform: 'uppercase'`), rôle en-tête de niveau 2 ; **24 au-dessus** (le
  `gap` de 16 du défilement + 8), 4 dessous. Ordre des groupes : celui où leur poste apparaît pour la
  première fois dans le rang — le poste du cycle d'abord.
- **Lignes** : voir « La ligne de piste » ci-dessous. Filet 1 `border` sous chaque ligne sauf la
  dernière du groupe (`filetsDesLignes`, inchangé).
- Profil 1, dans cet ordre : **Voyages longue distance** — 1 601, 277, 273, 48, 24, 23 kg ;
  **Loisirs du week-end** — 101, 67 kg ; **Trajet domicile-travail** — 36, 18 kg.
- Le premier écran montre la tête « Voyages » et quatre pistes (six aujourd'hui) ; l'écran allongé
  passe de 1 269 à 1 655 px.

### A1·360 — La liste à 360

À 360, **aucun titre du profil 1 ne dépasse deux lignes** (mesuré), et la ligne du gain tient
toujours en une. C'est la raison pour laquelle la pastille descend sur la ligne du gain : posée à côté
du titre, elle lui retirait 89 à 151 px et en mettait plusieurs sur trois lignes.

### A2 — Une ligne engagée · au milieu de la liste (390)

- **L'ordre ne bouge pas** (décision n° 2) : « Regrouper deux sorties en une seule, une fois sur
  cinq » reste cinquième, dans les loisirs, sous la sortie à vélo. La liste ouvre toujours sur le vol
  long-courrier.
- **La ligne engagée** : même titre, même ligne de gain ; à la place de la pastille, la
  pastille-coche 20 px (`PastilleEngagee`) et « Engagée » small 600 `accentText`, écart 8. Elle n'est
  **pas** touchable (un `View` accessible, comme aujourd'hui).
- **Les autres pastilles disent « Choisir à la place »** (décision n° 5) — le libellé que portait le
  bouton de la carte (« Choisir celle-ci à la place »), qui n'est plus sur le chemin.
- **Intro avec engagement** : « Par poste, du plus gros gain au plus petit. Une seule action engagée
  à la fois : en choisir une ici remplace la tienne. » — elle perd « Ton action en cours d'abord,
  puis », qui décrivait l'ordre qu'on retire.

### A2·360 — Une ligne engagée à 360

« − 67 kg par an », la pastille-coche et « Engagée » tiennent sur la ligne du gain (84 px pour la
fin de ligne). Dans la liste, c'est le seul accent plein, hors barre d'onglets.

### B1 — Juste après « Choisir » · un voyage : l'échéance (390 × 844)

- **La ligne devient la carte, ouverte sur la question.** C'est `CarteDePiste` — donc `ActionCard` —
  telle que sur le plan : titre `cardTitle` 17/24, gain 20/26 600 `accentText` « − 1 601 kg CO₂e »,
  « par an · 65 % de ton empreinte » small `textSecondary`, la base « Sur 1 vol long-courrier
  déclaré. » small `textTertiary`.
- **Le sélecteur d'intention (`ActionCommitment`), contenu inchangé**, rendu d'emblée : encart
  `backgroundElement`, rayon 16, padding 24, gap 16 ; « Quand ? » small tertiaire ; les échéances
  du poste en `Chip` radio, rayon 16, contour, `nestedBackground` (« À mon prochain projet de
  voyage », « Avant mon prochain bilan ») ; « Annuler » small tertiaire souligné et « C'est noté »
  primaire `flex`. **Rien n'est coché** : `timing` part de `null`, et « C'est noté » reste inactif tant
  qu'on n'a pas choisi — aucune échéance par défaut.
- **« Je m'y engage » est sauté** : « Choisir » l'a déjà dit.
- **Un seul choix en cours** : toucher la pastille d'une autre ligne referme celle-ci (sa sélection
  est perdue) et ouvre l'autre ; « Annuler » la rend à sa ligne. « Réduire » disparaît.
- Le passage de ligne à carte reste celui de `v1-30-les-transitions.md` : `HauteurSuivie` sous la même
  clé, 250 ms en grandissant, 200 en rétrécissant, la carte en fondu (`Apparition`) ; posé d'emblée
  sous « réduire les animations ».

### B2 — Un trajet · les jours, à 360 (360 × 800)

- « Travailler depuis chez toi deux jours par semaine », dernière piste du profil 1 : « Quels jours ? »
  en `Chip` checkbox rayon 14, pleines, grille de **quatre colonnes** (`GroupeDeChoix colonnes={4}`).
  Mardi et jeudi sont cochés : c'est l'état juste avant « C'est noté ».
- À 360, le sélecteur a 222 px de contenu (360 − 2 × 24 d'écran − 2 × 1 de bordure − 2 × 20 de carte
  − 2 × 24 d'encart) ; la grille déborde de 4 de chaque côté (230 px), soit **57,5 par cellule**,
  au-dessus du minimum de `GroupeDeChoix` (56 : la cible de 48 et ses 8), sous lequel il passerait
  seul à trois colonnes.
- **Le défilement** : la carte grandit vers le bas ; si « C'est noté » sort de l'écran, l'écran
  défile juste assez pour le montrer, sans faire passer le titre de la carte sous la bande. C'est le
  défilement de la plateforme, comme la page suivante de l'onboarding (`scrollTo({ animated:
  !animationsReduites })` dans `src/app/onboarding/index.tsx`) : **instantané sous « réduire les
  animations »**. C'est un mouvement neuf sur cet écran — à relire avec le skill `/mouvement` avant de
  l'écrire.

### B3 — « Choisir à la place » · une autre est engagée (390 × 844)

- La pastille touchée disait « Choisir à la place » ; la carte s'ouvre sur « Quand ? » (échéances des
  loisirs : « Ce mois-ci », « Le mois prochain », « À ma prochaine occasion ») ; la planche montre
  l'état après avoir coché « À ma prochaine occasion », juste avant de valider ; la ligne engagée est
  visible juste dessous.
- « C'est noté » appelle `commit_plan_action` **avec `p_replace`**, comme aujourd'hui. Sur un refus
  `RM001`, la phrase se dit en tête de liste (`MessageInline`, inchangé), la liste est relue et la
  carte reste ouverte.
- **La carte qu'on choisit n'est jamais estompée sur la liste** : filet `border`, pas
  `backgroundElement`. L'estompage est un fait du plan (la seconde carte recule derrière l'engagée) ;
  ici il ferait reculer la carte au moment où on la regarde.

### B4 — Après « C'est noté » · le plan (390)

Inchangé par rapport à aujourd'hui (`v1-17` §7.3) : le drapeau de passage (`passage.deposer`) est posé
**avant** `revenirOu('/plan')`, et le plan se rend dans son ordre (`src/app/(tabs)/plan/index.tsx`) :
« Ton plan » et son intro, la carte d'attente — ici celle d'après la feuille, la notification choisie :
« Je te fais signe lundi. », « Par notification sur ce téléphone. » —, le cap, puis l'action en tête :
« TON ENGAGEMENT », « par an · à mon prochain projet de voyage · 65 % de ton empreinte », « Sur 1 vol
long-courrier déclaré. », « PREMIER PAS » « Regarde lequel de tes projets de voyage peut attendre, ou
se passer plus près. », « Changer d'avis » ; puis la meilleure autre piste estompée par son cadre avec
« Choisir celle-ci à la place », puis « Voir toutes les pistes · 10 ». Quand cet engagement est le tout
premier (premier parcours), la carte d'ouverture « Plan et Suivi » se rend en tête, comme aujourd'hui.

### B5 — Après « C'est noté » · la première fois, la feuille des rappels (390 × 844)

Inchangée : `FeuilleRappels`, une fois par appareil, sur Android. Pour un vol, la boucle mensuelle :
Ramille « Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l'as
faite. », « Comment tu préfères que je te fasse signe ? », les trois lignes de canal (notification
« À activer en une fois. », email hors d'atteinte « Rattache un compte pour l'activer. » avec
« Rattacher un compte », « Sans rappel »), « Autoriser les notifications », « Tu pourras changer
d'avis dans « Toi ». ». **Derrière elle, le plan d'avant tout choix** ; sa carte d'attente, que la
feuille cache sur la planche, est celle d'un appareil anonyme dont la préférence par défaut est
l'email (`reminder_channel`), sans adresse pour le recevoir — « On se retrouve ici lundi. », « Rattache un compte pour recevoir le mot par email. »,
« Rattacher un compte » (`carteAttente`, `src/types/rappels.ts`). Sur web sans adresse rattachée, la
feuille ne s'ouvre pas (`doitProposerLaFeuille`) — c'est ce qu'on voit en navigation privée.

### C1 — Trois pistes · un petit rouleur (390 × 844)

Un profil relevé en production : trois jours, 12 km en voiture thermique, rural, pas de transports en
commun, un véhicule, un jour de télétravail possible, sorties rares, ni vol ni long trajet. Trois
pistes, un seul poste : « Travailler depuis chez toi un jour par semaine » 154 kg, « Faire ce trajet
à deux au moins un jour sur deux » 115 kg, « Faire un trajet sur cinq à vélo à assistance
électrique » 85 kg. Le plan en montre deux et « Voir toutes les pistes · 3 ». L'écran ne change pas de
forme (décision n° 4) ; le groupe unique garde sa tête, qui dit sur quoi porte l'écran.

## La ligne de piste

Mesurée dans le rendu du canvas à 390 et 360.

```
┌ rangée : Pressable, role button, paddingVertical 16 ───────────────────────────┐
│ Titre — ThemedText default 16/24, weight 500, text (1 à 2 lignes)               │
│ ↕ 4 (Spacing.one)                                                               │
│ Ligne du gain — row, space-between, alignItems center, gap 8, minHeight 32      │
│   « − 1 601 kg » body 15/22 600 text, tabular-nums, puis « par an » small tert. │
│                                         ( Choisir ) ← pastille bordée, décorative│
└─────────────────────────────────────────── filet 1 border (sauf dernière) ─────┘
```

- **Hauteur** : 92 px (titre sur une ligne), 116 (sur deux) — la cible de 48 largement tenue, par la
  hauteur et non par `hitSlop` (les rangées se touchent).
- **Le gain** : `− ${formatKg(saving_kg_year)} kg` en `body` 600 tabulaire, suivi d'une espace et de
  « par an » en `small` `textTertiary` — un texte imbriqué, sans écart à régler. Le conteneur ne se
  coupe pas (`flexShrink: 0`). Pas de part de l'empreinte sur la ligne : elle classe comme le gain.
- **La pastille « Choisir »** : `View` + `ThemedText`, **décorative** (masquée aux lecteurs d'écran,
  la rangée l'annonce) : hauteur 32 (**la seule valeur en dur** : aucune `ControlHeight` ne la nomme),
  `paddingHorizontal: 16` (`Spacing.three`), rayon 16 (`Radius.field` — la moitié de sa hauteur,
  comme le bouton à 27 = 54 / 2), **filet `Stroke.hairline` en `fieldBorder`**, fond transparent,
  libellé small 600 `accentText`. C'est la « pastille bordée » du brief (§3) : `fieldBorder`, le
  contour d'un champ au repos, est le seul gris du système qui tienne 3:1 sur le fond — il sert ici au
  contour d'un contrôle au repos, le même rôle. Mesures : 81 px pour « Choisir », 143 pour « Choisir à
  la place », filet compris. À 360 la ligne du gain la plus longue fait 112 + 8 + 143 = 263 px sur 312.
- **Sous le doigt** : la rangée prend `backgroundPressed`, tout de suite, sans animation ; la pastille,
  transparente, le prend avec elle. Pas de marge négative (le filet reste aligné sur les têtes).
- **Libellé accessible de la rangée** : « {titre sans point final}. − 1 601 kg par an. Choisir. » —
  ou « … Choisir à la place. » quand une autre est engagée. La ligne engagée : « {titre}. − 67 kg par
  an. Action engagée. »
- **Les trois états** : libre (« Choisir »), une autre engagée (« Choisir à la place »), engagée
  (pastille-coche + « Engagée », pas de cible). **Pas d'état désactivé** : toute piste listée se
  choisit (brief §3).

## Interactions et états

- **Ligne → carte au choix** : `setEnChoix(action.id)` ; la carte `CarteDePiste` se rend à sa place
  avec le sélecteur déjà ouvert, rien de coché. Une seule à la fois.
- **« Annuler »** : `setEnChoix(null)` ; la carte redevient ligne (200 ms).
- **« C'est noté »** : `commit_plan_action(p_replace = une autre est engagée)` → `onChanged` →
  `onEngage(poste)` → `passage.deposer({ poste })` puis `revenirOu('/plan')` (inchangé).
- **Refus `RM001`** : message en tête de liste, relecture, la carte reste ouverte (inchangé).
- **Retour** (geste, bouton, « Retour au plan ») : ferme le choix en cours avec l'écran ; rien n'est
  gardé — un geste de lecture, pas une préférence.
- **Relecture au retour** (`useRafraichirAuRetour`, inchangé) : une ligne ouverte dont l'action serait
  devenue engagée entre-temps se rend en ligne engagée (la règle `committed_at === null` d'aujourd'hui
  s'applique à `enChoix`).

## Accessibilité

- La rangée est un bouton dont le libellé recompose ce qu'elle porte (règle de `FRONT.md` §2.4 pour un
  `Pressable` à plusieurs textes) ; la pastille est masquée.
- **Le focus suit le geste** (`FRONT.md` §2.4) : la ligne disparaît sous le doigt, donc à l'ouverture
  le focus va au groupe de la question (« Quand ? » / « Quels jours ? », `donnerLeFocus` de
  `src/lib/focus.ts`) ; à « Annuler », il revient à la rangée qui réapparaît. Aujourd'hui rien ne le
  dit : ni la planche A2 ni l'écran ne posent le focus.
- Têtes de groupe : rôle en-tête, niveau 2 (déjà le cas).
- Contrastes, calculés sur les jetons (clair / sombre) : titre et gain `text` 18,24:1 / 21:1 ;
  « par an » et têtes `textTertiary` 6,0:1 / 6,43:1 ; libellé de la pastille `accentText` sur le fond
  8,67:1 / 11,28:1 ; **filet de la pastille `fieldBorder` 3,45:1 / 4,97:1** — au-dessus des 3:1 que
  WCAG 1.4.11 demande à la frontière d'un contrôle. Sous le doigt, sur `backgroundPressed`, le filet
  tombe à 2,74:1, le temps de l'appui ; le libellé y reste à 6,89:1.

## Ce qui se touche dans le dépôt

La décision n° 2 rend fausses plusieurs phrases qui décrivent l'ordre, et la décision n° 1 celles qui
décrivent l'ouverture multiple et « Réduire ». Elles sont listées ici une à une, recette comprise :
**une phrase qui décrit ce que le code faisait avant** est la famille de défaut que ce dépôt paie le
plus souvent.

- **`src/app/(tabs)/plan/pistes.tsx`**
  - la rangée à deux étages et sa pastille ; la tête de groupe en `TypeScale.label` capitales ;
    l'intro qui perd sa variante « Ton action en cours d'abord » ;
  - l'état `ouvertes: ReadonlySet<string>` devient `enChoix: string | null` ; « Réduire » disparaît ;
    le focus et le défilement ;
  - `separationsDesLignes` et `filetsDesLignes` ne changent pas (`enCarte` = l'ensemble réduit à
    `enChoix`) ;
  - les commentaires qui décrivent l'avant : l'en-tête (« la tête de cet écran est la première carte
    du plan »), celui des lignes ouvertes (« Plusieurs à la fois, et c'est le point », qui cite
    `v1-16` §5), celui de l'intro, et les deux qui expliquent « Réduire ».
- **`src/types/plan.ts`**
  - `pistesParPoste` groupe **dans l'ordre du rang**, sans « l'engagée d'abord » ; `ordonnerLesPistes`
    reste celle de `pistesDuPlan` ;
  - le commentaire de `ordonnerLesPistes` (« L'ordre commun aux deux surfaces ») et la doc de
    `pistesParPoste` (qui dit qu'un autre ordre « rendrait la tête de liste différente de la première
    carte du plan ») sont à réécrire : le plan met l'engagée en tête, la liste non, et tous deux
    suivent le rang ;
  - deux dérivations affichées à sortir de l'écran (`FRONT.md` §1.1) : le libellé de la pastille
    (« Choisir » / « Choisir à la place ») et l'intro (avec ou sans engagement).
- **`src/types/plan.test.ts`** — le test « met l'action engagée en tête, et son poste avec elle » et le
  commentaire qui le précède s'inversent (l'engagée reste à son rang, son poste à sa place), comme le
  commentaire du test d'ordre des groupes qui parle de la « première carte du plan » ; tests des deux
  dérivations, éprouvés en les cassant (`TESTING.md` §1.1).
- **`src/components/plan/carte-de-piste.tsx`** — une prop pour s'ouvrir sur le choix et un
  `onAnnuler` à passer ; `estompee` devient `uneAutreEstEngagee && !ouverteSurLeChoix`.
- **`src/components/plan/action-commitment.tsx`** — une prop qui initialise `picking` à vrai, et
  « Annuler » qui appelle `onAnnuler` quand il est fourni (au lieu de revenir au bouton « Je m'y
  engage ») ; le focus sur le groupe à l'ouverture. Le plan ne passe ni l'une ni l'autre : rien n'y
  change.
- **La recette** — [`docs/recette/premier-parcours-web.md`](../../recette/premier-parcours-web.md),
  bloc 06, dont quatre lignes décrivent l'avant : 06.2 (la parenthèse « Ton action en cours
  d'abord »), 06.3 (« la toute première piste de l'écran est la même action que la première carte du
  plan »), 06.4 (« son bouton pour s'engager ») et 06.5 (« En ouvrir plusieurs… ce n'est pas un
  accordéon »). Un parcours changé sans sa fiche fait jouer à la séance suivante un écran qui
  n'existe plus.
- **Le kit** — `docs/design/design-system/components/plan/CarteDePiste.prompt.md` et
  `ActionCommitment.prompt.md` (et leurs `.jsx`/`.d.ts`) décrivent les nouvelles props ; si la rangée
  devient un composant (`src/components/plan/…`), elle arrive avec sa fiche (`scripts/verifier-miroir-du-kit.mjs`
  refuse un composant sans fiche).
- **Le parcours réel** (`scripts/verifier-parcours-reel.mjs`) ne fait qu'aller sur l'écran des pistes
  et en revenir : il ne devrait pas bouger, mais une étape qui choisit depuis la liste y a sa place —
  c'est le seul chemin d'engagement que rien ne joue contre une vraie stack.
- **Les renvois** — `v1-13` §14.7, `docs/architecture/produit.md` et un bandeau en tête de `v1-16` §5
  renvoient ici depuis la PR du canvas ; le document d'implémentation reprendra les cinq décisions et
  ces trois renvois pointeront vers lui.

## Écarts

Reprise de la page Écarts du canvas.

| Quoi | Avant | Après | Pourquoi | Où |
|---|---|---|---|---|
| Le titre de la ligne | `small` 14/20 `textSecondary` | `default` 16/24 500 `text` | C'est le contenu de l'écran ; un cran sous le titre de carte (17/600) | A1 |
| Le gain de la ligne | 14/20 tertiaire, à droite du titre | Sous le titre : 15/22 600 `text` tabulaire + « par an » 14 tertiaire | C'est ce qu'on compare ; « par an » comme le cap depuis le 24/09 | A1 |
| « Choisir » a une forme | Un mot 14/600 `accentText` | Pastille bordée : 32, rayon 16, filet 1 `fieldBorder`, fond de l'écran, 14/600 `accentText` | Un mot ne fait pas une affordance (deuxième séance de suite) ; un cadre, à condition qu'il se voie (3,45:1, là où un fond gris seul tranche à 1,14:1) ; pas de bouton plein (brief §6) | A1 |
| « Choisir » choisit | Ligne → carte en lecture → « Je m'y engage » → intention → « C'est noté » (4 gestes) | Ligne → carte ouverte sur l'intention → « C'est noté » (3 gestes) | Décision n° 1 : le mot dit vrai | B1 |
| Un seul choix en cours | Plusieurs cartes ouvertes (`v1-16` §5, recette du 14/09), « Réduire » (#238, la réparation de la planche A2) | Une carte à la fois, « Annuler » la referme | Deux cartes ouvertes ne tiennent pas dans l'écran (A0b) ; remplace `v1-16` §5 sur ce point | B1 |
| « Choisir à la place » | Le bouton de la carte le disait | La pastille le dit quand une autre est engagée | Décision n° 5 : le remplacement se dit sur ce qu'on touche | A2, B3 |
| L'ordre ne bouge plus | L'engagée en tête, son groupe avec elle | L'ordre du rang toute la saison | Décision n° 2 | A2 |
| La tête de groupe | `small` 14/20 600 tertiaire, 16 au-dessus | `label` 13/18 600 tertiaire, capitales, 24 au-dessus | Face à des titres en 16 `text`, une tête en 14 tertiaire s'effacerait (plainte du 18/09) | A1 |
| La carte qu'on choisit | Estompée quand une autre est engagée | Jamais estompée sur la liste | L'estompage est un fait du plan | B3 |
| Le focus et le défilement | Rien ne le dit | Focus au groupe de la question ; retour à la rangée sur « Annuler » ; défilement de la plateforme jusqu'à « C'est noté », instantané sous « réduire les animations » | `FRONT.md` §2.4 ; un mouvement neuf sur cet écran, à relire avec `/mouvement` | B1, B2 |
| Le numéro de ce dossier | `v1-30` nomme déjà `v1-30-les-transitions.md` | Le dossier garde son nom ; le document d'implémentation prend un autre numéro | Deux `v1-30` ne se distingueraient que par leur dossier | — |
| Brief §7, « une ligne engagée au milieu » | Impossible avec le code : l'engagée est toujours première | Possible, dessiné | C'est la décision n° 2 qui le rend vrai | A2 |
| Brief §5, « la feuille d'intention » | Le brief dit feuille ; dans le dépôt, c'est le sélecteur de la carte | Reste dans la carte, contenu inchangé ; seul le déclenchement change | Une feuille sur la liste puis la feuille des rappels sur le plan ferait deux feuilles pour un choix | B1 |
| Canvas v1-17, planche A2 | Cible 44, entrée translateY 16 en 260 ms, onglet actif `backgroundSelected` | Le dépôt : cible 48, `HauteurSuivie` 250/200, onglet actif accent plein | Le code gagne | toutes |
| Kit, `ActionCard.jsx` | « − {Math.round(gainKg)} » : « − 1601 » | « − 1 601 » (`formatKg`, U+00A0) | Relevé en préparant le canvas ; **corrigé dans le kit par cette PR** | kit |
| Brief §1.1, « une rangée mesure 52 px » | 52 | 72 relevé en production à 390 (73 avec le filet) | 52 est la rangée d'un titre sur une ligne (16 + 20 + 16), 72 celle d'un titre sur deux ; la cible est tenue dans les deux cas | A0 |
| Thème sombre | `Colors.dark` provisoire | Toutes les planches basculent, aucun jeton ajouté | — | toutes |

## Réponses aux questions du brief

**§1.1 — La taille et le poids des lignes.** Titre en 16/24 500 `text`, gain en 15/22 600 `text`
dessous. Le contenu à la taille du contenu, un cran sous la carte ouverte ; le gain plus gras que le
titre pour que l'œil descende la colonne des gains. La cible était bonne et le reste (92 px au moins).

**§1.2 — « Choisir » ne se donne pas pour un bouton.** Une pastille bordée — un filet `fieldBorder`
qui tient 3:1, sans accent plein — **et un mot qui dit vrai** : toucher « Choisir » ouvre le choix, pas
une carte à lire. Aucune icône : le système dit « bouton » par un cadre, et il n'en faut pas plus.
Proposer un chevron aurait été une décision de système (un cinquième tracé, pour tout le produit) pour
dire moins bien la même chose — un chevron dit « ça s'ouvre », pas « c'est ici qu'on choisit ».

**§1.3 — Deux cartes ouvertes à trois lignes d'écart se comparent-elles ?** Non. Elles ne tiennent
pas dans l'écran, et le gain d'une carte ouverte quitte la colonne des autres. Ce que la carte ajoute
à la ligne — la part, qui classe comme le gain, et la base — ne départage rien. D'où la décision n° 1,
qui remplace `v1-16` §5 sur ce point : tout ce qui se compare passe sur la ligne, et la carte ne
s'ouvre que pour choisir.

**§8.1 — Le gain doit-il se lire sans ouvrir, et à quelle taille ?** Oui, à 15/22 600, sur sa propre
ligne sous le titre, suivi de « par an ». C'est le critère de comparaison. La part de l'empreinte
reste dans la carte : un second chiffre par ligne qui dit la même chose que le premier serait du
bruit.

**§8.2 — Grouper par poste, ou trier par gain ?** Grouper (décision n° 3). Le faisable se décide par
poste : qui ne peut pas renoncer à l'avion écarte un groupe d'un coup d'œil ; trié, l'écran se lirait
comme un palmarès. Dans chaque groupe, du plus gros gain au plus petit ; les groupes dans l'ordre où
leur poste apparaît au classement.

**§8.3 — À trois pistes, l'écran a-t-il une raison d'être ?** Oui (décision n° 4). Une seule règle :
le plan montre toujours deux cartes et une porte vers tout. À trois, l'écran montre une piste nouvelle
et c'est là qu'on la choisit ; une troisième carte sur le plan affaiblirait « Une action par saison,
une seule », l'intro juste au-dessus.

## Relevés hors mandat

- **Le bouton « C'est noté » inactif n'a pas de forme dans son encart** : `Button` désactivé prend
  `backgroundElement`, qui est aussi le fond du sélecteur. WCAG exempte un composant inactif, et son
  libellé tertiaire se lit ; mais tant que rien n'est choisi, on voit un mot, pas un bouton — B1 le
  montre. Le contenu du sélecteur est hors mandat (brief §5) : relevé, pas redessiné.
- **Sur web, la feuille des rappels ne s'ouvre pas** après un premier engagement en session anonyme
  (`doitProposerLaFeuille`) : c'est voulu, et c'est ce que la recette verra en navigation privée —
  B5 est la planche Android.

## Données relevées (28/09/2026)

Profil 1 joué sur `www.ramille.fr` par un navigateur sans interface, **à la lettre** de la feuille de
recette ; pistes lues sous la session de la personne (`plan_actions`, RLS), hauteurs des rangées lues
dans le DOM, puis compte supprimé par `delete_my_account` et **vérifié en base** (`auth.users`,
`assessments`, `plan_cycles`, `notification_outbox` : zéro ligne). Total 2 453,7 kg/an, poste
dominant voyages (2 030,2 kg), cap − 406 kg jusqu'au 30 novembre.

| Rang | Poste | Action | Gain | Part | Base |
|---|---|---|---|---|---|
| 1 | voyages | Renoncer à un vol long-courrier cette année | 1 601 | 65 % | Sur 1 vol long-courrier déclaré. |
| 2 | voyages | Renoncer à un vol court ou moyen-courrier cette année | 277 | 11 % | Sur 1 vol court ou moyen-courrier déclaré. |
| 3 | voyages | Remplacer un aller-retour en avion par le train | 273 | 11 % | Sur 1 vol court ou moyen-courrier déclaré. |
| 4 | loisirs | Faire une sortie sur trois à vélo à assistance électrique | 101 | 4 % | Sur tes déplacements de loisir. |
| 5 | loisirs | Regrouper deux sorties en une seule, une fois sur cinq | 67 | 3 % | Sur tes déplacements de loisir. |
| 6 | voyages | Faire un de tes longs trajets en train plutôt qu'en voiture | 48 | 2 % | Sur 2 longs trajets en voiture déclarés. |
| 7 | trajet | Travailler depuis chez toi deux jours par semaine | 36 | 1 % | Sur tes 5 trajets par semaine. |
| 8 | voyages | Remplacer un de tes longs trajets en autocar par le train | 24 | 1 % | Sur 2 longs trajets en autocar déclarés. |
| 9 | voyages | Faire un de tes longs trajets en autocar plutôt qu'en voiture | 23 | 1 % | Sur 2 longs trajets en voiture déclarés. |
| 10 | trajet | Travailler depuis chez toi un jour par semaine | 18 | 1 % | Sur tes 5 trajets par semaine. |

Le petit rouleur de C1 a demandé trois essais (deux profils ne rendaient que deux pistes : à 12 km le
vélo mécanique sort, à 7 km c'est le vélo à assistance) ; les trois comptes ont été supprimés et
vérifiés de même. Total 516,4 kg/an, poste dominant le trajet domicile-travail.

| Rang | Action | Gain | Part | Base |
|---|---|---|---|---|
| 1 | Travailler depuis chez toi un jour par semaine | 154 | 30 % | Sur tes 3 trajets par semaine. |
| 2 | Faire ce trajet à deux au moins un jour sur deux | 115 | 22 % | Sur tes 3 trajets par semaine. |
| 3 | Faire un trajet sur cinq à vélo à assistance électrique | 85 | 16 % | Sur un trajet de 12 km. |

## Règles non négociables respectées

Pas de balayage, de carrousel ni de paquet de cartes. Toute piste listée se choisit ; aucune n'est
masquée, grisée ou reléguée. Une seule couleur d'accent ; dans la liste, l'accent plein n'apparaît
qu'une fois, sur la pastille-coche de la ligne engagée (hors barre d'onglets, et hors « C'est noté »
quand un choix est ouvert). Pas de bouton plein par ligne. Pas de rang affiché, de médaille ni de
« meilleure piste ». Cibles de 48 au moins. Spline Sans pour toute phrase adressée à la personne.
Ramille absente de l'écran — chaque ligne porte un chiffre. Le premier pas ne s'affiche qu'une fois
l'action engagée, sur le plan. Aucune icône, aucun jeton neuf, aucune route, aucune seconde carte.

## Fichiers

- `Canvas.dc.html` — le canvas (A la liste, B le choix, C la courte liste, Écarts, Réponses,
  Système). A1 est cliquable ; bascule de thème.
- `support.js` — le runtime des `.dc.html` (copie de `docs/design/support.js`).
- `captures/` — une PNG 2× par planche et par page, en thème clair et en thème sombre (`-sombre`).
- `BRIEF.md` — le brief.
- `README.md` — ce qu'il y a dans le dossier et ce qui a été retenu.
