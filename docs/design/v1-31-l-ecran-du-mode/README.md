# Canvas — l'écran du mode : une liste qui tient, et ce qui manque qui mène quelque part

Sources du canvas livré le 28/09/2026 en réponse à [`BRIEF.md`](BRIEF.md) (v1-31, l'écran du mode
du questionnaire ; issue [#289](https://github.com/ScratchMe/Ramille/issues/289), ligne 02.10 de la
recette web et `v1-13` §11.19). Le document d'implémentation qui en découle est
[`v1-31-l-ecran-du-mode.md`](../../architecture/v1-31-l-ecran-du-mode.md) (29/09/2026) ; ce README
dit ce qu'il y a dans le dossier et ce que la session a tranché.

Le livrable est conservé tel quel :

- `HANDOFF.md` : planche par planche, la copy définitive, les réponses du §7, où ça se touche, ce
  que les gardes voient ;
- `Canvas.dc.html` : le canvas, qui ne référence que `support.js` ;
- `support.js` : le runtime des `.dc.html`, copie de celui de v1-17 ;
- `captures/` : une PNG 2× par planche, thème clair, état initial ;
- `captures/sombre/` : les planches A et B en thème sombre ;
- `captures/avant/` : l'écran tel qu'il est sur `main`.

## Ce que le canvas contient

Une page des décisions, quatre groupes de planches (A à D), un prototype (P), deux pages de lecture
(G, Q), puis Écarts et Système. Les cadres sont la zone d'affichage web, 390 × 844 et 360 × 800,
comme les mesures du brief : ce qui est sous le pied est coupé. Toutes les planches basculent en
thème sombre. **Les nombres des notes sont lus sur le rendu**, pas recopiés.

| Planche | Capture | Rôle |
| --- | --- | --- |
| Décisions | `0-decisions.png` | les trois questions de produit et leurs réponses, ce qui en découle |
| A1 — Rien de choisi | `A1-rien-de-choisi.png` | neuf modes, trois familles, tout dans le champ ; rien au pied |
| A2 — Covoiturage, précisions vides | `A2-covoiturage-precisions-vides.png` | une boîte, deux questions, dans le champ |
| A3 — Une précision sur deux | `A3-une-precision-sur-deux.png` | rien ne change sous le doigt |
| A4 — Le même, « Suivant » touché | `A4-une-precision-sur-deux-suivant-touche.png` | la ligne-lien, la question marquée, le focus |
| A5 — Train précisé, prêt | `A5-train-precise-pret.png` | « Suivant » vert |
| A6 — Rien de choisi, « Suivant » touché | `A6-rien-de-choisi-suivant-touche.png` | la question de l'étape ne se marque pas |
| B1 à B5 — Les mêmes à 360 × 800 | `B1-…-360.png` à `B5-…-360.png` | ce qui passe à 360 |
| B6 — Vélo : l'écran remonte | `B6-velo-l-ecran-remonte-360.png` | le défilement à l'ouverture d'une précision |
| C1 à C3 — Les vols | `C1-vols-rien-touche.png`, `C2-…`, `C3-…-360.png` | la règle de `StepShell` sur une autre étape |
| D1 à D3 — Les sorties | `D1-sorties-distance-sous-le-pied.png`, `D2-…`, `D3-…-360.png` | ce qui manque hors champ : le filet, puis le défilement au toucher |
| D4 — Les sorties, autres modes | `D4-sorties-autres-modes.png` | la décision 2 sur la liste dépliée |
| P — Prototype | `P-prototype.png` | l'étape du mode et la suivante, à toucher |
| G — Le geste, moment par moment | `G-le-geste.png` | ce qui se voit, ce qui bouge, où va le focus |
| Q — Les trois questions du §7 | `Q-les-questions-du-brief.png` | une réponse et sa limite, par question |
| Écarts | `Ecarts.png` | seize lignes avant / après, apport, prix, où ; puis ce qui a été relevé contre le brief et le kit |
| Système | `Systeme.png` | aucun jeton ajouté, une valeur hors échelle, quatre motifs réemployés, ce que le canvas ne fait pas |

## Ce que la session a tranché avec la personne qui pilote

Trois questions de produit, posées une à la fois le 28/09/2026. Les trois ont reçu la réponse
recommandée.

1. **Ce qui manque se dit au toucher de « Suivant », jamais d'office.**
   - Le « Suivant » gris garde son apparence, mais répond au toucher et mène à ce qui manque.
   - Tout reste jusqu'à ce que l'étape soit complète, puis la demande retombe.
2. **Les modes se rangent en trois familles, sans intertitre.** Le deux-roues passe de la 8e à la
   3e place ; même ordre sur « Lequel ? » et sur les autres modes des sorties.
3. **Un filet en haut du pied quand la suite est cachée dessous.** C'est le trait de la bande
   haute. Posée après la contre-lecture : le filet était d'abord un choix de dessin, mais il est la
   seule parade au défaut d'appareil du 07/09/2026 pour qui ne touche pas le bouton gris. Le
   retirer rouvrirait ce défaut.

Le reste est technique et tranché dans le canvas :

- des rangées de 48 ;
- une boîte pour deux précisions d'une même voiture, à 12 de marge intérieure ;
- un défilement minimal ;
- un « Suivant » gris qui est un bouton ordinaire. Le web ne sait pas dire « indisponible » d'un
  bouton qui agit : le handoff, §7.3, en donne la raison.

## Ce que le canvas ne fait pas

- Aucune phrase nouvelle : la ligne dit ce que `manqueDeLEtape` dit déjà.
- Aucun jeton, aucune route, aucune migration.
- Aucune étape de plus, aucun menu déroulant, aucune feuille pour les précisions (elle les
  sortirait du groupe de leur mode).
- Aucune liste repliée après le choix, aucune grille à deux colonnes, aucune icône, aucun
  intertitre.
- Rien en rouge, rien de prérempli, rien qui apparaisse avant qu'on ait pu répondre.

## Relevé contre le brief et le kit

Mesuré le 28/09/2026 sur l'export web de `main`, le code gagnant :

- **« La précision défile d'elle-même »** (brief §1) : aucun code ne le fait, et l'écran ne bouge
  pas quand elle s'ouvre. Ce défilement est donc un écart de ce canvas (B6).
- **502 et 918 px** (brief §1) : le groupe des modes mesure 532 et 948 sur le web. Le même écart
  de 30 px dans les deux états, donc une différence de bornes de mesure. Les hauteurs de zone qui
  défile sont celles du brief au pixel près. Dans le code, la rangée fait 53 dp, et le web
  l'arrondit à 52.
- **« Graisse 400 »** (brief §1) : c'est la valeur calculée du CSS ; la police chargée est
  SplineSans_500Medium.
- **À 360 × 800**, que le brief ne mesurait pas : la question des personnes du covoiturage est
  entièrement sous le pied une fois la motorisation choisie.
- **Le kit** (`StepShell`, `ModeListItem`, `PrecisionMode`) est identique au code sur les valeurs
  touchées ; ses fiches se mettront à jour dans la PR d'implémentation.

## La contre-lecture du 28/09/2026

Le sous-agent `contre-lecture` a relu la livraison avant l'ouverture de la PR. Quinze constats, tous
repris dans cette version :

- **Une garde que le réordonnancement aurait rendue muette** : la section H de
  `scripts/verifier-etats-export.mjs` écrit « Bus » en dur.
- **Un « Suivant » à la fois indisponible et activable**, que react-native-web ne sait pas
  exprimer.
- **La table des précisions qui passent sous le pied** : elle avait été vérifiée pour une seule
  hauteur de pied.
- **La demande** : elle survivait à la complétude, contre les mots de la décision 1.
- **La liste dépliée des sorties** n'était pas dessinée, et **les longs trajets** étaient oubliés.
- **Le DOM du canvas pris pour celui du dépôt**, sur la marge de la boîte.
- **Le mouvement** : un repli animé que le code n'a pas, un défilement « en 250 ms » que `scrollTo`
  ne sait pas faire, une `Apparition` sans fournisseur, et un `Depliage` qui ne se mesure pas sous la
  préférence.
- **La hauteur d'aujourd'hui** : 53 dp et non 52.
- **Un trait de filet** différent de celui de la bande haute.
- **Deux choix de produit** laissés hors des questions. Le filet est devenu la troisième question ;
  le repli TalkBack a disparu avec l'« indisponible ».

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil des chantiers, comme `v1-17-densite-du-plan/README.md` le fait : le dépôt
gagne, le canvas ne se réécrit pas. Trois points connus au moment de livrer :

1. **Le prototype approxime le dépli et le défilement** : une grille CSS et le défilement du
   navigateur, là où le dépôt a `Depliage` et `scrollTo`.
2. **Le DOM du canvas n'est pas celui du dépôt** : la boîte y est une sœur de sa rangée. Les
   marges à suivre sont celles du handoff.
3. **Les cadres n'ont pas de barre d'état** : les marges annoncées (60 px à 390, 16 à 360) sont
   celles du web, et l'appareil en retire.

Et ce que l'implémentation a corrigé ou précisé en chemin (29/09/2026 — le détail et les raisons
sont en `docs/architecture/v1-31-l-ecran-du-mode.md` §9 : les lignes 3, 6 et 8 pour ce qui se voit à
l'écran et que le plan avait posé, les lignes 12 à 14 pour ce que l'implémentation a trouvé) :

