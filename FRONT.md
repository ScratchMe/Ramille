# FRONT.md — l'écran, ce qu'il affiche et ce qu'il tait

> **Quand ouvrir ce fichier.** Toucher un écran, un composant ou une dérivation lue par un écran ·
> écrire une phrase que quelqu'un lira · afficher un chiffre, un repère, un poste, une saison ·
> rendre quelque chose cliquable · toucher un état de chargement, un état vide ou un écran d'erreur
> · ajouter une route · toucher au plan ou à un écran d'onglet. Et, selon ce qu'on touche, l'un des
> cinq fichiers de la famille : `FRONT-MASCOTTE.md` pour faire parler Ramille,
> `FRONT-QUESTIONNAIRE.md` pour le questionnaire, `FRONT-SESSION.md` pour la session, les rappels,
> le code et le démarrage, `FRONT-SUIVI.md` pour le suivi et la restitution, `FRONT-MOUVEMENT.md`
> pour faire bouger quelque chose.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `CLAUDE.md` le 17/09/2026, où il pesait 545 lignes sur 1 911 — 29 % du
seul fichier chargé à chaque session. Même motif que `VERCEL.md`, `SUPABASE.md`, `EXPO.md` et
`TESTING.md` : ce qui est propre à **un sujet** vit dans son fichier, ouvert sur déclencheur.

La §1 vaut sur n'importe quelle app qui affiche des chiffres à quelqu'un ; la §2 est Ramille, et
ne voyage pas.

**Découpé à son tour le 01/10/2026**, où il pesait 102 Ko : ce fichier garde la §1, et de la §2 ce
qui vaut pour tout écran — les chiffres et le vocabulaire (§2.1), les pages légales (§2.2), ce qui
se touche et s'annonce (§2.4), la frontière avec la plateforme (§2.5), les pièges web et natif
(§2.8), les écrans d'onglet (§2.11). Les autres sections sont parties **telles quelles — à leurs renvois près — et sous leur
numéro**, qui reste unique dans la famille — un renvoi « `FRONT.md` §2.x » écrit avant cette date
se retrouve donc par cette table :

| Section | Vit dans |
|---|---|
| §2.3, la mascotte | `FRONT-MASCOTTE.md` |
| §2.6, le questionnaire | `FRONT-QUESTIONNAIRE.md` |
| §2.7, §2.7 bis, §2.9 — la session, les rappels, le code, le démarrage | `FRONT-SESSION.md` |
| §2.10, le suivi | `FRONT-SUIVI.md` |
| §2.12, le mouvement | `FRONT-MOUVEMENT.md` |
| tout le reste | ici |

