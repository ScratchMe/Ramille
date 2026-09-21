# FRONT.md — l'écran, ce qu'il affiche et ce qu'il tait

> **Quand ouvrir ce fichier.** Toucher un écran, un composant ou une dérivation lue par un écran ·
> écrire une phrase que quelqu'un lira · afficher un chiffre, un repère, un poste, une saison ·
> faire parler Ramille · rendre quelque chose cliquable · toucher un état de chargement, un état
> vide ou un écran d'erreur · ajouter une route · toucher au questionnaire, au plan ou au suivi.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `CLAUDE.md` le 17/09/2026, où il pesait 545 lignes sur 1 911 — 29 % du
seul fichier chargé à chaque session. Même motif que `VERCEL.md`, `SUPABASE.md`, `EXPO.md` et
`TESTING.md` : ce qui est propre à **un sujet** vit dans son fichier, ouvert sur déclencheur.

La §1 vaut sur n'importe quelle app qui affiche des chiffres à quelqu'un ; la §2 est Ramille, et
ne voyage pas.

## 1. Ce qui vaut sur n'importe quelle app

### 1.1 Une dérivation affichée sort de l'écran

**Toute dérivation pure affichée à la personne, ou décidant d'une navigation, vit hors du
composant** — dans un module pur, avec ses tests. C'est la règle qui décide de ce qui est testé
dans ce dépôt (`TESTING.md` §2.1), et sa conséquence chiffrée est nette : le module pur est à
99 % de couverture, les écrans à zéro, par décision.

Trois choses qu'elle achète, et qui n'ont rien d'évident :

- **une phrase fausse devient éprouvable.** « Deux actions pour ton trajet domicile-travail » au
  dessus de onze pistes, « du plus gros gain au plus petit » au-dessus d'une liste où l'action
  engagée passe devant : ces deux-là ont été trouvées en relisant, pas en testant, **parce
  qu'elles étaient dans le composant** ;
- **un ternaire dans un composant n'a pas de nom**, donc personne ne peut dire ce qu'il oublie. La
  version dérivée, si : elle a une signature, et ses cas se comptent ;
- **deux écrans qui doivent s'accorder ne peuvent plus diverger** s'ils lisent la même fonction.

**Le corollaire qui coûte, et qui a coûté** : un test sur une fonction pure garde la fonction,
**jamais ses appels**. Quand elle reçoit un ensemble, une liste d'identifiants ou un drapeau plutôt
que les objets qu'elle décrit, c'est le **nom du paramètre** qui porte le contrat — et un nom qui
ment fait passer l'appel fautif sous un test vert (contre-lecture du 17/09/2026, défaut n°1).

### 1.2 Une lecture qui échoue ne rend jamais un état vide

`{ ok: true, data } | { ok: false }`, **jamais erreur → tableau vide**. Un état vide est une
**affirmation sur les données de la personne** : « ton suivi commence au premier bilan » à
quelqu'un qui a douze bilans est un mensonge, pas une dégradation.

Quatre règles qui en découlent, et qui se sont toutes payées :

- **le drapeau d'échec vit à côté de l'état, jamais dans sa variante `ok`.** Logé dedans, le repli
  détruit les états « rien à afficher » légitimes — et avec eux les boutons qui en sortent ;
- **l'écran d'erreur plein écran ne s'atteint que depuis le chargement** : lui seul veut dire
  « rien n'a jamais pu être lu ». Une relecture en échec se dit à côté, sans rien effacer ;
- **le « Réessayer » repasse par l'état de chargement dans son propre gestionnaire**, jamais dans
  la fonction de rafraîchissement : sans ce passage, un second échec rend le même écran et le
  bouton a l'air mort ; dedans, il fait clignoter l'écran à chaque retour au premier plan ;
- **une valeur par défaut posée sur un échec est du même mensonge.** Ce qu'on ne sait pas vaut
  `null`, et l'élément ne s'affiche pas — plutôt que de nommer le mauvais jour, le mauvais canal
  ou le mauvais rythme.

### 1.3 Un état de chargement n'affirme rien non plus

Le même raisonnement une seconde avant : **l'état de départ d'un écran est lu par tout le monde, à
chaque ouverture**. Il doit donc être celui qui n'affirme rien — et sur une app qui se rend aussi
en statique, celui du rendu serveur (`EXPO.md` §1.4).

Le cas d'école : une barre de navigation masquée par une marque locale. Démarrer à « masquée »
la fait disparaître une fraction de seconde chez **tout le monde**, à chaque chargement de page ;
démarrer à « visible » ne coûte qu'un transitoire à ceux qui doivent la voir disparaître.
**Mesuré plutôt que supposé** : dix à dix-sept millisecondes, une image au plus.

### 1.4 Accessibilité : le libellé annoncé *est* le texte affiché

- **un texte cliquable passe par un composant dédié**, jamais par un `Pressable` enveloppant un
  texte : un libellé recopié à côté du texte visible finit toujours par ne plus lui correspondre ;
- **les choix exclusifs sont des `radio`**, seul rôle qui annonce « sélectionné » et la place dans
  le groupe. Un `button` qui porte `selected` est un défaut, pas un raccourci ;
- **une puce annoncée seule doit se suffire** : détachée de la question posée trois lignes plus
  haut, « Aucun » ne dit rien. C'est ce qu'un libellé accessible ajoute, et c'est la chose qu'on
  oublie en écrivant les libellés visibles ;
- **les illustrations et les mascottes sont masquées** : elles accompagnent un texte qui dit déjà
  tout ;
- **les titres s'annoncent en en-tête par leur type**, pas écran par écran ;
- une cible tactile fait 44 px **par sa hauteur** quand les rangées se touchent — du `hitSlop` y
  ferait se recouvrir deux zones.

### 1.5 Une phrase qui dit quoi faire donne le moyen de le faire

« Rattache un compte pour recevoir le mot par email » sans rien à toucher est un mur. La porte se
rend **sous la ligne qui la porte**, et **seulement dans l'état qui la réclame** — pas la carte
entière rendue cliquable, ce qui ferait une cible morte des variantes qui n'ont rien à offrir.

### 1.6 Un chiffre vit à un seul endroit, et sa forme aussi

Un repère affiché ne se recopie pas dans un écran. Et quand deux contextes ne peuvent pas partager
le module (un runtime différent, un bundler séparé), **la duplication se garde par un test** qui
lit les deux côtés : la règle « tenir les deux moitiés » ne s'applique pas toute seule, et le jour
où elle est oubliée, les deux chiffres du même partage se contredisent sur une surface publique.

**Et la forme inclut les caractères invisibles**, qui sont le pire endroit où recopier quoi que ce
soit. Le groupement des milliers était écrit **quatre fois** dans le dépôt — le même `replace`, le
même séparateur — parce qu'une ligne de trois caractères ne se lit pas comme une dérivation. Une
seule fonction désormais (`grouperLesMilliers`), et les quatre appellent.

### Un caractère de mise en forme n'est pas un choix typographique tant qu'on n'a pas mesuré sa chasse

