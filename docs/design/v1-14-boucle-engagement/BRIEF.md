# Brief pour Claude Design — la boucle d'engagement, d'une saison à l'autre

Increment **v1-14**, lot 2 du plan `docs/architecture/v1-13-audit-et-chantiers.md`. Écrit le
10/09/2026, avant la session, pour que le canvas parte de ce qui existe et de ce qui est déjà
tranché — pas d'une page blanche. Même méthode que `v1-12-rappels/BRIEF.md` : le brief, la
session, le canvas, puis le document d'implémentation.

## 1. Ce qu'on demande

Dessiner **la boucle d'engagement telle qu'une personne la vit sur une saison entière** — du
moment où elle s'engage sur une action jusqu'à l'ouverture de la saison suivante — et donner à
Ramille une façon de **porter la saison** sans dire un chiffre.

Ce n'est pas « refaire le plan » ni « refaire le suivi ». L'audit du 09/09/2026 (283 constats
contre-vérifiés) a trouvé la boucle coupée en cinq endroits, et trois de ces coupures sont des
problèmes de ce que l'écran **dit**, pas de ce que le serveur calcule :

- le point du lundi ne nomme jamais l'action sur laquelle la personne s'est engagée — elle a
  dit « à vélo, le mardi et le jeudi », et on lui demande si elle a « changé de mode de
  transport au moins une fois cette semaine » ;
- une saison n'a ni ouverture ni clôture visibles : un cap est annoncé, puis le cycle suivant
  se crée dans la nuit et personne ne relit jamais le précédent ;
- le suivi montre un total qui bouge, jamais ce que la personne a **décidé** ni comment
  **chaque poste** a bougé — un effort sur le trajet quotidien disparaît derrière un vol.

Le verdict de l'audit, mot pour mot : « Le produit est exemplaire jusqu'au premier engagement.
La durée, qui est l'objectif central, n'a pas encore de mécanique. » C'est cette mécanique que
le canvas doit rendre visible.

## 2. Le mandat : ce que le canvas peut changer

Les trois canvas précédents demandaient « aucune nouvelle couleur, aucune nouvelle taille ».
**Celui-ci ne le demande pas.** Le titulaire l'a dit explicitement le 10/09/2026 : si un
élément du design existant — un composant, une hiérarchie, une couleur secondaire, une
illustration, une transition, le rythme d'un écran, ou la forme même d'un moment — peut mieux
servir les deux objectifs du produit, ou rendre l'app plus actuelle, **le canvas le propose.**

Les deux objectifs, pour mémoire : **provoquer une prise de conscience** (le chiffre, sa
source, ce qu'il pèse — sans gouffre) et **soutenir un changement d'habitude dans la durée**
(une action, une intention, un point régulier, une saison après l'autre, jusqu'à un horizon
2050 lointain). Le second est celui qui manque le plus aujourd'hui, et c'est celui où le
design a le plus de prise : rendre le progrès visible, nommer l'intention, relier chaque
retour à l'action choisie, faire d'une saison un nouveau départ plutôt qu'une bascule dans la
nuit.

Trois conditions au mandat :

1. **Dire ce qui change, et pourquoi.** Une page « Écarts » du canvas liste chaque proposition
   qui touche au design existant : avant / après, ce qu'elle apporte à l'un des deux objectifs,
   ce qu'elle coûte (un composant neuf, une migration, un build natif). Ce qui n'y figure pas
   est réputé inchangé.
2. **Rester dans les limites du §5.** Elles ne sont pas un style, ce sont le produit : aucun
   jugement, aucune mécanique d'échec, aucune comparaison entre personnes, la voix de Ramille et
   ses règles, la mascotte jamais près d'un chiffre lourd. Un design plus actuel qui franchit
   une de ces lignes n'est pas une amélioration.
3. **Proposer des jetons, jamais des valeurs en dur.** Une nouvelle couleur entre dans
   `Colors` avec ses **deux thèmes** (clair et sombre, `src/constants/theme.ts`) ; une taille
   dans `TypeScale`, un rayon dans `Radius`, une hauteur dans `ControlHeight`. Le code ne recopie
   pas un hexa d'un canvas, et le canvas montre au moins un écran en thème sombre pour chaque
   couleur qu'il ajoute.

Ce qu'on entend par « plus actuel » : pas une tendance, pas un habillage. Ce qui, sur un
téléphone Android aujourd'hui, se lit comme soigné et vivant — un mouvement qui a un sens (une
carte qui vient de quelque part), une profondeur discrète, une typographie qui respire, des
états qui répondent au geste, une hiérarchie qui laisse une chose à lire à la fois. Et ce que
la recherche sur le changement de comportement recommande sans réserve : la visibilité du
progrès, l'intention formulée (« le mardi et le jeudi »), le retour relié à l'action, le
sentiment d'identité (« je suis quelqu'un qui… ») plutôt que le score. Ce qu'on n'entend pas
par là est en §8.