**Trois règles vivent dans un morceau mais valent pour tout écran**, et c'est ici qu'on les croise :
**la mascotte n'apparaît jamais à côté d'un chiffre lourd** (`FRONT-MASCOTTE.md` §2.3) ; **une
découpe permanente** (`overflow: hidden` qui ne s'en va pas) **coupe l'anneau de focus** d'un
contrôle posé au bord (`FRONT-MOUVEMENT.md` §2.12) ; et **« trois mois » sans compte ne s'écrit pas
sans relire la purge des sessions anonymes**, qui ferme après trois mois d'inactivité
(`FRONT-SESSION.md` §2.9).

## 1. Ce qui vaut sur n'importe quelle app

### 1.1 Une dérivation affichée sort de l'écran

**Toute dérivation pure affichée à la personne, ou décidant d'une navigation, vit hors du
composant** — dans un module pur, avec ses tests. C'est la règle qui décide de ce qui est testé
dans ce dépôt (`TESTING.md` §2.1), et sa conséquence chiffrée est nette : le module pur est à
99 % de couverture, et les écrans n'en ont que par exception — quelques tests d'écran depuis le
20/09/2026 (`src/tests/ecrans/`), sous le critère de `TESTING.md` §2.10.

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
  bouton a l'air mort ; dedans, il fait clignoter l'écran à chaque retour au premier plan. **Et il
  marque ce chargement comme demandé** (`relance`) depuis que la ligne « Chargement… » attend
  300 ms (`FRONT-MOUVEMENT.md` §2.12) : hors ligne, l'échec revient bien avant, et l'écran d'erreur disparaissait puis
  revenait sans un mot — le même bouton mort, par une autre porte (`useChargementVisible`) ;
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

**Et il garde la place de ce qui arrive**, quand ce qui est déjà là se touche. Un écran qui insère
ses données **au-dessus** d'un lien rendu tout de suite le fait sauter, et un toucher pris dans le
saut se perd sans erreur — ou tombe sur ce qui a pris sa place. Attendre les données avant de rendre
le lien n'est pas la parade quand ce lien doit rester atteignable hors ligne : on réserve la hauteur
attendue, mesurée, et on accepte un reste là où elle varie. **Et les lectures se posent ensemble** :
une hauteur réservée ne couvre que ce qui n'est pas encore là, donc des données qui arrivent en trois
temps la feraient tomber au premier. Payé chez Ramille sur « Toi », où « Supprimer mon compte »
descendait de 412 px sur web (décision du 01/10/2026, #305, `HAUTEUR_DU_COMPTE_EN_LECTURE` ; mesurée
sur web, le natif est en `v1-13` §11.25).

### 1.4 Accessibilité : le libellé annoncé *est* le texte affiché

- **un texte cliquable passe par un composant dédié**, jamais par un `Pressable` enveloppant un
  texte : un libellé recopié à côté du texte visible finit toujours par ne plus lui correspondre ;
- **les choix exclusifs sont des `radio`**, seul rôle qui annonce « sélectionné » et la place dans
  le groupe. Un `button` qui porte `selected` est un défaut, pas un raccourci ;
- **un choix se coche à la barre d'espace**, comme WAI-ARIA l'attend d'une case d'option et d'une
  case à cocher — pas seulement à Entrée. Un rôle juste qui ne répond plus au geste qu'il annonce a
  échangé un défaut contre un autre, et c'est ce qui s'est passé ici le 24/09/2026. Un gestionnaire
  d'Espace fait trois choses : retenir la page (`preventDefault`), agir **une fois par appui** — une
  touche maintenue répète —, et laisser Entrée à qui la gère déjà : deux activations ramènent une
  case à cocher exactement où elle était ;
- **une puce annoncée seule doit se suffire** : détachée de la question posée trois lignes plus
  haut, « Aucun » ne dit rien. C'est ce qu'un libellé accessible ajoute, et c'est la chose qu'on
  oublie en écrivant les libellés visibles ;
- **les illustrations et les mascottes sont masquées** : elles accompagnent un texte qui dit déjà
  tout ;
- **les titres s'annoncent en en-tête par leur type**, pas écran par écran — **et avec leur
  niveau** : sans lui, react-native-web rend chaque en-tête en `<h1>`, et une page parcourue titre
  par titre ne distingue plus l'écran de ses sections ;
- une cible tactile fait **48 px** **par sa hauteur** quand les rangées se touchent — du `hitSlop` y
  ferait se recouvrir deux zones. 48 et non 44 : c'est la cible de Material, que les outils
  d'accessibilité d'Android signalent ; 44 est le seuil de WCAG 2.5.5 (AAA), et 2.5.8 (AA) n'en
  demande que 24. Ce fichier et `theme.ts` ont attribué 44 à « 2.5.8 / Material » jusqu'au
  24/09/2026 (`docs/architecture/v1-29-challenge-du-design-system.md`) ;
- **l'état d'un contrôle ne tient jamais à la seule couleur** (WCAG 1.4.1). L'onglet actif et
  l'inactif avaient la même luminance, à 1,02:1 : pour qui distingue mal les couleurs, ils étaient
  identiques. Un état se dit par une forme, un fond plein ou un texte, et se mesure à 3:1 au moins ;
- **un contrôle désactivé le dit par son texte, jamais par une opacité.** L'opacité s'applique à
  tout ce que le contrôle porte, y compris la phrase qui dit *pourquoi* il est désactivé : WCAG
  exempte de contraste un composant inactif, mais cette phrase-là est précisément celle qu'on doit
  pouvoir lire ;
- **un champ se voit au repos** (WCAG 1.4.11) : un fond gris clair sur blanc ne ressort qu'à 1,14:1,
  donc un champ vide sans contour n'existe pas pour une vue faible. Le contour au repos tient 3:1 ;
- **sur web, l'état d'un contrôle passe par les props `aria-*`**, jamais par l'objet
  `accessibilityState` : react-native-web 0.21 ne le traduit plus, et un choix visiblement coché
  s'annonçait « non coché » à un lecteur d'écran. `aria-checked`, `aria-expanded`, `aria-busy`,
  `aria-disabled` sont typées par React Native, qui les mappe aussi sur Android ; pas
  d'`aria-selected` sur un `radio`, où il est invalide. Et `accessibilityHint` n'existe pas sur web :
  une information qui ne vit que dans un hint n'y est dite à personne ;
- **un contrôle répond au toucher** : une teinte **immédiate**, sans animation. Rien ne changeait
  sous le doigt, et sur Android on ne savait pas si l'appui avait été pris — ce qui se paie en
  doubles appuis.

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

**Et la ponctuation double ne se coupe pas de son mot.** Une question finissait par un « ? » seul en
début de ligne dès que la phrase remplissait la largeur — sur la carte du point, la plus lue du
produit. L'espace qui précède `?`, `!`, `:`, `;` et `%` — ce dernier depuis le 30/09/2026, un
« % » seul en début de ligne relevé à la recette —, celle qui suit un `+` ou un `−` posé devant un
nombre, et celles qui bordent l'intérieur des guillemets,
sont insécables, **posées au rendu en un seul endroit** et jamais à la main dans chaque texte : une
règle que chaque texte doit se rappeler finit oubliée par le suivant. Même mesure que ci-dessus :
U+00A0 et non l'espace fine, trop étroite dans cette police. **Et la règle voit le texte entier,
pas ses morceaux** (30/09/2026) : `− {formatKg(capKg)} kg` rend trois enfants, et appliquée à
chacun elle ne voyait jamais le nombre qui suit le signe — le « − » du cap et des gains restait
sécable sur le plan. `ThemedText` réunit donc les chaînes et les nombres voisins avant de
l'appliquer ; un texte imbriqué coupe la réunion et reçoit la règle pour lui-même
(`src/components/themed-text.test.tsx`).

**Corollaire pour les tests** : un séparateur s'écrit par son **point de code** (`\u00a0`) et jamais
collé en littéral. Trois assertions le portaient en clair, et leur échec affichait
`Expected: "1 600"` / `Received: "1 600"` — deux chaînes rigoureusement identiques à l'œil. C'est
exactement ce qui avait laissé passer le mauvais caractère.

---

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
- **Le résiduel des sorties rares a son propre nom dans les quatre registres : « loisirs
  occasionnels »** (arbitrage du 27/09/2026, `v1-29` §6.3). Pour qui sort « rarement », les loisirs
  comptés sont une hypothèse du calcul, et « Tes loisirs du week-end » les présentait comme un
  comportement. **Un écran qui peut nommer le résiduel ne lit donc pas une table de `postes.ts`
  directement** : il passe par `nomDuPoste(poste, registre, occasionnels)` — le cap du plan compris,
  qui se chiffre dès que le plan porte une action, fût-elle sur un autre poste que celui du
  cycle —, et
  `occasionnels` vient de `loisirsSontLeResiduel`, qui lit **la fréquence déclarée** d'abord. Les
  libellés figés ne suffisent pas : le serveur ne marque le résiduel que sur le poste dominant et
  sur celui de la boucle mensuelle, donc pas dans le cas courant de « rarement » avec un vol, où la
  barre des loisirs de la restitution le montre pourtant. La restitution lit cette fréquence à part,
  en tolérant l'échec ; le suivi l'embarque dans sa lecture de l'historique.
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

### 2.4 Ce qui se touche, et ce qui s'annonce

- **Un texte cliquable passe par `TextLink`, jamais par un `Pressable` enveloppant un
  `ThemedText`.** L'audit T11 avait relevé **zéro attribut d'accessibilité dans tout `src/`**, et
  ce motif y comptait pour une vingtaine d'occurrences. Le composant existe pour que le libellé
  annoncé **soit** le texte affiché — un `accessibilityLabel` recopié à côté du texte visible
  finit toujours par ne plus lui correspondre — et pour porter la cible tactile de 48 px
  (`ControlHeight.target`) sans déplacer le texte. Trois règles qui vont avec : les titres sont
  annoncés comme en-têtes **par leur `type`** (`title`, `screenTitle` et `display` au niveau 1,
  `subtitle` et tout autre en-tête au niveau 2, `headingLevel` pour l'exception), pas écran par
  écran ; les listes de choix exclusifs (`ModeListItem`, `ChoiceRow`, **et toute série de `Chip`**)
  sont des `radio` et non des `button`, seul rôle qui annonce « sélectionné », dans un conteneur
  `radiogroup` **nommé par sa question** — une puce « 1 » annoncée seule ne dit pas à quoi elle
  répond —, et un choix multiple (les jours d'une intention) est une série de `checkbox` ; et la
  mascotte comme les illustrations sont masquées
  (`aria-hidden`, `accessibilityElementsHidden`) — elles accompagnent un texte qui dit déjà
  tout. Un `Pressable` nu reste légitime quand la cible porte plusieurs textes (la bannière de
  `src/app/(tabs)/suivi/bilan.tsx`), à condition de lui donner un `accessibilityLabel` qui les
  recompose.
- **Sous le doigt, une surface prend sa teinte appuyée, tout de suite et sans animation** (décision
  du 24/09/2026, `v1-29`) : `accentPressed` sur l'accent (bouton principal, puce pleine),
  `backgroundPressed` sur une surface neutre, `backgroundSelectedPressed` sur une surface choisie,
  par le `style` fonction de `Pressable`. Un lien texte se souligne. Pas d'`android_ripple`, qui n'existe
  pas sur web — le même geste doit répondre pareil des deux côtés —, et pas d'opacité, qui fait
  baisser le contraste du texte au moment même où on le lit. **Le fond d'un choix, au repos comme
  sous le doigt, sort d'une seule dérivation** (`fondDuChoix`, `src/types/fond-du-choix.ts`,
  25/09/2026) : `Chip`, `ChoiceRow`, `ModeListItem` et `LigneDeCanal` écrivaient chacun le même
  ternaire à deux étages.
- **L'onglet actif est une pastille `accent` pleine, icône en `onAccent`** (6,12:1) : la teinte de
  l'icône seule ne le distinguait pas (voir §1.4).
- **Toute série de choix passe par `GroupeDeChoix`** (`src/components/bilan/groupe-de-choix.tsx`) —
  puces, rangées, items de mode, lignes de canal —, qui pose le rôle du groupe et le **nomme par sa
  question**, écrite une seule fois ; c'est le seul endroit du dépôt qui écrive `radiogroup` ou
  `group`. Le 25/09/2026, trois listes de modes du questionnaire n'avaient pas de groupe du tout —
  « Voiture (seul) » ne disait pas à quelle question il répond — et trois fichiers posaient le rôle
  eux-mêmes. Deux exceptions au nom affiché, écrites dans son contrat : un intitulé qui ne se
  comprend qu'avec le titre de l'écran reçoit sa forme complète, qui le contient (« Trajets longue
  distance en train » pour « En train »), et une série sans question affichée reçoit le nom de ce
  qu'elle choisit (« Catégorie »). **Une précision qui s'ouvre sous une option est son propre
  groupe, posé dans celui de l'option** — la forme des révélations conditionnelles de GOV.UK, et la
  seule qui la garde juste sous ce qu'elle précise : chaque case d'option répond au groupe **le plus
  proche**, et le parcours réel le vérifie à chaque étape — avec une règle de plus, qu'aucun
  `radiogroup` ne coche deux cases : c'est la seule qui voie une précision privée de son propre
  groupe, tombée dans celui du mode, qui est bien nommé. `Chip.role` est
  **obligatoire** (`radio` ou `checkbox`) : une puce ajoutée sans rôle ne compile plus, là où onze
  séries s'annonçaient comme des boutons. Une puce posée dans un encart teinté prend
  `nestedBackground`, sans quoi elle s'y fond.
- **Espace coche un choix, sur web aussi** (25/09/2026). react-native-web ne gère Espace que sur un
  bouton (`PressResponder`, `isValidKeyPress`) : depuis que les puces sont des `radio` et des
  `checkbox`, Espace ne cochait plus rien et faisait défiler la page. Tout `Pressable` de rôle
  `radio` ou `checkbox` décompose donc `activableALaBarreDEspace` (`src/lib/barre-d-espace.ts`) —
  `Chip`, `ChoiceRow`, `ModeListItem` et `LigneDeCanal` le font —, qui retient la page, agit une fois
  par appui, laisse Entrée à la bibliothèque, ne fait rien sur un contrôle désactivé ni sur natif.
  Un choix neuf qui l'oublierait retrouverait le défaut : `verifier-etats-export.mjs` (section F) et
  le parcours réel le verraient. **Depuis le 29/09/2026, elle arrête aussi une répétition d'Entrée**
  (`onKeyDownCapture`) : quand un geste pose le focus sur un choix pendant qu'Entrée est tenue — la
  demande du « Suivant », « Voir les autres modes » —, la répétition arrivait sur lui, et la
  bibliothèque, qui ne lit pas `repeat`, le cochait au relâchement. Un appui neuf passe : c'est un
  vrai choix. La section K le vérifie sur le « Suivant » ; pour « Voir les autres modes », ce sont
  deux gardes ensemble — la section F, qui exige qu'un item de mode décompose ce gestionnaire, et la
  section K, qui exige que le gestionnaire arrête la répétition. Aucune ne joue un Entrée maintenu sur
  le lien lui-même : le défaut y a été relevé une fois, sur l'export d'avant la correction (`v1-31`
  §9, écart 14).
- **Le « Suivant » d'une étape incomplète n'est pas désactivé : il est en attente**
  (`Button.enAttente`, `v1-31`). Il a l'apparence du désactivé — fond `backgroundElement`, texte
  `textTertiary`, et `backgroundPressed` sous le doigt plutôt que `accentPressed` — et rien d'autre :
  **ni `disabled`, ni `aria-disabled`**. Il agit (`FRONT-QUESTIONNAIRE.md` §2.6, il demande ce qui manque), donc il ne
  s'annonce pas indisponible ; et sur web, `aria-disabled` réécrit depuis `disabled` pose l'attribut
  natif, qui le rendrait inerte au clic comme au clavier (`EXPO.md` §1.5). `disabled` reste pour ce
  qui n'agit vraiment pas — le « C'est noté » d'une feuille incomplète, l'« Enregistrer » de
  `/contexte`. Deux gardes derrière lui, et la seconde est voulue : `StepShell` n'appelle pas
  `onNext` sur une étape incomplète, et `handleNext` le refuse encore (`issueDuSuivant`) — à la
  dernière étape, il vérifie **toutes** les étapes visibles, `?etape=` permettant d'y arriver avec
  un questionnaire vierge.
- **Un groupe de cases d'option n'est qu'un arrêt de tabulation, et se parcourt aux flèches, sur
  web** (25/09/2026, `v1-29` §6.4). Ce sont des `div` à `role="radio"` et non des cases natives :
  react-native-web donnait `tabindex="0"` à chacune et ne faisait rien des flèches — dix modes, dix
  tabulations. `GroupeDeChoix` branche le motif de WAI-ARIA (`src/lib/groupe-au-clavier.ts`) :
  l'arrêt est l'option cochée, ou la première ; les flèches passent à la voisine **en la cochant**,
  bouclent aux deux bouts et sautent les options désactivées ; une flèche accompagnée d'un
  modificateur est laissée au navigateur. Les options d'un groupe sont celles dont il est le
  groupe **le plus proche** : une précision imbriquée garde ses flèches et son arrêt. Un `group` de
  cases à cocher n'y passe pas — chacune reste un arrêt, comme le veut le même motif. Rien à écrire
  dans un composant de choix : c'est le groupe qui le fait, et la section I de
  `verifier-etats-export.mjs` le vérifie sur une précision imbriquée et sur une grille.
- **Une option désactivée ne paraît jamais choisie** (`paraitChoisie`, `src/types/ligne-de-canal.ts`) :
  « Par email » grisé mais cerné d'accent disait à la fois « indisponible » et « c'est ton réglage ».
  Ce qui paraît coché est ce que la table de vérité des rappels rend effectif, pas la préférence
  enregistrée. **Et elle le dit par son texte, jamais par une opacité** (25/09/2026, kit `readme.md`,
  puce « États ») : fond des éléments, titre en `textTertiary`, détail en `textSecondary`. La ligne
  de canal portait `opacity: 0.6`, qui faisait tomber à 3,2:1 le détail — la phrase qui dit pourquoi
  le canal est hors d'atteinte.
- **Un écran qui en remplace un autre sous le doigt porte le focus sur ce qui arrive**
  (`TitreDArrivee`, `donnerLeFocus` dans `src/lib/focus.ts`) — « C'est envoyé, merci. », le calcul
  du bilan, la réplique d'un point, la page suivante de l'onboarding —, et **jamais au montage d'un
  écran qu'on retrouve** : une carte déjà répondue qu'on revoit en revenant sur le plan n'a volé le
  focus à personne. Même règle pour **un contrôle qui disparaît sous le geste qui l'active** :
  « Voir les autres modes » donne le focus au premier mode révélé, là où il se trouvait — sans quoi
  il retombe sur le document et la tabulation repart du haut de la page (25/09/2026).
  `MessageInline` s'annonce lui-même sur natif (`announceForAccessibility`), une région vivante
  n'annonçant pas son apparition sur Android.
- **Un bouton secondaire posé sur une carte grise ou teintée prend `onPanel`** : fond de l'écran et
  filet, au lieu du gris des panneaux. Gris sur gris, « Oui » et « Non » de la carte du point se
  lisaient comme du texte.
- **La chasse fixe (`type="code"`) est réservée aux sources et aux codes techniques** — une
  référence ADEME, un code d'erreur, une clé de configuration —, jamais à une phrase adressée à la
  personne : « Ton mode n’est pas dans la liste ? Dis-le-nous. » en 12 px gris à chasse fixe se
  lisait comme une ligne de débogage (décision du 24/09/2026).
- **Les espaces insécables de la ponctuation double sont posées par `ThemedText`, au rendu**
  (`src/types/typographie.ts`) : un texte les écrit avec une espace ordinaire, et un texte rendu
  hors de `ThemedText` (un `Text` nu, une carte de `api/`) ne les reçoit pas. Les dérivations de
  `src/types/` rendent des espaces ordinaires, et un contrôle d'export qui cherche du texte dans
  `innerText` doit normaliser les blancs (`\s+` couvre U+00A0). **Une garde qui lit `textContent`
  aussi** : le 29/09/2026, une sonde du parcours réel cherchait « Quand ? » à l'identique et ne
  trouvait rien, alors que la source l'écrit avec une espace ordinaire.
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
- **Le lien du rappel ouvre l'app grâce à `public/.well-known/assetlinks.json`**, qui autorise le
  paquet pour tout le domaine ; c'est le `pathPrefix` `/plan` d'`app.json` qui rend la revendication
  volontairement étroite, et l'empreinte de Play s'**ajoute** à la publication : `EXPO.md` §2.3.
- **Une dépendance native nouvelle impose un build**, et rien dans le code ne le dit :
  `EXPO.md` §2.3.
- **Un « Retour » ne s'écrit jamais en `router.back()` nu : il passe par `revenirOu(repli)`**
  (`src/lib/navigation.ts`, recette web du 28/09/2026, constat H1). Sur le web chaque écran est une
  adresse — tapée, rechargée, partagée, ouverte depuis Google Play —, et la pile derrière lui est
  alors **vide** : un `back()` nu n'y fait rien, sans erreur, et la personne reste enfermée. C'est
  arrivé sur l'écran des pistes, les pages légales, « Toi », `/contexte` et `/feedback`, trouvés
  ensemble le même soir. **Le repli se choisit comme la destination qu'aurait le lien s'il n'était
  pas un retour** : le plan pour ce qui s'ouvre depuis le plan (les pistes, `/contexte`), la racine
  `/` quand l'écran s'ouvre de plusieurs endroits — elle route elle-même vers le plan ou
  l'onboarding. Le seul `router.back()` qui reste (`bilan/index.tsx`) n'est rendu que si
  `canGoBack()` est vrai. Et un écran qui dépose quelque chose pour l'écran d'arrivée doit supposer
  que celui-ci se monte **à neuf** : c'est ce qu'a oublié le premier correctif, et le plan perdait la
  feuille des rappels (`useReprendreLEngagement`).

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
  d'erreur repasse par `loading` **dans son propre gestionnaire**, marqué `relance` pour que sa
  ligne se montre sans attendre le délai de `FRONT-MOUVEMENT.md` §2.12, jamais dans `rafraichir` — sans ce passage, un
  second échec rend exactement le même écran et le bouton a l'air mort ; dedans, il
  ferait clignoter « Chargement… » à chaque retour au premier plan, donc à chaque arrivée par
  notification, puisque `rafraichir` est aussi le rappel de `useRafraichirAuRetour`. Et une valeur
  par défaut posée sur un échec de lecture est du même mensonge : les boucles (`boucles`) valent
  `null` tant qu'on ne les a pas lues, et la carte d'attente comme celle des deux lieux ne
  s'affichent pas plutôt que de nommer le mauvais jour. **Une exception, nommée** (30/09/2026) : la
  carte d'un point répondu tient alors sa boucle pour tournante (`laBoucleDuPointTourne`) — elle
  existe déjà, sa réplique est choisie par période, et la déclarer arrêtée ferait changer la phrase
  de Ramille le temps de la panne ; le suivi garde de même le texte d'avant de sa carte « aucun
  point répondu » (`carteDuSuiviSansPoint`). Ce n'est pas une valeur par défaut qui affirme : c'est
  l'état d'avant qu'on ne défait pas sans savoir.
- **Les tailles, rayons, hauteurs et traits qui se répètent vivent dans `TypeScale`, `Radius`,
  `ControlHeight`, `Rail` et `Stroke`** (`src/constants/theme.ts`), consommés par les types
  `screenTitle`/`salient`/`cardTitle`/`body`/`display` de `ThemedText` ou étalés dans un style
  (`TypeScale.label`). Une taille unique reste en dur là où elle vit — la nommer serait du bruit.
  **Trois** titres valent 30 px — `/connexion`, l'étape de contexte de l'onboarding et les pages
  légales —, la même valeur que `salient` qui nomme un **chiffre** : ils restent en dur, ce type sur
  un titre encoderait une fausse équivalence. Ce paragraphe en comptait deux et `theme.ts` les
  appelait des « recopies de `salient` » à migrer, jusqu'au 24/09/2026 : les deux disaient faux, en
  sens contraire. `title`/`subtitle` (48/32) sont les tailles du handoff initial, qu'aucun écran
  n'affiche sans les surcharger. **Le kit recopie ces jetons** (`docs/design/design-system/tokens/`) :
  toucher une valeur ici impose de la recopier là-bas, dans la même PR (`v1-29` §5).
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
  motorisés sans préposition alors qu'ils peuvent parfaitement être le `dominant_poste_mode`.
  **Cette garde existe depuis le 21/09/2026**, et elle est en SQL parce que pgTAP ne peut pas lire
  du TypeScript : `07_sync_emission_factors.test.sql` épingle la liste exacte des identifiants de
  `public.transport_modes`, donc une migration qui ajoute un mode rougit en CI et son message
  nomme ce fichier. C'est un **fil-piège**, pas une comparaison — il ne dit pas que
  `MODE_PREPOSITION` est juste, il dit qu'il faut venir la relire, ce qui est exactement ce qui
  manquait. C4.4 y a ajouté cinq modes du même geste que dans sa migration.