Le séparateur retenu était U+202F, l'espace **fine** insécable, sur l'argument — juste en général —
qu'une insécable ordinaire « écarterait trop ». Relevé dans la police du produit avec opentype.js,
à 2000 unités par cadratin : U+202F y vaut **71 unités**, soit **0,6 px à 17** ; U+00A0 en vaut
**357**, c'est-à-dire **1/6 de cadratin** (333), exactement la valeur que la typographie française
demande. « 1 601 » se lisait donc « 1601 », et il a fallu une recette pour le voir.

La règle : **relever la chasse dans la police qu'on utilise**, pas dans la norme. Elle se refait le
jour où la police change, et ça se mesure en une commande — charger le `.ttf` et lire l'`advanceWidth`
du point de code.

**Corollaire pour les tests** : un séparateur s'écrit par son **point de code** (`\u00a0`) et jamais
collé en littéral. Trois assertions le portaient en clair, et leur échec affichait
`Expected: "1 600"` / `Received: "1 600"` — deux chaînes rigoureusement identiques à l'œil. C'est
exactement ce qui avait laissé passer le mauvais caractère.

## 2. Propre à Ramille

### 2.1 Les chiffres affichés, les repères, et le vocabulaire des postes

- **Tout repère chiffré affiché à l'utilisateur vit dans `src/constants/carbon-reference.ts`**,
  jamais en dur dans un écran : moyenne française, objectif 2050, décomposition par poste,
  repère transport. **Une seule source statistique, le SDES** (décomposition par postes de
  consommation, données 2017) : le total affiché est *défini* comme la somme des postes, jamais
  recopié d'ailleurs. C'est délibéré — il circule au moins quatre chiffres officiels pour « la
  moyenne d'un Français », dont deux contradictoires sur le site de l'ADEME lui-même (9,1 t et
  9,3 t), et une première version mélangeait ce 9,3 t avec la ventilation SDES. Ne pas
  « rafraîchir » le total avec une valeur plus récente sans reprendre aussi la ventilation :
  l'arbitrage complet est en `v1-07` §3.4 et un test épingle l'invariant. Seule exception, la
  cible 2050 (2 t, ADEME) — un objectif normatif ne concurrence pas une mesure.
  `TARGET_2050_TRANSPORT_T` est une **dérivation** explicitement signalée — aucune source
  publique ne donne d'objectif 2050 par poste d'empreinte individuelle — d'où le libellé
  « Repère » et non « Objectif » à l'écran.
  **Trois formateurs, et ils ne disent pas la même chose.** `formatTonnes` (`src/lib/format.ts`)
  bascule : kilos arrondis sous la tonne, dixième de tonne au-dessus — sans quoi tout ce qui vaut
  moins de 50 kg s'affichait « 0,0 t CO₂e », c'est-à-dire les postes secondaires de n'importe quel
  bilan et la phrase « Le repère 2050 est à ta portée : 0,0 t CO₂e de moins sur l'année »,
  adressée au profil qui en est le plus près. `formatTonnesShort` (`carbon-reference.ts`) ne
  bascule pas, et c'est délibéré : il porte l'échelle de comparaison — la moyenne française, le
  repère 2050 — qui reste dans une seule unité pour que les barres se comparent. Les deux se
  lisent côte à côte dans la carte « Où tu te situes » de `suivi/bilan.tsx`, d'où la règle : **les
  lignes de repère restent en tonnes, les lignes qui sont les chiffres de la personne passent par
  `formatTonnes` sous la tonne** (« Toi », « Ton prochain palier » — sauf quand le palier *est* le
  repère 2050, où la ligne redevient un repère). Ce qui n'est **pas** réglé : au-dessus de la
  tonne, deux bilans à 1 240 puis 1 180 kg s'affichent toujours « 1,2 t » tous les deux sous une
  note « 5 % de moins » — **c'était** A5-3 symptôme 1, refermé le 14/09/2026 : `variationNote` dit
  désormais l'écart absolu d'abord (« 60 kg de moins que ton bilan précédent (− 5 %) »), donc la
  note corrobore ce que deux barres identiques ne distinguent pas. Le remède était bien de dire
  l'**écart** en kilos côté suivi, jamais une forme de plus dans le formateur — et il fallait le
  dire **sur `/suivi`** : la première rédaction donnait le constat pour clos par `formatTonnesNu`,
  que seule la restitution lisait. Et `src/lib/format.ts` doit rester pur pour une
  raison qui ne se voit pas : `src/types/resultat.ts` l'importe, donc une dépendance ajoutée là
  ferait tomber toute la suite Jest qui en dépend.
  **Le troisième est `formatTonnesNu`** (C2.7, même module) : la même bascule que `formatTonnes`, par
  la même fonction interne, mais **sans le nom du gaz**. Deux endroits en ont besoin, et dans les
  deux « CO₂e » est du bruit — « 2,1 t CO₂e → 1,7 t CO₂e » sur une ligne de l'écart par poste, et
  « 600 kg CO₂e de moins que ton bilan de mars » dans une phrase, où le gaz s'intercale entre le
  nombre et ce qu'il qualifie. Le nom du gaz appartient au chiffre qui se tient **seul** : un total,
  un gain, un cap. Ce n'est donc pas une troisième règle d'unité, et c'est pour ça qu'il n'entre pas
  en concurrence avec les deux autres.
  **C'est aussi ce qui referme A5-3** : l'écart entre deux bilans se dit en kilos
  (`variationDepuisLeBilanPrecedent`), là où deux bilans à 1 240 puis 1 180 kg s'affichaient tous
  deux « 1,2 t ». Le remède était bien une décision d'écran, pas une forme de plus dans le
  formateur du total.
