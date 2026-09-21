# Recette web — le compte, le contexte et les modes manquants

> **Écrit le 21/09/2026.** **Jouée le : ………**
>
> À jouer **dans un navigateur**, sur `https://www.ramille.fr`. Aucun build EAS n'est disponible
> avant le 1er octobre (quota du plan gratuit, registre d'exploitation §3.3), et rien de ce qui est
> listé ici n'a besoin de natif — sauf ce qui est explicitement renvoyé à `v1-13` §11.

## Pourquoi cette séance, et ce qu'elle ne fait pas

**Elle ne rejoue pas le premier parcours.** La séance du 18/09/2026 l'a joué (`v1-13` §14), et
depuis le 20/09 la CI le rejoue à chaque PR sur deux profils
(`scripts/verifier-parcours-reel.mjs`). **On part donc du principe qu'il n'y a pas de régression**,
et on ne regarde que **ce qui a été livré depuis le 18/09/2026**.

C'est un choix, et il a un prix qu'il vaut mieux écrire : si une régression est arrivée sur un
écran ancien que ni la CI ni cette feuille ne regardent, cette séance ne la trouvera pas. Le pari
est que les gardes automatiques couvrent le chemin nominal, et que le temps humain vaut mieux sur
ce qui n'a **jamais** été parcouru à la main.

Cinq sujets, dans l'ordre où ils se jouent :

| | Sujet | D'où ça vient |
|---|---|---|
| 1 | Les trois questions neuves du questionnaire, et la densité de l'écran du mode | C4.4 ([#257](https://github.com/ScratchMe/Ramille/pull/257)) |
| 2 | Le bilan et le plan : les chiffres et les deux gabarits neufs | C4.4 |
| 3 | **Le compte : le code à huit chiffres, et les deux branches indistinguables** | [#252](https://github.com/ScratchMe/Ramille/pull/252), [#253](https://github.com/ScratchMe/Ramille/pull/253), [#255](https://github.com/ScratchMe/Ramille/pull/255) |
| 4 | `/contexte` : corriger quatre réponses sans resoumettre de bilan | C6.4 ([#240](https://github.com/ScratchMe/Ramille/pull/240)) |
| 5 | Le re-bilan, « Toi », et le séparateur des milliers | [#237](https://github.com/ScratchMe/Ramille/pull/237), [#238](https://github.com/ScratchMe/Ramille/pull/238), [#256](https://github.com/ScratchMe/Ramille/pull/256) |

**Le sujet 3 est le plus important**, et c'est celui par lequel il ne faut pas finir si le temps
manque : le chemin du compte a entièrement changé le 20/09 (l'e-mail ne porte plus de lien mais un
code), il ferme une faille de sécurité mesurée, et **il n'a jamais été parcouru à la main**. Un
script le joue à chaque PR contre une stack locale ; personne ne l'a encore fait sur la production,
avec une vraie messagerie.

## Trois précautions qui décident du résultat

- **C'est la production.** Les comptes créés sont réels et les e-mails partent vraiment. Prévoir
  **une adresse e-mail qu'on relève facilement**, et supprimer les comptes à la fin (bloc 09).
- **Une fenêtre de navigation privée neuve par bloc qui le demande.** Le produit pose des marques
  en stockage local, et une fenêtre déjà utilisée fausse les blocs 03 et 05.
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

## Le profil à saisir, et les chiffres qu'il rend

**Mesuré en base le 21/09/2026**, bilan calculé puis plan estimé dans une transaction annulée — pas
calculé de tête. Le saisir **à la lettre**, sinon les chiffres ci-dessous ne sont comparables à
rien.

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
| Vols | **2** au total, dont **1** court ou moyen-courrier (donc **un long-courrier**) |
| Longs trajets en train | **0** |
| Longs trajets en autocar | **2** |
| Longs trajets en voiture | **2** → **Thermique** → **À deux** |
| Zone | **Périurbain** |
| Transports en commun | **Limité** |
| Véhicules du foyer | **1** |
| Télétravail | **Deux jours ou plus** |

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

Et **dix pistes**, dans cet ordre :

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

**Le vol long-courrier n'est pas décoratif** : son gain est le **seul nombre à quatre chiffres** de
tout le parcours, donc le seul endroit où le séparateur des milliers se regarde (bloc 07.4). Les
totaux, eux, basculent en tonnes avant d'atteindre le millier et n'en portent jamais.

**Ce qui doit tenir quoi qu'il arrive**, et ce qui peut bouger légitimement :

- **tient** : la **forme** (dix pistes, deux cartes pleines puis deux estompées derrière un lien
  qui dit combien, puis des lignes), l'**ordre** ci-dessus, la **présence** des trois lignes en gras
  (ce sont les gabarits neufs), et le libellé du poste « Trajet domicile-travail **(RER ou
  Transilien)** » ;
- **peut bouger** : les **kilogrammes**. Les facteurs ADEME se resynchronisent chaque trimestre
  (`sync_emission_factors`), donc un chiffre qui a glissé de quelques unités n'est pas un écart. Un
  chiffre qui **double**, ou un rang qui change, en est un.
- **dépend du jour** : la saison nommée par la carte du cap (automne jusqu'au 30 novembre inclus).

---

## Bloc 00 — Avant de commencer

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Ouvrir `https://www.ramille.fr/status` dans une fenêtre **normale** | Sous « Connexion Supabase », **« OK — N modes de transport en base »**. Autre chose qu'un « OK » : **arrêter là**, le défaut est côté configuration et la suite ne prouverait rien | |
| 00.2 | Relever **N**, le nombre de modes | **24** — relevé sur le distant le 21/09/2026, après C4.4 qui en a ajouté cinq. Un nombre plus bas veut dire que la production ne porte pas la migration, et **tous les blocs 01 et 02 tomberaient** pour cette seule raison, sans rien prouver du produit. C'est aussi le seul chiffre de cette feuille qui peut **monter** légitimement, si un mode est ajouté après cette date | |
| 00.3 | Noter le commit servi, et le comparer à `main` | Le site suit `main`. **Ne pas figer de valeur ici** : la feuille s'en figeait une le 18/09 et la séance l'a trouvée périmée alors que le site était simplement en avance | |
| 00.4 | Ouvrir une fenêtre de **navigation privée** neuve | — | |

## Bloc 01 — Les trois questions neuves du questionnaire

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | Traverser l'onboarding, puis saisir le profil ci-dessus jusqu'à l'étape du mode | — | |
| 01.2 | Choisir **Train** à l'étape du mode | Un encart s'ouvre **sous la ligne « Train »**, à l'intérieur de la liste et non après : « **Quel type de train ?** », trois réponses en rangées — **TER ou train régional**, **RER ou Transilien**, **Intercités**. Tant qu'aucune n'est choisie, « Suivant » reste inactif | |
| 01.3 | Choisir **RER ou Transilien**, puis « Suivant » | — | |
| 01.4 | À l'étape du second mode, répondre **Oui** puis choisir **Vélo** | Un encart « **Quel type de vélo ?** » s'ouvre sous « Vélo », deux réponses : **Mécanique**, **À assistance électrique**. La **trottinette** n'en a pas, et c'est voulu | |
| 01.5 | Choisir **À assistance électrique**, puis la part **Un quart** | — | |
| 01.6 | À l'étape des longs trajets | **Trois** compteurs et non deux : « En train », « **En autocar** », « En voiture ». Sous l'autocar, **aucune** question de motorisation ni de remplissage — on ne choisit pas le véhicule d'un autocar | |
| 01.7 | **L'écran du mode : est-ce devenu pénible ?** Y revenir par le bouton Retour et le remplir une seconde fois, délibérément | **Ce n'est pas une conformité, c'est un jugement à rendre** (`v1-13` §11.19). Cinq des neuf entrées ouvrent désormais une sous-question — « Voiture (seul) », « Voiture (covoiturage) » qui en ouvre deux, « Deux-roues motorisé », « Train », « Vélo ». Trois choses à regarder : (a) l'encart reste-t-il dans le champ de vision après la sélection, sans le chercher ; (b) comprend-on qu'il reste quelque chose à faire quand « Suivant » est grisé ; (c) changer d'avis sur le mode donne-t-il l'impression de tout recommencer. **Répondre même si tout est conforme** — une ligne muette se lira « non joué ». Si c'est pénible, la suite est un **brief de design**, pas un correctif | |
| 01.8 | Finir le questionnaire et soumettre | — | |

## Bloc 02 — Le bilan et le plan

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | Le total sur la restitution | **2,5 t** (2 453,7 kg mesuré, affiché au dixième de tonne). Un écart de quelques kilos est légitime — les facteurs se resynchronisent ; un total qui change de tonne ne l'est pas | |
| 02.2 | La répartition par poste | L'**autocar** y figure et n'est pas à zéro (52,6 kg mesuré). Avant C4.4, deux trajets en car comptaient pour **rien** | |
| 02.3 | Rejoindre le plan, puis toucher **« Voir toutes les pistes · 10 »** | Le compte est **dans** le libellé : un lien qui ne dit pas combien il cache n'aide pas à décider de l'ouvrir. On arrive sur l'écran des pistes, avec les **dix** dans l'ordre du tableau ci-dessus | |
| 02.4 | Chercher les trois pistes neuves | « Faire une sortie sur trois à **vélo à assistance électrique** » au rang **4** ; « Remplacer un de tes longs trajets en **autocar** par le train » et « Faire un de tes longs trajets en **autocar** plutôt qu'en voiture » aux rangs **8** et **9**. Aucune des trois n'existait avant le 21/09 | |
| 02.5 | Le libellé du poste du trajet | « Trajet domicile-travail **(RER ou Transilien)** » — et **non** « (Train ou RER) », qui était le libellé d'avant C4.4 et portait le facteur du TER | |
| 02.6 | Toucher une **ligne simple** (rang 5 ou plus, donc une des trois neuves) | Elle s'ouvre **en carte**, avec son bouton. Les trois rangs disent l'insistance, jamais la permission | |
| 02.7 | Engager la piste du **vélo à assistance** (rang 4), en choisissant une échéance | Une fois engagée, un **premier pas** s'affiche sous l'action — une consigne pratique, **sans aucun chiffre** | |

## Bloc 03 — Le compte : le code à huit chiffres

> **Le bloc le plus important de la séance.** Le chemin a changé le 20/09 : l'e-mail ne porte plus
> de lien mais un **code**, parce qu'un lien confirmait l'adresse d'un seul clic — donc n'importe
> qui recevant l'e-mail rattachait son adresse au compte d'un inconnu.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 03.1 | Depuis la restitution, aller vers la création de compte | **L'écran intitulé « Garde ce résultat » ne doit plus exister.** C'est l'interposition retirée le 20/09 : son titre promettait de protéger quelque chose qui est en base depuis toujours, et son bloc « Ce qui est déjà enregistré » répétait l'écran qu'on venait de quitter. S'il réapparaît, c'est une régression. On doit arriver sur le formulaire d'adresse | |
| 03.2 | Saisir une adresse **qui n'a pas de compte Ramille**, puis « Recevoir un code » | On arrive sur l'écran de saisie du code, champ « **Code reçu par email** ». **Et cette phrase, avant la saisie** : « S'il existait déjà un compte Ramille à cette adresse, ce code t'y ramène — et le bilan de cet appareil ne l'y rejoindra pas. » Au **conditionnel** : à l'indicatif, elle redeviendrait l'oracle qu'on vient de fermer | |
| 03.3 | Ouvrir l'e-mail reçu | **Un code à huit chiffres**, et **aucun lien de confirmation**. S'il y a un lien cliquable qui confirme l'adresse, **c'est un écart de sécurité** et il faut l'écrire tel quel | |
| 03.4 | **Sans saisir le code**, quitter l'écran et aller sur « Toi », puis revenir | La reprise doit être possible : on doit pouvoir revenir saisir le code. Sans elle, une adresse reste en attente sans moyen de la confirmer — un cul-de-sac | |
| 03.5 | Saisir un code **faux** (huit chiffres au hasard) | Un refus **calme**, qui nomme les deux causes possibles (code faux **ou** expiré) et donne le même geste. Ne pas inventer une distinction : le serveur rend la même erreur dans les deux cas | |
| 03.6 | Le champ après ce refus | **Il ne se vide pas.** On compare ses chiffres avec l'e-mail ; le vider forcerait à tout retaper | |
| 03.7 | Attendre une minute, puis « Renvoyer un code » | Un nouvel e-mail arrive. **Le code précédent ne vaut plus** — le tester pour s'en assurer, le refus doit dire que ce n'est pas le plus récent | |
| 03.8 | Saisir le dernier code | Le compte est rattaché : on n'est plus en session anonyme, et le bilan saisi au bloc 01 **est toujours là** | |

## Bloc 04 — Les deux branches ne se distinguent pas

> Arbitrage du 21/09/2026. Avant, une adresse déjà prise menait à un écran qui le **disait** — donc
> n'importe qui pouvait savoir si une adresse a un compte Ramille. Mesuré : vingt sondages d'affilée,
> aucun plafond.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | Ouvrir une **fenêtre privée neuve**, faire un bilan rapide (n'importe quel profil court), puis aller vers la création de compte | — | |
| 04.2 | Saisir **l'adresse du bloc 03**, celle qui a maintenant un compte | **Le même écran de code qu'au 03.2**, au mot près : même titre, même phrase conditionnelle, même bouton. **Aucune mention** que l'adresse a déjà un compte | |
| 04.3 | Comparer les deux écrans | Seule l'adresse affichée diffère — c'est celle qu'on a tapée, pas une réponse du serveur. **Tout le reste doit être identique.** Un seul mot qui suivrait la branche rouvrirait par le texte la fuite fermée par le mécanisme | |
| 04.4 | Saisir le code reçu | Il ramène au **compte existant** (celui du bloc 03, avec son bilan à 2,5 t), et **non** à un compte neuf. Le bilan de cet appareil-ci ne l'a pas rejoint — c'est ce que la phrase du 03.2 annonçait | |

## Bloc 05 — Retrouver un compte depuis un navigateur neuf

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 05.1 | Fenêtre privée neuve, puis depuis l'accueil de l'onboarding : « **J'ai déjà un compte** » | On arrive sur `/connexion/retrouver` | |
| 05.2 | Saisir une adresse **inconnue** | **Le même écran** qu'un envoi réussi. Si l'écran dit que l'adresse est inconnue, c'est un moyen de savoir qui utilise Ramille — **écart** | |
| 05.3 | Saisir l'adresse du bloc 03, puis le code reçu | Le compte revient **entier** : le bilan, le plan, l'action engagée au 02.7. C'est le seul chemin vers un compte existant depuis un appareil neuf | |

## Bloc 06 — `/contexte` : corriger sans resoumettre

> C6.4. Avant, « Modifier ces réponses » rouvrait le questionnaire entier et en sortir soumettait un
> bilan — alors que corriger « j'ai déménagé » ne change rien à ce qu'on déclare de ses trajets.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 06.1 | Depuis le plan, ouvrir l'encart de contexte puis « Modifier ces réponses » | Un écran **« Ton contexte de mobilité »** — et **non** le questionnaire. Quatre questions seulement | |
| 06.2 | Lire la phrase sur le calcul | Elle se dérive du profil. Pour ce profil (sorties déclarées), elle doit dire que ces réponses **n'entrent pas** dans le calcul du bilan | |
| 06.3 | Passer les véhicules du foyer de **1** à **0**, puis « Enregistrer » | On revient au plan, **recalculé**. Et **aucun bilan de plus** dans le suivi : recalculer n'est pas resoumettre | |
| 06.4 | Regarder le suivi | Toujours **un seul** bilan, à la date du bloc 01 | |
| 06.5 | Revenir au plan | Si l'action engagée au 02.7 a été libérée, un **encart** le dit, avec une phrase qui parle de **contexte** et non de « nouveau bilan » — il n'y a pas eu de bilan | |

## Bloc 07 — Le re-bilan, « Toi », et les milliers

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 07.1 | Depuis le suivi, lancer un nouveau bilan | Une feuille : « **Ton plan va être recalculé** », puis une phrase sur l'engagement en cours, puis en petit : « Rien ne presse : une habitude met du temps à prendre. Si tes trajets n'ont pas changé, ton bilan actuel est toujours juste. » Deux sorties : « **Soumettre mon bilan** » et « **Pas maintenant** » | |
| 07.2 | Le titre de la proposition de re-bilan | Il dépend du régime. Un bilan de **moins d'un mois** ne doit pas se voir dire « Ton dernier bilan a moins d'un mois » sous un titre qui prétend qu'une saison a passé — c'est le défaut corrigé par C6.3 | |
| 07.3 | « Pas maintenant », puis ouvrir « Toi » **en étant déconnecté** (fenêtre privée, bilan local) | La page dit ce qu'un compte apporte **et ce que son absence coûte** : « Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs — si tu changes de téléphone ou si tu ne reviens pas pendant **trois mois**, ce bilan ne te suivra pas. » | |
| 07.4 | Le gain de la piste de rang 1, sur le plan | **« 1 601 kg »** avec un vrai espace entre le 1 et le 6 — jamais « 1601 kg ». **C'est le seul nombre à quatre chiffres du parcours** : les totaux basculent en tonnes avant le millier, donc seuls les **gains** et le **cap** peuvent en porter un. Le correctif du 19/09 a remplacé une espace fine (U+202F, qui vaut un demi-pixel dans la police du produit et se lisait « 1601 ») par une espace insécable ordinaire (U+00A0, un sixième de cadratin). C'est exactement l'écart que la séance du 18/09 avait relevé en 05.3 | |

## Bloc 08 — Ce qui ne se joue pas ici

À ne **pas** tenter dans cette séance, et à ne pas consigner comme écart :

- **les notifications push** et les liens profonds `ramille://` — ils demandent l'appareil, et vivent
  en `v1-13` §11 ;
- **le rappel par e-mail et sa désinscription** — le cron tourne à 7 h UTC, et la séance du
  14/09/2026 les a déjà parcourus ;
- **TalkBack et l'accessibilité** — `v1-13` §11.1 et §11.4.

## Bloc 09 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 09.1 | Supprimer les comptes créés, depuis « Toi » ou `https://www.ramille.fr/compte/suppression` | La suppression aboutit, et la page ne prétend pas avoir supprimé quelque chose quand la session est une session anonyme vide | |
| 09.2 | Vérifier qu'on ne peut plus retrouver le compte avec son adresse | `/connexion/retrouver` répond **comme pour une adresse inconnue** — c'est-à-dire le même écran que pour un envoi réussi | |

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle des
§12, §13 et §14 : ce que la séance a trouvé, **une issue par constat**, et l'accrochage à une vague.
Et les lignes de §11 qui auraient été jouées le disent **en tête de leur case**.

Un constat n'est pas toujours un correctif : la ligne 01.7 part vraisemblablement en **brief de
design** si la réponse est « oui, c'est pénible ». C'est une destination légitime, et elle se note
comme telle (`RECETTE.md` §2.4).
