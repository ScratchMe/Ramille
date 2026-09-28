# Canvas — « Toutes les pistes » : ce qu'on lit, et ce qu'on touche

Sources du canvas livré le 28/09/2026 par la session de design, en réponse à [`BRIEF.md`](BRIEF.md)
(constat 14.7 de la recette du 18/09/2026, issue [#235](https://github.com/ScratchMe/Ramille/issues/235)
— le brief de design de l'écran des pistes). Le document d'implémentation qui en découlera est à
écrire dans `docs/architecture/` ; ce README dit ce qu'il y a dans le dossier et ce qui a été retenu.

Le livrable est conservé tel quel : `HANDOFF.md` (planche par planche, copy définitive, les écarts,
les réponses aux questions du brief, où ça se touche, les données relevées), `Canvas.dc.html` (le
canvas, qui référence `support.js` et les polices du kit), `support.js` (le runtime des `.dc.html`)
et `captures/` (une PNG 2× par planche et par page, en clair et en sombre — le plus court chemin pour
voir une planche sans navigateur).

## Ce qui a été retenu

**On compare sur la liste, on touche pour choisir.** Quatre décisions de produit, prises une à une
avec la personne qui pilote le 28/09/2026, chacune sur la recommandation de la session :

1. **Comparer sur la liste.** La ligne porte ce qu'on compare — titre en 16/24 500 `text`, gain en
   15/22 600 dessous, suivi de « par an ». « Choisir » devient une pastille (32 de haut, rayon 16,
   fond `backgroundElement`, libellé `accentText`) et il choisit vraiment : la ligne s'ouvre en carte
   **directement sur l'intention** (« Quand ? », « Quels jours ? »). Un seul choix en cours ;
   « Annuler » le referme ; « Réduire » et l'ouverture de plusieurs cartes disparaissent.
2. **L'ordre ne bouge pas.** La liste suit le rang toute la saison ; la ligne engagée reste à sa
   place, marquée « Engagée ». Le plan, lui, garde l'action engagée en tête.
3. **Groupées par poste**, comme la planche A2 de `v1-17`.
4. **L'écran dès trois pistes**, comme aujourd'hui.

Et, de la part de la session : les têtes de groupe passent en étiquette capitale (13/18 600
tertiaire), les autres pastilles disent « Choisir à la place » quand une action est engagée, la carte
qu'on choisit n'est jamais estompée sur la liste, et le focus suit le geste.

## Ce que le canvas contient

Trois groupes de planches, puis trois pages. Planches à 390 px, vérifiées à 360, valeurs relevées du
dépôt, chiffres relevés en production, thème clair et sombre. A1 est cliquable.

| Planche | Capture | Rôle |
| --- | --- | --- |
| A0 — Aujourd'hui · la liste livrée | `A0-aujourd-hui-la-liste-livree.png` | la référence : l'écran de #238 (la réparation de la planche A2) |
| A0b — Aujourd'hui · deux cartes ouvertes | `A0b-aujourd-hui-deux-cartes-ouvertes.png` | pourquoi deux cartes ouvertes ne se comparent pas |
| A1 — La liste · dix pistes, rien d'engagé | `A1-la-liste-dix-pistes-rien-d-engage.png` | la ligne à deux étages, la pastille, les têtes |
| A1·360 — La liste à 360 | `A1-360-la-liste-a-360.png` | ce qui passe sur deux lignes |
| A2 — Une ligne engagée · au milieu de la liste | `A2-une-ligne-engagee-au-milieu-de-la-liste.png` | l'ordre qui ne bouge pas, « Choisir à la place » |
| A2·360 — Une ligne engagée à 360 | `A2-360-une-ligne-engagee-a-360.png` | la ligne engagée à 360 |
| B1 — Après « Choisir » · un voyage : l'échéance | `B1-apres-choisir-un-voyage-l-echeance.png` | la carte ouverte sur « Quand ? » |
| B2 — Après « Choisir » · un trajet : les jours, à 360 | `B2-apres-choisir-un-trajet-les-jours-a-360.png` | « Quels jours ? » en quatre colonnes, le défilement |
| B3 — « Choisir à la place » · une autre est engagée | `B3-choisir-a-la-place-une-autre-est-engagee.png` | le remplacement, la carte jamais estompée |
| B4 — Après « C'est noté » · le plan | `B4-apres-c-est-note-le-plan.png` | inchangé : l'action en tête |
| B5 — Après « C'est noté » · la première fois, la feuille des rappels | `B5-apres-c-est-note-la-premiere-fois-la-feuille-des-rappels.png` | inchangée, Android |
| C1 — Trois pistes · un petit rouleur | `C1-trois-pistes-un-petit-rouleur.png` | la courte liste |
| Écarts | `Ecarts.png` | seize lignes : avant, après, pourquoi, ce que ça coûte, où |
| Réponses | `Reponses.png` | les trois demandes du §1 et les trois questions du §8 |
| Système | `Systeme.png` | la ligne cotée, ses trois états, les jetons lus — aucun ajouté |

Chaque capture a sa jumelle en thème sombre, suffixée `-sombre`.

## Ce que le canvas ne fait pas

Aucun jeton, aucune icône, aucune route, aucune migration. Aucune seconde carte : la carte ouverte
est celle du plan. Aucun contenu neuf dans le sélecteur d'intention ni dans la feuille des rappels.
Aucune animation neuve. Aucun bouton plein par ligne, aucune piste masquée, aucun rang affiché, aucun
balayage.

## Ce que la session a corrigé ailleurs

**Le kit** : `components/plan/ActionCard.jsx` écrivait le gain par `Math.round` seul, donc
« − 1601 kg CO₂e » là où le dépôt écrit « − 1 601 » (`formatKg`). Corrigé dans la même PR — le code
gagne, et le kit est un miroir tenu (`v1-29` §5).

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil du chantier, comme les dossiers précédents le font : le dépôt gagne, le canvas
ne se réécrit pas.