- **Le palier de la restitution est le cap de la saison, jamais une marche inventée**
  (`src/types/palier.ts`). La barre « Repère 2050 » lui a cédé sa place : afficher 15,8 t à côté
  de 0,6 t donnait un rapport de 1 à 26 que le texte ne rattrape pas, et 2050 tient désormais
  en mots. Deux mécaniques ont été écartées sur les données réelles et ne doivent pas revenir :
  la trajectoire linéaire (le pas dépend du point de départ — −609 kg/an à 15,8 t contre
  **−6 kg/an** à 0,76 t) et les marches absolues partagées (première marche à −82 %). Le repère
  2050 réapparaît **dès qu'on passe sous la moyenne française** (`showsTarget2050`) : au-dessus
  c'est un gouffre, en dessous un horizon crédible à un facteur 2 à 4. Quand le palier tombe
  pile sur le repère, c'est le **repère** qui est affiché — c'est l'objectif final, pas une
  étape. Être déjà sous le repère ne coupe pas la proposition : la marche reste offerte, dans un
  registre de contribution (« ce que tu n'émets pas laisse de la marge ailleurs ») et jamais
  d'exigence. **Le nombre de paliers restants ne s'affiche jamais.**
- **Le vocabulaire d'un poste vit dans `src/constants/postes.ts`, et il a quatre registres qu'il
  ne faut pas fusionner.** `POSTE_LABEL` est l'étiquette nue (« Trajet domicile-travail »),
  `POSTE_SUBJECT` / `POSTE_EN_PHRASE` le sujet d'une phrase de restitution, et **`FORME_INSERABLE`
  la forme courte qui suit une préposition** (« pour ton trajet domicile-travail », « − 20 % sur
  tes voyages »). Les deux dernières se ressemblent assez pour qu'on soit tenté de n'en garder
  qu'une ; les unifier rallonge la question du point d'un « longue distance » ou change
  « sorties » en « loisirs » dans la copie validée du canvas — un test l'épingle. Avant C2.6, cinq
  phrases collaient après une préposition le libellé **snapshoté**, mode compris : « as-tu changé
  de mode de transport cette semaine pour Trajet domicile-travail (Voiture thermique) ? ».
  La jumelle SQL est `public.poste_inserable(poste, loop_type)` — écrite deux fois parce qu'un
  rappel part sans le client, **donc à toucher ensemble**, comme `reminder_channel_for`. Les deux
  s'accordent sur **toute valeur que le schéma autorise** (contre-vérifié valeur par valeur le
  11/09/2026) ; elles divergent sur une valeur qu'il interdit — un poste inconnu rend « tes trajets »
  en SQL, et le repli de boucle côté client. Les trois colonnes portent
  `check (poste is null or poste in ('commute','leisure','travel'))`, donc cette branche SQL est
  **inatteignable** et aucun test ne la couvre : ne pas la prendre pour un quatrième registre, et si
  un quatrième poste arrive un jour, c'est la branche qui ferait dire au rappel autre chose qu'à la
  carte — exactement le défaut que C2.5 a corrigé.
  Elle a imposé trois colonnes, et la raison vaut d'être connue : le serveur **décidait** du poste
  puis n'en gardait que le libellé. `assessment_results.extras_poste` (loisirs ou voyages),
  `engagement_checkins.poste` (`loop_type` ne le nomme pas : « extras » couvre les deux) et
  `plan_cycles.poste`. Se rabattre sur `loop_type` aurait remplacé une vérité laide par une
  **fausseté lisible** — « tes sorties du week-end » à quelqu'un dont le poste est les voyages.
