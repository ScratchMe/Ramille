# Canvas — « Toutes les pistes » : ce qu'on lit, et ce qu'on touche

Sources du canvas livré le 28/09/2026 par la session de design, en réponse à [`BRIEF.md`](BRIEF.md)
(constat 14.7 de la recette du 18/09/2026, issue [#235](https://github.com/ScratchMe/Ramille/issues/235)
— le brief de design de l'écran des pistes). Son document d'implémentation est
[`v1-32-toutes-les-pistes.md`](../../architecture/v1-32-toutes-les-pistes.md), écrit le 29/09/2026 —
**pas `v1-30`**, que [`v1-30-les-transitions.md`](../../architecture/v1-30-les-transitions.md) porte
déjà ; ce README dit ce qu'il y a dans le dossier et ce qui a été retenu.

Artifact : https://claude.ai/artifact/9BonUxxdvRzJvnKp6H7ZVW — une copie autonome de `Canvas.dc.html`,
publiée le 29/09/2026 : les polices y sont embarquées, et si le moteur du canvas ne démarre pas chez
l'hébergeur, une version figée prend sa place (tout y est, les deux thèmes se basculent, seul le
prototype de A1 ne réagit plus). Il est privé tant qu'il n'est pas partagé depuis son menu. **Le
canvas du dossier reste la référence** : l'artefact se republie s'il change.

Le livrable est conservé tel quel : `HANDOFF.md` (planche par planche, copy définitive, les écarts,
les réponses aux questions du brief, où ça se touche, les données relevées), `Canvas.dc.html` (le
canvas, qui référence `support.js` et les polices du kit), `support.js` (le runtime des `.dc.html`)
et `captures/` (une PNG 2× par planche et par page, en clair et en sombre — le plus court chemin pour
voir une planche sans navigateur).

## Ce qui a été retenu

**On compare sur la liste, on touche pour choisir.** Cinq décisions de produit, prises une à une avec
la personne qui pilote le 28/09/2026, chacune sur la recommandation de la session :

1. **Comparer sur la liste.** La ligne porte ce qu'on compare — titre en 16/24 500 `text`, gain en
   15/22 600 dessous, suivi de « par an ». « Choisir » devient une pastille bordée (32 de haut, rayon
   16, filet `fieldBorder`, libellé `accentText`) et il choisit vraiment : la ligne s'ouvre en carte
   **directement sur l'intention** (« Quand ? », « Quels jours ? »), rien de coché. Un seul choix en
   cours ; « Annuler » le referme. **Cette décision remplace
   [`v1-16`](../../architecture/v1-16-trois-decisions-decran.md) §5 sur l'ouverture de plusieurs
   cartes** (décidée après la recette du 14/09 pour comparer deux leviers) et retire « Réduire »
   (ajouté par [#238](https://github.com/ScratchMe/Ramille/pull/238), la réparation de la planche A2).
   La question avait d'abord attribué l'ouverture multiple à cette réparation ; la contre-lecture l'a relevé, elle
   a été reposée avec ce cadrage, et la décision confirmée.
2. **L'ordre ne bouge pas.** La liste suit le rang toute la saison ; la ligne engagée reste à sa
   place, marquée « Engagée ». Le plan, lui, garde l'action engagée en tête.
3. **Groupées par poste**, comme la planche A2 de `v1-17`.
4. **L'écran dès trois pistes**, comme aujourd'hui.
5. **« Choisir à la place » sur la pastille** quand une action est engagée — l'expression du plan,
   dite sur la chose qu'on touche.

Et, de la part de la session, sur son mandat (typographie, structure, affordance) : les têtes de
groupe passent en étiquette capitale (13/18 600 tertiaire), la carte qu'on choisit n'est jamais
estompée sur la liste, et le focus suit le geste.

## Ce que le canvas contient

Trois groupes de planches, puis trois pages. Planches à 390 px, vérifiées à 360, valeurs relevées du
dépôt, chiffres relevés en production, thème clair et sombre. A1 est cliquable.

| Planche | Capture | Rôle |
| --- | --- | --- |
| A0 — Aujourd'hui · la liste livrée | `A0-aujourd-hui-la-liste-livree.png` | la référence : l'écran de #238 (la réparation de la planche A2) |
| A0b — Aujourd'hui · deux cartes ouvertes | `A0b-aujourd-hui-deux-cartes-ouvertes.png` | pourquoi deux cartes ouvertes ne se comparent pas |
| A1 — La liste · dix pistes, rien d'engagé | `A1-la-liste-dix-pistes-rien-d-engage.png` | la ligne à deux étages, la pastille bordée, les têtes |
| A1·360 — La liste à 360 | `A1-360-la-liste-a-360.png` | ce qui passe sur deux lignes |
| A2 — Une ligne engagée · au milieu de la liste | `A2-une-ligne-engagee-au-milieu-de-la-liste.png` | l'ordre qui ne bouge pas, « Choisir à la place » |
| A2·360 — Une ligne engagée à 360 | `A2-360-une-ligne-engagee-a-360.png` | la ligne engagée à 360 |
| B1 — Juste après « Choisir » · un voyage : l'échéance | `B1-juste-apres-choisir-un-voyage-l-echeance.png` | la carte ouverte sur « Quand ? », rien de coché |
| B2 — Un trajet · les jours, à 360 | `B2-un-trajet-les-jours-a-360.png` | « Quels jours ? » en quatre colonnes, le défilement |
| B3 — « Choisir à la place » · une autre est engagée | `B3-choisir-a-la-place-une-autre-est-engagee.png` | le remplacement, la carte jamais estompée |
| B4 — Après « C'est noté » · le plan | `B4-apres-c-est-note-le-plan.png` | inchangé : l'action en tête |
| B5 — Après « C'est noté » · la première fois, la feuille des rappels | `B5-apres-c-est-note-la-premiere-fois-la-feuille-des-rappels.png` | inchangée, Android |
| C1 — Trois pistes · un petit rouleur | `C1-trois-pistes-un-petit-rouleur.png` | la courte liste |
| Écarts | `Ecarts.png` | dix-sept lignes : avant, après, pourquoi, ce que ça coûte, où |
| Réponses | `Reponses.png` | les trois demandes du §1 et les trois questions du §8 |
| Système | `Systeme.png` | la ligne cotée, ses trois états, les jetons lus — aucun ajouté, une valeur en dur |

Chaque capture a sa jumelle en thème sombre, suffixée `-sombre`.

## Ce que le canvas ne fait pas

Aucun jeton neuf, aucune icône, aucune route, aucune migration. Aucune seconde carte : la carte
ouverte est celle du plan. Aucun contenu neuf dans le sélecteur d'intention ni dans la feuille des
rappels. Aucune animation dessinée hors celles de `v1-30-les-transitions.md` et le défilement de la
plateforme pour montrer « C'est noté », instantané sous « réduire les animations ». Aucun bouton
plein par ligne, aucune piste masquée, aucun rang affiché, aucun balayage.

## Ce que la session a corrigé ailleurs

**Le kit** : `components/plan/ActionCard.jsx` écrivait le gain par `Math.round` seul, donc
« − 1601 kg CO₂e » là où le dépôt écrit « − 1 601 » (`formatKg`). Corrigé dans la même PR — le code
gagne, et le kit est un miroir tenu (`v1-29` §5).

## Relecture du 28/09/2026

Une contre-lecture adversariale a relu la première version avant la PR et y a trouvé treize défauts,
tous corrigés : l'ouverture multiple attribuée à #238 (la réparation de la planche A2) au lieu de `v1-16` §5 (et la question reposée) ;
une pastille qui n'était pas bordée, alors que le brief le demandait et qu'un fond gris seul ne
tranche qu'à 1,14:1 ; la hauteur des rangées d'aujourd'hui (72 et non 68) ; la planche B1 qui cochait
une échéance d'avance ; la carte d'attente du plan posée au-dessus du titre, et une carte d'attente
incohérente avec la feuille derrière laquelle elle se tient ; un « accent plein une seule fois » qui
oubliait la barre d'onglets ; deux cotes approximatives présentées comme mesurées ; la liste de ce
qu'il faudra réécrire, qui oubliait la moitié des commentaires et le bloc 06 de la recette ; un
numéro cité seul ; « v1-30 » en deux sens ; un défilement animé proposé sous « aucune animation
neuve » ; et « Choisir à la place », un texte montré, tranché sans avoir été posé (il l'a été ensuite).

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil du chantier, comme les dossiers précédents le font : le dépôt gagne, le canvas
ne se réécrit pas.

**Livré le 29/09/2026** ([`v1-32`](../../architecture/v1-32-toutes-les-pistes.md) §8). Les planches A1,
A2, B1, B2, B3 et C1 ont été retrouvées à l'écran au navigateur, sur les données du canvas (le profil 1
et le petit rouleur, fabriqués sur la stack locale), à 390 et 360. **Les planches `-sombre` ne se
voient pas au navigateur** : le web reste en clair par décision (`src/hooks/use-theme.ts`), et
l'émulation du thème sombre y rend donc le clair, comme voulu. Elles ont été regardées sur un export
de brouillon forcé en sombre, jamais commis : la pastille, la ligne engagée et la carte ouverte y
rendent ce que dessine le canvas. Les écarts :

| Quoi | Le canvas | Le dépôt | Pourquoi |
|---|---|---|---|
| Le focus sur le plan | Le HANDOFF dit que rien n'y change | « Je m'y engage » donne le focus à la question, « Annuler » le rend au bouton revenu | Les deux disparaissent sous le doigt, le même trou que sur la liste ; le combler au passage est la règle du dépôt (`v1-32` §4.2). Rien ne change de ce qui se voit. `Button` a gagné une prop `ref` pour ça |
| La rangée | Un composant ou non, question laissée ouverte | Reste dans l'écran (`Lignes`, `pistes.tsx`) | Un seul écran la rend ; un composant arriverait avec une fiche de kit pour zéro réutilisation (`v1-32` §3) |
| La cible du focus à l'ouverture | « le groupe de la question » | Le **texte** de la question, « Quand ? » ou « Quels jours ? », rendu focalisable par programme | C'est le nom même du groupe qui suit : le lecteur d'écran lit la question puis les choix, et la tabulation reprend à la première puce. Rendre le groupe focalisable demandait d'ouvrir `GroupeDeChoix`, partagé par tout le questionnaire. Sur la liste, il part une fois la carte grandie (250 ms, tout de suite sous « réduire les animations ») : au montage, la question est encore découpée et transparente. Vérifié au navigateur (`document.activeElement`) ; TalkBack reste au doigt (`v1-13` §11.24) |
| Le défilement jusqu'à « C'est noté » | « l'écran défile juste assez », sans dire quand | Il part une fois la carte grandie, 250 ms après le toucher, et garde 16 px en haut comme en bas | Mesuré au navigateur : parti pendant que la carte grandit, le défilement est borné par le contenu de l'instant, et s'arrêtait avec « C'est noté » sous la barre d'onglets. La carte s'ouvre, puis l'écran monte ; sous « réduire les animations », tout est posé d'un coup |
| La hauteur de la pastille | 32 | 32 **au moins** (`minHeight`) | Le libellé suit l'agrandissement des polices du système, comme le bouton (A10-21) : une boîte figée à 32 le ferait déborder |
| « C'est noté » après un envoi réussi, sur la liste | — | Reste inactif jusqu'à ce que l'écran parte vers le plan | Sur natif, le retour de la pile s'anime : le bouton redevenu actif pendant ce temps se retouchait. Invisible sur web, où le retour est immédiat |

**Relevé en passant, hors mandat** : le libellé d'une échéance qui passe sur deux lignes (« À mon
prochain projet de voyage », à 390) est **centré** dans le canvas (B1) et **aligné à gauche** dans le
dépôt — `Chip` centre sa boîte, pas son texte. C'est le contenu du sélecteur, inchangé par ce
chantier (brief §5), et le même composant sert tout le questionnaire : à trancher sur un canvas ou à
la recette, et consigné en attendant au relevé de dette (`v1-27` §12.19).