## 3. Ce qui existe déjà — le canvas ne le redessine pas

**Le produit.** Un questionnaire en neuf étapes → une restitution (total annuel, poste
dominant, barres « Moyenne en France » et « cap de la saison », repère 2050 en mots quand on
passe sous la moyenne) → un plan (une ou deux actions chiffrées, une seule engagée par saison,
avec une intention obligatoire) → un point régulier → un suivi. Deux onglets, **Plan** (le
présent, cette saison) et **Suivi** (la trace) ; le questionnaire est un flux plein écran, le
compte un détour derrière une icône (`docs/design/v1-11-navigation/README.md`). Pas de
compte nécessaire : chaque visiteur a une session dès l'ouverture, et un compte ne sert qu'à
retrouver ses données sur un autre appareil.

**La boucle.** Deux boucles indépendantes, générées côté serveur : un point **hebdomadaire**
sur le trajet domicile-travail (créé le lundi à 6 h UTC), un point **mensuel** sur les extras —
loisirs ou voyages (créé le 1er du mois). Un point, c'est une question fermée, aujourd'hui
« As-tu changé de mode de transport au moins une fois cette semaine pour Trajet
domicile-travail (Voiture thermique) ? », réponse Oui / Non, et un mot de Ramille en retour :
« Bien joué — chaque changement compte. » / « Pas cette fois-ci. Rien d'obligatoire, on se
repose la question au prochain point. » Pas de streak, pas de série, pas de score ; un point
sans réponse expire et n'est jamais relu.

**L'engagement.** Sur le plan, « Je m'y engage » puis « Quels jours ? » (domicile-travail) ou
une échéance fermée (« ce mois-ci », « le mois prochain », « à ma prochaine occasion ») pour
les autres postes ; « C'est noté ». L'action engagée s'affiche en carte saillante (bordure
accent 2 px, fond teinté, étiquette « TU T'Y ES ENGAGÉ », que le lot 3 renomme « TON
ENGAGEMENT »). « Changer d'avis » la libère sans que rien ne le compte contre soi.

**Le plan, aujourd'hui.** De haut en bas : le point en attente s'il y en a un (sinon la carte
d'attente de v1-12 : « Je te fais signe lundi. » / « On se retrouve ici lundi. ») ; l'action
engagée ; les autres actions ; la carte du cap — « Ton cap pour cette période », en kilos, avec
« Cadence : Automne 2026 » ; après six mois de bilan, une carte « Une nouvelle saison a
commencé » qui propose de refaire son bilan. La **fin** de la saison n'est écrite nulle part ;
à la bascule, un cycle neuf remplace l'ancien.

**Le suivi, aujourd'hui.** Les bilans comme instantanés (date, total, écart au précédent en
pourcentage, ouvrables), « N points de suivi » avec une liste bornée à huit lignes « Oui / Non »
et la phrase « Tu réponds régulièrement : c'est déjà ça qui compte. », une mascotte `happy` au
sommet de la colonne, « Refaire mon bilan ». Aucune trace des engagements, aucun écart par
poste. Sans point répondu : Ramille en `resting`, « Je note tes réponses ici, au fil des
saisons. »

**La restitution d'un second bilan** est identique à celle du premier : le bilan précédent n'y
apparaît pas.

**Les rappels** (v1-12, livré et vérifié sur appareil) : la feuille après « C'est noté », le
choix notification / email / rien, la carte d'attente, le réglage sur « Toi ». Le canvas les
cite, il ne les redessine pas — sauf si le mandat du §2 y trouve quelque chose à améliorer,
auquel cas il le dit en « Écarts ».