- **La saison côté client vit dans `src/types/saison.ts`** (`saisonDe`, `recapDeSaison`), miroir
  exact de `public.season_bounds` : saisons **météorologiques**, décembre appartenant à l'hiver
  **qui commence**. Ne jamais la dériver de `plan_cycles` ni de la cadence — `rolling_quarter`
  n'a pas de saison nommée, alors que la mascotte et les regroupements du suivi suivent le
  calendrier dans les deux cas. `recapDeSaison` compte les points **répondus** et les « oui », et
  **jamais les manqués** : il n'y a volontairement aucun champ pour les dire, parce qu'un champ
  rendrait affichable ce que `/suivi` refuse de montrer. Son filtre est `status = 'answered'` et
  non la réponse elle-même, pour que la troisième réponse de C2.4 (« pas de trajet cette période »,
  un point bel et bien répondu) y entre sans rien changer. `PointDeSaison.reponse` parle le
  vocabulaire de `response_kind` depuis C2.8 et non plus un `boolean | null`, où `null` voulait dire
  à la fois « pas répondu » et « répondu sans objet ».
  Le module porte aussi, depuis C2.8, ce que le plan affiche de la période : `finDePeriodeEnMots`
  (« jusqu'au 30 novembre », qui lit les **caractères** de la date et jamais un `Date` — minuit UTC
  serait la veille à l'ouest de Greenwich), `progressionDeLaPeriode`, `estDansLouverture`,
  `ouvertureDeSaison`, `sortiesDeLouverture` et `basculeDeSaison`. Les douze mois et le « 1er »
  viennent de `src/types/checkin.ts` (`MOIS_FRANCAIS`, `jourDuMois`, exporté pour l'occasion) : une
  seconde copie divergerait par la faute de frappe que personne ne relit.
- **La moyenne française n'est pas montrée à qui n'a pas le choix** (C3.1,
  `montreMoyenneFrancaise` dans `src/types/resultat.ts`). `assessment_results.mobility_constrained`
  est calculée depuis l'increment 6, commentée « pour la restitution », et n'était lue par **aucun**
  écran : la barre s'affichait donc à quelqu'un qui vient de déclarer n'avoir aucun transport en
  commun, et une moyenne dont il ne peut pas s'approcher est un score avec un mauvais côté, pas un
  repère. Trois points à ne pas défaire : **`null` montre la barre** (les bilans d'avant la colonne
  la portent, et ne pas savoir n'est pas une contrainte — d'où `!== true`) ; **rien d'autre n'est
  masqué**, ni le repère 2050, ni le palier, ni la répartition par poste, et le drapeau ne pilote pas
  l'estimateur d'actions, qui filtre l'impossible par le contexte B4 ; et **la phrase de
  remplacement se rend à deux endroits gardés l'un par l'autre** — `comparisonNote` ne parle qu'en
  relecture, `palierNote` la remplace en mode `nouveau`, donc une seule branche aurait laissé le
  profil concerné sans phrase à l'endroit même où la barre disparaît.
  **Et `/suivi` nomme la moyenne même pour ce profil, ce qui est assumé** (14/09/2026) : ce que C3.1
  retire est la **barre**, c'est-à-dire un score avec un mauvais côté ; la phrase du suivi ne se rend
  qu'en **dessous** de la moyenne, donc du seul côté qui soit favorable, et la taire cacherait à ce
  profil la seule comparaison qui joue pour lui.
### 2.2 Les pages légales, et le régime juridique qui les explique

- **Les pages légales (`/confidentialite`, `/conditions`) partent d'un fait juridique qu'il ne
  faut pas « corriger » par réflexe : le produit est édité par un particulier, à titre non
  professionnel et sans but lucratif.** L'article 6 III-2 de la LCEN autorise alors à ne
  publier que les coordonnées de l'hébergeur, et le médiateur de la consommation (code de la
  consommation L612-1) ne s'applique pas du tout — il ne vise que les professionnels. D'où
  l'absence assumée de statut juridique, d'adresse postale, d'immatriculation et de directeur
  de la publication. Seul le RGPD (art. 13) reste incompressible : nom et coordonnées du
  responsable de traitement, regroupés dans `src/constants/editeur.ts` — un seul endroit à
  remplir, jamais de mention en dur dans un écran. Ce régime tomberait si le projet devenait
  une activité professionnelle.
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
### 2.4 Ce qui se touche, et ce qui s'annonce

- **Un texte cliquable passe par `TextLink`, jamais par un `Pressable` enveloppant un
  `ThemedText`.** L'audit T11 avait relevé **zéro attribut d'accessibilité dans tout `src/`**, et
  ce motif y comptait pour une vingtaine d'occurrences. Le composant existe pour que le libellé
  annoncé **soit** le texte affiché — un `accessibilityLabel` recopié à côté du texte visible
  finit toujours par ne plus lui correspondre — et pour porter la cible tactile de 44 px sans
  déplacer le texte. Trois règles qui vont avec : les titres sont annoncés comme en-têtes
  **par leur `type`** (`title`/`subtitle` dans `ThemedText`), pas écran par écran ; les listes
  de choix exclusifs (`ModeListItem`, `ChoiceRow`) sont des `radio` et non des `button`, seul
  rôle qui annonce « sélectionné » ; et la mascotte comme les illustrations sont masquées
  (`aria-hidden`, `accessibilityElementsHidden`) — elles accompagnent un texte qui dit déjà
  tout. Un `Pressable` nu reste légitime quand la cible porte plusieurs textes (la bannière de
  `src/app/(tabs)/suivi/bilan.tsx`), à condition de lui donner un `accessibilityLabel` qui les
  recompose.
- **Un lien qui doit compter pour un moteur de recherche passe par `Link` d'Expo Router, jamais
  par un `onPress`** (rendu en `<div>` par `react-native-web`), et se vérifie dans le HTML statique
  de `dist/` : `EXPO.md` §2.1.
### 2.5 La frontière avec la plateforme : `api/`, l'environnement, l'hydratation

- **Ce que `api/` duplique de `src/` doit être tenu des deux côtés, et la liste est courte.**
  Les Vercel Functions ne peuvent pas importer `src/` (tsconfig dédié, runtime Web Fetch API) :
  `APP_NAME` y est un littéral, et depuis le 11/09/2026 **la règle des kilos sous la tonne** aussi.
  L'oubli ne se voit d'aucun côté pris séparément : quand `formatTonnes` a basculé en kilos sous
  1 t, le message de partage s'est mis à dire « 40 kg CO₂e » pendant que l'aperçu et l'image
  gardaient « 0,0 t CO₂e » — les deux chiffres du même partage se contredisaient, sur la seule
  surface publique du produit. Chaque côté est épinglé depuis le 20/09/2026 — Jest sur
  `src/lib/format.ts`, `scripts/verifier-api.mjs` sur le « 40 kg et non 0,0 t » d'`api/` — mais
  **aucune suite ne compare les deux entre eux** : chacune pingle sa moitié sur une valeur écrite
  à la main, donc changer la règle des deux côtés sauf un la laisse verte des deux côtés.
  Toucher à un formatage affiché impose donc de chercher son jumeau dans `api/`.
- **Une valeur `EXPO_PUBLIC_*` peut disparaître du bundle sans que rien ne bronche** — lire la
  variable dans un `const`, jamais en valeur d'une propriété homonyme ;
  `scripts/verifier-configuration-export.mjs` garde ce point : `EXPO.md` §1.2 et §2.1.
- **La configuration Supabase absente ou fautive s'affiche, elle ne plante plus.**
  `src/lib/supabase.ts` ne lève plus au chargement du module mais à la première utilisation
  (mandataire) : le contrat ne change pas — aucun écran ne fonctionne sans configuration — mais
  le layout racine peut rendre `ConfigurationManquante` au lieu de laisser l'app s'ouvrir et se
  refermer sans un mot, ce qui n'était lisible **nulle part** sur un build natif de production.
  La dérivation vit dans `src/types/configuration.ts` (module pur, testé), qui refuse aussi une
  URL portant un chemin — `.../rest/v1` collé à la place de l'URL du projet a coûté un cycle de
  build. L'écran s'adresse à la personne qui développe : ni la voix de Ramille, ni la mascotte.
- **Un état qui diffère entre le serveur et le client doit démarrer à la valeur du serveur et
  changer après hydratation** (`useSyncExternalStore`, jamais `useWindowDimensions` — le pager
  d'onboarding l'a appris, v1-11 §9.10) : `EXPO.md` §2.2.
### 2.6 Le questionnaire : ce qu'une réponse efface, et comment on saisit

- **Une réponse rendue impossible par une autre réponse s'efface dans `normaliserReponses`, et
  nulle part ailleurs** (`src/types/bilan.ts`, appliquée après chaque `update` du questionnaire et
  à la relecture d'un brouillon). Trois écrans tenaient trois listes de remises à zéro, qui
  divergeaient déjà : changer le mode principal effaçait la motorisation sans regarder si le
  **second** mode était encore une voiture ; « Non » à B1.1 oubliait le type de deux-roues ; et
  choisir comme mode principal celui déjà pris en second laissait les deux jambes sur « voiture »,
  la ligne n'apparaissant plus nulle part et la moitié du trajet étant facturée au tarif solo.
  Deux règles : la fonction est **idempotente** (elle s'applique aussi à un brouillon écrit avant
  ces règles), et ce qui décide d'effacer un champ est **ce que le calcul lit encore**, pas ce que
  l'écran affiche — la branche « rarement » des loisirs en est l'exemple, commentée sur place.
  **Et depuis `v1-16` §4, elle écrit `false` ou `null` selon ce qu'elle veut dire** : `false` quand
  la question ne s'applique plus (pas de trajet régulier), `null` quand elle est **à reposer** — un
  retour en arrière qui rend le second mode identique au mode principal répondait « Non » à la
  place de la personne. Les confondre, c'est refaire le défaut de §12.3 par une autre porte.
- **Une question à laquelle personne n'a répondu ne vaut pas « Non »** (recette du 14/09/2026,
  `v1-16` §4). `commute_second_mode_used` est `boolean | null` côté client, `null` valant « pas
  encore répondu », et `manqueDeLEtape` le refuse : le défaut était `false`, donc « Non » arrivait
  coché sur un questionnaire vierge et l'étape se traversait sans qu'on décide — or « Non »
  **sous-estime** un trajet intermodal, sur le poste qui décide du poste dominant donc du plan.
  C'est la quatrième occurrence du motif de C3.4 / C3.5 / C3.6, restée en place parce qu'elle
  préexistait à la règle. **La colonne, elle, reste `not null`, et ce n'est pas un raccourci** :
  `null` décrit un questionnaire en cours, jamais un bilan soumis, et la rendre nullable
  réimporterait l'ambiguïté en base — la branche du calcul est
  `if a.commute_second_mode_used and a.commute_second_mode is not null`, où `null` se comporte
  **exactement comme `false`**. D'où un `?? false` à l'insert, inatteignable par construction et
  écrit quand même, le typecheck étant le seul garde qui voie cette dérive.
- **Une précision s'ouvre sous l'option qu'elle décrit, et la dernière exception est tombée**
  (`v1-16` §3). La taille du covoiturage du trajet quotidien vivait en tête de l'écran **suivant**,
  alors que ses deux jumelles de C3.5 (sorties, longs trajets) s'ouvrent sous l'option choisie :
  trois fois la même question, deux motifs. Elle est désormais sous « Voiture (covoiturage) » de
  B1.4, par `PrecisionChiffres`, après la motorisation — les deux précisions décrivent la même
  voiture. Le seul écart qui reste est la distance ouverte des loisirs, et sa raison est écrite sur
  place : une rangée de puces n'a pas d'élément sous lequel se glisser.
- **La virgule est un séparateur décimal, et la traiter comme un caractère à jeter coûtait un
  facteur dix.** Le champ de distance filtrait tout ce qui n'était pas un chiffre : « 3,5 » ne
  donnait ni erreur ni refus, il donnait **35**. Le clavier numérique d'Android propose une
  virgule, et l'erreur porte sur le poste le plus lourd de la majorité des bilans, multiplié par
  deux fois le nombre de jours et par quarante-cinq semaines. D'où `nettoyerSaisieNumerique` /
  `saisieVersNombre` / `afficherNombreSaisi` (`src/types/bilan.ts`) : la virgule est **conservée
  telle quelle** sous les doigts de la personne, la conversion se fait à part, et un second
  séparateur est ignoré sans jeter ses chiffres. Et un « 0 » saisi n'est pas une distance — la
  colonne porte `check (commute_distance_km > 0)`, donc la complétude de l'étape et l'insert
  lisent la **même** définition, `distanceDomicileTravailKm`.
### 2.7 La session, le jeton d'appareil, et les rappels

- **`ensureSession()` est enveloppée dans `uneSeuleFois` (`src/types/une-seule-fois.ts`), et ce
  n'est pas du confort : sans elle, deux comptes anonymes** — six des treize comptes de la base
  l'étaient : `SUPABASE.md` §2.4.
- **Le jeton d'appareil se réenregistre à chaque changement d'utilisateur, pas seulement au
  démarrage.** `register_push_token` *reprend* le jeton à son propriétaire précédent, et il n'y
  avait aucun appel ailleurs qu'au lancement : le lien de `/connexion/retrouver` ouvre la session
  d'un utilisateur **différent** de la session anonyme qui venait d'enregistrer le jeton, si bien
  que l'appareil restait inscrit au nom de celui qu'on vient de quitter — et recevait ses rappels
  jusqu'au prochain démarrage à froid. Le garde vit hors du composant (`onAuthStateChange` émet à
  chaque rafraîchissement de jeton, soit toutes les heures) et **ne se valide qu'après le succès**
  de l'appel, sinon un échec réseau le referme sur l'état qu'il devait corriger.
