# Handoff : Ramille — v1-31, l'écran du mode : une liste qui tient, et ce qui manque qui mène quelque part

## Overview

Réponse au brief [`BRIEF.md`](BRIEF.md) du 28/09/2026 (issue
[#289](https://github.com/ScratchMe/Ramille/issues/289), l'écran du mode du questionnaire ; ligne
02.10 de la recette web et `v1-13` §11.19). Deux gênes retenues, et elles seules :

1. **la longueur de la liste** ;
2. **ce qui manque se lit mal** — la ligne « Il manque encore… », collée au bouton grisé, seule
   indication de ce qui reste à faire.

Les deux gênes non retenues (les sous-questions en cascade, et la sous-réponse effacée quand on
change d'avis) ne sont pas résolues ; la première est un peu allégée en passant (une boîte au lieu
de deux sous le covoiturage), la seconde n'est ni aggravée ni touchée.

La réponse touche `StepShell`, donc elle vaut pour les neuf étapes. Le canvas le montre sur deux
autres étapes : les vols (l'exemple du brief) et les sorties, où ce qui manque est vraiment sous
le pied.

Cible : `ScratchMe/Ramille`, branche `main`, React Native / Expo Router. **Ni migration, ni route,
ni jeton, ni phrase nouvelle.** Le reste tient en trois catégories : de la mise en page
(`ModeListItem`, les boîtes de précision, l'ordre des modes), un comportement de `StepShell` (la
demande, la ligne-lien, le défilement, le filet) et une prop de `Button`.

## À propos des fichiers de design

`Canvas.dc.html` est une **référence de design créée en HTML** : un prototype qui montre
l'apparence et le comportement attendus, pas du code à copier. La tâche est de **recréer ces
écrans dans le dépôt** (composants de `src/components`, jetons de `src/constants/theme.ts`,
`ThemedText`, `src/lib/mouvement.tsx`), avec ses conventions. Le fichier ne référence que
`support.js`, et il s'ouvre dans un navigateur (le runtime charge React depuis unpkg). Chaque
cadre porte un `data-screen-label`, et une note de conception sous chaque cadre dit l'intention.
**Les nombres des notes sont lus sur le rendu**, jamais recopiés : une note ne peut pas dire 682
sous un cadre qui montre 690.

Les captures de `captures/` sont en 2×, thème clair, état initial ; `captures/sombre/` porte les
planches A et B en thème sombre, et `captures/avant/` l'écran tel qu'il est, relevé sur l'export
web de `main` du 28/09/2026 (identique à la production, sans rien écrire sur la base).

## Fidélité

**Haute fidélité.** Couleurs, tailles, rayons, hauteurs et copy sont définitifs et relevés du
dépôt ; les seules nouveautés sont listées dans la page Écarts. **Les cadres sont la zone
d'affichage web**, comme les mesures du brief : 390 × 844 et 360 × 800, sans barre d'état, ce qui
est sous le pied étant coupé comme sur l'écran. Sur l'appareil, les barres d'Android retirent 40 à
70 dp : c'est ce que le jugement au doigt (`v1-13` §11.19) mesurera.

## Ce que le canvas tranche

### Deux décisions de produit, prises avec la personne qui pilote le 28/09/2026

Posées une à la fois, sous la forme habituelle : le fait, ce qui est en jeu, la recommandation, et
ce qu'on casse si on se trompe. Les deux ont reçu la réponse recommandée.

1. **Ce qui manque se dit au toucher de « Suivant », jamais d'office.** Rien ne s'écrit à
   l'arrivée : la question est déjà en titre. Rien ne change non plus sous le doigt au moment d'un
   choix. Le « Suivant » gris garde son apparence, mais il répond :
   - l'écran défile jusqu'à ce qui manque s'il le faut ;
   - le focus s'y pose ;
   - l'intitulé de la question passe en vert ;
   - « Il manque encore … » apparaît au-dessus des boutons, lien vers la même question, jusqu'à ce
     que l'étape soit complète.

   *Ce qu'on a accepté* : quelqu'un qui ne toucherait jamais un bouton gris n'a pas de texte.
2. **Trois familles, sans intertitre.** L'ordre devient : Voiture (seul), Voiture (covoiturage),
   Deux-roues motorisé · Bus, Train, Métro ou tram · Vélo, Marche, Trottinette ou mobilité
   douce. L'écart vaut 4 px dans une famille, 16 entre deux familles. Le même ordre s'applique à
   « Lequel ? » et aux autres modes des sorties.

   *Ce qu'on a accepté* : l'ordre ne suit plus l'usage (le deux-roues, rare, passe devant le
   train), et un re-bilan ne retrouve plus le deux-roues à sa place, même si sa réponse arrive
   cochée.

### Ce qui en découle, et qui est technique

- **Rangées de 48 px**, la cible, au lieu de 52. C'est vrai des modes comme des réponses d'une
  précision.
- **Une seule boîte pour les deux précisions du covoiturage** : elles décrivent la même voiture.
- **Une marge intérieure de 12 dans la boîte**, pour que cinq puces de 48 tiennent sur une rangée
  à 360.
- **L'écran remonte à l'ouverture d'une précision** qui passerait sous le pied.
- **Un filet en haut du pied** quand le contenu continue dessous. C'est le prix de la réponse 1,
  payé sans un mot. Sans lui, l'étape des sorties avait l'air finie avec la distance cachée sous
  le pied (planche D1).

### La règle d'accessibilité ne bouge pas

La précision reste **dans le groupe de son mode** (`v1-29`, 25/09/2026) : chaque précision est son
propre `radiogroup`, nommé par sa question, posé dans celui des modes, et le parcours réel continue
de le vérifier. Le covoiturage porte **deux** groupes dans une seule boîte, jamais un groupe
fusionné.

### Les trois questions du §7

- **§7.1 — Neuf modes peuvent-ils tenir sans défiler à 390 × 844, sous la question, sans descendre
  sous les 48 px de cible ?** **Oui, avec 60 px de marge, et encore 16 à 360 × 800.** Neuf rangées
  de 48, 4 px dans une famille et 16 entre familles font 488 px. Sous l'en-tête (58) et le titre
  (trois lignes, 96), le dernier mode s'arrête à 682 px, pour un pied qui commence à 742 (698 à
  360). Deux conditions, dont aucune n'est un rabais : la rangée à 48 et non 52, et plus de ligne
  « il manque » à l'arrivée (décision 1), ce qui rend 28 px. *Ce qui le fait déborder* : le
  bandeau d'un re-bilan (« Tes réponses précédentes sont pré-remplies… », environ 76 px, mais la
  réponse y arrive cochée), une police système agrandie, et, sur l'appareil, les barres d'Android.
