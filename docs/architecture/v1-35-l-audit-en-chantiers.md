# v1-35 — Ce que l'audit du 18/10/2026 laisse, mis en chantiers

> **Écrit le 22/10/2026**, sur les réponses de la personne qui pilote à ce qui restait de l'audit du
> 18/10/2026 (`v1-27` §12.41, compte rendu de la PR de l'audit). Ce document est le **plan** : une étape
> par PR, et après chacune la personne qui pilote dit si l'on continue. Il se tient à jour étape par
> étape ; ce qui a été livré se lit dans la colonne « État ».

## 1. Ce que la personne qui pilote a répondu, le 22/10/2026

- **Le chiffre de référence reste celui de 2017** (9,5 t, SDES). Elle se souvenait de la raison : seule la
  décomposition de 2017 donne le détail par poste, et le total affiché est la somme des postes.
  Revérifié le même jour : rien de mieux qu'une ventilation de 2018 dans une publication de l'INSEE
  (`src/constants/carbon-reference.ts`, « Pourquoi pas 8,2 t »).
- **Le périmètre du bilan** : la seconde partie du questionnaire devait couvrir les loisirs **de la
  semaine et du week-end**, tout ensemble. Reste à choisir entre des libellés qui le disent clairement et
  une étape de saisie de plus — et dans ce cas, la distinction doit être vraiment claire, sinon elle
  ajoute de la confusion (étape 3).
- **Le progrès visible : d'accord, à faire** (étape 6).
- **Le web et l'iPhone : d'accord** — le compte comme condition des rappels sur le web, la purge des
  sessions anonymes à 120 jours (étape 4) —, **et une page de présentation à la racine du site**, plutôt
  que de tomber sur l'onboarding : l'équivalent de la fiche Play, qui donne envie, avec le film de
  présentation (étape 5).
- Ce qui revient à la personne qui pilote hors du dépôt (compte Play, testeurs, marque, pixel de Brevo,
  second administrateur, DNS, réglages de Supabase et de Vercel, permissions de l'agent, recette sur
  téléphone) se fera **plus tard**, par elle ; ce plan ne l'attend pas.

## 2. Les étapes

| # | Étape | Une question d'abord ? | Ce qu'elle touche | État |
|---|---|---|---|---|
| 1 | **Correctifs sans décision** : le jeton de notification ne part plus chez Expo sans la notification choisie ; les refus de plafond (engagements, bilans) disent « Réessaie demain » au lieu de « Réessaie dans un instant » | Non | Client, page de confidentialité, registres | **Livrée le 22/10/2026** (#382). Trois contre-lectures ont trouvé de vrais défauts dans la logique du jeton, tous corrigés : la garde du retour, la reprise avant la désactivation, la marque du jeton qui appartient à l'appareil (`FRONT-SESSION.md` §2.7) |
| 2 | **Mentions légales et conservation** : écran des licences, âge minimum, mentions légales, durée de conservation des adresses IP de session, journal d'audit d'Auth après suppression | Deux, posées en chemin : **aucun âge** dans les conditions, et l'**adresse IP d'une session effacée après 90 jours** sans servir (tranchées le 22/10/2026) | Écran neuf, conditions, migration, page de confidentialité, registre | **Livrée le 22/10/2026** (#384). Les mentions légales étaient déjà justes (audit du 18/10/2026) ; le journal d'Auth est vide sur la production (registre, E7). L'écran des licences ne couvre pas les dépendances Gradle (§3) |
| 3 | **Le périmètre du bilan** | Oui : libellés élargis sur une étape, ou deux étapes. **Tranchée le 22/10/2026 : une étape**, des libellés qui disent la semaine et le week-end, et une cinquième réponse, « Presque tous les jours » (5 sorties par semaine). La question : « À quelle fréquence fais-tu des trajets pour tes loisirs, le week-end comme en semaine ? » — l'ordre inversé après coup, pour ne pas couper « week-end » au milieu (`FRONT-QUESTIONNAIRE.md`). Le poste s'appelle « Loisirs » | Questionnaire, calcul, méthodologie, kit, recettes (`v1-13` §11.39) | **Livrée le 22/10/2026** (#386). Migration `20261022201848`, appliquée en production avant la fusion ; test `60`. Le kit suit ; le film, non diffusé, attend l'étape 5 (§4) |
| 4 | **Le web et l'iPhone** : le compte comme condition des rappels sur le web ; la purge des sessions anonymes à 120 jours | Une, posée en chemin le 23/10/2026 : **une feuille, une seule fois**, au premier engagement sur le web sans compte — « Sur le web, je ne peux te faire signe que par email. Rattache ton adresse pour recevoir le rappel. » (« Rattacher mon adresse », « Plus tard ») ; pas chez qui a déjà choisi « Sans rappel » | Feuille des rappels, migration, registre, confidentialité, conditions | **Livrée le 23/10/2026** (#387). Migration `20261023174656` (purge), appliquée en production avant la fusion ; test `61` ; recette web `v1-13` §11.W.10 |
| 5 | **La page d'accueil du web**, avec le film | Quatre, **tranchées le 23/10/2026** : qui revient avec un bilan ou un questionnaire en cours **va directement à son plan** ; « Pas de série » **reste** à côté de « Deuxième semaine de suite… », qui ne se dit qu'une fois et ne compte rien — à rouvrir à l'étape 6a ; **sous le film, une ligne** : « Sur Android, Ramille te fait signe par notification ; sur le web, par email. » ; et, posée en chemin sur la contre-lecture, **depuis la page d'accueil l'onboarding s'ouvre à sa deuxième page** (« 9,5 tonnes en moyenne, 2 tonnes visées en 2050 »), la première redisant la page d'accueil | Racine du web, session ouverte au geste, mesure, onboarding, film (loisirs et écran du plan repris, `public/film/`), confidentialité, recette web (`v1-13` §11.W.11) | **Livrée le 23/10/2026** (#388). Migration `20261023233954` (la porte `accueil`), appliquée en production avant la fusion ; test `62` ; recette web `v1-13` §11.W.11 |
| 6a | **Le progrès visible : le chiffre** | Oui : un « oui » ne dit pas combien de fois, et `v1-23` §3.2 refuse un second chiffre concurrent du bilan. **Tranchée le 24/10/2026 : des kilos de CO₂ évités, comptés « au moins une fois »** — un « oui » compte la plus petite chose qu'il veut dire, un seul trajet, donc le chiffre est toujours vrai et le prochain bilan ne le dément jamais ; une ligne après chaque « oui », un total pour la saison, séparés du bilan. Deux autres, posées en chemin sur la contre-lecture et **tranchées le même jour** : la ligne du « oui » **reste sous la réplique de Ramille**, exception écrite à la règle de la mascotte (`FRONT-MASCOTTE.md` §2.3) ; et **« Pas de score. Pas de série. » reste dans le film** — la question que la décision 2 de l'étape 5 renvoyait ici | Plan, suivi, carte d'ouverture, export, confidentialité | **Livrée le 24/10/2026** (#389). Migration `20261024194430`, appliquée en production avant la fusion ; test `63` ; recette web `v1-13` §11.W.12. Deux contre-lectures : un bloquant (le vol entier compté à chaque « oui » mensuel) et neuf défauts, tous corrigés |
| 6b | **Répondre au point depuis l'e-mail** | Non | Gabarit, page de confirmation (les antivirus de messagerie cliquent sur les liens) | À faire |
| 6c | **Répondre au point depuis la notification Android** | Non | Natif : un build EAS | À faire |
| 7 | **Le ménage**, facultatif : le bundle web d'un seul fichier, l'écran du plan | Oui : le faire ou pas | Refontes | À faire |

## 3. Ce qui a été écarté en chemin

- **Les dépendances Gradle dans l'écran des licences** (étape 2). AndroidX, Kotlin, Firebase et Material
  Components entrent dans l'APK sans passer par `node_modules`, sous Apache 2.0 pour la plupart : les lister
  demande un build Android avec son SDK. L'écran le dit en une phrase plutôt que de se prétendre complet ; la
  piste est au relevé de la dette (`v1-27`).
- **L'indexation de `/licences`** : la page reste en `noindex` et hors du plan du site, comme toute page
  absente de `PAGE_DESCRIPTIONS`. Une liste de licences n'a rien à chercher dans un moteur.
- **Deux étapes pour les loisirs, la semaine puis le week-end** (étape 3, écartée par la personne qui
  pilote le 22/10/2026). Elles auraient été plus précises pour qui fait du vélo en semaine et prend la
  voiture le week-end, mais elles ajoutaient deux écrans, et un trajet du vendredi soir ne se range ni
  d'un côté ni de l'autre. Retenu : une étape, des libellés qui disent la semaine et le week-end, et
  une cinquième réponse, « Presque tous les jours » (5 sorties par semaine). **Écartée pour le MVP** : la personne
  qui pilote, le 23/10/2026, « on pourra revenir sur cette distinction loisirs week-end et loisirs semaine
  plus tard si nécessaire ».

- **Les contrastes des barres** (`accentMuted` sur le fond de carte, environ 1,6:1). Chaque barre porte sa
  valeur écrite à côté d'elle : WCAG 1.4.11 n'exige 3:1 que d'un graphique **nécessaire** à la
  compréhension, ce que ces barres ne sont pas. Et le jeton est celui du design system entier : le changer
  serait une décision de design, pas un correctif.

## 4. Ce qui reste ouvert après une étape

- **Étape 3, sur appareil** : `v1-13` §11.39 — les cinq rangées sur Android, la coupure du titre, et le
  préremplissage de « Presque tous les jours » sur un build d'avant le 22/10/2026. Elle attend le prochain
  build EAS.
- **Étape 3, le film** : repris à l'étape 5, le 23/10/2026, avec l'écran du plan
  (`docs/communication/le-fil-de-ramille/README.md`).
- **Étape 5, ce que la page d'accueil ne fait pas, et pourquoi** :
  - **son HTML exporté reste l'écran de lancement** : la page ne s'affiche qu'une fois la session restaurée,
    pour que qui revient ne la voie pas le temps de charger l'app. Un robot qui n'exécute pas de JavaScript ne
    lit donc que le titre et la description de la page (`page-titles.ts`) ; Google, qui l'exécute, lit la
    page. À rouvrir si une vérification (l'écran de consentement de Google, un moteur) demande le contenu dans
    le HTML : il faudrait un script en tête qui reconnaisse une session avant la première image, et son
    empreinte dans la CSP ;
  - **une visite qui reste sur la page d'accueil ne se mesure pas** : elle n'ouvre pas de session, et la
    mesure en demande une. L'entonnoir du web commence à « Découvrir mon impact » (`MESURE.md`) ;
  - **le film n'a pas le badge de Google Play** : il viendra à la publication, et le film se réexporte vers
    `public/film/` ce jour-là (`docs/exploitation/README.md` §4) ;
  - **les écrans du questionnaire du film gardent des écarts d'avant le 03/10/2026** — des titres en 22 au lieu
    de 26, des rangées un peu moins hautes, les lignes d'aide omises (README du film). Ses textes et ses
    chiffres sont ceux de l'app ; sa mise en page de ces quatre écrans, pas tout à fait. À reprendre au
    prochain export, celui du badge.
- **Étape 3, la coupure du titre à 430 de large** : au relevé de la dette (`v1-27` §12.42).
- **Étape 6a, ce que les kilos évités ne font pas, et pourquoi** :
  - **un point répondu avant le 24/10/2026 ne compte rien** : la migration a rattrapé les actions de plan et
    les points en attente, pas les points déjà répondus, que le trigger des réponses ferme. Le minimum n'en
    est que plus bas, et seuls des comptes de test sont concernés ;
  - **« Pas de score. Pas de série. » reste dans le film** (décision 2 de l'étape 5, rouverte ici et tranchée
    le 24/10/2026) : un minimum en kilos n'est ni un score — rien ne se classe, rien ne se compare, aucun
    manque ne se compte — ni une série — « Deuxième semaine de suite » ne se dit toujours qu'une fois ;
  - **trois actions de voyage ne disent aucun kilo** : les deux « Renoncer à un vol … cette année », dont la
    question est « as-tu eu un déplacement où tu as choisi autre chose que l'avion ? », et « Remplacer un de
    tes longs trajets en autocar par le train », dont la question ne dit pas « long ». Un « oui » n'y dit pas
    quel trajet, et compter le vol entier à chaque « oui » mensuel aurait dépassé ce que le bilan déclare
    (contre-lecture du 24/10/2026). **À rouvrir si l'on veut qu'elles comptent** : il faudrait réécrire leurs
    questions pour qu'elles nomment le trajet — une décision de produit, et les points déjà posés gardent
    leur question ;
  - **le total du plan part d'un coup quand une correction le retire** : il se déplie quand il naît, mais
    `Depliage` n'a pas de sortie, et « Modifier ma réponse » d'un seul « oui » en « non » est rare ;
  - **un « oui » donné sur le dernier point d'une saison, après la carte d'ouverture**, ne s'inscrit sur
    aucun total du plan — il appartient à la saison écoulée — et ne se voit que sur la carte du point et dans
    le suivi. Le point du dernier mois reste ouvert tout le premier mois, la carte quinze jours au plus ;
  - **le total de la saison vit à trois endroits, et c'est le même** : sous le titre du plan pour la saison
    en cours, dans le récapitulatif de la carte d'ouverture quand elle s'achève, et dans le suivi, saison par
    saison — sans quoi il s'effacerait à chaque bascule ;
  - **le gain d'un « oui » ne dit pas les jours** : « Mardi ou jeudi » vaut un aller, même si la personne a
    fait les deux. Compter les fois, c'est C4.1, fermé pour la V1 (`v1-23`).
- **Étape 6b, ce que la réponse depuis l'e-mail ne fait pas, et pourquoi** :
  - **passé la période, le lien ne montre plus que la question** : ni la réponse donnée, ni son heure, ni ses
    kilos, ni si la boucle tourne (contre-lecture du 24/10/2026). Un e-mail se garde des mois, et se
    transfère : la portée du jeton est celle de la période, en lecture comme en écriture ;
  - **« Deuxième semaine de suite » ne se dit pas sur la page** : la lecture par le jeton ne rend pas les
    périodes d'avant, et n'a pas à les rendre. Le signal se dérive à la lecture, donc la carte du plan le dit
    à la prochaine ouverture de l'app, pendant la période ;
  - **qui a l'e-mail peut lire et répondre** au point de ce message — un e-mail transféré compris —, comme il
    pourrait se désinscrire : rien d'autre, et pas au-delà de la période. C'est le compromis de
    `/rappels/stop`, écrit au registre (fiche 3) et sur la page de confidentialité ;
  - **sur Android, les liens de réponse s'ouvrent dans le navigateur** : l'app ne revendique que `/plan`,
    et c'est voulu — la page marche sans session. Le lien du plan reste dans l'e-mail pour qui veut l'app ;
  - **les rappels déjà en file gardent leur ancien corps**, avec le seul lien du plan : ils partent dans
    quatre jours au plus, et le suivant porte les réponses ;
  - **la notification Android n'a pas de réponse** : c'est l'étape 6c, qui demande un build EAS. Le mot de la
    veille non plus, et il n'en aura pas — il ne pose pas de question.