- **`enregistrerLeJeton()` rend un booléen, et c'est la seule chose qui peut faire passer
  `jetonActif` à vrai** (`src/lib/rappels.ts`) — une permission accordée dont l'enregistrement a
  échoué (pas d'identifiants FCM, pas de réseau, simulateur) faisait promettre au plan une
  notification que le serveur ne voyait pas. Hors du chemin `push`, `jetonActif` n'est pas touché :
  la préférence et le jeton sont deux faits distincts, et la feuille rend `prefs.jetonActif`
  inchangé quand on la referme sans rien choisir. Le booléen ne distingue pas encore « permission
  non accordée » d'un échec réseau ; le garde d'`_layout.tsx` ne rend donc le jeton à son
  propriétaire précédent que sur une exception.
- **Une absence de jeton n'accuse personne : c'est la permission qui le dit.** L'absence recouvre
  quatre situations — jamais demandée, refusée, enregistrement échoué, simulateur — qui n'appellent
  pas la même phrase. `lignesDeReglage` **et** `carteAttente` (`src/types/rappels.ts`) reçoivent
  donc la `Permission`, et « coupées dans les réglages du téléphone » ne se dit que là où quelqu'un
  les a vraiment fermées. Le corollaire est le lien « Ouvrir les réglages du téléphone » : il
  n'existe que dans l'état `fermee`, il se rend **sous la ligne qui le porte** et non après le
  groupe (détaché, il se lit comme appartenant au dernier choix), et **le retour doit réparer, pas
  seulement changer le texte** — relire la permission sans réinscrire le jeton laisse la ligne
  promettre une notification pendant que `push_tokens` porte encore son `disabled_at`, jusqu'au
  prochain démarrage à froid.
- **La carte d'attente parle de la personne, la feuille parle de l'action — et `Boucle` sert aux
  deux** (recette sur appareil du 14/09/2026). La carte annonce le prochain contact quel qu'en soit
  le sujet : elle se dérive de la personne (un poste domicile-travail ⟹ un point le lundi). La
  feuille ouverte après « C'est noté » promet un contact **sur l'action qu'on vient d'engager**
  (« Lundi, je reviens te demander si tu l'as faite ») : elle se dérive du **poste de cette
  action**, par `boucleDeLAction` (`src/types/rappels.ts`), miroir de l'appariement que fait la
  génération du point (C2.1). Les confondre affiche une promesse fausse, et c'est ce qui a été
  trouvé : quelqu'un qui a un trajet domicile-travail **et** s'engage sur un vol s'entendait
  promettre le lundi, alors que le point du lundi ne demandera jamais rien sur son vol — vérifié en
  base le même jour, le point hebdomadaire sortant en question générique. Corollaire : la feuille
  ne dépend plus de `boucle`, sans quoi un échec de lecture secondaire empêchait une cérémonie qui
  ne s'ouvre **qu'une fois par appareil** — donc la perdait pour de bon.
- **Une phrase qui dit quoi faire donne le moyen de le faire, et la porte se rend sous la ligne qui
  la porte** (13.4, recette web du 16/09/2026). « Rattache un compte pour recevoir le mot par
  email. » était un `ThemedView` nu sur le plan : le seul chemin était l'icône de compte en haut à
  droite, que rien n'explique — alors que le commentaire de `lignesDeReglage` écrivait déjà la
  doctrine (« une porte, pas un mur »), vraie sur « Toi » où l'on est déjà, fausse sur le plan.
  `carteAttente` rend donc une `action` à côté de son `detail`, de la même forme que le lien
  « Ouvrir les réglages du téléphone » : elle n'existe **que dans l'état qui la réclame**.
  L'invariant est écrit sur le sens et non sur les six phrases — **la porte se rend exactement là
  où le canal effectif est `aucun` et où la carte dit quelque chose** : aucun canal veut dire
  qu'aucune adresse ne peut recevoir le mot, donc qu'un compte est ce qui manque ; ne rien dire
  (l'enregistrement raté, qui se répare au prochain lancement) veut dire qu'il n'y a rien à
  réparer à la main. La destination est **« Toi » et jamais `/connexion`**, qui imposerait une
  provenance neuve à `SOURCES_CONNEXION`. Et pas la carte entière rendue `Pressable` : trois des
  six variantes n'ont rien à offrir, elles deviendraient une cible morte.
- **Le jeton de cet appareil est mémorisé en AsyncStorage** (`traceverte.jeton_appareil.v1`),
  parce que rien en base ne permet de le reconnaître : `push_tokens` est owner-scoped et une
  lecture rend les jetons de tous les appareils de la personne. C'est ce qui rend vraies les deux
  phrases « sur ce téléphone » et « on ne désactive que le sien ». Sans marque locale, on ne
  désactive rien — fenêtre de transition assumée et commentée dans `src/lib/rappels.ts`, sans
  conséquence tant que `push_tokens` est vide.
### 2.7 bis Le champ de code, et pourquoi il n'y a pas huit cases

Depuis le 20/09/2026, les deux e-mails du produit portent un **code à huit chiffres** et plus aucun
lien (`v1-28`). Trois écrans demandent une adresse et attendent ce code — rattacher, retrouver,
supprimer —, et ils partagent **un** composant (`SaisieDuCode`) qui en porte un second
(`ChampDeCode`). En écrire trois garantirait qu'ils divergent : c'est la leçon de `CarteDePiste`
en C5.2, et elle vaut ici encore plus, parce que ce qui doit rester identique entre les trois est la
**règle de non-divulgation**.

Six points, dans l'ordre où ils se cassent :

- **Un seul champ, jamais huit cases.** Huit cases coûtent huit champs à un lecteur d'écran, un
  composant qui gère le focus à la frappe et au collé, et n'apportent rien qu'un champ centré ne
  rende. Le kit écrit de `TextField` qu'il est « en pratique le seul champ texte du produit » : il en
  existe deux depuis ce jour, et celui-ci reprend sa boîte — hauteur, rayon, fond, bordure d'accent
  dès qu'un chiffre est là — pour que ce soit visiblement la même famille. Les chiffres en 24/30,
  interlettrage 6, centrés : une taille hors échelle, en dur là où elle sert.
- **La normalisation est dans la dérivation, pas dans le composant** (`chiffresDuCode`, testé) : une
  espace collée avec le code est **retirée et non refusée** — les messageries en insèrent, et refuser
  un collé qui contient le bon code ferait chercher une faute qui n'existe pas. Un collé trop long
  garde ses chiffres utiles.
- **Au dernier chiffre, la vérification part d'elle-même**, et le bouton reste — pour qui colle,
  corrige, ou lit l'écran avec un lecteur d'écran. Le verrou vit dans une `ref` et pas dans l'état
  d'affichage, qui ne vaut `true` qu'au rendu suivant : sans lui, un collé suivi d'un toucher enverrait
  deux appels, dont le second sur un code déjà consommé — c'est-à-dire « ce code ne marche pas » juste
  après qu'il a marché. Même raison que le verrou de soumission du questionnaire.
- **Le champ garde ses chiffres sur un refus, et ne se vide qu'au renvoi.** Sur un refus, la personne
  compare avec son e-mail ; au renvoi, l'ancien code vient d'être invalidé (mesuré), donc garder ses
  chiffres ferait réessayer un code mort.
- **Le corps de l'écran change avec le contexte, et la différence EST la non-divulgation.** En
  rattachement on affirme qu'un code est parti (la personne vient de taper l'adresse) ; en connexion
  on ne peut pas l'affirmer sans dire si l'adresse a un compte, d'où le « si ». Recopier la première
  phrase dans la seconde serait la fuite exacte que « retrouver » existe pour éviter, et un test la
  garde.
- **Le libellé annoncé dit la longueur** (« Code reçu par email, huit chiffres »), parce que c'est ce
  qu'on ne peut pas voir — règle §1.4.

### 2.8 Web et natif : les pièges déjà payés

- **Le mode clair est forcé sur web, et ce n'est pas un oubli** (`src/hooks/use-theme.ts`, et le
  `ThemeProvider` du layout racine porte la même décision) : `EXPO.md` §2.2.
- **`public/robots.txt` et `public/sitemap.xml` sont la cinquième garde d'export, et ils
  disparaissent exactement comme `assetlinks.json`** — trois points à ne pas défaire à moitié :
  `EXPO.md` §2.1.
- **Changer `.env` puis réexporter ne suffit pas à revérifier l'inlining : il faut
  `expo export --clear`** : `EXPO.md` §2.1.
- **`react-native-web` : un `<input>` enfant d'un conteneur flex a besoin de `minWidth: 0`
  explicite** : `EXPO.md` §2.2.
- **`Alert.alert(...)` sur web retombe sur `window.alert()`, qui n'invoque pas fiablement
  `onPress`** — un état de composant à la place, et l'import est interdit par ESLint : `EXPO.md` §2.2.
- **Une API de module natif appelée pendant le rendu emporte toute l'app sur web** — page blanche
  sur toutes les routes, HTML servi en 200 ; d'où `RetourDeNotification` monté sous
  `{estNatif && …}` et `scripts/verifier-rendu-export.mjs` : `EXPO.md` §2.2.
- **Le lien du rappel ouvre l'app grâce à `public/.well-known/assetlinks.json`, pas grâce à
  l'app** — revendication volontairement étroite (`/plan` seul), et l'empreinte de Play
  s'**ajoute** à la publication : `EXPO.md` §2.3.
- **Une dépendance native nouvelle impose un build**, et rien dans le code ne le dit :
  `EXPO.md` §2.3.
### 2.9 Le démarrage : marques locales, brouillon, reprise, et ce qu'on promet sans compte

- Persistance locale (brouillon de bilan, préférences UI comme "a déjà vu la proposition de
  connexion", jeton d'appareil, ouverture de saison vue, marque « cet appareil a vu un bilan ») via
  AsyncStorage — explicitement device-local, pas de sync multi-device tant que le compte n'est pas
  rattaché. Voir `src/lib/bilan-draft.ts`, `src/lib/connexion-prefs.ts`,
  `src/lib/notification-prefs.ts`, `src/lib/saison-prefs.ts`, `src/lib/marque-de-bilan.ts`. Toutes
  ces clés portent le
  préfixe historique `traceverte.` (le renommer effacerait les brouillons), et c'est par ce
  **préfixe** que `src/lib/compte.ts` les balaie à la suppression de compte. **Ne jamais
  dénombrer les clés `traceverte.*` dans un commentaire.** Le balayage se fait par préfixe
  précisément pour que le nombre n'ait pas à être juste : trois commentaires en portaient un, tous
  faux dès que le jeton d'appareil s'est ajouté. Une phrase qui compte devient fausse à la clé
  suivante, en silence — et nommer ici les occurrences fautives rendrait cette ligne-ci fausse le
  jour où on les corrige.
- **Un brouillon de bilan détourne le démarrage, et l'écran de reprise a deux déclencheurs**
  (C3.9). La racine lit `loadBilanDraft()` en parallèle de sa requête, et route sur
  `/bilan?reprise=1` **quand il n'y a pas de bilan complété** — qui en a un a le plan pour maison,
  et un re-bilan commencé ne doit pas s'emparer de l'ouverture de l'app. Avant, quelqu'un qui avait
  interrompu son questionnaire rejouait les quatre écrans d'onboarding et « Commencer mon bilan »
  pour atterrir sans un mot à l'étape 5. L'écran de reprise s'affiche sur ce paramètre **ou** sur un
  brouillon de plus de trois semaines (C1.3, audit A2-6) : les deux ne couvrent pas les mêmes
  arrivées, et le second survit. **« L'écran s'affiche » et « il y a un repli » sont deux faits
  distincts** — le bouton « Repartir de mon dernier bilan » ne se rend que s'il y a un bilan vers
  quoi repartir, et les confondre réservait la reprise à ceux qui avaient déjà soumis un bilan,
  c'est-à-dire à personne au premier questionnaire interrompu. Le décompte de l'écran
  (`avancementDeLaReprise`) se **dérive** de `visibleSteps`, jamais de neuf : un profil sans trajet
  régulier n'a que six étapes. Il ne dit jamais zéro écran rempli, et l'écran ne dit jamais le délai
  écoulé — interdit du handoff §5.2, parce que « tu as commencé il y a trois semaines » est un
  reproche déguisé en information.
- **Ramille parle à l'entrée de chaque section du questionnaire — quatre, pas neuf** (C3.9,
  `RAMILLE.entreeDeSection`). Le questionnaire demande des ordres de grandeur et ne le disait qu'une
  fois, dans l'onboarding, cinq écrans plus tôt ; au troisième champ, la précision qu'on croit
  devoir donner est ce qui fait abandonner. À chaque étape ce serait du papier peint — même usure
  que les variantes de C2.12 traitent ailleurs. **Rendu sans `RamilleDit`** : son visage est déjà
  dans l'en-tête, trois centimètres plus haut, et un second `Mascot` ferait deux Ramille sur le même
  écran. La règle que cette exception ne touche pas est la vraie — la phrase vit dans `RAMILLE`.
- **Ce que le produit promet sans compte, et ce qu'on y perd, se dit là où la personne renonce**
  (C3.9). L'onboarding n'écrivait nulle part qu'on peut commencer sans compte — le seul mot
  « compte » était « J'ai déjà un compte », qui se lit à l'envers. Et la proposition de compte
  promettait « un historique de points **mensuels** », texte du handoff antérieur à la boucle
  hebdomadaire : elle nomme désormais ce qui suit le compte (les bilans, les réponses, le plan) sans
  promettre de cadence. Sous « Continuer sans compte », les deux faits qui n'étaient dits que dans
  les pages légales : changer de téléphone perd tout, et la purge des sessions anonymes ferme le
  compte après trois mois d'**inactivité** (`purge_stale_anonymous_accounts`, fenêtre de 90 jours) —
  donc ne pas écrire « trois mois » ailleurs sans vérifier cette fonction.
- Le questionnaire se préremplit dans cet ordre : **brouillon local > dernier bilan complété >
  vide** (`src/lib/bilan-history.ts`). Le brouillon prime car il est plus récent par
  construction. Un re-bilan prérempli est ce qui rend le suivi dans la durée praticable — sans
  lui, comparer deux bilans demandait de retaper les neuf étapes.
- La logique **pure** du suivi (écart entre deux bilans, dédoublonnage par jour, ancienneté)
  vit dans `src/types/suivi.ts`, séparée des requêtes de `src/lib/bilan-history.ts` : ce module
  tire AsyncStorage et `react-native`, qui n'ont rien à faire dans une suite de logique pure
  (cf. §Tests, où le motif est expliqué en entier). Même découpage que `src/types/bilan.ts`.
### 2.10 Le suivi

- **L'écran `/suivi` n'a aucune mécanique d'échec** : ni streak, ni série cassée, ni score. Une
  période sans réponse n'y apparaît pas du tout (les check-ins non répondus sont clos en
  `expired` côté serveur et jamais relus). On compte les fois où la personne a répondu, jamais
  celles où elle a laissé passer — et une hausse d'empreinte est toujours présentée comme un
  fait, jamais comme une faute. **Une baisse, en revanche, est désormais reconnue** (C2.7) :
  « Ce que tu as changé se voit ici. », et le mot de Ramille `suiviDifference` en bas de l'écran —
  mais **seulement sur une baisse réelle** (`estUneBaisse`), jamais au-dessus d'une hausse ni d'un
  écart qui tient dans l'imprécision des facteurs. Le seuil de stabilité est `estStable`, une seule
  fois pour les trois endroits qui le lisent.
