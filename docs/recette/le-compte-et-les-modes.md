# Recette web — ce qui est neuf depuis le 18/09/2026

> **Écrit le 21/09/2026, mis à jour le 27/09/2026** — la séance n'avait pas été jouée entre-temps,
> donc la feuille couvre désormais les deux périodes : ce que le 21/09 livrait (le compte, le
> contexte, les modes manquants) et ce que les six jours suivants ont ajouté (le design system à
> l'écran, l'onboarding, le résiduel des sorties rares, le retrait d'un bilan, la page de
> confidentialité). **Jouée le : ………**
>
> À jouer **dans un navigateur**, sur `https://www.ramille.fr`. Aucun build EAS n'est disponible
> avant le 1er octobre (quota du plan gratuit, registre d'exploitation §3.3), et rien de ce qui est
> listé ici n'a besoin de natif — sauf ce qui est explicitement renvoyé à `v1-13` §11. **Le bloc 12
> seul attend une date** : il ne se joue qu'à partir du 1er octobre.

## Pourquoi cette séance, et ce qu'elle ne fait pas

**Elle ne rejoue pas le premier parcours.** La séance du 18/09/2026 l'a joué (`v1-13` §14), et
depuis le 20/09 la CI le rejoue à chaque PR sur deux profils
(`scripts/verifier-parcours-reel.mjs`). **On part donc du principe qu'il n'y a pas de régression**,
et on ne regarde que **ce qui a été livré depuis le 18/09/2026**.

C'est un choix, et il a un prix qu'il vaut mieux écrire : si une régression est arrivée sur un
écran ancien que ni la CI ni cette feuille ne regardent, cette séance ne la trouvera pas. Le pari
est que les gardes automatiques couvrent le chemin nominal, et que le temps humain vaut mieux sur
ce qui n'a **jamais** été parcouru à la main.

Douze sujets, dans l'ordre où ils se jouent :

| | Sujet | D'où ça vient |
|---|---|---|
| 1 | L'onboarding : « Retour », les points de pagination, « Commencer » | [#262](https://github.com/ScratchMe/Ramille/pull/262), [#276](https://github.com/ScratchMe/Ramille/pull/276), [#278](https://github.com/ScratchMe/Ramille/pull/278) |
| 2 | Les questions neuves du questionnaire, la densité de l'écran du mode, les vols | C4.4 ([#257](https://github.com/ScratchMe/Ramille/pull/257)), [#274](https://github.com/ScratchMe/Ramille/pull/274), [#276](https://github.com/ScratchMe/Ramille/pull/276) |
| 3 | Le bilan et le premier plan : les chiffres, les pistes, le cap « par an », l'onglet actif | C4.4, [#262](https://github.com/ScratchMe/Ramille/pull/262), [#265](https://github.com/ScratchMe/Ramille/pull/265) |
| 4 | **Le compte : le code à huit chiffres** | [#252](https://github.com/ScratchMe/Ramille/pull/252), [#253](https://github.com/ScratchMe/Ramille/pull/253), [#255](https://github.com/ScratchMe/Ramille/pull/255), [#278](https://github.com/ScratchMe/Ramille/pull/278) |
| 5 | Les deux branches ne se distinguent pas | [#255](https://github.com/ScratchMe/Ramille/pull/255) |
| 6 | Retrouver un compte depuis un navigateur neuf | — |
| 7 | `/contexte` : corriger quatre réponses sans resoumettre de bilan | C6.4 ([#240](https://github.com/ScratchMe/Ramille/pull/240)) |
| 8 | Le re-bilan, « Toi », et le séparateur des milliers | [#237](https://github.com/ScratchMe/Ramille/pull/237), [#238](https://github.com/ScratchMe/Ramille/pull/238), [#256](https://github.com/ScratchMe/Ramille/pull/256) |
| 9 | **Retirer un bilan** | C4.7 ([#285](https://github.com/ScratchMe/Ramille/pull/285)) |
| 10 | Qui sort « rarement » : les loisirs occasionnels, le plan vide, le premier plan avant les deux lieux, la légende du suivi | [#263](https://github.com/ScratchMe/Ramille/pull/263), [#278](https://github.com/ScratchMe/Ramille/pull/278), [#282](https://github.com/ScratchMe/Ramille/pull/282), [#284](https://github.com/ScratchMe/Ramille/pull/284) |
| 11 | La page de confidentialité | [#282](https://github.com/ScratchMe/Ramille/pull/282), C4.7 et les agrégats de cohortes ([#285](https://github.com/ScratchMe/Ramille/pull/285)) |
| 12 | À partir du 1er octobre : la question mensuelle de qui sort rarement | [#281](https://github.com/ScratchMe/Ramille/pull/281) |

**Le sujet 4 est le plus important**, et c'est celui par lequel il ne faut pas finir si le temps
manque : le chemin du compte a entièrement changé le 20/09 (l'e-mail ne porte plus de lien mais un
code), il ferme une faille de sécurité mesurée, et **il n'a jamais été parcouru à la main**. Un
script le joue à chaque PR contre une stack locale ; personne ne l'a encore fait sur la production,
avec une vraie messagerie. **Le sujet 9 vient juste après** : retirer un bilan est le seul geste
neuf qui détruit quelque chose à l'écran, et il n'a été joué que par le parcours automatique.

## Trois précautions qui décident du résultat

- **C'est la production.** Les comptes créés sont réels et les e-mails partent vraiment. Prévoir
  **une adresse e-mail qu'on relève facilement**, et supprimer les comptes à la fin (bloc 14) —
  **sauf celui du profil 2**, qu'on garde jusqu'au bloc 12.
- **Deux navigateurs, et jamais deux fenêtres privées ouvertes en même temps dans le même.** Sur le
  web, la session et les marques du produit vivent dans le stockage local — et Chrome, Edge et
  Firefox **partagent un seul stockage entre toutes leurs fenêtres privées ouvertes ensemble**
  (Safari les isole). Une « fenêtre privée neuve » ouverte à côté de celle du profil 1 **n'est donc
  pas neuve** : elle arrive sur le plan du profil 1, et le bloc qui la demandait ne prouve rien. D'où
  la règle de la séance :
  - **navigateur A** : le profil 1, dans **une** fenêtre privée ouverte au 00.4 et **gardée jusqu'au
    bloc 09** — puis rouverte pour le 14.1 ;
  - **navigateur B** : tout le reste — les fenêtres jetables des blocs 05, 06 et 08.3, puis le
    profil 2 au bloc 10. **Fermer toutes les fenêtres privées de B avant d'en ouvrir une neuve.**

  Une fenêtre déjà utilisée fausse les blocs 01, 03 (les marques du premier plan), 05, 06, 08.3 et
  10. **Et la feuille reste dans une fenêtre normale** : fermer les fenêtres privées efface leur
  stockage, pas celui de la feuille.
- **Ne pas demander deux codes pour la même adresse à moins d'une minute.** Le distant porte
  `smtp_max_frequency = 60` : un second envoi rapproché est **refusé**, ce qui est le comportement
  de la production et non un défaut.

## Comment consigner

Trois états, **jamais deux** : **conforme**, **écart**, **non joué**. Une case laissée vide est
*muette*, et se lit « non joué » — jamais « conforme ». C'est la règle la plus chère des séances
précédentes (`RECETTE.md` §1.3).

Et **noter ce qui a été vu, pas son interprétation** : « l'écran affichait 2,5 t » vaut mieux que
« le calcul de l'autocar n'a pas dû passer ». La cause se cherche ensuite, avec le code sous les
yeux.

## Profil 1 — le rouleur du RER, et les chiffres qu'il rend

**Mesuré en base le 21/09/2026, puis remesuré le 27/09/2026 à l'identique** — bilan calculé puis
plan estimé dans une transaction annulée, pas calculé de tête. Le saisir **à la lettre**, sinon
les chiffres ci-dessous ne sont comparables à rien.

| Étape | Réponse, dans les mots de l'écran |
|---|---|
| Trajet régulier | **Oui** |
| Jours par semaine | **5** |
| Distance | **20 km** (saisie libre) |
| Mode | **Train** → « Quel type de train ? » → **RER ou Transilien** |
| Second mode ? | **Oui** → **Vélo** → « Quel type de vélo ? » → **À assistance électrique** |
| Part du second mode | **Un quart environ** |
| Sorties | **Une fois par semaine** |
| Mode des sorties | **Voiture (seul)** → « Quelle motorisation ? » → **Thermique** |
| Distance d'une sortie | **15 à 30 km** |
| Vols | **2** au total, dont **1** court (donc **un long-courrier**) |
| Longs trajets en train | **0** |
| Longs trajets en autocar | **2** |
| Longs trajets en voiture | **2** → **Thermique** → « Vous êtes combien dans la voiture ? » → **2** |
| Zone | **Périurbain** |
| Transports en commun | **Limité** |
| Véhicules du foyer | **1** |
| Télétravail | **Deux ou plus** |

**Ce que ce profil rend** — total **2 453,7 kg/an**, que la restitution affiche **« 2,5 t »** (le
formateur bascule en tonnes dès 1 000 kg et arrondit au dixième). Réparti ainsi :

| Poste | kg/an |
|---|---|
| Trajet principal (RER) | 66,0 |
| Second mode (vélo à assistance) | 24,6 |
| Loisirs | 332,9 |
| Avion long-courrier | 1 601,0 |
| Avion court/moyen-courrier | 277,0 |
| **Autocar** | **52,6** |
| Voiture longue distance | 99,6 |

Le poste dominant est **les voyages** (2 030,2 kg), donc **le cap de la saison vaut − 406 kg**
(20 % des voyages), à franchir d'ici au **30 novembre**. Et **dix pistes**, dans cet ordre :

| Rang | Action | Gain |
|---|---|---|
| 1 | Renoncer à un vol long-courrier cette année | **1 601 kg** |
| 2 | Renoncer à un vol court ou moyen-courrier cette année | 277 kg |
| 3 | Remplacer un aller-retour en avion par le train | 273 kg |
| 4 | **Faire une sortie sur trois à vélo à assistance électrique** | **101 kg** |
| 5 | Regrouper deux sorties en une seule, une fois sur cinq | 67 kg |
| 6 | Faire un de tes longs trajets en train plutôt qu'en voiture | 48 kg |
| 7 | Travailler depuis chez toi deux jours par semaine | 36 kg |
| 8 | **Remplacer un de tes longs trajets en autocar par le train** | **24 kg** |
| 9 | **Faire un de tes longs trajets en autocar plutôt qu'en voiture** | **23 kg** |
| 10 | Travailler depuis chez toi un jour par semaine | 18 kg |

**Le vol long-courrier n'est pas décoratif** : son gain est le **seul gain à quatre chiffres** de
tout le parcours, donc le seul endroit où le séparateur des milliers se regarde sur un chiffre
calculé (bloc 08.4). Les totaux, eux, basculent en tonnes avant d'atteindre le millier et n'en
portent jamais. (L'étape des vols affiche aussi « 1 500 km » et « 9 000 km », les distances de
référence : des constantes, pas des résultats.)

## Profil 2 — le cycliste qui sort rarement

**Mesuré en base le 27/09/2026**, même méthode. C'est le profil que le produit traitait le plus mal
jusqu'au 27/09 : le calcul **suppose** ses sorties (le « résiduel »), et tout ce qui les nommait
parlait de sorties qu'il n'a pas déclarées.

| Étape | Réponse, dans les mots de l'écran |
|---|---|
| Trajet régulier | **Oui** |
| Jours par semaine | **5** |
| Distance | **8 km** (saisie libre) |
| Mode | **Vélo** → « Quel type de vélo ? » → **Mécanique** |
| Second mode ? | **Non** |
| Sorties | **Rarement — une fois par mois ou moins** |
| Vols | **0** |
| Longs trajets en train | **1** |
| Longs trajets en autocar | **0** |
| Longs trajets en voiture | **0** |
| Zone | **Urbain dense** |
| Transports en commun | **Bon** |
| Véhicules du foyer | **1** |
| Télétravail | **Aucun** |

**Ce que ce profil rend** — total **58,4 kg/an** : le trajet à vélo **0,6 kg**, le long trajet en
train **2,3 kg**, et **55,5 kg** de loisirs **supposés**, qui sont le poste dominant. **Le plan ne
porte aucune action** — le résiduel n'en reçoit pas, et le train ne se remplace par rien de moins
lourd.

**Puis, au bloc 10, un second bilan** où le seul changement est le mode du trajet : **Voiture
(seul)** → **Thermique**, les 8 km inchangés. Il rend **569,9 kg/an**, le trajet devient le poste
dominant (**512,1 kg**), le cap vaut **− 102 kg**, et **quatre pistes** apparaissent :

| Rang | Action | Gain |
|---|---|---|
| 1 | Passer deux trajets sur cinq en métro ou en tram | 199 kg |
| 2 | Passer deux trajets sur cinq en train | 165 kg |
| 3 | Faire ce trajet à deux au moins un jour sur deux | 128 kg |
| 4 | Faire un trajet sur cinq à vélo | 102 kg |

**Ce qui doit tenir quoi qu'il arrive**, et ce qui peut bouger légitimement :

- **tient** : la **forme** (les nombres de pistes, deux cartes pleines puis les suivantes derrière
  un lien qui dit combien), l'**ordre** des tableaux ci-dessus **pour les deux cartes du plan** —
  l'écran des pistes, lui, groupe par poste (03.8) —, la **présence** des trois lignes en gras du
  profil 1 (les gabarits neufs de C4.4), le libellé du poste « Trajet domicile-travail **(RER ou
  Transilien)** » **dans l'export** (03.10), et pour le profil 2 : **zéro action** au premier bilan,
  les mots « loisirs occasionnels » partout où le résiduel est nommé ;
- **peut bouger** : les **kilogrammes**. Les facteurs ADEME se resynchronisent chaque trimestre —
  **et le prochain passage a lieu le 1er octobre 2026** — donc un chiffre qui a glissé de quelques
  unités n'est pas un écart. Un chiffre qui **double**, ou un rang qui change, en est un ;
- **dépend du jour** : la saison nommée par la carte du cap (automne jusqu'au 30 novembre inclus).

---

## Bloc 00 — Avant de commencer

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Ouvrir `https://www.ramille.fr/status` dans une fenêtre **normale** | Sous « Connexion Supabase », **« OK — N modes de transport en base »**. Autre chose qu'un « OK » : **arrêter là**, le défaut est côté configuration et la suite ne prouverait rien | |
| 00.2 | Relever **N**, le nombre de modes | **24** — relevé sur le distant le 21/09/2026 puis le 27/09/2026. Un nombre plus bas veut dire que la production ne porte pas les migrations de C4.4, et **les blocs 02 et 03 tomberaient** pour cette seule raison. C'est aussi le seul chiffre de cette feuille qui peut **monter** légitimement, si un mode est ajouté après cette date | |
| 00.3 | Noter le commit servi, et le comparer à `main` | Le site suit `main`. **Le bloc 09 demande que le retrait d'un bilan y soit** (C4.7, fusionné le 28/09/2026 au plus tôt) : s'il n'y est pas encore, le jouer à une séance suivante. **Ne pas figer de valeur ici** : la feuille s'en figeait une le 18/09 et la séance l'a trouvée périmée alors que le site était simplement en avance | |
| 00.4 | Dans le **navigateur A**, fermer toutes les fenêtres privées, puis en ouvrir une pour le profil 1 | — | |

## Bloc 01 — L'onboarding : « Retour », les points, « Commencer »

> Trois décisions du 27/09/2026 (`v1-29` §6.3). Il n'y avait **aucun moyen de revenir en arrière**
> dans l'onboarding, sinon le balayage — et à la souris, le retour du navigateur fait sortir de
> l'onboarding. Les points de pagination, seule progression visible, ne ressortaient qu'à 1,33:1.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | La première page | Un seul bouton, **« Découvrir mon impact »**, puis quatre points, puis **« Pas de compte à créer pour commencer. »** et le lien **« J'ai déjà un compte »**. **Aucun « Retour »** : la première page n'a rien derrière elle | |
| 01.2 | Les points de pagination, sur chaque page | Le point de la page courante est une **pilule** plus longue que les autres — il se reconnaît à sa **forme**, pas seulement à sa couleur. Les autres sont **gris moyen**, et se voient aussi sur la page à fond teinté (la troisième) : avant, ils étaient presque blancs | |
| 01.3 | « Découvrir mon impact », puis sur la deuxième page | **« Retour »** à gauche et **« Continuer »** à droite, **sur une même ligne et à la même hauteur** | |
| 01.4 | « Retour » | On revient à la première page, **sans sortir de l'onboarding** | |
| 01.5 | Revenir jusqu'à la troisième page (fond teinté) | « Retour » y est **filé** (un contour), et toujours de la même hauteur que « Continuer » : un contour posé en plus du rembourrage le rendait plus haut de deux pixels | |
| 01.6 | Quatrième page | Le titre **« On passe à ton bilan »**, et le bouton dit **« Commencer »** — et non plus « Commencer mon bilan », qui passait sur deux lignes à côté de « Retour ». Réduire la fenêtre à **360 px** de large (outils de développement, mode appareil) : les deux boutons restent **sur une ligne**, et « Commencer » sur une seule | |
| 01.7 | « Commencer » | Le questionnaire s'ouvre | |

## Bloc 02 — Les questions neuves du questionnaire, et les vols

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | Saisir le **profil 1** jusqu'à l'étape du mode | — | |
| 02.2 | Choisir **Train** à l'étape du mode | Un encart s'ouvre **sous la ligne « Train »**, à l'intérieur de la liste et non après : « **Quel type de train ?** », trois réponses en rangées — **TER ou train régional**, **RER ou Transilien**, **Intercités**. Tant qu'aucune n'est choisie, « Suivant » reste inactif | |
| 02.3 | Choisir **RER ou Transilien**, puis « Suivant » | — | |
| 02.4 | À l'étape du second mode, répondre **Oui** puis choisir **Vélo** | Un encart « **Quel type de vélo ?** » s'ouvre sous « Vélo », deux réponses : **Mécanique**, **À assistance électrique**. La **trottinette** n'en a pas, et c'est voulu | |
| 02.5 | Choisir **À assistance électrique**, puis la part **Un quart** | — | |
| 02.6 | **Les vols**, avant de saisir ceux du profil : choisir **0**, puis **2** | La question « **Sur ces 2, combien sont courts ?** » arrive **sans réponse choisie**, et « Suivant » reste inactif tant qu'on n'a rien choisi. Avant le 27/09, elle arrivait déjà réglée sur « 0 », donc **deux long-courriers** comptés sans que personne ne l'ait dit — l'erreur la plus lourde possible sur le poste le plus lourd | |
| 02.7 | Choisir **2** courts | Sous la question : **« Aucun vol long-courrier ne sera compté. »** — le zéro dit en mots, et non « 0 vol long-courrier sera compté. » | |
| 02.8 | Choisir **1** court (la réponse du profil) | **« 1 vol long-courrier sera compté. »** | |
| 02.9 | À l'étape des longs trajets | **Trois** compteurs et non deux : « En train », « **En autocar** », « En voiture ». Sous l'autocar, **aucune** question de motorisation ni de remplissage — on ne choisit pas le véhicule d'un autocar | |
| 02.10 | **L'écran du mode : est-ce devenu pénible ?** Y revenir par « Retour » et le remplir une seconde fois, délibérément | **Ce n'est pas une conformité, c'est un jugement à rendre** (`v1-13` §11.19). Cinq des neuf entrées ouvrent désormais une sous-question — « Voiture (seul) », « Voiture (covoiturage) » qui en ouvre deux, « Deux-roues motorisé », « Train », « Vélo ». Trois choses à regarder : (a) l'encart reste-t-il dans le champ de vision après la sélection, sans le chercher ; (b) comprend-on qu'il reste quelque chose à faire quand « Suivant » est grisé ; (c) changer d'avis sur le mode donne-t-il l'impression de tout recommencer. **Répondre même si tout est conforme** — une ligne muette se lira « non joué ». Si c'est pénible, la suite est un **brief de design**, pas un correctif | |
| 02.11 | Finir le questionnaire et soumettre | — | |

## Bloc 03 — Le bilan et le premier plan

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 03.1 | Le total sur la restitution | **2,5 t** (2 453,7 kg mesuré, affiché au dixième de tonne). Un écart de quelques kilos est légitime ; un total qui change de tonne ne l'est pas | |
| 03.2 | La répartition par poste | **Trois** barres : Trajet domicile-travail ≈ 91 kg CO₂e, Loisirs du week-end 333 kg CO₂e, Voyages longue distance **2,0 t CO₂e**. L'**autocar n'a pas de barre à lui** : il est compté dans les voyages (52,6 kg mesuré). Ce qui prouve qu'il compte est le total du 03.1 — **2,5 t** avec lui, 2,4 t sans lui (2 401,1 kg) — et les deux pistes autocar du 03.9. Avant C4.4, deux trajets en car comptaient pour **rien** | |
| 03.3 | Rejoindre le plan | En tête, la carte **« TON PREMIER PLAN »**, titrée **« Une action pour l'automne. »**. **Puis les deux cartes d'action, et seulement ensuite la carte du cap** : au tout premier plan, les actions passent avant le cap (`v1-29`, décision n° 3) — avant, la première action arrivait coupée en bas de l'écran | |
| 03.4 | La carte du cap | « **Ton cap pour cette saison** », **« − 406 kg »**, puis dessous « **par an**, soit − 20 % sur tes voyages (2,0 t CO₂e aujourd'hui) » : le chiffre est **annuel**, et « par an » le dit (décision n° 4). Puis **« L'une des deux pistes proposées suffit à le franchir. »** — l'une seulement : 1 601 kg le franchit, 277 kg non. Plus bas, « Automne 2026 » et « jusqu'au 30 novembre » ; **et pas de trait de temps** — au premier plan il n'y a encore rien à mesurer | |
| 03.5 | La barre d'onglets | **Elle n'est pas encore là.** Elle arrive quand on referme « Ton premier plan » (C5.7) | |
| 03.6 | « Compris » sur la carte du premier plan | La barre d'onglets arrive, et la carte **« PLAN ET SUIVI » — « Deux endroits, pas plus. »** prend la place de la première | |
| 03.7 | L'onglet actif | Une **pastille verte pleine, icône blanche**, sur « Plan » : il se reconnaît sans sa couleur (décision n° 5). Avant, actif et inactif avaient la même luminance | |
| 03.8 | Toucher **« Voir toutes les pistes · 10 »** | Le compte est **dans** le libellé. L'écran des pistes dit « **Par poste, du plus gros gain au plus petit.** » et groupe les **dix** : **Voyages longue distance** — 1 601, 277, 273, 48, 24, 23 kg ; **Loisirs du week-end** — 101, 67 kg ; **Trajet domicile-travail** — 36, 18 kg. L'ordre qui tient est celui **de chaque groupe** : le rang du tableau du profil 1 est celui du plan, pas de cet écran | |
| 03.9 | Chercher les trois pistes neuves | « Faire une sortie sur trois à **vélo à assistance électrique** » **en tête des loisirs** (7ᵉ ligne de l'écran) ; « Remplacer un de tes longs trajets en **autocar** par le train » et « Faire un de tes longs trajets en **autocar** plutôt qu'en voiture » en **5ᵉ et 6ᵉ place des voyages** | |
| 03.10 | Le libellé du poste du trajet — **dans l'export**, le seul endroit où ce profil le montre : « Toi » → « **Télécharger mes données** », champ `commute_poste_label` | « Trajet domicile-travail **(RER ou Transilien)** » — et **non** « (Train ou RER) », le libellé d'avant C4.4, qui portait le facteur du TER. À l'écran, le mode ne se lit que quand le trajet est le poste dominant (« en RER ou Transilien »), ce qui n'est pas le cas du profil 1 | |
| 03.11 | Toucher une **ligne simple** (rang 5 ou plus) | Elle s'ouvre **en carte**, avec son bouton. Les rangs disent l'insistance, jamais la permission | |
| 03.12 | Engager la piste du **vélo à assistance** (rang 4), en choisissant une échéance | Une fois engagée, un **premier pas** s'affiche sous l'action — une consigne pratique, **sans aucun chiffre**. Sous le gain : « **par an** · » puis l'échéance — « par an » d'abord, collé au chiffre qu'il qualifie | |

## Bloc 04 — Le compte : le code à huit chiffres

> **Le bloc le plus important de la séance.** Le chemin a changé le 20/09 : l'e-mail ne porte plus
> de lien mais un **code**, parce qu'un lien confirmait l'adresse d'un seul clic — donc n'importe
> qui recevant l'e-mail rattachait son adresse au compte d'un inconnu.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | « Toi » → « **Rattacher un compte** » → « **Utiliser un email à la place** » | En chemin, **l'écran intitulé « Garde ce résultat » ne doit plus exister** : c'est l'interposition retirée le 20/09, et s'il réapparaît c'est une régression. On passe par « Ton bilan, d'un appareil à l'autre » (Google, ou un email), puis on arrive sur le formulaire **« Rattacher mon adresse »** | |
| 04.2 | Saisir une adresse **qui n'a pas de compte Ramille**, puis « Recevoir un code » | On arrive sur l'écran de saisie du code, champ « **Code reçu par email** ». **Et cette phrase, avant la saisie** : « S'il existait déjà un compte Ramille à cette adresse, ce code t'y ramène — et le bilan de cet appareil ne l'y rejoindra pas. » Au **conditionnel** : à l'indicatif, elle redeviendrait l'oracle qu'on vient de fermer | |
| 04.3 | Le texte sous le champ | « **8 chiffres, sans espace. Il est vérifié dès le dernier chiffre.** » — le code part seul au huitième chiffre, et l'écran le dit désormais (`v1-29` §6.3, 27/09/2026) | |
| 04.4 | Ouvrir l'e-mail reçu | **Un code à huit chiffres**, et **aucun lien de confirmation**. S'il y a un lien cliquable qui confirme l'adresse, **c'est un écart de sécurité** et il faut l'écrire tel quel | |
| 04.5 | **Sans saisir le code**, quitter l'écran et aller sur « Toi », puis revenir | La reprise doit être possible : on doit pouvoir revenir saisir le code. Sans elle, une adresse reste en attente sans moyen de la confirmer | |
| 04.6 | Saisir un code **faux** (huit chiffres au hasard) | Un refus calme : « **Ce code ne marche pas : il a expiré, ou ce n'est pas le plus récent. Demande-en un nouveau.** » Il ne dit pas « faux », et il ne le peut pas : le serveur rend la même erreur pour un code faux et pour un code expiré | |
| 04.7 | Le champ après ce refus | **Il ne se vide pas.** On compare ses chiffres avec l'e-mail | |
| 04.8 | Attendre une minute, puis « Renvoyer un code » | Un nouvel e-mail arrive. **Le code précédent ne vaut plus** — le tester pour s'en assurer, le refus doit dire que ce n'est pas le plus récent | |
| 04.9 | Saisir le dernier code | Le compte est rattaché : on n'est plus en session anonyme, et le bilan du profil 1 **est toujours là** | |

## Bloc 05 — Les deux branches ne se distinguent pas

> Arbitrage du 21/09/2026. Avant, une adresse déjà prise menait à un écran qui le **disait** — donc
> n'importe qui pouvait savoir si une adresse a un compte Ramille. Mesuré : vingt sondages d'affilée,
> aucun plafond.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 05.1 | Dans le **navigateur B**, une fenêtre privée (aucune autre ouverte dans B), faire un bilan rapide (n'importe quel profil court), puis « Toi » → « Rattacher un compte » → « Utiliser un email à la place » | — | |
| 05.2 | Saisir **l'adresse du bloc 04**, celle qui a maintenant un compte | **Le même écran de code qu'au 04.2**, au mot près : même titre, même phrase conditionnelle, même bouton. **Aucune mention** que l'adresse a déjà un compte | |
| 05.3 | Comparer les deux écrans | Seule l'adresse affichée diffère — c'est celle qu'on a tapée. **Tout le reste doit être identique.** Un seul mot qui suivrait la branche rouvrirait par le texte la fuite fermée par le mécanisme | |
| 05.4 | Saisir le code reçu | Il ramène au **compte existant** (celui du bloc 04, avec son bilan à 2,5 t), et **non** à un compte neuf. Le bilan de cet appareil-ci ne l'a pas rejoint — c'est ce que la phrase du 04.2 annonçait | |

## Bloc 06 — Retrouver un compte depuis un navigateur neuf

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 06.1 | Fermer la fenêtre privée du bloc 05, en ouvrir une dans le **navigateur B**, puis depuis l'accueil de l'onboarding : « **J'ai déjà un compte** » | On arrive sur `/connexion/retrouver` | |
| 06.2 | Saisir une adresse **inconnue** | **Le même écran** qu'un envoi réussi. Si l'écran dit que l'adresse est inconnue, c'est un moyen de savoir qui utilise Ramille — **écart** | |
| 06.3 | Saisir l'adresse du bloc 04, puis le code reçu | Le compte revient **entier** : le bilan, le plan, l'action engagée au 03.12. C'est le seul chemin vers un compte existant depuis un appareil neuf | |

## Bloc 07 — `/contexte` : corriger sans resoumettre

> C6.4. Avant, « Modifier ces réponses » rouvrait le questionnaire entier et en sortir soumettait un
> bilan — alors que corriger « j'ai déménagé » ne change rien à ce qu'on déclare de ses trajets.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 07.1 | Depuis le plan, ouvrir l'encart de contexte puis « Modifier ces réponses » | Un écran **« Ton contexte de mobilité »** — et **non** le questionnaire. Quatre questions seulement | |
| 07.2 | Lire la phrase sur le calcul | Elle se dérive du profil. Pour ce profil (sorties déclarées), elle doit dire que ces réponses **n'entrent pas** dans le calcul du bilan | |
| 07.3 | Passer les véhicules du foyer de **1** à **0**, puis « Enregistrer » | On revient au plan, et l'encart de contexte dit **« pas de véhicule dans le foyer »**. Les dix pistes ne bougent pas — aucune d'elles ne suppose une voiture du foyer —, donc le recalcul ne se **voit** pas ici. Ce qui se voit : **aucun bilan de plus** dans le suivi, parce que recalculer n'est pas resoumettre | |
| 07.4 | Regarder le suivi | Toujours **un seul** bilan, à la date du bloc 02 | |
| 07.5 | Revenir au plan | **Aucun encart** : l'action engagée au 03.12 est toujours proposée, donc rien n'a été libéré. (Si une action l'était, l'encart parlerait de **contexte** et non de « nouveau bilan » — le cas n'arrive pas avec ce profil) | |

## Bloc 08 — Le re-bilan, « Toi », et les milliers

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 08.1 | « **Revoir mon bilan** » en bas du plan (ou le bilan depuis le suivi), puis « **Faire un nouveau bilan** », et avancer **jusqu'à la dernière étape**, puis « Voir mon bilan » | Une feuille : « **Ton plan va être recalculé** », puis la phrase de l'engagement en cours — une échéance ayant été choisie au 03.12 : « **L'action que tu suis — Faire une sortie sur trois à vélo à assistance électrique — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, elle ne sera plus engagée.** » —, puis en petit : « Rien ne presse : une habitude met du temps à prendre. Si tes trajets n'ont pas changé, ton bilan actuel est toujours juste. » Deux sorties : « **Soumettre mon bilan** » et « **Pas maintenant** » | |
| 08.2 | Le plan et le suivi, en cherchant une proposition de re-bilan | **Aucune carte de re-bilan**, ni sur le plan ni sur le suivi : le bilan a moins d'une saison, et la proposition ne vient qu'à la bascule (C6.3). Une carte qui dirait « Ton dernier bilan a moins d'un mois » est un écart | |
| 08.3 | « Pas maintenant ». Puis, dans le **navigateur B** (fermer la fenêtre du bloc 06 d'abord), une fenêtre privée sur `https://www.ramille.fr/compte` — une session anonyme, sans bilan, suffit | La page dit ce qu'un compte apporte **et ce que son absence coûte** : « Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs — si tu changes de téléphone ou si tu ne reviens pas pendant **trois mois**, ce bilan ne te suivra pas. » | |
| 08.4 | Le gain de la piste de rang 1, sur le plan du profil 1 | **« 1 601 kg »** avec un vrai espace entre le 1 et le 6 — jamais « 1601 kg ». **C'est le seul gain à quatre chiffres du parcours** | |
| 08.5 | Revenir sur le compte du profil 1 (**navigateur A**, la fenêtre du bloc 04) et **soumettre pour de bon un second bilan**, identique au premier sauf **2 vols courts sur 2** (donc aucun long-courrier) | La feuille du 08.1 s'ouvre de nouveau, avec la même phrase de l'engagement ; « Soumettre mon bilan ». Le suivi porte maintenant **deux** bilans — c'est ce qu'il faut au bloc 09 | |

## Bloc 09 — Retirer un bilan

> C4.7, décidé et livré le 27–28/09/2026 (`v1-22`). Un bilan faux — une distance saisie en mètres,
> un questionnaire rempli « pour voir » — restait pour toujours dans le suivi et devenait la base de
> comparaison du suivant. **Retirer n'efface rien** : le bilan disparaît du suivi et son chiffre ne
> s'affiche plus, mais il reste dans l'export des données. **Irréversible à l'écran** : on joue ce
> bloc sur le compte du profil 1, qui sera supprimé au bloc 14.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 09.1 | Ouvrir la restitution du **second** bilan (le plus récent) depuis le suivi | En bas, le lien **« Ce bilan ne me ressemble pas »** — un lien discret, jamais un bouton | |
| 09.2 | Le toucher | Il laisse place à un encart : **« Retirer ce bilan ? »**, puis « **Il n'apparaîtra plus dans ton suivi, et ton plan repartira de ton bilan précédent.** », puis — parce qu'une action est engagée, avec l'échéance du 03.12 — « **L'action que tu suis — Faire une sortie sur trois à vélo à assistance électrique — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, elle ne sera plus engagée.** » (la forme sans moment, « … reste engagée si ton nouveau plan la propose encore … », ne s'affiche que pour une action sans intention lisible). Deux sorties : « **Annuler** » et « **Retirer ce bilan** » | |
| 09.3 | « Annuler » | L'encart se referme, le lien revient. **Rien n'a été retiré** : le suivi porte toujours deux bilans | |
| 09.4 | Rouvrir, puis « **Retirer ce bilan** » | Le bouton dit « **Retrait…** » le temps de l'appel. Puis la page dit **« Ce bilan a été retiré. »** et « **Il n'apparaît plus dans ton suivi, et son chiffre ne s'affiche plus ici.** », avec « **Revenir à mon suivi** ». **Aucun chiffre** du bilan à l'écran | |
| 09.5 | Recharger la page (F5) | **Le même état « retiré »** — c'est l'adresse qui le dit, et plus le geste : c'est elle qui circule par les favoris et les partages | |
| 09.6 | « Revenir à mon suivi » | **Un seul** bilan dans l'historique, le premier | |
| 09.7 | Le plan | Il repart du premier bilan, dans cet ordre : **d'abord l'action engagée** (le vélo à assistance, « TON ENGAGEMENT » — elle est encore proposée, donc reposée), **puis** le vol long-courrier à « − 1 601 kg CO₂e », puis « **Voir toutes les pistes · 10** ». **Aucun encart** qui annonce que le plan a changé — c'est un geste choisi, qu'on ne raconte pas après coup (D2) | |
| 09.8 | Ouvrir la restitution du **premier** bilan, puis « Ce bilan ne me ressemble pas » | Le corps a changé : « **C'est ton seul bilan : il n'apparaîtra plus dans ton suivi, et tu repartiras d'un nouveau bilan.** » — et **aucune phrase sur le plan ni sur l'action** : il n'y a plus de plan à reconstruire | |
| 09.9 | « Retirer ce bilan » | On rejoint **l'onboarding** (ou la reprise d'un questionnaire commencé, s'il y en avait un) | |
| 09.10 | Couper le réseau (outils de développement → « Offline »), recharger `https://www.ramille.fr/` | **L'onboarding**, et non « ton plan t'attend » ni un plan : la marque locale qui autorisait cette phrase hors ligne a été effacée avec le dernier bilan. Remettre le réseau | |

## Bloc 10 — Qui sort « rarement »

> Le résiduel des sorties rares (`v1-29` §6.3, 25 et 27/09/2026) : la personne a dit ne presque
> jamais sortir, et le calcul **suppose** tout de même des sorties. Tout ce qui les nommait
> « loisirs du week-end » parlait de sorties qu'elle n'a pas déclarées. Ce bloc joue aussi deux
> défauts d'enchaînement du plan trouvés le 27/09 : la carte « Ton premier plan » et celle des deux
> lieux qui s'empilaient, et une légende du suivi qui affirmait un plan qu'elle ne lisait pas.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 10.1 | **Navigateur B**, toutes ses fenêtres privées fermées, puis une neuve. Onboarding, puis saisir le **profil 2** | Après « Rarement — une fois par mois ou moins », les questions du détail des sorties **ne s'affichent pas** | |
| 10.2 | La restitution | Le poste dominant s'appelle **« Tes loisirs occasionnels »**, et sa barre de répartition **« Loisirs occasionnels »** — jamais « loisirs du week-end ». Le texte commence par **« Tu es déjà sous le repère transport 2050. »**, et **ne propose aucune marche** : pas de « S'il te reste de l'envie… » sur des sorties qu'on n'a pas déclarées | |
| 10.3 | Rejoindre le plan | **Aucune action.** La carte de félicitation dit **« Tu es déjà sous le repère 2050. »** Et **pas** de carte « Ton premier plan » : il n'y a rien à choisir | |
| 10.4 | La barre d'onglets | **Elle est là**, avec la carte **« Deux endroits, pas plus. »** — un plan à zéro action referme le premier parcours. **Ne pas toucher « Compris »** : la ligne 10.7 en a besoin | |
| 10.5 | Le suivi | L'entrée du bilan dit **« Poste principal : Loisirs occasionnels »**, et la ligne d'horizon **« Tu es déjà sous le repère transport 2050. »** | |
| 10.6 | « **Revoir mon bilan** » en bas du plan, puis « **Faire un nouveau bilan** » : tout pareil, sauf le mode du trajet → **Voiture (seul)** → **Thermique** | La restitution dit **570 kg** environ (569,9 mesuré), et le poste dominant devient le trajet domicile-travail | |
| 10.7 | Le plan | **Une seule** carte d'ouverture : **« TON PREMIER PLAN » — « Une action pour l'automne. »**, et **pas** « Deux endroits, pas plus. » par-dessus ou dessous. Jusqu'au 27/09, les deux s'empilaient sur ce chemin précis. Puis **les deux cartes** (métro ou tram, train), « **Voir toutes les pistes · 4** », et le cap **« − 102 kg »** avec « **Chacune des deux pistes proposées suffit à le franchir.** » (199 et 165 kg, tous deux au-dessus de 102) | |
| 10.8 | « Compris » sur « Ton premier plan » | **Alors seulement** la carte « Deux endroits, pas plus. » apparaît : celle qui attend son tour se rend dès que la précédente est refermée | |
| 10.9 | Le suivi : l'écart par poste, sous les deux bilans | Sous les barres, la légende : « Contour : bilan précédent · plein : ce bilan · accent : **ton trajet domicile-travail, ton poste principal** ». **Jamais « le poste sur lequel ton plan travaille »** — la légende ne lit pas le plan, et un plan à zéro action ne travaille sur rien (corrigé le 27/09/2026). L'entrée du premier bilan dit toujours « Poste principal : Loisirs occasionnels » | |
| 10.10 | **Garder ce profil pour le bloc 12** : depuis « Toi », rattacher un compte avec **une seconde adresse** (le code, comme au bloc 04). **Puis, toujours sur « Toi », régler les rappels sur « Aucun »** | Le compte est rattaché. Sans ça, fermer la fenêtre privée perdrait la session, et le bloc 12 n'aurait personne à interroger. Les rappels sur « Aucun » : sans ça, un **vrai** rappel partirait vers cette adresse dans les quatre jours qui suivent le 1er octobre (`RECETTE.md` §2.3) — le point, lui, se génère quel que soit le canal | |

## Bloc 11 — La page de confidentialité

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 11.1 | Ouvrir `https://www.ramille.fr/confidentialite` | « **Dernière mise à jour : 27 septembre 2026** » — la date est écrite en dur dans la page, posée le jour de la fusion de C4.7. Une autre date est un écart à consigner tel quel | |
| 11.2 | Chercher ce que le rappel fait sortir vers les prestataires d'envoi | La page dit que le rappel envoie **la question du point** — qui peut nommer le mode, l'action choisie et les jours fixés. **Et non plus** qu'il n'envoie que le nom du poste, « la seule chose issue de ton bilan » : c'était l'état d'avant le lot 2, corrigé le 27/09/2026 | |
| 11.3 | Dans « Combien de temps nous les gardons » | Une puce **« Bilan retiré »** : « un bilan que tu retires n'apparaît plus dans ton suivi, mais il reste conservé — et dans l'export de tes données — jusqu'à la suppression de ton compte, ou de ta session anonyme si tu n'as pas créé de compte. » Sans elle, « retirer » se lirait « effacer » | |
| 11.4 | Juste en dessous | Une puce qui dit ce qui reste **après** une suppression : « **Après une suppression, il ne reste que des compteurs, sans aucun identifiant.** », puis ce qu'ils retiennent — pour une session anonyme supprimée automatiquement, sa semaine d'arrivée, jusqu'où elle était allée, combien de semaines elle avait duré, où en étaient ses rappels ; pour une suppression de compte, un au compteur du mois — et « **gardés sans limite de durée** » (lot 6, décidé le 27/09/2026) | |

## Bloc 12 — À partir du 1er octobre : la question mensuelle de qui sort rarement

> Arbitrage du 27/09/2026 (`20260927191009`, #281). Qui sort rarement recevait chaque mois une
> question sur **ses sorties du week-end** — le résiduel qu'il n'a pas déclaré — et jamais une
> question sur le voyage qu'il a, lui, déclaré. Le point mensuel se génère **le 1er du mois à 6 h
> UTC** (8 h à Paris) et interroge le mois **écoulé**.
>
> **Ce bloc impose une date à toute la séance** : le profil 2 doit exister **avant le 1er octobre à
> 6 h UTC**. Créé plus tard, son premier point arrive le 1er novembre et nomme **octobre** — les
> lignes ci-dessous seraient à relire avec ce mois-là. La séance se joue donc entre la fusion de
> C4.7 et le 30 septembre.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 12.1 | **Le 1er octobre après 8 h**, ouvrir le plan du profil 2 (se reconnecter avec la seconde adresse du 10.10 si besoin) | Un point : **« En septembre, as-tu changé de mode de transport pour tes voyages ? »** — **« tes voyages »**, jamais « tes sorties du week-end ». Et le troisième choix nomme le même poste et le même mois : **« Pas de voyage en septembre »** | |
| 12.2 | Les deux boutons « Oui » et « Non » | **Le même poids visuel** : ni l'un vert plein et l'autre gris, ni l'un plus grand (`v1-29`, décision n° 2). Le troisième choix reste un lien | |
| 12.3 | Répondre **« Pas de voyage en septembre »** | Une réplique calme de Ramille, qui parle de **voyage** — jamais de sortie | |

## Bloc 13 — Ce qui ne se joue pas ici

À ne **pas** tenter dans cette séance, et à ne pas consigner comme écart :

- **les notifications push** et les liens profonds `ramille://` — ils demandent l'appareil, et vivent
  en `v1-13` §11 ;
- **le rappel par e-mail et sa désinscription** — le cron tourne à 7 h UTC, et la séance du
  14/09/2026 les a déjà parcourus ;
- **TalkBack et l'accessibilité** — `v1-13` §11.1, §11.4 et §11.20 (le focus de la confirmation
  du retrait) ;
- **la teinte sous le doigt et les cibles de 48** — `v1-29` §6.5, sur appareil.

## Bloc 14 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 14.1 | Dans le **navigateur A**, supprimer le compte du profil 1, depuis « Toi » ou `https://www.ramille.fr/compte/suppression` (se reconnecter par « J'ai déjà un compte » si la fenêtre a été fermée) | La suppression aboutit, et la page ne prétend pas avoir supprimé quelque chose quand la session est une session anonyme vide | |
| 14.2 | Vérifier qu'on ne peut plus retrouver ce compte : `/connexion/retrouver`, son adresse | L'écran, lui, ne peut rien dire — il est le même que l'adresse ait un compte ou non, et c'est voulu. **Le seul observable est la boîte de réception : aucun e-mail n'arrive**, parce que l'envoi ne crée jamais de compte (`shouldCreateUser: false`) | |
| 14.3 | **Après le bloc 12**, supprimer le compte du profil 2 de la même façon | — | |

## Ce que cette séance ne prouve pas

- **Rien de natif** : ni la notification, ni TalkBack, ni le retour matériel Android depuis la
  confirmation du retrait — `v1-13` §11.
- **Les écrans anciens** que ni la CI ni cette feuille ne regardent : le pari est écrit en tête.
- **Le retrait d'un bilan qui ne porte pas le plan** (un bilan plus ancien quand un plus récent
  existe) : la feuille ne le joue pas, `34_retirer_un_bilan.test.sql` le tient.
- **Le mot de la veille** (C4.2) : décidé le 27/09/2026, pas encore livré au moment d'écrire.
- **Les agrégats de cohortes** du lot 6, livrés avec C4.7 : la séance lit la phrase de la page
  (11.4), mais rien ne se compte avant qu'une purge ne supprime quelqu'un — début décembre 2026 au
  plus tôt (`docs/exploitation/README.md` §8.5 bis).

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle des
§12, §13 et §14 : ce que la séance a trouvé, **une issue par constat**, et l'accrochage à une vague.
Et les lignes de §11 **et de §11.W** — cette séance joue §11.W.2, W.6, W.7, W.8 et W.9 — qui
auraient été jouées le disent **en tête de leur case**.

Un constat n'est pas toujours un correctif : la ligne 02.10 part vraisemblablement en **brief de
design** si la réponse est « oui, c'est pénible ». **Et elle ne referme pas §11.19**, qui demande un
jugement « au doigt, sur un vrai téléphone » : un jugement rendu à la souris s'y consigne comme un
premier avis, pas comme la réponse. C'est une destination légitime, et elle se note
comme telle (`RECETTE.md` §2.4).