**La mascotte.** Ramille est la silhouette du logo (une feuille, une nervure) avec un visage
calculé, cinq expressions — `calm`, `happy`, `encouraging`, `thinking`, `resting` — et une
inclinaison (`tilt`) qui fait un second registre : penchée elle regarde, droite elle
accompagne. Elle apparaît à une douzaine d'endroits, de l'écran de lancement à l'en-tête du
questionnaire (28 px, sa taille minimale), et **sous 28 px elle rend la feuille seule**. Tout
ce qu'elle dit vit dans `src/constants/mascotte.ts`, gardé par un test. Canvas d'origine :
`docs/design/v1-08-mascotte/`.

**Le vocabulaire visuel** : `docs/design/v1-11-navigation/Systeme.dc.html` et
`src/constants/theme.ts`. Spline Sans ; accent `#1F6F4A` (texte sur teinte `#14563A`, atténué
`#A9C8B6`, teinte `#E4EFE8`) ; textes `#131612` / `#39403B` / `#5E655F` ; fond `#FFFFFF`, fond
teinté `#F3F8F4`, surfaces `#F0F1EC` / `#F6F8F3`, bordure `#DDE0D9` ; bouton 54 / rayon 27,
champ 56 / rayon 16, carte 18, puces 8, échelle 4/8/16/24/32. Un thème sombre existe déjà
(`Colors.dark`, accent `#3D9B6F`). Rien n'est arrondi à une grille.

## 4. Ce qui est déjà tranché — le canvas part de là

Dix-huit décisions ont été rendues le 10/09/2026 (`v1-13` §1). Celles qui touchent au dessin :

1. **La question nomme l'action et les jours** (D1) : « Mardi ou jeudi, as-tu fait ce trajet à
   vélo ? » Sans engagement, la question générique reste, sur une forme insérable du poste
   (« ton trajet domicile-travail », « tes sorties du week-end », « tes voyages »).
2. **Elle interroge la période écoulée** (D2) : « la semaine dernière », « le mois dernier ». Le
   point arrive toujours le lundi, le rappel aussi.
3. **Une troisième réponse, explicite** (D3) : « Pas de trajet cette semaine » / « Pas de
   voyage ce mois-ci ». Ce n'est pas un « Non » — Ramille répond une attente, pas une relance.
4. **Les réponses de Ramille ont des variantes** (D12, contre la recommandation de l'audit) :
   trois ou quatre par issue, choisies par période, l'originale conservée. Le canvas peut en
   proposer ; elles obéissent aux règles du §5.
5. **Un second renforcement après deux « Oui » consécutifs**, en mots — la phrase du handoff,
   « Deuxième mois de suite que tu changes quelque chose sur ce trajet. », à décliner pour la
   boucle hebdomadaire — jamais un badge, jamais au-delà de deux.
6. **Le premier point n'est pas généré à la soumission du bilan** (D11) : l'attente reste, la
   carte nomme le jour.
7. **La saison a une ouverture** : pendant ses deux premières semaines, une carte, voix produit,
   « L'automne commence. Cet été : N points répondus, M fois où tu as changé quelque chose. »
   — jamais les points manqués — puis « Reprendre la même action » (déjà reconduite) ou
   « Choisir une autre ». Ramille : « On repart pour une saison. » Et une **fin** : la carte du
   cap porte « jusqu'au 30 novembre ».
8. **L'engagement survit** au re-bilan et au changement de saison : reconduit si l'action
   existe encore, sinon gardé dans le suivi, et dit une fois.
9. **Le suivi montre ce qui a été décidé** (une ligne par saison : période, action, jours) et
   **l'écart par poste**, jamais un statut tenu / pas tenu.
10. **La restitution d'un re-bilan montre le bilan précédent** (une barre au-dessus de
    « Moyenne en France ») et dit si le palier visé est derrière — sans jamais compter les
    paliers restants.
11. **Deux actions en avant, les autres dépliables** (D18), et un « premier pas » affiché une
    fois l'action engagée.
12. **Une norme sociale en mots seulement**, dans la voix de Ramille (D16) — jamais un chiffre
    non sourcé.