- **Le suivi lit enfin `plan_cycles`, et une décision n'a pas de statut** (C2.7). « Ce que tu as
  décidé, saison après saison » est une liste de **décisions**, jamais un bulletin : le produit ne
  sait pas si l'action a été menée, seulement ce que la personne a répondu aux points — qui vivent
  dans leur propre carte. Une ligne par cycle, et `decisionsParSaison` fait gagner l'engagement
  **vivant** sur l'archive du même cycle, puis la dernière libérée. `decisions === null` veut dire
  « pas lu » et la carte ne s'affiche pas : un tableau vide affirmerait que rien n'a jamais été
  engagé, la faute de A5-2 sur une carte de moins.
- **Les trois réponses du suivi ont des libellés de fait, au même niveau typographique** (C2.7) :
  « Changement fait » / « Pas cette fois » / « Pas de trajet ». « Oui » et « Non » étaient les
  libellés du *bouton* — relus six mois plus tard, hors de la question, ils ne disent plus à quoi
  ils répondaient. Et un « Changement fait » en accent au-dessus d'un « Pas cette fois » en
  tertiaire classait les réponses, alors que ni la deuxième ni la troisième n'est un échec : la
  reconnaissance vit dans le compteur et dans le mot de Ramille, pas dans la couleur d'une ligne.
  La liste est **groupée par saison**, chaque groupe portant son vrai total — elle était tronquée à
  huit **en silence** sous un compteur global qui en annonçait davantage.
