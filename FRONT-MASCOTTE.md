# FRONT-MASCOTTE.md — Ramille : sa géométrie, ses saisons, ce qu'elle dit

> **Quand ouvrir ce fichier.** Faire parler Ramille — une réplique, une carte où elle parle ·
> toucher à la mascotte : son dessin, ses accessoires de saison, son visage · décider si une phrase
> est la sienne ou celle du produit · placer la mascotte sur un écran, surtout près d'un chiffre.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `FRONT.md` le 01/10/2026, qui pesait 102 Ko — avec
`FRONT-QUESTIONNAIRE.md`, `FRONT-SESSION.md`, `FRONT-SUIVI.md` et `FRONT-MOUVEMENT.md`. Ses sections
y sont venues **telles quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la famille, donc
un renvoi « `FRONT.md` §2.x » écrit avant cette date — dans un commentaire du code, un document daté
— se retrouve ici, et la table en tête de `FRONT.md` dit où vit chaque numéro. Tout ici est propre à
Ramille ; ce qui voyage est en `FRONT.md` §1, et le design system se lit par le skill
`ramille-design`.

---

## 2. Propre à Ramille

### 2.3 La mascotte : sa géométrie, ses saisons, et tout ce qu'elle dit

- **La mascotte ne se redimensionne pas proportionnellement : sa géométrie est calculée**
  (`src/types/mascot.ts`, `mascotFaceGeometry`), et `src/components/mascot.tsx` ne fait que
  dessiner ce qu'elle rend. Le visage vit dans un `viewBox` 0 0 100 100, donc une unité vaut
  `size / 100` pixels : au trait nominal de 3,2 unités, la bouche mesurait **0,70 px** à
  `size={22}` dans l'en-tête du questionnaire et l'antialiasing n'en laissait qu'une tache
  grise — la mascotte y coûtait sa place sans rien rendre. La compensation optique épaissit
  donc les traits à mesure que `size` diminue (les positions ne suivent qu'à 20 %, sinon
  l'œil sort de la feuille), et sous `MASCOT_MIN_FACE_SIZE` le composant rend la feuille
  seule plutôt qu'un visage illisible. Ne jamais réintroduire de chemin SVG figé dans le
  composant, et ne jamais passer un `size` inférieur à cette constante. Deux pièges vérifiés :
  le point de contrôle d'une quadratique est à **2×** la flèche voulue (s'y tromper double la
  courbure des yeux, ce que ni le typecheck ni les assertions de lisibilité ne voient — seul
  un rendu visuel l'a montré, d'où le test de conformité aux chemins d'origine), et arrondir
  `50 ± offset` casse la symétrie d'un centième, d'où l'arrondi sur l'écart et non sur la
  coordonnée. Les joues affleurent le bord de la silhouette dès la taille nominale : le
  visage est découpé par un `clipPath`, sans quoi elles flottent hors du vert.
  **Elle porte la saison** (C2.13) : un bonnet en hiver, un bourgeon au printemps, une goutte de
  rosée en été, des joues chaudes en automne. La saison par défaut est celle du jour (`saisonDe`),
  donc **aucun écran ne la passe** et le 1er décembre elle change partout sans mise à jour de l'app
  — jamais dérivée de `plan_cycles` ni de la cadence, un trimestre glissant n'ayant pas de saison
  nommée. Quatre points à connaître avant d'y toucher. L'automne n'est **pas** un accessoire : il
  reprend les joues du visage (rayon × 1,18, opacité + 0,25, ton chaud), donc il vit dans
  `mascotFaceGeometry` et `mascotSeasonGeometry('automne', …)` rend une liste vide — deux couches de
  joues, l'une découpée et l'autre non, se verraient au bord de la feuille. Les trois autres ne sont
  **pas découpés** par le `clipPath`, à la différence du visage : le clip existe parce que des joues
  hors du vert se lisent comme un bug, pas pour empêcher un chapeau de se porter sur la tête, et
  découper rognerait le pompon en lentille. Ce qu'il garantissait, un test le garantit autrement —
  chaque élément reste dans le `viewBox`. Les positions sont **fixes** et seules les épaisseurs et
  les rayons suivent `k`, comme les traits du visage. Et les quatre jetons (`mascotInk`,
  `mascotVein`, `mascotAccessory`, `mascotWarm`) existent dans les deux thèmes mais ne sont **lus
  qu'en clair** : le composant lit `Colors.light` comme avant, dormance assumée et commentée sur
  place — le jour où un thème sombre est livré, c'est cette table qui dit ce qui bascule (la
  feuille, les joues et le ton chaud) et ce qui ne bascule pas (l'encre). `mascotWarm` porte bien deux valeurs : ranger tous les accessoires du côté « ne bascule pas » était faux. **Ce qui se voit au rendu ne se
  voit pas à la lecture d'un chemin** : deux des trois écarts au canvas viennent d'une capture des
  cinq expressions × cinq tailles × cinq saisons, et les deux assertions qui en sortent — la
  distance **réelle** entre accessoire et visage, et la lisibilité de chaque élément — valent mieux
  que la capture. **Le quatrième écart vient du même genre de relevé, poussé d'un cran**
  (14/09/2026) : le rayon extérieur du pompon passe de 5,6 à **7,1**, parce qu'à 5,6 le cerne clair
  qui le sépare de la calotte mesurait 0,71 px de 28 à 40 — sous le plancher de 1,3 px, franchi
  seulement au-dessus de 76, c'est-à-dire sur le seul écran de lancement. Un rendu rastérisé à la
  vraie taille puis agrandi sans lissage montre qu'aux tailles courantes il ne se lit **pas du
  tout** : le pompon devient un point chaud sur une calotte chaude. Deux choses à ne pas défaire —
  c'est le rayon **extérieur** qu'on ouvre et jamais le cœur qu'on rétrécit (le cœur fait le deux
  tons, et il porte le dessin à 168 px), et 7,1 plutôt que 7,0 parce que l'arrondi au centième
  ramènerait le cerne à 1,2997 px à `size` 41, soit sous le seuil de trois dix-millièmes. Le pompon
  vaut alors 56 % de la largeur de la calotte à `k` maximal et son bord haut tombe à y = 1,35 : c'est
  la borne du `viewBox`, donc on ne l'ouvre pas davantage. Exclus, et ils doivent le rester : la carte de partage (`api/share-card.ts`), le
  favicon, `mascot-mark.svg`.
  **Elle parle, et tout ce qu'elle dit vit dans `src/constants/mascotte.ts`** (`RAMILLE`),
  rendu par `RamilleDit` — jamais une phrase écrite dans un écran. Trois règles, gardées par
  un test : première personne et tutoiement ; **jamais un nombre dans sa bouche** (les
  chiffres restent au produit, c'est ce qui garantit qu'elle ne commente jamais une
  empreinte) ; jamais « tu devrais » ni « il faut ». Les rappels par email sont un mot
  d'elle, signé (`enqueue_checkin_reminders`). Les répliques de check-in **d'origine** viennent
  des maquettes validées et ne se réécrivent pas ; **la période calme fait exception** — « Rien à
  rattraper. » a été retirée le 07/09/2026 sur un retour d'usage (elle se lisait comme une
  attente déçue), remplacée par des phrases qui *disent* l'attente et nomment le jour. Elle
  peut le faire sans jamais compter, le rythme étant fixe.
  **Des variantes s'ajoutent depuis la décision D12 du 10/09/2026** (C2.12) : l'originale reste en
  **première position** de son tableau et n'est pas modifiée, et `variantePourLaPeriode`
  (`src/types/checkin.ts`) en choisit une par **période**. Jamais un tirage au hasard :
  `useRafraichirAuRetour` relit l'écran du plan à chaque retour au premier plan, donc la phrase
  changerait plusieurs fois dans la même période et différerait d'un appareil à l'autre. Le hachage
  est un FNV-1a 32 bits avec un `>>> 0` à chaque tour — sans lui la multiplication sort de l'entier
  exact des `number` et Hermes et V8 ne rendraient pas la même phrase pour la même semaine ; et deux
  périodes voisines ne diffèrent que de sept jours ou d'un mois, donc une somme de codes de
  caractères donnerait des indices corrélés. **Les tableaux sont doublés par boucle** (« À lundi. »
  n'a aucun sens sur un point mensuel) et `checkinSansObjet` l'est par **poste**, ce qui est l'écart
  de C2.4. L'usure que ces variantes traitent n'est **pas mesurable** — `checkin_answer` est interdit
  comme événement d'usage — c'est un choix de ton, assumé comme tel.
  Depuis C2.5 certaines répliques sont **groupées** (`maintienNon` par mode, les tableaux de C2.12) :
  le test aplatit `RAMILLE` avant de l'éprouver, et il le fait parce qu'une valeur non-textuelle
  traverse `expect.stringMatching` **sans jamais matcher** — les trois règles de voix passeraient en
  silence sur une réplique groupée. Deux gardes s'ajoutent à C2.12 : l'originale en tête de chaque
  tableau, et **aucun doublon** — un copier-coller qui laisse deux entrées identiques réduit la
  variété sans que rien ne le signale, c'est-à-dire défait le chantier en silence.
  Cinq expressions, **aucune négative et il ne faut pas en ajouter** : `calm`, `happy`,
  `encouraging`, `thinking` (attente du calcul — seule asymétrie assumée, le regard est décalé
  d'une unité) et `resting` (périodes calmes de `/suivi`). Un second registre s'obtient sans
  redessiner, par la prop `tilt` : une feuille penchée regarde, une feuille droite accompagne.
  **La mascotte n'apparaît jamais à côté d'un chiffre lourd** — ni près du total, ni près d'une
  empreinte élevée : y mettre un visage serait commenter, et le produit ne commente pas.
