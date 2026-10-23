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
| 4 | **Le web et l'iPhone** : le compte comme condition des rappels sur le web ; la purge des sessions anonymes à 120 jours | Une, posée en chemin le 23/10/2026 : **une feuille, une seule fois**, au premier engagement sur le web sans compte — « Sur le web, je ne peux te faire signe que par email. Rattache ton adresse pour recevoir le rappel. » (« Rattacher mon adresse », « Plus tard ») ; pas chez qui a déjà choisi « Sans rappel » | Feuille des rappels, migration, registre, confidentialité, conditions | En cours. Migration `20261023090000` (purge), test `61` ; recette web `v1-13` §11.W.10 |
| 5 | **La page d'accueil du web**, avec le film | Oui : ce que voit quelqu'un qui revient ; la phrase « pas de série » du film face à « deuxième semaine de suite » | Route racine du web, export du film, titre | À faire |
| 6a | **Le progrès visible : le chiffre** | Oui : un « oui » ne dit pas combien de fois, et `v1-23` §3.2 refuse un second chiffre concurrent du bilan | Plan, suivi | À faire |
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
- **Étape 3, le film** : il montre encore l'ancienne étape des loisirs. Il n'est pas diffusé ; il se reprend
  avant la diffusion, avec l'écran du plan (`docs/communication/le-fil-de-ramille/README.md`), donc à
  l'étape 5 au plus tard.
- **Étape 3, la coupure du titre à 430 de large** : au relevé de la dette (`v1-27` §12.42).
