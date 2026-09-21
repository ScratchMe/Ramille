# Recette web — le premier parcours

> **Écrit le 17/09/2026**, le jour de la livraison du lot 5. **Jouée le : ………**
>
> À jouer **dans un navigateur**, sur `https://www.ramille.fr`. Aucun build EAS n'est disponible
> avant le 1er octobre (quota du plan gratuit, registre d'exploitation §3.3), et ce parcours-là
> n'a besoin de rien de natif : les deux marques qui le pilotent vivent en stockage local, et les
> trois cartes sont du rendu.

> **Depuis le 20/09/2026, la CI joue ce profil à chaque PR** (`scripts/verifier-parcours-reel.mjs`,
> `TESTING.md` §2.6) : les mêmes réponses, les mêmes 4 231 kg, les dix pistes dans cet ordre,
> l'engagement, un point répondu, le suivi — la base relue derrière chaque écran. **Et le bloc 09
> aussi**, depuis le même jour : un second profil, le cycliste, y joue le plan à zéro action, la
> barre d'onglets qui arrive sans « Compris », et le cap qui ne chiffre pas.
>
> Ce que cette séance regarde encore, et que les deux profils ne voient pas : le **visuel**, Ramille,
> les libellés exacts de la barre quand elle se nomme, le bloc 10 (le re-bilan), et tout ce qui se
> joue sur l'appareil. Une ligne qui tombe ici n'est donc pas forcément une régression neuve — c'est
> peut-être quelque chose que rien n'avait jamais regardé.

## Pourquoi cette séance

Le lot 5 a livré le **premier parcours** — la barre d'onglets qui attend, la carte « Ton premier
plan », la barre qui arrive et se nomme. **Personne ne l'a jamais vu tourner.** Il est éprouvé par
des tests de dérivation et par un garde-fou d'export qui pose les marques et mesure la barre dans
ses cinq états, mais aucun de ces deux filets ne regarde l'enchaînement : ils vérifient des pièces,
pas un parcours.

C'est aussi le seul moment du produit qui **ne se rejoue pas**. Trois cartes d'ouverture, chacune
une seule fois ; une fois « Compris » touché, il faut une fenêtre neuve pour revoir l'écran. Une
séance qui se trompe d'ordre ne se rattrape donc pas en revenant en arrière — elle se rattrape en
rouvrant une fenêtre privée, ce qui coûte un bilan à ressaisir.

## Deux précautions qui décident du résultat

**Une fenêtre de navigation privée neuve par parcours.** Les marques (`traceverte.*`) et le
brouillon de questionnaire vivent dans le stockage du navigateur : un parcours rejoué dans la même
fenêtre ne repart pas de zéro et montrera l'état d'après. Fermer **toutes** les fenêtres privées
entre deux parcours, pas seulement l'onglet — le stockage survit tant qu'il en reste une ouverte.

**C'est la production.** Un bilan soumis ici est un vrai bilan, sur un vrai compte anonyme, qui
comptera dans les chiffres d'usage. Rien n'est à nettoyer : la purge ferme les sessions anonymes
après 90 jours d'inactivité. Mais rien n'est fictif non plus, et il ne faut pas saisir une adresse
email réelle dont on ne veut pas qu'elle reçoive quoi que ce soit.

## Comment consigner

Un tableau par bloc. Pour chaque ligne : **conforme**, ou ce qui a été vu à la place. Deux choses à
ne pas faire, apprises des deux séances précédentes :

- **ne pas cocher un bloc parce qu'il « a l'air bon »** : chaque ligne dit ce qu'on cherche, et une
  ligne muette n'a pas été jouée — y compris quand le bloc est revenu conforme sur autre chose ;
- **noter ce qui a été vu, pas son interprétation.** « La barre était là » vaut mieux que « la
  marque n'a pas dû être posée » : la cause se cherche ensuite, avec le code sous les yeux.

Un écart n'est pas un échec de la séance : c'est ce qu'elle sert à produire. Les sept constats du
16/09/2026 sont devenus sept issues dans la journée — cinq corrigées le soir même, deux devenues
des briefs de design parce qu'elles demandaient un arbitrage et non un correctif.

---

## Le profil à saisir, et les chiffres qu'il rend

**À respecter à la lettre.** Ce profil a été **mesuré** le 17/09/2026 — bilan calculé puis plan
généré sur le projet distant, dans une transaction annulée — pour que les blocs 05 à 08 puissent
attendre des **chiffres exacts** plutôt que des ordres de grandeur. Toute réponse changée change
ces chiffres, et une ligne de plus ou de moins dans le plan.

| Question | Réponse à donner |
|---|---|
| Trajet domicile-travail régulier | **Oui** |
| Jours par semaine | **5** |
| Distance | **« Je connais la distance exacte » → 30** (c'est un aller ; pas la tranche, qui compterait 40) |
| Mode | **Voiture (seul)**, motorisation **thermique** |
| Second mode | **Non** |
| Sorties du week-end | **Une fois par semaine**, en **voiture** thermique, tranche **15 à 30 km**, sans covoiturage |
| Vols | **2** dans l'année, dont **1** court → l'écran doit écrire « 1 vol long-courrier sera compté. » |
| Longs trajets en autocar | **0** par an — le compteur existe depuis C4.4, et il faut le laisser à zéro pour retrouver ces chiffres |
| Longs trajets en voiture | **2** par an, thermique, **2** personnes à bord |
| Contexte | **Périurbain**, transports en commun **Limité**, **1** véhicule |
| Télétravail | **Un jour** |

Ce que ce profil rend, mesuré :

- un bilan de **4 231 kg/an**, poste dominant **trajet domicile-travail** (**1 920 kg**) ;
- un cycle **« Automne 2026 »**, du 1er septembre au **30 novembre** ;
- un cap de **− 384 kg** (− 20 % du poste dominant) ;
- **dix** pistes, dans cet ordre :

| Rang | Poste | Action | Gain |
|---|---|---|---|
| 1 | Trajet domicile-travail | Passer deux trajets sur cinq en train | **619 kg** |
| 2 | Voyages longue distance | Renoncer à un vol long-courrier cette année | **1 601 kg** |
| 3 | Trajet domicile-travail | Faire ce trajet à deux au moins un jour sur deux | 480 kg |
| 4 | Trajet domicile-travail | Travailler depuis chez toi un jour par semaine | 384 kg |
| 5 | Voyages longue distance | Renoncer à un vol court ou moyen-courrier cette année | 277 kg |
| 6 | Voyages longue distance | Remplacer un aller-retour en avion par le train | 273 kg |
| 7 | Loisirs du week-end | Faire une sortie sur trois à vélo à assistance électrique | 101 kg |
| 8 | Loisirs du week-end | Regrouper deux sorties en une seule, une fois sur cinq | 67 kg |
| 9 | Voyages longue distance | Faire un de tes longs trajets en train plutôt qu'en voiture | 48 kg |
| 10 | Voyages longue distance | Faire un de tes longs trajets en autocar plutôt qu'en voiture | 23 kg |

**Les rangs 7 et 10 sont nés de C4.4** (21/09/2026), et ils disent ce que le chantier a ouvert :
les sorties de ce profil font 22,5 km, au-dessus de ce qu'un vélo mécanique tient (15 km) et dans
la fenêtre du vélo à assistance ; et ses deux longs trajets en voiture à deux laissent encore 47 %
à gagner en autocar. Le rang 1 a perdu « ou en RER » de son libellé : le gain est chiffré au tarif
du TER, et le produit ne promet que ce qu'il chiffre.

**Le rang 2 pèse plus lourd que le rang 1, et c'est exactement ce qu'on vient voir** : le rang 1 est
la meilleure piste du **poste dominant**, le reste suit le gain décroissant (C5.1). Avant ce
chantier, tout le poste dominant passait devant, et le vol à 1 601 kg serait tombé en ligne simple.

**Si les chiffres ne tombent pas juste**, ce n'est pas forcément un écart : les facteurs d'émission
se resynchronisent chaque trimestre, et une nouvelle version ADEME les déplace tous. Ce qui doit
tenir quoi qu'il arrive, c'est la **forme** — l'ordre des dix lignes, le rang 2 plus lourd que le
rang 1, et le fait qu'un nombre dépasse le millier. Un écart de forme est un vrai constat ; un
écart de décimale se vérifie contre `emission_factor_sync_runs` avant d'être consigné.

Un profil sobre — vélo, aucun voyage — rendrait un plan à **zéro** action, qui est un **autre**
parcours : c'est le bloc 09, et il vaut la peine d'être joué aussi.

---

## Bloc 00 — Avant de commencer

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 00.1 | Ouvrir `https://www.ramille.fr/status` dans une fenêtre **normale** | Sous « Connexion Supabase », la page écrit **« OK — N modes de transport en base »**. Autre chose qu'un « OK », **arrêter là** : la suite ne prouverait rien, et le défaut est côté configuration, pas côté parcours | |
| 00.2 | Noter la version déployée | Le site suit `main` : c'est le dernier commit fusionné. **La feuille ne fige pas de valeur** — elle s'en figeait une (`79ca698`), et la séance du 18/09/2026 l'a trouvée périmée alors que le site était simplement en avance. Relever le commit servi, et le comparer à `main` plutôt qu'à un souvenir | |
| 00.3 | Ouvrir une fenêtre de **navigation privée** neuve | — | |

---

## Bloc 01 — L'onboarding et le questionnaire

Ce bloc n'est pas le sujet de la séance, mais il faut le traverser pour y arriver — et il porte
deux choses neuves du lot 5 qu'on regarde au passage. Les réponses à donner sont celles du tableau
ci-dessus.

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 01.1 | Traverser l'onboarding jusqu'à « Commencer mon bilan » | Sous le bouton, il est écrit qu'on peut commencer **sans compte**. **Et pas ce qu'on y perd** : la feuille l'attendait, le produit ne l'a jamais porté, et la séance du 18/09/2026 a jugé qu'il n'a pas à l'être ici — à cette étape, « ce qu'on perd » ne veut encore rien dire pour quelqu'un qui n'a pas vu son bilan | |
| 01.2 | Répondre au questionnaire jusqu'à la dernière étape | « Étape N sur M » en tête, et le pied reste visible sans défiler. **M dépend des réponses** — neuf pour le profil ci-dessus, huit si les sorties sont « rarement », six sans trajet régulier — donc ce qu'on regarde est que N avance d'une étape à l'autre **sans sauter**, pas la valeur de M | |
| 01.3 | **La question du télétravail** (dernière étape, C5.4) | « Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez toi ? », et **trois** puces : Aucun / Un jour / Deux ou plus. Le mot « Parfois » ne doit apparaître nulle part | |
| 01.4 | Revenir en arrière et ramener le trajet à **1 jour** par semaine, puis revenir à l'étape Contexte | La question du télétravail **a disparu**, et « Voir mon bilan » ne reste pas bloqué en réclamant une réponse qu'on ne peut plus donner | |
| 01.5 | Remettre **5** jours, répondre « Un jour » au télétravail, soumettre | — | |

---

## Bloc 02 — La restitution, sans barre d'onglets

**C'est le premier des trois moments neufs.** À ne pas manquer : il se joue à l'instant où la
restitution s'affiche.

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 02.1 | Regarder le **bas** de l'écran de restitution | **Aucune barre d'onglets.** Pas de « Plan » ni « Suivi » en bas | |
| 02.2 | Regarder s'il reste une bande vide là où elle serait | Le contenu descend jusqu'en bas de la fenêtre. Une bande grise ou blanche de la hauteur d'une barre absente serait un écart | |
| 02.3 | Le reste de l'écran | Inchangé : le total (**4,2 t** pour ce profil), la répartition, « Où tu te situes », le partage. L'icône de compte en haut à droite est toujours là | |
| 02.4 | Descendre jusqu'au bouton | « Voir ce que je peux faire » | |

---

## Bloc 03 — La carte « Ton premier plan »

Le deuxième moment neuf, et celui qui porte le plus de décisions.

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 03.1 | Toucher « Voir ce que je peux faire » | **L'écran de création de compte s'intercale d'abord** — la transition imposée de `/connexion` (`resultat_transition`), un choix daté que la feuille avait oublié. Le passer, puis : on arrive sur le plan, **toujours sans barre d'onglets**. *Que ce soit le bon moment pour cet écran est une question ouverte depuis le 18/09/2026, pas un écart* | |
| 03.2 | La carte en haut de l'écran | Étiquette **« TON PREMIER PLAN »**, titre **« Une action pour l'automne. »**, puis « Choisis-en une, et dis quand. Ensuite, un point régulier te demandera si tu l'as faite — rien d'autre à suivre. » La saison nommée est celle du **cycle**, pas celle du jour : automne jusqu'au 30 novembre inclus, hiver ensuite | |
| 03.3 | **Ramille, sous la carte et hors du cadre** | Le visage vert, penché, et la phrase **« Prends celle qui te ressemble. »** Elle doit être **dessous**, pas dans le cadre | |
| 03.4 | La sortie de la carte | Un seul lien, **« Compris »**. Pas de bouton plein, pas de second choix | |
| 03.5 | **La carte du cap** (plus bas) | « Ton cap pour cette saison », **« − 384 kg »**, « soit − 20 % sur ton trajet domicile-travail (1,9 t aujourd'hui) », puis **« Automne 2026 »** et **« jusqu'au 30 novembre »**. **Mais pas de trait de temps**, et pas la phrase « La saison avance ; le trait mesure le temps, pas toi. » — les deux n'arrivent qu'une fois une action engagée | |
| 03.6 | L'intro du plan | « Ton plan », puis **« Une action par saison, une seule. C'est pas à pas qu'on tient un cap. »** — et surtout pas une phrase qui nomme un poste ou un nombre d'actions | |

**Ne pas encore toucher « Compris ».** Les blocs 05 à 08 se jouent aussi bien avant qu'après, mais
03.5 (l'absence de trait) ne se revoit plus une fois une action engagée.

---

## Bloc 04 — La barre arrive, et se nomme

Le troisième moment neuf. **Irréversible dans cette fenêtre.**

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 04.1 | Toucher **« Compris »** | La carte disparaît | |
| 04.2 | Le bas de l'écran | **La barre d'onglets apparaît**, avec « Plan » et « Suivi », l'onglet Plan actif | |
| 04.3 | En haut du plan, à la place de la carte refermée | Une seconde carte : **« PLAN ET SUIVI »**, titre **« Deux endroits, pas plus. »**, puis « Ici, ton plan : l'action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison. » | |
| 04.4 | Ramille sous cette carte | **« Je note tes réponses dans ton suivi, au fil des saisons. »** | |
| 04.5 | Toucher « Compris » sur cette carte, puis recharger la page | La carte **ne revient pas**, la barre **reste**. C'est ce qui prouve que la marque a été écrite | |
| 04.6 | Toucher l'onglet **Suivi**, puis revenir sur **Plan** | Les deux écrans s'affichent, et aucune des deux cartes d'ouverture ne réapparaît | |

---

## Bloc 05 — Ce que le plan montre (C5.1, C5.3, C5.8)

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 05.1 | Les **deux** cartes d'action | Deux, pas plus. La première : « Passer deux trajets sur cinq en train ou en RER », **− 619 kg CO₂e**, « Sur tes 5 trajets par semaine. » La seconde : « Renoncer à un vol long-courrier cette année », **− 1 601 kg CO₂e**, « Sur 1 vol long-courrier déclaré. » | |
| 05.2 | **Le classement** (C5.1) | La **seconde** carte annonce un gain **plus élevé** que la première, et c'est juste : le rang 1 est la meilleure piste du poste dominant, le reste suit le gain décroissant. Voir l'inverse — le vol en tête, ou le vol relégué en ligne simple — est un écart | |
| 05.3 | **Les milliers** (C5.8) | Le gain de la seconde carte s'écrit **« 1 601 »** avec une espace fine, jamais « 1601 ». C'est le seul endroit de cet écran qui dépasse le millier : le cap (384) et les autres gains sont à trois chiffres | |
| 05.4 | Sous le cap | **Aucune note** du genre « le cap porte sur tes voyages ; cette action porte ailleurs » — elle a été retirée par C5.3, et ce profil est précisément celui qui la réveillait | |

---

## Bloc 06 — L'écran « Toutes les pistes » (C5.2)

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 06.1 | Sous les deux cartes | Un lien **« Voir toutes les pistes · 8 »** — le compte est le **total** des pistes, pas celles qui restent à voir | |
| 06.2 | L'ouvrir | Titre « Toutes les pistes », la phrase « Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan. », **la barre d'onglets reste visible**, et un lien « Retour au plan » en haut. (Si le bloc 08 a déjà été joué, la phrase commence par « Ton action en cours d'abord » : c'est voulu, pas un écart) | |
| 06.3 | L'ordre des groupes | **Trajet domicile-travail** (3 pistes), puis **Voyages longue distance** (4), puis **Loisirs du week-end** (1). Les groupes sortent dans l'ordre où leur poste apparaît, donc la toute première piste de l'écran est la même action que la première carte du plan | |
| 06.4 | Toucher une ligne | Elle s'**ouvre en carte**, avec son gain et son bouton pour s'engager | |
| 06.5 | En ouvrir **plusieurs** | Elles restent toutes ouvertes — ce n'est pas un accordéon —, et deux cartes voisines **ne se touchent pas** : il y a un écart entre elles | |
| 06.6 | Revenir au plan | Le plan est tel qu'on l'a laissé | |

---

## Bloc 07 — L'encart de contexte et sa porte (C5.5, destination réécrite par C6.4)

**Ce bloc a changé de destination le 19/09/2026.** La séance du 18/09 avait trouvé ici le constat
07.4 : « Modifier ces réponses » rouvrait le questionnaire, et en sortir **soumettait un bilan
entier**. C6.4 a sorti le contexte du questionnaire, donc les lignes 07.3 et suivantes ne cherchent
plus la même chose — c'est la porte elle-même qui est en recette.

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 07.1 | Descendre en bas du plan | **« Ton plan tient compte de ton contexte : zone périurbaine, accès limité aux transports en commun, un véhicule dans le foyer, un jour de télétravail possible. Ce qui ne tient pas avec ces réponses n'est pas proposé. »** — les quatre réponses, dans cet ordre | |
| 07.2 | La relire | Elle ne contient **aucun chiffre** et ne nomme **aucune action écartée**. Un « tu perds telle action » serait un écart grave | |
| 07.3 | Toucher **« Modifier ces réponses »** | L'écran **« Ton contexte de mobilité »** s'ouvre, avec les quatre mêmes questions que la dernière étape du questionnaire et les réponses déjà sélectionnées. **Retomber dans le questionnaire serait l'écart que ce chantier ferme** | |
| 07.4 | Lire le pied de l'écran, sans rien toucher | « Enregistrer met ton plan à jour ; ton bilan n'est pas refait. Si l'action que tu suis n'y tient plus, tu en choisiras une autre. » Et **« Enregistrer » est inactif** tant qu'aucune réponse n'a bougé | |
| 07.5 | Toucher **« Retour »** | On retrouve le plan, inchangé | |
| 07.6 | Rouvrir l'écran, passer l'accès aux transports en commun sur **Inexistant**, puis **« Enregistrer »** | Retour au plan, et **le plan s'est réduit** : les actions qui supposaient un métro ou un tram ont disparu | |
| 07.7 | Ouvrir l'onglet **Suivi** | **Aucune entrée nouvelle.** Un second bilan dans l'historique serait le défaut que C6.4 ferme — corriger son contexte n'est pas refaire un bilan | |
| 07.8 | Revenir au contexte et remettre **Limité**, puis enregistrer | Le plan retrouve ses actions. Le suivi n'a toujours qu'une entrée | |
| 07.9 | Ouvrir **« Toi »** | La ligne **« Mon contexte de mobilité »** y mène aussi. C'est la seule porte pour un plan à zéro action, où l'encart du plan ne se rend pas | |

---

## Bloc 08 — S'engager, et voir le trait apparaître

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 08.1 | Sur la **première** carte (le trajet domicile-travail), choisir l'action et son intention | Des **jours de la semaine**. Sur la carte du vol, à l'inverse, ce sont des **échéances** (« à mon prochain projet de voyage ») et jamais « ce mois-ci » : les deux valent d'être ouvertes pour comparer | |
| 08.2 | Toucher « C'est noté » | L'action passe en tête, marquée comme engagée | |
| 08.3 | **Le premier pas** | Une ligne pratique apparaît **sous** l'action engagée, et seulement maintenant — pas avant le choix. Pour cette action : « Vérifie l'horaire qui te convient, puis essaie-le une fois. » Elle ne contient aucun chiffre | |
| 08.4 | **La carte du cap** | Le **trait de temps** est apparu, avec « La saison avance ; le trait mesure le temps, pas toi. » C'est ce que 03.5 attendait. Il est **court** — il mesure le temps écoulé depuis le 1er septembre sur les 91 jours de la saison, et non ce qu'on vient de faire : s'engager ne le fait pas avancer d'un pixel | |
| 08.5 | La feuille des rappels | Sur le web et sans compte rattaché, **elle ne s'ouvre pas** : c'est normal, et non un écart. Elle demande une adresse confirmée ou un appareil | |

---

## Bloc 09 — Le parcours d'un profil sobre (optionnel, mais instructif)

**Fenêtre privée neuve.** Ce parcours-là ne passe **jamais** par la carte « Ton premier plan » :
un plan à zéro action ne la rend pas. La barre doit donc arriver quand même, au premier affichage du
plan, avec la carte « Plan et Suivi ». C'est le chemin le moins évident du chantier.

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 09.1 | Refaire un bilan en déclarant un trajet **à vélo** et aucun voyage | — | |
| 09.2 | Arriver sur le plan | **Pas** de carte « Ton premier plan ». À la place : la barre d'onglets **et** la carte « Plan et Suivi » | |
| 09.3 | Le contenu du plan | La félicitation « Tu fais déjà l'essentiel sur ce poste. », la carte du cap **sans chiffre** (mais avec la période et sa fin), et **ni** encart de contexte **ni** lien vers les pistes | |

---

## Bloc 10 — Le re-bilan (optionnel)

| | Ce qu'on fait | Ce qu'on attend | Vu |
|---|---|---|---|
| 10.1 | Depuis le plan du premier profil, « Revoir mon bilan », changer une réponse, soumettre | La restitution s'affiche, **la barre d'onglets est là** (le parcours est fini, un re-bilan ne le rouvre pas) | |
| 10.2 | Aller sur Suivi | Deux barres, l'écart par poste, et une note qui dit l'écart **en kilos** avant le pourcentage | |
| 10.3 | Revenir sur le plan | Si l'engagement du bloc 08 a été emporté par le re-bilan, un encart le **dit** — il ne disparaît pas en silence | |

---

## Ce que cette séance ne prouve pas

À ne pas relire plus tard comme si elle l'avait fait. Ces lignes restent dans la §11 de
[`v1-13`](../architecture/v1-13-audit-et-chantiers.md) et attendent un appareil :

- **les notifications push**, et la cérémonie qui les propose — sur le web elle exige une adresse
  confirmée, donc le bloc 08.5 ne l'ouvre pas ;
- **le retour de l'app depuis l'arrière-plan**, qui est le chemin nominal de la boucle d'engagement
  et n'existe pas dans un navigateur ;
- **l'absence de bande vide au-dessus de l'encoche** d'un vrai Android — le bloc 02.2 la regarde sur
  un écran dont l'encoche vaut zéro ;
- **l'entrée animée** de la carte telle qu'Android la rend ;
- **TalkBack**, les marges de sécurité, et les liens `ramille://`.

## Où atterrissent les constats

Dans la **§13 bis** de [`v1-13`](../architecture/v1-13-audit-et-chantiers.md), sur le modèle des
§12 et §13 : ce que la séance a trouvé, une issue par constat, et l'accrochage à une vague. Les
lignes de la §11.W qui auront été jouées le diront en tête de leur case, comme celles de la §11 le
font pour la séance du 14/09/2026.
