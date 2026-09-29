# v1-32 — « Toutes les pistes » : on compare sur la liste, on touche pour choisir. Plan d'implémentation

**Écrit le 29/09/2026, contre-lu le même jour (§10).** Document d'implémentation apparié au dossier
de design [`docs/design/v1-30-toutes-les-pistes/`](../design/v1-30-toutes-les-pistes/README.md), comme
[`v1-17-densite-du-plan.md`](v1-17-densite-du-plan.md) l'est au sien. **Le numéro diffère de celui du
dossier**, et c'est voulu : `v1-30` est déjà porté par [`v1-30-les-transitions.md`](v1-30-les-transitions.md),
et `v1-31` revient au canvas de l'écran du mode du questionnaire
([`docs/design/v1-31-l-ecran-du-mode/`](../design/v1-31-l-ecran-du-mode/README.md)), dont le document
d'implémentation reste à écrire.

C'est un plan : aucun code, aucune migration. **Les valeurs, la copy et la géométrie sont dans le
[`HANDOFF.md`](../design/v1-30-toutes-les-pistes/HANDOFF.md)**, qui en est la seule source ; ce
document ne les recopie pas, il dit qui les lit, où, et dans quel ordre. En cas d'écart entre les
deux, le HANDOFF gagne sur la copy et la géométrie, le code gagne sur tout le reste — et l'écart se
consigne au README du dossier (« Ce que l'implémentation corrigera »), jamais dans le canvas.

## 1. Ce que ça change pour la personne, en trois phrases

Aujourd'hui, l'écran des pistes rend son contenu en `small` 14 px et `textSecondary` — la taille et
la couleur d'un texte secondaire —, avec un « Choisir » que deux séances de recette ont trouvé muet ;
pour comparer deux leviers, il faut les ouvrir en cartes qui ne tiennent pas ensemble dans l'écran ;
et s'engager prend quatre gestes, dont un « Je m'y engage » qui redit ce que « Choisir » venait de
dire.

Après : chaque ligne porte son titre à la taille du contenu et son gain aligné dessous, donc on
compare **sur la liste**, d'un coup d'œil ; « Choisir » est une pastille bordée qui ouvre la carte
**directement sur la question** (« Quand ? », « Quels jours ? »), une seule à la fois ; et la liste
garde son ordre toute la saison, l'action engagée marquée à sa place.

## 2. Les cinq décisions, et ce qu'elles remplacent

Prises une à une le 28/09/2026 avec la personne qui pilote ; le HANDOFF (§ « Les cinq décisions »)
dit pour chacune ce qu'on a accepté de casser.

| # | Décidé | Ce que ça remplace dans le dépôt |
|---|---|---|
| 1 | **Comparer sur la liste** ; « Choisir » ouvre la carte sur l'intention ; un seul choix en cours ; « Annuler » le referme | Dans [`v1-16`](v1-16-trois-decisions-decran.md) §5 : la puce « plusieurs lignes peuvent être ouvertes à la fois », et celle qui fait de l'affordance « un mot » (c'est désormais une pastille) — son bandeau le dit. Et « Réduire », ajouté par [#238](https://github.com/ScratchMe/Ramille/pull/238) (la réparation de la planche A2) |
| 2 | **L'ordre de la liste ne bouge pas** : le rang toute la saison, la ligne engagée à sa place | La règle posée par C5.2 (la pile du plan et l'écran des pistes, 17/09/2026) : « la tête de cet écran est la première carte du plan » — `pistesParPoste` réutilise aujourd'hui l'ordre du plan, l'engagée d'abord. **Le plan, lui, garde l'engagée en tête** |
| 3 | **Groupées par poste** | Rien : c'est l'état actuel, confirmé |
| 4 | **L'écran dès trois pistes** | Rien : c'est l'état actuel, confirmé |
| 5 | **« Choisir à la place » sur la pastille** quand une action est engagée | Le bouton « Choisir celle-ci à la place » de la carte, qui n'est plus sur le chemin **de la liste** — il reste celui du plan |

Ce que le chantier **ne décide pas** : le contenu du sélecteur d'intention (échéances, jours,
« Annuler », « C'est noté ») et la feuille des rappels, inchangés (brief §5).

## 3. Le relevé de fichiers

**Fait le 29/09/2026 sur `main` à `2674c6d`, puis complété par la contre-lecture (§10).** Un seul
chantier, donc une seule PR ; le relevé sert à dire tout ce qui devient faux, et ce que le chantier
partage avec ce qui tourne à côté.

| Fichier | Ce qui change |
|---|---|
| `src/app/(tabs)/plan/pistes.tsx` | La rangée à deux étages et sa pastille ; les têtes de groupe ; l'intro dérivée ; `ouvertes` → `enChoix` ; « Réduire » part ; le focus et le défilement ; les commentaires qui décrivent l'avant (§4.4) |
| `src/types/plan.ts` | `pistesParPoste` suit le rang seul ; quatre dérivations affichées entrent (§4.1) ; deux blocs de documentation réécrits |
| `src/types/plan.test.ts` | Un test s'inverse ; les quatre dérivations sont testées |
| `src/components/plan/carte-de-piste.tsx` | Deux props transmises ; `p_replace` et l'estompage lus sur `etatDeLaPiste` |
| `src/components/plan/action-commitment.tsx` | Deux props (ouvert d'emblée, « Annuler » rendu à l'appelant) ; le focus dans les deux sens |
| `docs/design/design-system/components/plan/CarteDePiste.*`, `ActionCommitment.*` | Les fiches du kit décrivent les props neuves |
| `docs/design/design-system/readme.md` | La ligne « Traits » connaît la pastille bordée (`fieldBorder` en trait fin) |
| `docs/recette/premier-parcours-web.md` | Bloc 06, lignes 06.2 à 06.5 ; une ligne neuve après 08.5 (§4.8) |
| `docs/recette/ce-qui-reste-apres-le-28-septembre.md` | Ligne 01.3 : « toucher une ligne, « Je m'y engage » » |
| `docs/recette/le-compte-et-les-modes.md` | Ligne 03.11 : « Elle s'ouvre en carte, avec son bouton » |
| `scripts/verifier-parcours-reel.mjs` | Une étape qui choisit depuis la liste, et la garde du défilement (§4.8) |
| `docs/architecture/v1-13-audit-et-chantiers.md` | §11 : les lignes 11.18 et 11.W.2 ; une ligne neuve pour le doigt. §14.7 : la phrase « le code reste à faire » (§7) |
| `docs/architecture/produit.md`, `v1-16-trois-decisions-decran.md` | Les phrases « pas encore codé » (§7) |

**Ce que le chantier ne crée pas** : aucun fichier sous `src/`. La rangée **reste dans l'écran**,
comme `Lignes` aujourd'hui : un seul écran la rend, et un composant sous `src/components/plan/`
arriverait avec une fiche de kit (`verifier-miroir-du-kit.mjs` refuse un composant sans fiche) pour
zéro réutilisation. Si l'implémentation trouve une raison de l'en sortir, elle la consigne et écrit
la fiche.

**Ce qui tourne à côté** : le canvas de l'écran du mode (`v1-31`) ajoutera une prop `enAttente` à
`src/components/button.tsx` — le bouton de « C'est noté » — et fera remonter sa hauteur finale à
`Depliage` dans `src/lib/mouvement.tsx`. Ce chantier **lit** les deux fichiers sans les écrire
(`Button`, `HauteurSuivie`, `Apparition`) : les deux sont parallélisables. Avant de pousser,
rebalayer ces deux fichiers sur `main` (règle de CLAUDE.md, « Avant de lancer une vague ») : un
changement de `Button` entre-temps changerait l'apparence de « C'est noté » inactif sans que rien
dans ce chantier ne le dise.

## 4. Le chantier, dans l'ordre

L'ordre suit les dépendances : les dérivations d'abord (elles portent les tests), les composants
ensuite, l'écran en dernier.

### 4.1 `src/types/plan.ts` — l'ordre, et quatre dérivations

- **`pistesParPoste` suit le rang, et le rang seul.** Aujourd'hui elle appelle `ordonnerLesPistes`,
  l'ordre du plan, qui fait passer l'engagée devant et entraîne son poste en tête. Elle trie
  désormais par `rank` (nul en dernier, comme aujourd'hui) ; `pistesDuPlan` garde
  `ordonnerLesPistes`. **Ne pas faire porter un drapeau à `ordonnerLesPistes`** (`engageeDabord:
  boolean`) : deux appelants, deux ordres, et un booléen qui dit lequel se lit mal à l'appel ; deux
  fonctions nommées se lisent seules. Le tri par rang s'écrit une fois et `ordonnerLesPistes` s'en
  sert pour départager, pour que les deux ne divergent pas sur les rangs nuls.
- **La documentation des deux fonctions se réécrit** : celle de `ordonnerLesPistes` (« L'ordre
  commun aux deux surfaces ») et celle de `pistesParPoste` (un autre ordre « rendrait la tête de
  liste différente de la première carte du plan »). Ce qui est vrai après : **le plan et la liste
  s'accordent sur le classement, pas sur leur tête** — le plan répond à « qu'est-ce que je fais en ce
  moment ? », la liste à « qu'est-ce qui existe, et combien ça pèse ? ». Le paragraphe « Ici il n'y a
  pas de rang » et la promesse de `v1-16` §5 (toute action affichée est engageable) restent.
- **Quatre dérivations affichées sortent de l'écran** (`FRONT.md` §1.1), avec des noms proposés :
  - `etatDeLaPiste(action, engageeId)` → `'libre' | 'aLaPlace' | 'engagee'`. C'est la seule source
    des trois états du HANDOFF (§ « La ligne de piste ») : l'écran la lit pour la rangée, et
    `CarteDePiste` pour `p_replace` et l'estompage (§4.3) — le libellé « Choisir à la place » et le
    remplacement qu'on demande au serveur disent le même fait, donc ils se lisent au même endroit.
    `engagee` se décide sur `committed_at !== null` de la ligne elle-même, pas sur `engageeId` — la
    règle d'aujourd'hui, qui tient une ligne ouverte dont l'action serait devenue engagée entre-temps ;
  - `libelleDuChoix(etat)` → « Choisir » ou « Choisir à la place » (rien pour `engagee`) ;
  - `annonceDeLaPiste({ titre, gainKg, etat })` → le libellé accessible de la rangée, les trois
    formes du HANDOFF. Il est aujourd'hui composé dans l'écran, deux fois (ligne libre, ligne
    engagée), avec la règle du point final et du repli « Action à préciser. » ; il sort avec elles.
    **Son commentaire ne part pas tel quel** : « le gain se dit « par an », que l'œil déduit de la
    colonne » devient faux, puisque « par an » est désormais affiché — l'annonce le dit parce que la
    rangée le montre ;
  - `introDesPistes(uneActionEstEngagee)` → les deux phrases du HANDOFF (A1 et A2). La variante « Ton
    action en cours d'abord, puis… » disparaît avec l'ordre qu'elle décrivait.
- **Les tests** (`plan.test.ts`), chacun **éprouvé en le cassant** (`TESTING.md` §1.1), le compte
  des mutations écrit en tête du `describe`, daté :
  - « met l'action engagée en tête, et son poste avec elle » **s'inverse** : l'engagée reste à son
    rang, son poste à sa place. Le commentaire du test d'ordre des groupes (« la tête de cet écran
    doit être la première carte du plan ») se réécrit avec lui ;
  - **la décision n° 2 est gardée par une paire, et chacune de ses moitiés le dit** : ce test inversé
    (la liste) et « met l'action engagée en tête, quel que soit son rang » de `pistesDuPlan` (le plan,
    inchangé). Un passage qui « factoriserait » les deux ordres en un fait tomber l'un ou l'autre selon
    le sens. Les deux commentaires nomment la décision et l'autre test, pour que celui qui en voit un
    tomber sache qu'il ne doit pas « corriger » l'autre ;
  - la garde de **partition** (« ne perd aucune action ») reste telle quelle : elle porte la promesse
    de `v1-16` §5 ;
  - les quatre dérivations, table de vérité complète — dont, pour `etatDeLaPiste`, une ligne engagée
    alors que `engageeId` désigne une autre (l'état relu gagne) ; pour l'annonce, les deux pièges
    connus : le point final du titre, et un gain nul (la partie « par an » disparaît, pas « null kg »).

### 4.2 `ActionCommitment` — s'ouvrir sur la question, rendre la main

Deux props, du même nom que dans `CarteDePiste` (§4.3) : **`surLeChoix?: boolean`** et
**`onAnnuler?: () => void`**.

- **`surLeChoix`** initialise `picking` à vrai. Le contenu du sélecteur ne change pas — `days` et
  `timing` partent vides, « C'est noté » reste inactif tant que rien n'est choisi
  (`isIntentionComplete`), **aucune valeur par défaut**.
- **Après un « C'est noté » réussi, `picking` ne repasse pas à faux quand `surLeChoix` est passé.**
  Aujourd'hui, `setPicking(false)` précède `onEngage` ; sur la liste, l'écran part vers le plan juste
  après, et pendant l'animation de retour de la pile, sur natif, la carte montrerait « Je m'y engage »
  ou « Choisir celle-ci à la place » — un bouton que la liste n'a plus.
- **`onAnnuler`** : « Annuler » l'appelle quand il est fourni, au lieu de revenir au bouton « Je m'y
  engage ». Sans lui, le comportement du plan est inchangé.
- **Le focus, dans les deux sens** (`FRONT.md` §2.4, `donnerLeFocus` de `src/lib/focus.ts`) :
  - quand le sélecteur apparaît à la suite d'un geste, le focus va à la question. La cible est un
    choix technique — le texte « Quand ? » / « Quels jours ? » rendu focalisable comme le fait
    `TitreDArrivee`, ou le groupe si `GroupeDeChoix` expose sa référence (elle est interne
    aujourd'hui) ; la vérification au navigateur (`document.activeElement` après le geste) tranche ;
  - **sur le plan, « Annuler » rend le focus au bouton qui réapparaît** (« Je m'y engage » ou
    « Choisir celle-ci à la place ») ; sur la liste, c'est l'écran qui le rend à la rangée (§4.4).
  Sur le plan, « Je m'y engage » et « Annuler » disparaissent eux aussi sous le doigt : c'est le même
  trou, invisible, et le combler au passage est la règle du dépôt. C'est le seul changement que le
  plan reçoit ; il se consigne comme écart au canvas (§9).
- **Une course, acceptée** : toucher la pastille d'une autre rangée pendant l'envoi de « C'est
  noté » démonte la carte, mais la requête part quand même et `onEngage` ramène au plan avec l'action
  qu'on venait de valider. C'est l'issue fidèle au geste — « C'est noté » a été touché — et la garder
  évite de faire remonter l'état d'envoi jusqu'à l'écran pour une fenêtre de quelques centaines de
  millisecondes.
- Le bouton du plan garde « Choisir celle-ci à la place » ; `p_replace` reste « une autre est
  engagée », sur les deux écrans.

### 4.3 `CarteDePiste` — transmettre, et ne pas estomper ce qu'on choisit

- **`surLeChoix` et `onAnnuler`** passent à `ActionCommitment` ; le plan ne les passe pas.
- `uneAutreEstEngagee` se lit sur `etatDeLaPiste(action, committedActionId) === 'aLaPlace'` (§4.1),
  pour `otherActionCommitted` comme pour l'estompage — une seule source pour le libellé de la liste
  et pour `p_replace`.
- **`estompee` devient `uneAutreEstEngagee && !surLeChoix`** (HANDOFF, B3) : l'estompage est un fait
  du plan, la seconde carte qui recule derrière l'engagée ; sur la liste il ferait reculer la carte
  au moment où on la regarde.

### 4.4 `pistes.tsx` — l'écran

- **`ouvertes: ReadonlySet<string>` devient `enChoix: string | null`.** Toucher une rangée **non
  engagée** — `libre` ou `aLaPlace` — ouvre sa carte et referme celle qui était ouverte (sa sélection
  est perdue, c'est voulu) ; « Annuler » remet `null`. L'ensemble passé à `separationsDesLignes` et
  `filetsDesLignes` devient `enChoix` réduit à une ligne dont `committed_at === null` — les deux
  fonctions ne changent pas, leur contrat parle de lignes rendues en carte.
- **La rangée** : deux étages et la pastille, exactement la géométrie du HANDOFF (§ « La ligne de
  piste ») — titre `default` 16/24 500 `text`, ligne du gain `body` 600 tabulaire + « par an »
  `small` `textTertiary`, pastille bordée **décorative** (masquée aux lecteurs d'écran, la rangée
  l'annonce), `backgroundPressed` sous le doigt sans animation. La hauteur de la pastille, 32, est
  **la seule valeur en dur** : un commentaire dit pourquoi (aucune `ControlHeight` ne la nomme). La
  ligne engagée garde `PastilleEngagee` et « Engagée », non touchable, sur la ligne du gain.
- **Les têtes de groupe** : `TypeScale.label` 600 `textTertiary`, capitales, 24 au-dessus (le `gap`
  de 16 du défilement + 8), 4 dessous, `accessibilityRole="header"` gardé. Vérifier que le lecteur
  d'écran ne les épelle pas : `textTransform` est un style, le texte reste en casse normale — c'est
  pour ça qu'on ne l'écrit pas en capitales dans la chaîne.
- **« Réduire » disparaît**, avec son style et ses deux commentaires.
- **Le focus au retour** : sur « Annuler », la rangée réapparaît sous la même clé de `HauteurSuivie`
  et reprend le focus. Piège : c'est un **autre élément** que la carte, monté à neuf ; le focus se
  pose une fois la rangée montée (une référence par identifiant, et l'identifiant « à refocaliser »
  gardé le temps d'un rendu), pas dans le gestionnaire d'« Annuler », où la rangée n'existe pas
  encore.
- **Le défilement jusqu'à « C'est noté »** (HANDOFF, B2) : si le bouton sort de l'écran à
  l'ouverture, l'écran défile juste assez pour le montrer, sans faire passer le titre de la carte
  sous la bande. `scrollTo({ animated: !animationsReduites })`, comme la page suivante de
  l'onboarding (`src/app/onboarding/index.tsx`, `useReducedMotion`). **C'est un mouvement neuf sur
  cet écran : appeler `/mouvement` avant de l'écrire.** Trois pièges :
  - mesurer la **carte**, pas son `HauteurSuivie` — ce dernier anime sa hauteur, donc sa mesure à
    l'instant de l'ouverture vaut la hauteur de la rangée ;
  - **toucher une pastille sous une carte déjà ouverte** : celle-ci se replie en 200 ms pendant que
    la nouvelle s'ouvre, donc la position de la nouvelle, mesurée à l'ouverture, est trop basse de la
    différence de hauteur — et l'ancrage du défilement de Chrome s'en mêle (`TESTING.md` §2.14). La
    cible se calcule une fois le repli fini, ou en retranchant ce qu'il va rendre ; sinon l'écran
    défile trop, et le titre passe sous la bande, ce que B2 interdit ;
  - le focus posé sur la question (§4.2) ne doit pas faire défiler à sa place : `donnerLeFocus` passe
    `preventScroll` sur web, et c'est ce qui laisse le défilement à qui l'a lancé.
- **Le refus `RM001`** : inchangé — la phrase au-dessus de la liste, la relecture, et `enChoix` qui
  ne bouge pas, donc la carte reste ouverte ; après la relecture, la carte lit « une autre est
  engagée » et un nouvel essai part avec `p_replace`. Si l'action de `enChoix` a disparu de la liste
  relue (un re-bilan ailleurs), rien n'est ouvert : pas de garde à écrire.
- **Le retour après « C'est noté »** : inchangé — `passage.deposer({ poste })` **avant**
  `revenirOu('/plan')` (`v1-17` §7.3).
- **Les commentaires qui décrivent l'avant**, un par un (HANDOFF, « Ce qui se touche », complété par
  la contre-lecture) — aucun balayage de mots ne les trouve tous :
  - l'en-tête du fichier (« la tête de cet écran est la première carte du plan ») ;
  - celui de `ouvertes` (« Plusieurs à la fois, et c'est le point », qui cite `v1-16` §5) ;
  - celui de l'intro (« La phrase disait un ordre que l'engagement défait ») ;
  - les deux de « Réduire », dont celui qui cite encore `v1-16` §5 ;
  - celui de l'affordance (« L'affordance est un mot, parce que ce dépôt n'a pas d'icônes ») ;
  - celui du groupement à droite (« Le gain et l'affordance groupés à droite : sous le
    `space-between`… »), faux dès que le gain passe sous le titre ;
  - celui du libellé accessible (« Le gain se dit « par an », que l'œil déduit de la colonne »), qui
    part avec `annonceDeLaPiste` (§4.1) ;
  - ceux des styles `groupe` et `teteDeGroupe` (« 16 dessus, 4 dessous, comme la planche A2 le
    demande », « Les 16 sont déjà là… les écrire ici les doublerait »), faux avec les 24 au-dessus ;
  - celui de `paddingVertical`, dont les chiffres (52) changent avec la rangée.

  **Une phrase qui décrit ce que le code faisait avant** est la famille de défaut que ce dépôt paie
  le plus souvent.

### 4.5 La copy

Toute la copy est dans le HANDOFF : l'intro (A1 et A2), les deux libellés de la pastille, les trois
annonces de la rangée. **Aucune réplique de Ramille** — l'écran porte un chiffre par ligne, il est en
voix produit, et Ramille en est absente comme aujourd'hui. Toute phrase neuve qui ne serait pas au
HANDOFF est une question de produit, et se pose avant d'écrire.

### 4.6 Le mouvement

Rien de neuf hors le défilement de §4.4 : la ligne qui devient carte reste le chemin de
`v1-30-les-transitions.md` (§5.7) — `HauteurSuivie` sous la même clé, 250 ms en grandissant, 200 en
rétrécissant, la carte en `Apparition`, `SansApparitionAuMontage` à l'arrivée sur l'écran, tout posé
d'emblée sous « réduire les animations ». « Annuler » prend le chemin de « Réduire », dans le même
sens.

### 4.7 Le kit

`CarteDePiste.prompt.md` et `ActionCommitment.prompt.md` (et leurs `.jsx` / `.d.ts`) décrivent
`surLeChoix`, `onAnnuler` et la règle d'estompage. **Ces fiches se relisent à la main** :
`scripts/verifier-miroir-du-kit.mjs` ne vérifie que l'inventaire — son en-tête le dit, il ne voit
pas des props qui dérivent —, donc son vert prouve qu'aucune fiche ne manque, pas qu'elles sont
justes. La ligne « Traits » du `readme.md` du kit ne connaît `fieldBorder` qu'en `Stroke.field`
(1,5) : elle gagne la pastille bordée, `fieldBorder` en `Stroke.hairline`, pour que la prochaine
session de design la trouve. `PastilleEngagee.prompt.md` reste juste.

### 4.8 La recette, `v1-13` §11 et le parcours réel

Ouvrir `RECETTE.md` avant de toucher `docs/recette/`.

- **`premier-parcours-web.md`** : le bloc 06 se joue **avant** le bloc 08, qui porte le premier
  engagement, sur le plan. Il ne peut donc vérifier que ce qui se voit sans engagement :
  - 06.2 perd sa parenthèse « Ton action en cours d'abord » ;
  - 06.3 garde l'ordre des groupes, sans « la toute première piste de l'écran est la même action que
    la première carte du plan » ;
  - 06.4 : la pastille « Choisir », et la carte qui s'ouvre sur la question, rien de coché, « C'est
    noté » inactif ;
  - 06.5 : toucher une autre pastille referme la première ; « Annuler » rend la ligne.

  **« Choisir à la place » et l'ordre qui tient vont dans une ligne neuve, après 08.5** : rouvrir les
  pistes une fois l'action du bloc 08 engagée, vérifier la ligne engagée à son rang, les autres
  pastilles en « Choisir à la place », puis revenir sans rien choisir. S'engager depuis la liste
  avant le bloc 08 fausserait 08.1 à 08.4 (l'engagement sur la première carte, le trait de temps qui
  apparaît).
- **`ce-qui-reste-apres-le-28-septembre.md`, ligne 01.3** — une feuille pas encore jouée : « toucher
  une ligne, « Je m'y engage », une échéance, « C'est noté » » devient « toucher « Choisir », une
  échéance, « C'est noté » ». Ce que la ligne vérifie (le retour au plan d'un écran ouvert par son
  adresse) ne change pas.
- **`le-compte-et-les-modes.md`, ligne 03.11** : « Elle s'ouvre en carte, avec son bouton » devient
  la carte ouverte sur la question.
- **`v1-13` §11** :
  - **11.18** (l'écran des pistes au doigt, ouverte le 17/09/2026) se date, remplacée par la ligne
    neuve ; ses deux points encore valables y passent : **un plan à trois actions au moins**, sans
    quoi la porte ne s'affiche pas, et **le retour après « C'est noté » qui ouvre la feuille des
    rappels** sur Android ;
  - **11.W.2** (le même écran au navigateur) attend « la tête de l'écran étant la même action que la
    première carte du plan » et des lignes qui s'ouvrent « plusieurs à la fois » : elle se réécrit
    sur les décisions n° 1 et n° 2 ;
  - **la ligne neuve**, pour ce que seul le doigt juge : la pastille se lit-elle comme un bouton, la
    carte ouverte sur la question à 360, le défilement jusqu'à « C'est noté », le focus au lecteur
    d'écran (TalkBack), plus les deux points repris de 11.18.
- **Le parcours réel** (`scripts/verifier-parcours-reel.mjs`), deux ajouts :
  - **une étape qui choisit depuis la liste.** L'engagement s'y joue sur le plan, et aucun chemin ne
    choisit depuis la liste contre une vraie stack — c'est pourtant le seul qui passe `p_replace` à
    vrai depuis cet écran. L'étape se place **après** celles qui dépendent de l'action engagée du
    plan, près de l'étape `« Retour au plan » sans pile` : ouvrir `/plan/pistes`, toucher une pastille
    « Choisir à la place », vérifier que la carte s'ouvre sur la question et que « C'est noté » est
    inactif, choisir, valider, arriver sur `/plan` avec cette action en tête, puis **relire la base** :
    l'engagement a changé de ligne, et l'archive porte une ligne `changement`. Mutation à consigner
    en tête du script : passer `p_replace` à faux depuis la liste — l'étape tombe sur `RM001`. Si des
    étapes suivantes lisent l'action engagée, les recaler (`ATTENDU`) plutôt que de déplacer l'étape
    sans le dire ;
  - **la garde du défilement, image par image, en deux moitiés** (`TESTING.md` §2.14) : ouvrir une
    carte dont « C'est noté » sort de l'écran, relever que l'écran défile et que le titre de la carte
    ne passe jamais sous la bande ; puis, sous « réduire les animations » émulé avant le chargement,
    que rien ne défile en chemin. Le cas d'une carte déjà ouverte au-dessus (§4.4, deuxième piège)
    est celui qui mérite la garde. Mutations : un défilement sans la correction du repli, un
    `animated: true` en dur.

## 5. Ce qu'il ne faut pas casser

- **Le plan ne bouge pas** : l'engagée en tête (`pistesDuPlan`), la seconde carte estompée, « Choisir
  celle-ci à la place », « Je m'y engage », le lien « Voir toutes les pistes · N ». Le seul
  changement qu'il reçoit est le focus de §4.2.
- **La chaîne du `select`** de l'écran, avec `plan_actions!plan_actions_plan_cycle_id_fkey` : sans le
  nom de la clé, PostgREST refuse la requête et l'écran ne charge plus (C2.2, l'engagement qui survit
  à un re-bilan, a ajouté la seconde clé étrangère vers `plan_cycles`).
- **`passage.deposer` avant `revenirOu('/plan')`**, jamais après ni sous condition (`v1-17` §7.3) : la
  feuille des rappels ne s'ouvre qu'une fois par appareil.
- **`useRafraichirAuRetour`**, l'état de chargement différé (`useChargementVisible`), l'écran d'échec
  qui ne dit jamais « tu n'as rien », et l'état vide « Ton plan ne porte aucune piste pour cette
  période. ».
- **La garde de partition** de `pistesParPoste`, `separationsDesLignes` et `filetsDesLignes`, et leurs
  tests.
- **Aucune route, aucun jeton, aucune migration, aucune icône.** La barre d'onglets reste visible
  (l'écran est dans la pile du plan) ; « Retour au plan » passe par `revenirOu`.
- **Les cibles de 48** : la rangée entière est la cible, par sa hauteur (92 px au moins) et non par
  `hitSlop` — les rangées se touchent. La pastille de 32 n'est pas une cible.

## 6. Vérifier avant d'ouvrir la PR

- `npx tsc --noEmit`, `npm run lint`, `npm test` ; chaque test neuf éprouvé en le cassant, les
  mutations comptées dans le fichier (`TESTING.md` §1.1).
- `expo export --platform web` puis Playwright sur `dist/`, à 390 et 360, clair et sombre (ouvrir
  `EXPO.md` avant : mise en page et mouvement sur web) : les planches A1, A2, B1, B2, B3 et C1 se
  retrouvent à l'écran ; le focus est sur la question après « Choisir » et sur la rangée après
  « Annuler » (`document.activeElement`), et sur le bouton du plan après « Annuler » sur le plan.
- `node scripts/rejouer-la-ci.mjs` (Docker, `TESTING.md` §2.13) : le parcours réel, avec son étape et
  sa garde neuves.
- `node scripts/verifier-renvois-des-documents.mjs` et `node scripts/verifier-miroir-du-kit.mjs`.
- **Rebalayer** le vocabulaire retiré sur tout le dépôt, fixtures, recette et kit compris :
  « Réduire », « Ton action en cours d'abord », « première carte du plan », « plusieurs à la fois »,
  « Je m'y engage » (dans `docs/recette/` : il reste juste sur le plan, faux sur la liste),
  `ouvertes`.
- **La contre-lecture** : le sous-agent `contre-lecture` sur le diff entier, avec la base, le commit
  et ce que le chantier prétend faire ; ses trois familles (une dérivation appelée avec le mauvais
  argument — ici `etatDeLaPiste`, son `engageeId` et le `committed_at` de la ligne ; une exclusion
  vérifiée sur une paire de moins ; une phrase qui décrit l'avant).
- **Vercel** : c'est une fusion de code, donc la mesure hors ligne de `VERCEL.md` §1.2 avant de
  fusionner, comparée au dernier relevé ; `api/` n'est pas touché, un écart s'explique dans la PR.

## 7. À la livraison, trois phrases deviennent fausses

Elles ont été écrites avant le code, et elles le disent ; la PR d'implémentation les corrige, dans
le même commit que l'écran :

- `produit.md`, fin de §3 : « **Rien n'est encore codé** » ;
- `v1-13` §14.7 : « le code reste à faire. D'ici là, l'écran en production reste celui de la
  réparation » ;
- le bandeau de `v1-16` §5 : « **Le code suit encore cette section tant que le chantier n'est pas
  livré** ».

Et l'état d'avancement de §8 se tient à jour pendant le travail, pas après coup.

## 8. État d'avancement

| Étape | État |
|---|---|
| 4.1 — `plan.ts`, l'ordre et les quatre dérivations, tests cassés d'abord | fait (29/09/2026) : dix mutations, comptées en tête des tests |
| 4.2 et 4.3 — `ActionCommitment`, `CarteDePiste` | à faire |
| 4.4 — l'écran | à faire |
| 4.7 — le kit | à faire |
| 4.8 — la recette, `v1-13` §11, le parcours réel | à faire |
| 6 — vérifications, contre-lecture, mesure Vercel | à faire |
| 7 — les trois phrases | à faire |

## 9. Écarts au canvas déjà connus

À reporter au README du dossier de design, section « Ce que l'implémentation corrigera », avec ceux
que le chantier trouvera :

- **le plan reçoit le focus dans les deux sens** (§4.2), là où le HANDOFF dit que rien n'y change —
  vrai de tout ce qui se voit ;
- **la rangée reste dans l'écran** au lieu de devenir un composant (§3) — le HANDOFF laissait la
  question ouverte.

## 10. Hors périmètre, et la contre-lecture du 29/09/2026

- **« C'est noté » inactif n'a pas de forme dans son encart** (HANDOFF, « Relevés hors mandat ») :
  `Button` désactivé prend `backgroundElement`, qui est aussi le fond du sélecteur. WCAG exempte un
  composant inactif, et le libellé se lit ; mais c'est une question de design, pas une dette
  technique — sa destination est un brief (`RECETTE.md` §2.4), et elle croise la prop `enAttente`
  que `v1-31` ajoute à `Button`. Hors de ce chantier.
- **Sur web, la feuille des rappels ne s'ouvre pas** après un premier engagement en session anonyme
  (`doitProposerLaFeuille`) : voulu, et c'est ce que la recette verra en navigation privée.

**La première version de ce plan a été relue par le sous-agent `contre-lecture` avant la PR**, qui
y a trouvé dix-sept constats, tous corrigés ici. Les plus lourds : une réécriture du bloc 06 de la
recette impossible à jouer à sa place (il précède l'engagement) ; deux feuilles de recette et une
ligne de `v1-13` §11 absentes du relevé ; trois commentaires de l'écran oubliés dans la liste « un
par un » ; les trois phrases « pas encore codé » que la livraison rendra fausses ; un défilement sans
garde, avec un piège de mesure quand une carte se replie au-dessus ; un bouton qui aurait reparu
pendant le retour vers le plan ; un test de divergence présenté comme la seule garde de la décision
n° 2, alors que la paire de tests la garde déjà ; et le risque partagé avec `v1-31` attribué à
`HauteurSuivie` au lieu de `Button`.
