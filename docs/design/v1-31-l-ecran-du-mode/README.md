# Canvas — l'écran du mode : une liste qui tient, et ce qui manque qui mène quelque part

Sources du canvas livré le 28/09/2026 en réponse à [`BRIEF.md`](BRIEF.md) (v1-31, l'écran du mode
du questionnaire ; issue [#289](https://github.com/ScratchMe/Ramille/issues/289), ligne 02.10 de la
recette web et `v1-13` §11.19). Le document d'implémentation qui en découlera est à écrire dans
`docs/architecture/` ; ce README dit ce qu'il y a dans le dossier et ce que la session a tranché.

Le livrable est conservé tel quel :

- `HANDOFF.md` : planche par planche, la copy définitive, les réponses du §7, où ça se touche ;
- `Canvas.dc.html` : le canvas, qui ne référence que `support.js` ;
- `support.js` : le runtime des `.dc.html`, copie de celui de v1-17 ;
- `captures/` : une PNG 2× par planche, thème clair, état initial ;
- `captures/sombre/` : les planches A et B en thème sombre ;
- `captures/avant/` : l'écran tel qu'il est sur `main`.

## Ce que le canvas contient

Quatre groupes de planches (A à D), un prototype (P), puis quatre pages. Les cadres sont la zone
d'affichage web, 390 × 844 et 360 × 800, comme les mesures du brief : ce qui est sous le pied est
coupé. Toutes les planches basculent en thème sombre. **Les nombres des notes sont lus sur le
rendu**, pas recopiés.

| Planche | Capture | Rôle |
| --- | --- | --- |
| Décisions | `0-decisions.png` | les deux questions de produit et leurs réponses, ce qui en découle |
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
| P — Prototype | `P-prototype.png` | l'étape du mode et la suivante, à toucher |
| G — Le geste, moment par moment | `G-le-geste.png` | ce qui se voit, ce qui bouge, où va le focus |
| Q — Les trois questions du §7 | `Q-les-questions-du-brief.png` | une réponse et sa limite, par question |
| Écarts | `Ecarts.png` | quinze lignes avant / après, apport, prix, où ; puis ce qui a été relevé contre le brief et le kit |
| Système | `Systeme.png` | aucun jeton ajouté, une valeur hors échelle, quatre motifs réemployés, ce que le canvas ne fait pas |

## Ce que la session a tranché avec la personne qui pilote

Deux questions de produit, posées une à la fois le 28/09/2026. Les deux ont reçu la réponse
recommandée.

1. **Ce qui manque se dit au toucher de « Suivant », jamais d'office.** Le « Suivant » gris garde
   son apparence mais répond au toucher, et il mène à ce qui manque.
2. **Les modes se rangent en trois familles, sans intertitre** — le deux-roues passe de la 8e à la
   3e place.

Le reste est technique et tranché dans le canvas : rangées de 48, une boîte pour les deux
précisions du covoiturage, 12 de marge intérieure, le défilement minimal, le filet du pied.
**Le filet n'a pas été soumis comme question** : il ne dit rien, il montre qu'il y a une suite. Il
est venu en dessinant D1, où la réponse 1 laissait l'étape des sorties avoir l'air finie avec la
distance sous le pied. Il se retire sans rien toucher d'autre si la personne qui pilote le trouve
de trop.

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
- **502 et 918 px** (brief §1) : le groupe des modes mesure 532 et 948. Le même écart de 30 px
  dans les deux états, donc une différence de bornes de mesure. Les hauteurs de zone qui défile
  sont celles du brief au pixel près.
- **« Graisse 400 »** (brief §1) : c'est la valeur calculée du CSS ; la police chargée est
  SplineSans_500Medium.
- **À 360 × 800**, que le brief ne mesurait pas : la question des personnes du covoiturage est
  entièrement sous le pied une fois la motorisation choisie.
- **Le kit** (`StepShell`, `ModeListItem`, `PrecisionMode`) est identique au code sur les valeurs
  touchées ; ses fiches se mettront à jour dans la PR d'implémentation.

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil des chantiers, comme `v1-17-densite-du-plan/README.md` le fait : le dépôt
gagne, le canvas ne se réécrit pas. Trois points connus au moment de livrer :

1. **Le prototype approxime le dépli et le défilement** : une grille CSS et le défilement du
   navigateur, là où le dépôt a `Depliage` et `scrollTo`.
2. **Les cadres n'ont pas de barre d'état** : les marges annoncées (60 px à 390, 16 à 360) sont
   celles du web, et l'appareil en retire.
3. **TalkBack et le bouton indisponible** : si TalkBack n'actionne pas un bouton annoncé
   indisponible, le repli de la question 3 du §7 s'applique.