4. **Une ouverture ne fait défiler qu'après une réponse donnée sur l'étape**, comptée par le
   questionnaire et non au toucher : un toucher sur une rangée déjà cochée n'ouvre rien, et le
   préremplissage d'un re-bilan ou un brouillon relu ne font jamais défiler.
5. **Un brouillon relu ne vole plus le focus** : l'étape qu'il rouvre après le montage était prise
   pour une entrée, et le focus quittait le document.
6. **Un Entrée maintenu sur le « Suivant » gris ne coche rien**, et c'était moins évident que le
   handoff ne le supposait : sur web, le bouton s'active à l'appui et non au relâchement, et la
   répétition de la touche arrivait sur l'option qui venait de recevoir le focus. Un second appui,
   lui, coche : c'est un vrai choix.
7. **« Lequel ? » et sa part tiennent dans une seule boîte** (§9, ligne 8) : le handoff ne comptait que
   les voitures parmi les boîtes à deux groupes, et deux dépliés séparés sous un même mode auraient
   fait partir deux annonces à la fois.
8. **L'écran remonte aussi pour « Lequel ? » et pour la distance d'une sortie** (§9, ligne 3), pas
   seulement pour une précision — et jamais pour les modes que « Voir les autres modes » révèle.
9. **Sous le doigt, le « Suivant » en attente prend `backgroundPressed`** (§9, ligne 6), et non
   l'`accentPressed` d'un bouton principal, qui l'aurait fait paraître prêt.