13. **Ramille porte la saison** (décision du 10/09, idée du titulaire) : un détail par saison —
    un bonnet en hiver, des joues plus marquées en automne, à proposer pour le printemps et
    l'été — comme un **accessoire**, jamais comme une sixième expression, et avec les limites du
    §7. Chantier C2.13.
14. **Un coup de pouce la veille des jours choisis** est reporté (D10, lot 4) : le canvas ne le
    dessine pas.

## 5. Les règles qui ne se discutent pas

**Aucun jugement.** Pas de rouge, pas d'orange, pas d'icône d'alerte ; l'accent marque ce qui
est dominant ou actionnable, jamais un verdict. Aucune mécanique d'échec : ni streak, ni série
cassée, ni score, ni période manquée — une période sans réponse **n'apparaît pas**. Une hausse
d'empreinte est un fait, jamais une faute. Aucune comparaison entre personnes, jamais (non-goal
ferme, `v1-06` §1). Les deux états « rien à proposer » sont des félicitations. On peut partir
sans écran de rétention.

**La voix de Ramille** (`src/constants/mascotte.ts`, gardée par un test) : première personne,
court, tutoiement ; **jamais un nombre dans sa bouche** — les chiffres restent au produit, elle
accompagne ; jamais « tu devrais », « il faut » ; et depuis l'audit, **jamais un accord qui
genre la personne** (« Tu t'y es engagé » disparaît). Le rythme est fixe, elle peut donc nommer
le jour — « lundi », « au début du mois prochain » — sans compter.

**La mascotte** : cinq expressions, aucune négative, on n'en ajoute pas ; l'hiver n'est pas
triste. **Jamais à côté d'un chiffre lourd** — ni le total, ni les kilos d'une action, ni le
cap : si un moment vit au milieu des kilos, c'est le nom qui parle, pas le visage. Un compte de
réponses (« trois points répondus ») n'est pas un chiffre lourd ; une empreinte l'est.

**Le repère 2050** s'appelle « Repère », jamais « Objectif » ; il n'apparaît que sous la
moyenne française ; le nombre de paliers restants ne s'affiche jamais.

**Pas de boîte système à nous** : les messages vivent dans la page. **Deux onglets**, et rien
d'autre n'est un lieu. **Accessibilité** : un texte cliquable est un lien annoncé par son
texte, les listes de choix exclusifs sont des boutons radio, les cibles font 44 px, la
mascotte et les illustrations sont masquées aux lecteurs d'écran — elles accompagnent un texte
qui dit déjà tout. **Français**, tutoiement, Android d'abord (Google Play), le web est la
surface publique.

## 6. Ce que le canvas doit montrer

Au format téléphone (390 × 844), en français, avec les composants réels ou ceux qu'il propose
en « Écarts ». Sept moments, dans l'ordre où une personne les rencontre.

**A. Le point qui nomme l'action.** La carte en tête du plan, avec engagement (« Mardi ou
jeudi, as-tu fait ce trajet à vélo ? ») et sans ; les **trois** réponses, la troisième discrète ;
le retour de Ramille pour chacune ; le second renforcement après deux « Oui » ; la carte
« répondue » qui reste le temps de la période à la place de la question. Deux cas particuliers :
la personne qui va **déjà** au travail à vélo — l'audit recommande une question de maintien
(« Es-tu allé au travail à vélo cette semaine ? », sans accord qui genre) dont le « Non » reçoit
une phrase neutre ; et l'action **voyages** de type « un vol en moins », où « changer de mode »
n'a pas de sens — une question d'occasion (« Ce mois-ci, as-tu eu un déplacement où tu as
choisi autre chose que l'avion ? »). Le texte de la notification, sujet en tête (« Ton trajet
domicile-travail : mardi ou jeudi, l'as-tu fait à vélo ? »).

**B. La saison : sa fin et son début.** La carte du cap avec sa fin (« jusqu'au
30 novembre ») ; la **carte d'ouverture** des deux premières semaines, avec le récapitulatif de
la saison passée (voix produit, seulement ce qui a été fait) et le choix « Reprendre la même
action » / « Choisir une autre » ; l'action **reconduite** sur le plan ; le bandeau quand le
cycle affiché est périmé ; la carte de re-bilan sur le fait (« Ton bilan a six mois ») ; et la
phrase, une fois, quand un re-bilan a changé le plan et que l'engagement n'a pas pu suivre.
C'est le moment le plus ouvert du canvas : c'est là que « nouveau départ » se dessine ou ne se
dessine pas.

**C. Ramille porte la saison.** Les quatre variantes à taille nominale (42 px) et aux deux
tailles courantes des onglets (40 et 36 px), sur la carte d'ouverture et dans le suivi ; la
feuille seule sous 28 px, inchangée ; les cinq expressions avec l'accessoire d'hiver au moins,
pour vérifier qu'il ne gêne aucune ; le tout en thème sombre. Les joues d'automne ne sont pas
rouges (§5) : un ton chaud de la palette, ou une proposition en « Écarts ».

**D. Le suivi dans la durée.** L'évolution par poste entre deux bilans, factuelle (le poste
dominant peut changer, c'est une réussite) ; « ce que tu as décidé, saison après saison », une
ligne par saison ; la liste des points regroupée par saison ou bornée avec « Voir tout », les
trois libellés (« Changement fait » / « Pas cette fois » / « Pas de trajet ») au même niveau
typographique ; la phrase d'attribution sous le compteur (« Ces fois-là, c'est toi qui as
choisi le trajet. ») ; la baisse reconnue (« X % de moins que ton bilan précédent. Ce que tu as
changé se voit ici. ») avec une ligne de Ramille (« Je vois la différence. ») **loin du
total** ; et la mascotte retirée du sommet de la colonne de réponses, ou passée en `calm`.