- **§7.2 — « Ce qui manque » doit-il pointer vers la précision, ou la montrer là où l'œil est
  déjà ?** **Les deux, dans cet ordre : montrer d'abord, pointer quand on le demande.**
  - *Montrer* : la précision s'ouvre sous le doigt, dans le champ, et l'écran remonte si elle
    passerait sous le pied, sans un mot.
  - *Pointer* : seulement au toucher de « Suivant » (ou de la ligne), par un défilement minimal,
    le focus, l'intitulé en vert et la ligne-lien.

  Jamais de mise en évidence d'office, jamais pendant qu'on répond. La marque se pose sur une
  question secondaire, jamais sur le titre de l'étape.
- **§7.3 — Si le bouton grisé porte la raison, que devient-il pour un lecteur d'écran, qui annonce
  déjà « Suivant, indisponible » ?** **Il reste « Suivant, indisponible », mais il n'est plus
  inerte.**
  - Son nom ne change pas, et son état est vrai (`aria-disabled`).
  - Il devient atteignable (au clavier web, il ne perd plus le focus) et activable ; l'activer
    porte le focus sur la question qui manque, dont le groupe s'annonce par sa question.
  - La raison écrite, qui apparaît au même moment, se lit juste avant lui et mène au même endroit.
  - La raison n'entre pas dans son nom : un nom qui change à chaque réponse ferait réannoncer le
    bouton, et un « Suivant » qui s'appelle autrement ne se retrouve plus d'une étape à l'autre.

  **À vérifier sur appareil** : que TalkBack actionne bien un bouton annoncé indisponible. S'il ne
  le fait pas, le repli est de retirer l'état et de nommer le bouton « Suivant, il manque encore … ».

## Ce qui change (page Écarts, résumé)

Ce qui n'est pas listé est inchangé.

1. **La hauteur d'une rangée de mode** — 52 → 48 px (`ControlHeight.target`), texte centré,
   `paddingVertical` 4 (`Spacing.one`) pour qu'un libellé agrandi grandisse la rangée. Vaut pour
   les réponses de précision et pour « Lequel ? ».