- **`keepLatestPerDay` regroupe sur le jour LOCAL** (C2.7). Les dix premiers caractères d'un
  `timestamptz` sont son jour **UTC** : un bilan soumis le 10 mars à 23 h 00 UTC et sa correction le
  11 à 00 h 30 UTC sont le même 11 mars à Paris, et l'ancien regroupement en faisait deux barres
  avec deux valeurs différentes — le doublon exact que cette fonction existe pour empêcher.
- **Le prédécesseur d'un bilan se choisit sur `submitted_at`, jamais dans l'historique
  — et ce point n'est couvert par aucun test** : `loadBilanPrecedent` vit dans `src/lib/`, qui tire
  AsyncStorage, donc il n'est pas éprouvable par la suite de logique pure (le rendre testable
  demanderait d'extraire la décision dans `src/types/suivi.ts`, ce qui n'est pas fait). Deux documents
  l'annonçaient comme testé ; ils ne le font plus.
  dédoublonné** (C2.7, `loadBilanPrecedent`). `keepLatestPerDay` ne garde que le dernier bilan de
  chaque jour : c'est ce qu'il faut pour une courbe, pas pour désigner celui d'avant. Deux lignes
  sont lues et non une, pour vérifier que le bilan courant est bien le plus récent — sinon on ne
  compare rien plutôt que de comparer à un bilan postérieur.
- **« Le palier que tu visais est derrière toi. » n'est dit que s'il est prouvable** (C2.7,
  `palierEstDerriere`). Le palier visé se recalcule depuis le cap **d'alors**, et ce cap est perdu
  quand les deux bilans tombent dans la même période : `generate_plan_cycle_for_user` réécrit le
  cycle courant à chaque soumission. Avec le cap d'aujourd'hui — plus petit, la baseline du poste
  dominant ayant baissé — le palier recalculé serait plus proche et la phrase s'afficherait plus
  souvent qu'elle ne le devrait. On passe `null` et on ne dit rien.
- **`EcartParPoste` compare poste à poste, et l'accent suit le dominant du serveur** (C2.7). Le
  poste dominant peut changer d'un bilan à l'autre, et c'est le plus souvent une réussite :
  comparer « dominant d'avant » à « dominant d'aujourd'hui » ferait passer ce succès pour une
  hausse. `dominant_poste` vient d'`assessment_results` et n'est pas un maximum recalculé — le
  départage du serveur n'en est pas un (les loisirs l'emportent sur les voyages à 5 % près). Et
  l'échelle est **commune aux six barres** : une échelle par poste rendrait un poste de 40 kg aussi
  long qu'un poste de 2 t.
### 2.11 Les écrans d'onglet : navigation, concurrence, états et mise en page

- **La barre d'onglets ne porte que deux destinations, et le reste n'est pas un lieu.** Le
  groupe `src/app/(tabs)/` contient le plan et la pile du suivi ; tout ce qui vit ailleurs
  s'affiche en plein écran, sans barre — le questionnaire et l'onboarding sont des flux, le
  compte est un détour, les pages légales des surfaces publiques. Ajouter une route dans
  `(tabs)/` lui donne un onglet : c'est presque toujours une erreur. **Ne jamais créer de route
  dynamique `[id]`** : l'export statique exige `generateStaticParams`, sans quoi la page n'est
  pas produite et Vercel répond 404 sans rien signaler — d'où `?id=` partout.