**E. La restitution d'un re-bilan.** La barre « Ton bilan précédent » au-dessus de « Moyenne
en France », la phrase de variation sous les barres, « Le palier que tu visais est derrière
toi. » quand c'est le cas, l'horizon 2050 en mots quand on passe sous la moyenne. Et la variante
**mobilité contrainte** (personne sans transport en commun) : sans la barre « Moyenne en
France », avec « Là où tu vis, la voiture n'est pas un choix. Le plan regarde ce qui dépend de
toi. »

**F. Les autres pistes et le premier pas.** Deux actions en avant, « Voir d'autres pistes »
qui déplie les suivantes ; le « premier pas » qui apparaît une fois l'action engagée ; la
phrase d'introduction quand les actions viennent d'autres postes que le dominant (« Deux
actions, sur d'autres postes que ton trajet domicile-travail. ») ; « Travailler depuis chez toi
un jour par semaine » à la place de « Garder une journée de télétravail ».

**G. La reprise.** Quelqu'un revient avec un questionnaire à moitié rempli : « On reprend où tu
t'étais arrêté », « Continuer mon bilan » / « Repartir de mon dernier bilan », sans mention du
délai. Et le plan ouvert depuis un rappel sur un appareil neuf, sans bilan local : « Ce rappel
concerne un compte. Retrouve-le ici. » avec « J'ai déjà un compte ».

## 7. Ce que la technique impose au dessin

- **La question est figée à la génération du point.** Changer d'engagement le mercredi ne
  réécrit pas la question du lundi ; la carte peut donc nommer une action que la personne vient
  de quitter. Le dessin l'accepte, ou le dit en une ligne — il ne suppose pas une carte toujours
  à jour.
- **Le point arrive le lundi, le rappel aussi.** Le push part le matin même ; l'email est
  étalé sur cinq jours pour ménager le prestataire. Ramille peut dire « lundi » et tenir parole.
- **Une seule action engagée par saison**, une intention obligatoire, jamais de saisie libre :
  des jours de la semaine pour le domicile-travail, une échéance fermée pour les autres postes.
- **La saison est météorologique** — décembre-février, mars-mai, juin-août,
  septembre-novembre, libellés « Hiver 2026-2027 », « Printemps 2027 »… (`season_bounds`).
  Une cadence de repli existe, le **trimestre glissant** ancré sur la date du bilan, sans nom
  de saison : la carte d'ouverture doit tenir sans « L'automne commence », et la mascotte suit
  le calendrier dans les deux cas.
- **La mascotte est une géométrie, pas un dessin.** Le visage vit dans un `viewBox` 0 0 100
  100, calculé par `mascotFaceGeometry` avec une compensation optique qui épaissit les traits
  quand la taille baisse (les positions ne suivent qu'à 20 %), une symétrie tenue par l'écart
  et non par la coordonnée, un `clipPath` sur la silhouette. Un accessoire de saison doit
  pouvoir s'écrire ainsi : des positions et des épaisseurs en unités de `viewBox` à la taille
  nominale, que le code dérive aux autres tailles. Sous 28 px il n'existe pas : la feuille
  seule reste la feuille seule. Il doit rester lisible avec les cinq expressions, et exister en
  thème sombre.
- **La carte de partage** (`api/share-card.ts`) duplique la silhouette hors de l'app et ne
  peut pas importer le composant : elle ne porte **pas** la saison, et le lot 3 lui retire le
  visage.
- **Ce que le suivi peut lire** : l'empreinte par poste de chaque bilan (trajet, sorties,
  voyages), les cycles passés et leur action engagée (avec une archive quand l'action a
  disparu), chaque point avec sa réponse à trois valeurs. **Ce qu'il ne lit jamais** : les
  points laissés passer, et quoi que ce soit sur d'autres personnes.
- **La liste des points s'allonge** : cinquante-deux points hebdomadaires et douze mensuels
  par an. Elle se regroupe ou se pagine ; elle ne se tronque pas en silence.
- **Le plan et le suivi sont des écrans d'onglet** : ils restent montés, se rafraîchissent au
  retour, et une carte qui « apparaît une fois » doit avoir un état pour réapparaître à froid.
- **Un composant natif nouveau impose un build** ; une transition ou une feuille se font avec
  ce que Reanimated sait faire. Pas de vidéo, pas de Lottie sans le dire en « Écarts ».

## 8. Ce qu'on ne veut pas voir

Une streak, une série, un badge, des points, une jauge de « progression vers 2050 », des
confettis, un classement, une comparaison avec « les autres utilisateurs », une pastille rouge,
un compteur de points manqués, « tenu / pas tenu ». Un visage de Ramille près d'un total ou
d'un cap. Un chiffre ou un « tu devrais » dans sa bouche. Une sixième expression, une mascotte
triste en hiver, un bonnet à 28 px, une saison qui change l'humeur. Une couleur en dur, un
rouge « chaud » pour les joues, une nouvelle couleur sans son thème sombre. Un dialogue système
dessiné, un troisième onglet, un écran de rétention, une demande de permission au lancement,
un second rappel « au cas où ». Une modernité qui serait un habillage : un dégradé, un
glassmorphisme, une animation qui ne montre rien.

## 9. Livrable attendu

Un canvas au format des précédents (`docs/design/v1-11-navigation/`, `v1-12-rappels/`) :
planches générées par un script pour rester cohérentes entre elles, valeurs relevées du code,
un README. Prototype cliquable pour A et B — le sentiment de « on me reconnaît, on repart » ne
se voit pas sur une image fixe. Trois pages en plus des moments du §6 :

- **Écarts** — chaque changement au design existant, avant / après, objectif servi, prix.
- **Système** — les jetons ajoutés ou modifiés, s'il y en a, dans les deux thèmes.
- **Saisons** — la page de la mascotte (§6 C), au format de `v1-08-mascotte/Expressions.dc.html`.

Les sources rejoindront `docs/design/v1-14-boucle-engagement/` ; le document d'implémentation
`v1-14` en découlera, et les chantiers du lot 2 (issues #119 à #130, et C2.13 pour la
mascotte) s'y adosseront pour leur partie écran. Leur partie serveur — migrations, RPC,
générateurs de points — n'attend pas le canvas.

## 10. Questions ouvertes pour la session

- La personne qui va déjà au travail à vélo : question de maintien, ou pas de point du tout ?
  L'audit recommande la question, qui renforce l'identité ; c'est à voir à l'écran.
- La formulation de la question d'occasion pour les voyages (§6 A), et celle de la troisième
  réponse.
- Le récapitulatif de la carte d'ouverture porte deux nombres en voix produit ; où se tient
  Ramille sur cette carte pour ne pas les commenter ?
- Les accessoires du printemps et de l'été, et si quatre détails sont trop : deux saisons
  marquées et deux nues sont une réponse acceptable.
- Ce que l'écran fait quand la saison change **pendant** que la personne regarde le plan (elle
  ouvre l'app le 1er décembre au matin).