2. **L'écart entre deux modes** — 8 → 4 px dans une famille, 16 entre deux familles ; 4 px entre
   deux réponses d'une précision.
3. **L'ordre des modes** (décision 2) — `COMMUTE_MODE_CHOICES` réordonné avec un champ `famille` ;
   l'ordre des clés de `TRANSPORT_MODE_LABELS` (« Lequel ? ») et de `LEISURE_MODE_CHOICES_MORE`
   (Deux-roues · Bus, Métro ou tram · Marche, Trottinette) suit. Relevé par recherche le
   28/09/2026 : aucun test ni parcours ne lit un rang. `LEISURE_MODE_CHOICES_MORE[0]` reçoit le
   focus au dépli de « Voir les autres modes », et il reste le premier mode révélé.
4. **Le titre et la liste** — 24 → 16 entre le titre et la liste, 24 → 8 entre la liste et le lien
   du mode manquant (l'écart qui sépare déjà « Voir les autres modes » de sa liste).
5. **La boîte de précision** — marge intérieure 16 → 12 ; réponses à 4 px ; 8 px sous la boîte,
   donc 12 jusqu'au mode suivant.
6. **Deux précisions, une boîte** — sous le covoiturage (du trajet et des sorties), une seule
   boîte, deux groupes à 16 px l'un de l'autre.
7. **Quand « ce qui manque » se dit** (décision 1) — jamais d'office ; au toucher du « Suivant »
   gris, puis jusqu'à ce que l'étape soit complète. Le toucher vaut pour la visite de l'étape.
8. **La ligne devient un lien** — `TextLink` small 600 `accentText`, cible 48 où tiennent deux
   lignes, aligné sur les boutons, 8 px au-dessus d'eux, en fondu 200 ms. Jamais `role="alert"`.
9. **Le « Suivant » gris répond** — même apparence, `aria-disabled`, atteignable et activable.
   `disabled` reste pour l'envoi en cours (« Enregistrement… »).
10. **La question marquée** — après le toucher, l'intitulé de la question secondaire qui manque
    passe de `textSecondary` 500 à `accentText` 600.
11. **Le défilement vers ce qui manque** — au toucher (ou de la ligne), le minimum.
12. **Le défilement à l'ouverture d'une précision** — si la boîte passerait sous le pied.
13. **Le filet du pied** — un trait hairline quand le contenu continue sous le pied.
14. **`manqueDeLEtape`** rend `{ champ, phrase }` au lieu d'une phrase — mêmes phrases, même ordre.
15. **Thème sombre** — toutes les planches basculent, aucun jeton ajouté.

## Planche par planche

### Commun à toutes les étapes (`StepShell`)

- **En-tête** inchangé : padding 8/24/0, gap 16 ; `ProgressHeader` (Ramille `calm` 28, section
  et « Étape N sur M » en small `textTertiary`, rail 6 px rayon 3) ; `motDeRamille` en small
  `textTertiary` quand l'étape en a un. Hauteur 58 sans mot.
- **Zone qui défile** inchangée : padding 24. Le contenu de chaque étape dit ses écarts.
- **Pied** : padding 24, colonne, gap 8 ; rangée des boutons gap 16 : « Retour » (secondaire,
  54, rayon 27) et « Suivant » (flex). Hauteur **102** sans ligne, **158** avec (la cible de 48, son
  écart de 8). À 390 × 844, la zone qui défile va donc de 58 à 742, ou à 686 ; à 360 × 800, de 58 à
  698, ou à 642.
- **« Suivant » complet** : `accent`, texte `onAccent` 600 16. **Incomplet** : fond
  `backgroundElement`, texte `textTertiary` 600 — l'apparence d'aujourd'hui —, mais
  `aria-disabled="true"` au lieu de `disabled`, atteignable et activable.
- **La demande** : un état local de `StepShell`, faux à chaque nouvelle étape (la clé d'`entree`),
  vrai dès qu'on touche le « Suivant » incomplet. Quand elle est vraie et que l'étape est
  incomplète :
  - **la ligne** : `TextLink`, `type="small"`, `weight={600}`, `themeColor="accentText"`,
    `minHeight` 48, alignée à gauche, texte « Il manque encore {phrase}. », en `Apparition` (fondu
    200 ms, posée sous la préférence). Sans rôle d'alerte, jamais annoncée ;
  - **la marque** : l'intitulé du groupe qui manque passe en `accentText` 600, **sauf** quand ce
    qui manque est la question de l'étape — son titre ne se recolore jamais ;
  - **le geste**, au toucher de « Suivant » comme de la ligne, dans cet ordre :
    1. le focus va au groupe qui manque (son option cochée, ou la première), par `donnerLeFocus`,
       **au geste**, jamais à la fin du défilement ;
    2. si le groupe n'est pas entier dans la zone visible, `scrollTo` le minimum pour qu'il le
       soit, 16 px au-dessus du pied. Un groupe plus haut que la zone s'aligne en haut, 24 px sous
       l'en-tête. Le défilement est animé, sauf sous « réduire les animations ».
- **Le filet du pied** : quand le contenu continue sous le pied au-delà de sa marge basse de 24
  (décalage + hauteur visible < hauteur du contenu − 24), un trait `border` de 1 px (`hairline`),
  pleine largeur, en position absolue en haut du pied — rien ne bouge quand il apparaît. Relu à
  `onScroll` et `onContentSizeChange`. Sans animation.
- **Le défilement à l'ouverture d'une précision** : quand un `Depliage` s'ouvre et que sa hauteur
  finale (connue au premier `onLayout`) le ferait passer sous le pied, la zone remonte juste assez
  pour qu'il s'arrête 16 px au-dessus, **sans jamais faire passer le mode choisi au-dessus du
  bord** (8 px). Le défilement part en même temps que le dépli (250 ms, la courbe unique) ; sous la
  préférence, tout est posé. Le focus ne bouge pas.

### A1 — Rien de choisi (390 × 844)
- Titre `screenTitle` « Quel est ton mode de transport principal pour ce trajet ? » (trois lignes,
  82 → 178).
- 16 px, puis la liste : `GroupeDeChoix` nommé par la même question, trois sous-vues sans rôle
  (une par famille, gap 4), 16 px entre elles. Rangées `ModeListItem` : minHeight 48, padding 4/16,
  rayon 14, trait 1,5 transparent, fond `backgroundElement`, libellé 16/22 400.
- La liste va de 194 à 682. 8 px, puis `MissingModeLink` inchangé (690 → 738).
- Pied sans ligne, « Suivant » gris, pas de filet (la marge basse seule est sous le pied).

### A2 — « Voiture (covoiturage) » choisi, précisions vides
- Rangée choisie : `backgroundSelected`, trait 1,5 `accent`, libellé 600.
- **Boîte** (`BoiteDePrecision`, à créer) : 8 px sous le mode (le `Depliage` porte marginTop 4, qui
  s'ajoute à l'écart de 4 de la famille), retrait 16, fond `backgroundElement`, rayon 16
  (`Radius.field`), padding 12, gap 16 entre ses groupes, marginBottom 8.
  - Groupe 1 : intitulé small `textSecondary` 500 « Quelle motorisation ? », 8 px, quatre
    `ModeListItem` `nestedBackground` (fond `background`) à 4 px : « Thermique », « Hybride »,
    « Hybride rechargeable », « Électrique ».
  - Groupe 2 : « Vous êtes combien à partager ce trajet ? », 8 px, cinq `Chip` en grille
    `colonnes={5}`, `nestedBackground`, rayon 14, « 2 » à « 6+ » (libellés accessibles
    « N personnes », « 6 personnes ou plus », inchangés).
- La boîte va de 302 à 650 : les deux questions sont dans le champ. Pied sans ligne ; filet (la
  liste continue).

### A3 — Une précision remplie sur deux, rien touché d'autre
- « Hybride » coché (fond `backgroundSelected`, trait `accent`, 600). Rien d'autre ne change :
  aucune ligne, aucune marque. « Suivant » gris.

### A4 — Le même, « Suivant » touché
- La question « Vous êtes combien à partager ce trajet ? » en `accentText` 600.
- Focus sur « 2 ».
- Ligne : « Il manque encore le nombre de personnes dans la voiture. », sur deux lignes dans sa
  cible (710 → 758).
- Pied à 686. Le groupe va de 562 à 638, donc rien ne défile.

### A5 — « Train » choisi et précisé : prêt à continuer
- « Train », cinquième, deuxième de sa famille ; boîte « Quel type de train ? » (« TER ou train
  régional », « RER ou Transilien » coché, « Intercités ») de 470 à 674. « Suivant » vert ; aucune
  ligne.

### A6 — Rien de choisi, « Suivant » touché
- Ligne « Il manque encore ton mode de transport. » ; focus sur « Voiture (seul) » (premier arrêt
  du groupe) ; titre **non recoloré**.

### B1 à B5 — Les mêmes, à 360 × 800
- Mêmes valeurs ; le titre garde ses trois lignes. B1 : le dernier mode s'arrête à 682, le pied
  commence à 698 ; le lien du mode manquant passe sous le pied, et le filet le dit.
- B2 : la boîte s'arrête à 650 ; les cinq puces tiennent sur une rangée
  (5 × 48 + 4 × 8 = 272 = 360 − 48 − 16 − 24).
- B4 : pied à 642 ; le groupe des personnes s'arrête à 638.
- B5 : la précision du train s'arrête à 674.

### B6 — « Vélo » choisi : l'écran remonte (360 × 800)
- « Vélo », septième ; boîte « Quel type de vélo ? » (« Mécanique », « À assistance électrique »).
  Elle s'arrêterait à 738 ; la zone remonte de **56 px** pour qu'elle s'arrête à 682, 16 au-dessus
  du pied. Le mode choisi reste en vue, le focus reste sur lui. À 390, rien ne bouge (738 pour un
  pied à 742).

### C1 à C3 — Les vols (étape 7), contenu inchangé
- En-tête avec le mot de Ramille : « De mémoire, sans aller chercher. C'est l'ordre de grandeur qui
  compte. »
- C1, deux vols choisis, la part pas encore choisie : **aucune ligne** (aujourd'hui, elle apparaît
  à l'instant où l'on touche « 2 »).
- C2, « Suivant » touché : le sous-titre « Sur ces 2, combien sont courts ? » (22/28 600) en
  `accentText` ; focus sur « 0 » ; ligne « Il manque encore la part de vols courts. ». Le groupe
  s'arrête à 571 : rien ne défile.
- C3, à 360 : les onze puces sur trois rangées ; la question s'arrêterait à 655 sous un pied à
  642, donc la zone descend de **29 px**.

### D1 à D3 — Les sorties (étape 6) : ce qui manque est hors champ
- Liste des quatre premiers modes par famille (Voiture (seul), Voiture (covoiturage) · Train ·
  Vélo), « Voiture (seul) » choisi, « Thermique » coché, puis « Voir les autres modes » (linkPrimary
  14/30 600 `accentText`), filet de séparation, « Quelle distance aller, en général ? » et ses
  quatre tranches.
- D1, rien touché : la question commence à **783 px**, sous le pied (742). Aucune ligne ; **le
  filet du pied** est là.
- D2, « Suivant » touché : la zone descend de **261 px** ; la question et ses tranches s'arrêtent
  16 px au-dessus du pied ; la question en `accentText` ; focus sur « Moins de 5 km » ; ligne « Il
  manque encore la distance habituelle. ».
- D3, à 360 : la question sur deux lignes ; la zone descend de **333 px**.

### P — Le prototype
L'étape du mode puis celle du second mode, à 390 × 844 ou 360 × 800, animations normales ou
réduites. Il éprouve les règles de `StepShell` sur une étape dont la question est principale (la
marque ne s'y pose jamais), et le fait que « Retour » efface la demande. Ce qu'il simule mal : la
hauteur qui grandit (une grille CSS, là où le dépôt a `Depliage`) et le défilement (celui du
navigateur, là où le dépôt appellera `scrollTo`).

## Copy définitive

**Aucune phrase nouvelle.** Tout ce qui s'affiche existe déjà dans le dépôt :

| Où | Texte | Source |
|---|---|---|
| Titre de l'étape du mode | « Quel est ton mode de transport principal pour ce trajet ? » | `QUESTION_MODE`, `commute-mode.tsx` |
| Modes | « Voiture (seul) », « Voiture (covoiturage) », « Deux-roues motorisé », « Bus », « Train », « Métro ou tram », « Vélo », « Marche », « Trottinette ou mobilité douce » | `COMMUTE_MODE_CHOICES` (ordre neuf) |
| Précisions | « Quelle motorisation ? », « Quel type de deux-roues ? », « Quel type de train ? », « Quel type de vélo ? », « Vous êtes combien à partager ce trajet ? » (sorties : « Vous êtes combien dans la voiture ? ») | `commute-mode.tsx`, `leisure-detail.tsx` |
| Réponses | `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS`, `VELO_TYPE_OPTIONS`, `TAILLES_DE_COVOITURAGE` | `src/constants/transport-modes.ts`, `src/types/bilan.ts` |
| La ligne | « Il manque encore {phrase}. » | `StepShell` + `manqueDeLEtape`, phrases inchangées |
| Lien | « Ton mode n’est pas dans la liste ? Dis-le-nous. » | `MissingModeLink` |
| Boutons | « Retour », « Suivant », « Voir mon bilan », « Enregistrement… » | `StepShell`, `src/app/bilan/index.tsx` |

## Où ça se touche

- `src/constants/transport-modes.ts` — l'ordre de `COMMUTE_MODE_CHOICES`, un champ `famille` ;
  l'ordre des clés de `TRANSPORT_MODE_LABELS` et de `LEISURE_MODE_CHOICES_MORE`.
- `src/components/bilan/mode-list-item.tsx` — minHeight 48, padding 4/16, contenu centré.
- `src/components/bilan/steps/commute-mode.tsx` — les familles (sous-vues sans rôle dans le
  `GroupeDeChoix`), les écarts 16 / 4 / 8, la boîte unique du covoiturage ;
  `src/components/bilan/steps/commute-extra.tsx` (« Lequel ? ») et
  `src/components/bilan/steps/leisure-detail.tsx` suivent l'ordre et les écarts.
- `src/components/bilan/precision-mode.tsx`, `src/components/bilan/precision-chiffres.tsx` —
  padding 12, réponses à 4, une variante sans boîte quand elles sont posées dans
  `BoiteDePrecision` (`src/components/bilan/boite-de-precision.tsx`, à créer), et l'intitulé
  marqué.
- `src/components/bilan/step-shell.tsx` — la demande, la ligne-lien, les ancres par champ (un
  contexte où chaque groupe s'enregistre), le défilement vers ce qui manque et à l'ouverture, le
  filet.
- `src/components/button.tsx` — une prop `indisponible` (apparence du désactivé, `aria-disabled`,
  `onPress` gardé), distincte de `disabled`.
- `src/types/bilan.ts` — `manqueDeLEtape` rend `{ champ, phrase }` ; `isStepComplete` en dérive
  toujours. `src/app/bilan/index.tsx` passe les deux à `StepShell`.
- `src/lib/mouvement.tsx` — `Depliage` remonte sa hauteur finale à qui la demande.
- Le kit, dans la même PR : les fiches `StepShell`, `ModeListItem`, `PrecisionMode`,
  `PrecisionChiffres`, `CommuteModeStep`, `Button`, et une fiche pour `BoiteDePrecision` — sans
  elle, `scripts/verifier-miroir-du-kit.mjs` rougit.

### Ce que les gardes existantes voient déjà, et ce qu'il faudra écrire

- **Le parcours réel** (`scripts/verifier-parcours-reel.mjs`) vérifie à chaque étape que toute
  précision a son `radiogroup` nommé et qu'aucun groupe n'en coche deux : il garde la boîte unique
  du covoiturage sans rien changer. Il clique « Suivant » quand l'étape est complète. **Et
  Playwright traite `aria-disabled` comme `disabled`** (relevé en jouant le prototype) : un clic sur
  un « Suivant » incomplet attend comme aujourd'hui.
- **À écrire** : les tests de `manqueDeLEtape` suivent la nouvelle forme ; une dérivation testée pour
  « le titre ne se marque jamais » (le champ de la question principale de chaque étape) ; une
  dérivation testée du défilement minimal (dans `src/types/`, comme le veut la règle des
  dérivations affichées) ; et une garde d'export qui touche le « Suivant » incomplet de l'étape du
  mode et relève la ligne, la marque et le focus — éprouvée en la cassant.

## Ce qui reste à décider ou à vérifier

- **Sur appareil** (`v1-13` §11.19) : le jugement au doigt ; que TalkBack actionne un bouton
  annoncé indisponible (§7.3) ; que le filet se voit sur un écran réel ; que les neuf modes tiennent
  sous les barres d'Android.
- **Le bandeau du re-bilan** fait passer le dernier mode sous le pied. Ce n'est pas corrigé ici :
  la réponse y arrive cochée, et le filet le dit.