- **Un écran d'onglet mesure ses affichages avec `useTrackFocus`, jamais `useTrackView`.**
  react-navigation garde l'écran monté quand on change d'onglet : au montage, l'événement ne
  part qu'une fois par session. Le compteur ne tombe pas à zéro, ce qui se verrait — il rend un
  chiffre plausible et faux.
- **Les deux onglets tiennent la concurrence de la même façon**, et c'est délibérément le même
  idiome : une clé d'état qu'incrémente `rafraichir`, l'effet de chargement qui la porte en
  dépendance, et un `let cancelled` périmé dans son nettoyage (`(tabs)/plan.tsx`, repris à
  l'identique par `(tabs)/suivi/index.tsx`). Revenir sur l'onglet puis ramener l'app au premier
  plan déclenche deux chargements à quelques millisecondes d'écart, et rien ne garantit l'ordre
  des réponses : chaque nouvelle clé démonte l'effet précédent, donc seul le dernier lancé écrit,
  sans compteur de génération à maintenir. Le rappel passé à `useRafraichirAuRetour` doit être
  stable (`useCallback`), sinon son effet de focus se réabonne à chaque rendu et fait tourner
  chargement et rendu l'un dans l'autre.
- **Une page d'un pager doit pouvoir défiler, sinon elle coupe — et sous `minHeight`, une hauteur
  n'est plus définie** : une page qui gère son propre débordement veut `height`, une page qui n'en
  a pas veut `minHeight` — `EXPO.md` §2.4.
- **Une coupure réseau n'a pas de détail technique, et le code le sait déjà quand il l'écrit**
  (13.2, recette web du 16/09/2026). Le `catch` de la soumission du questionnaire classait l'erreur
  en `reseau` pour la mesure (`genreErreurSoumission`), puis appelait `setDetail(decrireErreur(…))`
  **sans regarder ce genre** : sous la phrase française correcte s'affichaient cinq lignes de
  bundle minifié en anglais, au terme de cinq minutes de saisie. `decrireErreur` n'est pas en cause
  et ne se défait pas — une contrainte, une permission, un `P0002` se recopient à la main et
  nomment la cause, c'est ce qui manquait avant le 14/09. Mais le réseau est le cas d'échec **le
  plus probable en production**, et le seul où « réessaie dans un instant » est déjà toute la
  vérité. Le genre se calcule donc **une fois** et sert deux fois, la mesure et le détail.
- **Un écran hors ligne ne dit jamais « tu n'as rien », et il ne se fige pas non plus.** Tout ce qui
  suit vit **derrière la racine**, qui levait à froid sans réseau jusqu'à C4.5 (§12.5 de `v1-13`) et
  route désormais sur la marque locale : ces écrans sont donc atteignables à froid depuis le
  15/09/2026, et le premier que rencontre alors quelqu'un qui a un bilan est l'`erreur_reseau` de
  `/plan` — ce qui est le point du chantier, pas un défaut. Charger à chaque retour transforme une lecture en échec en régression visible : tant que la lecture n'avait
  lieu qu'au montage, personne ne pouvait perdre ses barres en cours de session. Les lectures
  rendent donc `{ ok: true, data } | { ok: false }` — **jamais erreur → tableau vide**, qui se
  traduisait par « Ton suivi commence au premier bilan » à quelqu'un qui a douze bilans — et les
  deux onglets séparent trois choses : l'erreur plein écran, qui ne s'atteint **que depuis
  `loading`** (rien n'a jamais pu être lu) ; la ligne de relecture, portée par un `useState` **à
  côté** du `LoadState` et jamais dans sa variante `ok`, affichable au-dessus de n'importe quel
  écran issu d'une lecture réussie et qui n'efface rien ; et les états vides, qui restent des
  affirmations sur les données de la personne. Le drapeau logé dans `LoadState.ok` était le
  défaut : le repli détruisait alors `pending`, `no_assessment` et `empty`, c'est-à-dire « Revoir
  mon bilan » et « Faire mon bilan » — la seule entrée du questionnaire, qui se remplit pourtant
  très bien hors ligne (brouillon AsyncStorage). Deux corollaires : le « Réessayer » d'un écran
  d'erreur repasse par `loading` **dans son propre gestionnaire**, jamais dans `rafraichir` — sans
  ce passage, un second échec rend exactement le même écran et le bouton a l'air mort ; dedans, il
  ferait clignoter « Chargement… » à chaque retour au premier plan, donc à chaque arrivée par
  notification, puisque `rafraichir` est aussi le rappel de `useRafraichirAuRetour`. Et une valeur
  par défaut posée sur un échec de lecture est du même mensonge : le rythme de la boucle (`boucle`)
  vaut `null` tant qu'on ne l'a pas lu, et la carte d'attente ne s'affiche pas plutôt que de nommer
  le mauvais jour.
- **Les tailles et rayons qui se répètent vivent dans `TypeScale`/`Radius`/`ControlHeight`**
  (`src/constants/theme.ts`), consommés par les types `screenTitle`/`salient`/`cardTitle`/`body`
  de `ThemedText`. Une taille unique reste en dur là où elle vit — la nommer serait du bruit.
  Deux titres valent 30 px, la même valeur que `salient` qui nomme un **chiffre** : ils restent
  en dur, ce type sur un titre encoderait une fausse équivalence. `title`/`subtitle` (48/32)
  sont les tailles du handoff initial, qu'aucun écran n'affiche sans les surcharger.
- Le wizard du bilan (`src/app/bilan/index.tsx` + `src/components/bilan/steps/*`) dérive
  entièrement sa navigation ("Étape N sur M", saut conditionnel d'étapes) de l'état courant
  des réponses via `isStepVisible`/`nextStep`/`previousStep`/`isStepComplete` dans
  `src/types/bilan.ts` — pas de machine à états séparée à maintenir en parallèle.
- `src/types/resultat.ts` a deux variantes de libellé pour le poste dominant, jamais
  interchangeables : `dominantHeadline()` (2ᵉ personne, "Tes voyages…", affichée à l'écran,
  adressée à l'utilisateur) et `dominantShareLabel()` (neutre, sans pronom, transmise à
  `/api/partage` — lue par les destinataires du lien partagé, pas par l'utilisateur qui
  partage). Voir `docs/architecture/v1-06-partage-social.md` §2.
  **`MODE_IDS` est un miroir tenu à la main de `public.transport_modes`**, relevé en base le
  11/09/2026. `MODE_PREPOSITION` étant un `Record` sur cette liste, le typecheck garantit la
  cohérence **interne** au fichier — un identifiant ajouté sans préposition ne compile pas — mais
  **rien** sur la correspondance avec la base : ajouter un mode au produit est une migration SQL,
  et un mode résolu côté serveur (les quatre deux-roues, les quatre motorisations, le TGV) ne
  traverse aucun fichier TypeScript. C'est le chemin qui avait laissé les quatre deux-roues
  motorisés sans préposition alors qu'ils peuvent parfaitement être le `dominant_poste_mode`. La
  garde qui manque est côté SQL et reste à écrire.
