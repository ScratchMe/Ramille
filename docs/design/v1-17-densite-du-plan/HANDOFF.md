# Handoff : Ramille — v1-17 + v1-18, le plan : ce qu'il montre, et ce qu'il tait

## Overview
Ce dossier répond à **deux briefs** écrits le 16/09/2026 au lendemain de la recette web
(`docs/architecture/v1-13-audit-et-chantiers.md` §13) : `v1-17` — la densité du plan et le tout
premier parcours (constat 13.3, issue #198) — et `v1-18` — une réponse du questionnaire qui restreint
sans le dire (constat 13.1, issue #197). **Un seul canvas**, parce que la réponse au second met la
restriction sur le plan, qui est l'écran que le premier dessine (v1-18 §6, dernier point) ; le dossier
`v1-18` renvoie ici. La relecture du titulaire, le 16/09/2026, a étendu le canvas au **premier parcours** entier,
de la restitution au suivi (F, G) : les deux onglets n'apparaissent qu'à la fin de ce parcours.

Cible : `ScratchMe/TraceVerte`, branche `main`, React Native / Expo Router. Ce canvas demande **une
migration** (le classement) et **une route** (l'écran des pistes) ; tout le reste est de la copy, des
états d'écran et des dérivations dans `src/types`.

## À propos des fichiers de design
`Canvas.dc.html` est une **référence de design créée en HTML** : un prototype qui montre l'apparence
et le comportement attendus, pas du code à copier. La tâche est de **recréer ces écrans dans le
dépôt** (composants de `src/components`, jetons de `theme.ts`, `ThemedText`, Reanimated), avec ses
conventions. Le fichier ne référence que `support.js` ; il s'ouvre dans un navigateur (le runtime charge
React depuis unpkg). Chaque cadre porte un `data-screen-label` ; sous chaque cadre, une note de
conception dit l'intention. Les captures de `captures/` sont en 2×, thème clair, état initial.

## Fidélité
**Haute fidélité.** Couleurs, tailles, rayons, hauteurs et copy sont définitifs et relevés du dépôt ;
les seules nouveautés sont listées dans la page Écarts. Les chiffres sont ceux du **profil de la
recette du 16/09/2026** (v1-17 §2 : poste dominant voyages, cap − 451 kg, six gains relevés en base) ;
les cinq autres pistes et les réponses de contexte sont des valeurs de démonstration cohérentes avec le
calcul. Les cadres des écrans qui défilent sont **allongés** pour tout montrer : l'écran réel fait
390 × 844 et défile, la barre d'onglets reste en bas.

## Ce que le canvas tranche

### v1-17 — le plan

1. **Le classement : « la meilleure piste de ton poste dominant d'abord ; ensuite toutes les autres,
   du plus gros gain au plus petit. »** Une phrase, explicable, et le plan ouvre toujours sur le poste
   que le cap mesure — sans quoi la carte du cap et les cartes en dessous auraient l'air de se
   contredire. Sur le profil de la recette : le vol long-courrier (1 601 kg) puis le télétravail à
   deux jours (461 kg) ; l'action de voyages à 48 kg redescend là où elle est. **Oui, une action
   d'un autre poste peut être la deuxième carte** ; elle n'est jamais la première tant que le poste
   dominant a une piste. **Et rien ne le commente** (relecture du titulaire, 16/09/2026) : ni note sous
   le cap, ni intro qui nomme les postes. Le cap est une quantité à atteindre, la ligne « soit − 20 %
   sur … » dit d'où vient le nombre, et où la réduction se fait est le choix de la personne — une phrase
   qui dirait « pas dans ce cap » énoncerait une règle que le produit n'applique nulle part. Chaque
   carte dit déjà où elle agit (« Sur tes 5 trajets par semaine. »). L'intro, elle, dit le **principe**
   du plan : « Une action par saison, une seule. C'est pas à pas qu'on tient un cap. »
2. **Deux cartes sur le plan, et toutes les pistes derrière une porte.** Le dépli en place (D18) a
   été décidé quand un plan portait quatre à six pistes ; il en porte onze, et « déplier + ouvrir »
   fait onze cartes sur l'écran où l'on revient le plus souvent. La liste va sur **un écran de la
   pile du plan**, comme le détail d'un bilan est dans la pile du suivi : la barre reste, le retour
   est celui de la plateforme, plus de « Replier ». Les pistes y sont **groupées par poste** —
   le dominant d'abord, les autres par leur meilleur gain, et par gain dedans — en lignes qui
   s'ouvrent en carte sur place (v1-16 §5) et se referment. Plus de cartes estompées qui s'ouvrent
   toutes seules.
3. **Le tout premier plan montre la même chose, ouvert autrement.** Une carte « TON PREMIER PLAN »
   (motif de `CarteDeSaison`) prend la place de la carte d'attente et dit la règle du jeu en deux
   phrases ; Ramille se tient dessous. Le trait de temps n'apparaît qu'une fois une action engagée.
   Le nombre de pistes n'est dit que par la porte (« · 11 ») : une intro qui compterait onze pistes
   inviterait à feuilleter, pas à choisir.

### v1-18 — la question qui restreint

1. **Où et quand : avant, comme une règle ; après, comme une prémisse ; jamais au moment de répondre
   avec l'enjeu sous la puce.** L'intro de l'étape dit « Ton plan ne propose que ce qui tient avec
   ces réponses. » ; le plan porte un encart qui redit les quatre réponses en mots, la règle, et la
   porte « Modifier ces réponses ». Dite au moment du choix, la restriction apprend à répondre haut ;
   dite après, sur un écran qu'on relit, elle informe sans marchander.
2. **La question porte sur ce que le produit lit : un nombre de jours.** « Sur tes 5 jours de trajet,
   combien pourrais-tu travailler depuis chez toi ? » — Aucun / Un jour / Deux ou plus. Le nombre
   vient de B1.2 ; « pourrais-tu » garde la possibilité (pas ce qu'on fait déjà, qui est dans les
   jours de trajet déclarés). Le seuil de C3.8 ne bouge pas : un jour ⇔ « Un jour », deux jours ⇔
   « Deux ou plus ».
3. **« Parfois » n'existe plus.** C'était une réponse sans unité, lue comme un seuil. Trois puces
   restent (une échelle courte), aucune précision qui s'ouvre, aucune question de plus.
4. **Les six autres conditions ne changent rien au questionnaire** : zone, transports en commun et
   véhicules sont des faits, et l'action écartée porte le mot de la réponse (« métro », « transports
   en commun », « à deux »). L'encart du plan vaut pour les sept.
5. **L'encart ne nomme jamais l'action écartée ni son gain.** Ce serait la liste des portes fermées
   pour la personne qui a répondu juste, et un prix sur une réponse pour les autres. Condition de
   réouverture : si un gabarit futur porte une condition qui ne se lit pas dans le mot de la
   réponse, on reformule la réponse — comme ici — on n'ajoute pas de liste.

### Le premier parcours (relecture du titulaire, 16/09/2026)

Le premier plan n'est pas un écran, c'est un moment dans un parcours — et ce parcours proposait deux
lieux (Plan, Suivi) avant qu'il y ait quoi que ce soit à suivre, dès la dernière page du questionnaire.
Une règle et une séquence :

- **Un lieu n'apparaît que quand il a quelque chose à montrer.** La barre d'onglets est masquée de la
  soumission du premier questionnaire à la fermeture de la carte « Ton premier plan » (« Compris » ou
  premier engagement). Jusque-là, chaque écran n'a qu'un geste : la restitution (« Voir ce que je peux
  faire »), la proposition de compte (inchangée), le premier plan (choisir). Ce n'est pas une contrainte :
  « Compris » ferme la carte et fait venir la barre sans avoir choisi ; « Revoir mon bilan » et l'icône
  de compte restent.
- **Quand la barre arrive, elle est nommée, une fois** : la carte « Plan et Suivi » (« Deux endroits,
  pas plus. ») prend la place de la carte d'attente et dit ce qu'on trouve ici et en bas ; Ramille
  dessous dit où iront les réponses, dans ses mots du suivi. Même carte, même moment, après un
  « Compris » sans choix ou sur un plan à zéro action.
- **Le suivi ne change pas** : le jour où la personne y entre, il s'explique par ce qu'il contient — son
  point de départ, la décision qu'elle vient de prendre, Ramille qui dit ce qui viendra s'y ranger. C'est
  l'ordre du parcours qui le rend lisible, pas un texte de plus.
- **Trois cartes d'ouverture, chacune une seule fois** : « Ton premier plan », « Plan et Suivi »,
  « Nouvelle saison ». Rien d'autre ne se réexplique jamais ; la cinquantième ouverture est l'écran B2,
  avec les mots du premier jour.

### Les questions ouvertes des briefs, une par une

- v1-17 §7.1 — Une action d'un autre poste en première carte ? **Non tant que le dominant a une piste ;
  en deuxième, oui.** Et elle compte comme les autres : le cap est une quantité, la carte du cap dit
  d'où vient le nombre et rien de plus. Aucune phrase ne dit qu'une action « ne compte pas ».
- v1-17 §7.2 — Le nombre d'actions visible d'emblée ? **Seulement dans la porte, et c'est le total**
  (« Voir toutes les pistes · 11 »), parce que la porte ouvre la liste entière.
- v1-17 §7.3 — Un premier plan doit-il montrer moins ? **Il montre la même chose** : deux cartes et la
  porte, sans catalogue — pour tout le monde, pas seulement au premier plan. Ce qui change est
  l'ouverture.
- v1-18 §9.1 — Dire « cette réponse restreint » aide-t-il ? **Avant et après, oui ; pendant, non.**
- v1-18 §9.2 — Une échelle de fréquence lève-t-elle l'ambiguïté sans explication ? **Oui, si l'unité
  est celle du calcul** : des jours, sur les jours déclarés. « Jamais / de temps en temps / toutes
  les semaines » aurait remplacé une ambiguïté par une autre.
- v1-18 §9.3 — Le bon moment est-il après, sur le plan ? **Oui, et c'est ce qui réunit les deux
  briefs.**
- v1-18 §9.4 — Peut ou fait déjà ? **Peut**, sur les jours de trajet — ce que la personne fait déjà
  est déjà dans `commute_days_per_week`, et c'est là-dessus que `remove_day` calcule.

## Ce qui change (page Écarts, résumé)
Ce qui n'est pas listé est inchangé.

1. **Le classement** — `row_number()` de `generate_plan_cycle_for_user` : la meilleure piste du poste
   dominant en 1, puis gain décroissant. `pistesDuPlan` ne change pas (elle lit `rank`).
2. **Deux cartes, un écran** — `(tabs)/plan/` devient une pile (`index.tsx` + `pistes.tsx`), sur le
   modèle de `suivi/` ; `pistesDuPlan` perd le rang estompé (`estompees` vide) ; la liste est groupée
   par poste côté écran.
3. **Le lien** — « Voir toutes les pistes · N », N = `actionsCount`.
4. **La ligne ouverte se referme** — « Réduire » (`TextLink` small tertiaire souligné) sous la carte.
5. **La ligne engagée** — pastille-coche 20 px + « Engagée », pas de bouton.
6. **L'intro dit le principe, pas les cartes** — « Une action par saison, une seule. C'est pas à pas
   qu'on tient un cap. » Une ligne fixe ; `cadreDuPlan` perd `intro`.
7. **La note sous le cap** — supprimée : `cadreDuPlan` perd `noteDuCap`. Le nouveau classement l'aurait
   réveillée sur la plupart des plans, pour dire une règle que rien n'applique.
8. **Le premier plan** — carte « TON PREMIER PLAN » à la place de la carte d'attente, Ramille
   dessous, « Compris » ; trait de temps absent tant que rien n'est engagé.
9. **L'encart de contexte** (v1-18) — les quatre réponses en mots, la règle, la porte. Absent d'un
   plan à zéro action.
10. **La porte « Modifier ces réponses »** — `/bilan?etape=context`, questionnaire prérempli.
11. **La question du télétravail** — libellé, trois réponses, valeurs `aucun` / `un_jour` /
    `deux_ou_plus`, posée dès deux jours de trajet.
12. **L'intro de l'étape** — « Ton plan ne propose que ce qui tient avec ces réponses. Elles n'entrent
    pas dans le calcul de ton bilan. »
13. **Zone, transports, véhicules** — inchangées.
14. **Le plan à zéro action** — inchangé : ni porte, ni encart, ni premier plan.
15. **L'espace fine des milliers** — « − 1 601 kg CO₂e », formateur à la main, jumeau dans `api/`.
16. **Thème sombre** — toutes les planches basculent, aucun jeton ajouté.
17. **La barre d'onglets attend la fin du premier parcours** — masquée de la soumission du premier
    questionnaire à la fermeture de la carte « Ton premier plan » ; elle glisse depuis le bas, 320 ms.
18. **La carte « Plan et Suivi »** — à l'arrivée de la barre, une fois, à la place de la carte d'attente.
19. **La restitution du premier bilan, sans barre** — le contenu ne change pas.

## Planche par planche

Communs à tous les écrans d'onglet : bande haute 52 px (nom 17/24/600 centré, icône compte 22 dans une
cible 44, hairline `border`) ; contenu `padding: 24`, `gap: 24`, largeur max 800 sur web ; barre
d'onglets 60 px + encoche, pastille 56 × 30 `backgroundSelected` sur l'actif, libellé 12/16. Les
cartes : rayon 18, padding 20 ; les encarts : rayon 16, padding 12/16. Les boutons : 54, rayon 27.

### A1 — Le plan · le meilleur levier hors du poste dominant
Profil de la recette, rien d'engagé, retour ordinaire.
- **Carte d'attente** (inchangée) : `backgroundElement`, mascotte `resting` 40, « Je te fais signe
  lundi. » 16/24/600, détail small `textSecondary` « Par notification sur ce téléphone. ».
- **Titre + intro** : `screenTitle` « Ton plan » ; `body` `textSecondary` « Une action par saison, une
  seule. C'est pas à pas qu'on tient un cap. » — fixe, « période » remplace « saison » quand la cadence
  n'en nomme pas une (`cadenceNommeUneSaison`, comme la carte du cap). Absente d'un plan à zéro action.
- **Carte du cap** : `backgroundSelected`, gap 6. « Ton cap pour cette saison » small 600
  `accentText` ; « − 451 kg » `salient` ; « soit − 20 % sur tes voyages (2,3 t CO₂e aujourd'hui) »
  small `textSecondary` ; **pas de note** ; période « Automne 2026 »
  small `textSecondary` à gauche, « jusqu'au 30 novembre » small 600 `accentText` à droite ; trait
  6 px rail `border` rempli `accentMuted` (17 % le 16 septembre) ; légende 12/16 `textTertiary`.
- **Deux cartes** (gap 10) : `ActionCard` bordure 1 px `border`, titre `cardTitle`, gain 20/26/600
  `accentText` « − 1 601 kg CO₂e », ligne small `textSecondary` « par an · 43 % de ton empreinte »,
  détail small `textTertiary` « Sur 1 vol long-courrier déclaré. », `Button` secondaire « Je m'y
  engage » (marge haute 16). Seconde carte : « Travailler depuis chez toi deux jours par semaine »,
  « − 461 kg CO₂e », « par an · 12 % de ton empreinte », « Sur tes 5 trajets par semaine. ».
- **La porte** : `TextLink` small 600 `accentText` centré, cible 44, « Voir toutes les pistes · 11 ».
- **Encart de contexte** : `backgroundElement`, rayon 16, padding 12/16, gap 8, aligné à gauche ;
  small `textSecondary` « Ton plan tient compte de ton contexte : zone urbaine dense, bon accès aux
  transports en commun, un véhicule dans le foyer, deux jours de télétravail possibles ou plus. Ce
  qui ne tient pas avec ces réponses n'est pas proposé. » ; `TextLink` small 600 `accentText`
  « Modifier ces réponses ».
- Note technique `code` 12/18 (inchangée) ; « Revoir mon bilan » small `textTertiary` centré.

### A2 — Toutes les pistes · l'écran
Un écran de la pile du plan (`(tabs)/plan/pistes.tsx`) ; bande haute et barre d'onglets présentes.
- **« Retour au plan »** : `TextLink` small 600 `accentText`, aligné à gauche, cible 44 — en tête du
  contenu qui défile. Le retour de la plateforme (geste, bouton, navigateur) fait la même chose.
- **Titre** `screenTitle` « Toutes les pistes » ; **intro** `body` `textSecondary` « Par poste, du
  plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en
  tête de ton plan. » — quand une action est engagée : « … en choisir une ici remplace la tienne. »
- **Têtes de groupe** : `POSTE_LABEL` (« Voyages longue distance », « Trajet domicile-travail »,
  « Loisirs du week-end »), small 600 `textTertiary`, padding 16 dessus, 4 dessous, rôle en-tête.
  Ordre : le poste du cycle d'abord, puis les autres par leur meilleur gain ; dedans, l'ordre de
  `rank`.
- **Lignes** : `Pressable` rangée, padding vertical 16 (44 px de cible), `space-between`, gap 8,
  filet 1 px `border` dessous ; titre small `textSecondary` (`flex: 1`) ; à droite, gain small
  `textTertiary` « − 461 kg » puis « Choisir » small 600 `accentText`. Libellé accessible :
  « {titre}. − 461 kg par an. Choisir. ».
- **Ligne ouverte** (A3) : la même `ActionCard` que sur le plan (marges 10 dessus et dessous), avec
  son bouton (« Je m'y engage », ou « Choisir celle-ci à la place » quand une autre est engagée) et,
  sous lui, `TextLink` « Réduire » small `textTertiary` souligné, cible 44, aligné à gauche.
  Plusieurs lignes peuvent être ouvertes ; l'état est local à l'écran. Entrée : translateY 16 → 0 et
  opacité, 260 ms ease-out.
- **Ligne engagée** (A3) : à la place de « Choisir », la pastille-coche 20 px (`accent`, coche
  blanche trait 3) et « Engagée » small 600 `accentText` ; la ligne ne s'ouvre pas.
- **Après « C'est noté »** : `commit_plan_action` (avec `p_replace` si une autre est engagée), puis
  l'écran se referme ; le plan, rafraîchi au focus, ouvre la feuille des rappels comme aujourd'hui.
  Sur un refus `RM001`, le plan est relu et la ligne concernée reste ouverte.

### B1 — Le tout premier plan
Signal : aucun cycle précédent, aucun engagement (courant ou archivé). L'écran est A1 sauf :
- **Carte d'ouverture** à la place de la carte d'attente : bordure 1 px `border`, fond
  `backgroundTinted`, rayon 18, padding 20, gap 12. Étiquette « TON PREMIER PLAN » 13/18/700 +0,3
  `accentText` ; titre `screenTitle` « Une action pour l'automne. » (la saison du cycle ; repli
  « Une action pour cette période. ») ; corps `body` `textSecondary` « Choisis-en une, et dis quand.
  Ensuite, un point régulier te demandera si tu l'as faite — rien d'autre à suivre. » ;
  sortie `TextLink` small 600 `accentText` « Compris » (marge haute 4).
- **Ramille dessous**, hors du cadre : `RamilleDit` `happy` 44, tilt − 5, padding horizontal 4,
  « Prends celle qui te ressemble. » (`RAMILLE.premierPlan`).
- **La carte du cap sans trait ni légende** : le trait et « La saison avance ; … » ne se rendent
  qu'une fois une action engagée. La période et sa fin restent.
- La carte se ferme par « Compris » (marque locale, comme `carteOuvertureVue`) ou par le premier
  engagement. Elle ne se rend pas sur un plan à zéro action (C).
- **Pas de barre d'onglets** tant que la carte est là (§« Le premier parcours »). L'écran garde son
  inset bas ; « Revoir mon bilan » et l'icône de compte restent les seules sorties.

### B2 — Le plan de retour · action engagée, point de la semaine
Le même profil, engagé sur le vol long-courrier ; un point est en attente.
- **`CheckinCard`** (inchangée) : `backgroundSelected` (poste dominant, non répondue), « Semaine du
  07/09 » small 600 `accentText`, question 16/23/600 « La semaine dernière, as-tu changé de mode de
  transport pour ton trajet domicile-travail ? » (générique : l'engagement porte sur les voyages,
  C2.1), « Non » secondaire / « Oui » primaire, « Pas de trajet la semaine dernière » small
  `textTertiary` centré.
- **Carte engagée** en tête : bordure 2 px `accent`, fond `backgroundTinted`, étiquette « TON
  ENGAGEMENT » avec pastille-coche, ligne « À mon prochain projet de voyage · par an · 43 % de ton
  empreinte », bloc « PREMIER PAS » (fond `background`, rayon 16, padding 12/16, sur-titre 13/18/600
  `textTertiary`, texte 14/20) « Regarde lequel de tes projets de voyage peut attendre, ou se
  passer plus près. », « Changer d'avis » small `textTertiary` souligné.
- **Seconde carte estompée** (opacité 0,72, cliquable) : « Choisir celle-ci à la place ».
- Porte, encart, note technique, « Revoir mon bilan » : comme A1.

### C — Le plan à zéro action
Inchangé : carte d'attente ; « Ton plan » sans intro ; carte du cap qui nomme la période sans
chiffre, avec le trait et sa légende ; félicitation `backgroundElement` (mascotte `happy` 36, « Tu
fais déjà l'essentiel sur ce poste. » `cardTitle`, corps `body` `textSecondary`) ; « Revoir mon
bilan ». **Aucun élément de ce canvas ne s'y rend** : ni porte, ni encart, ni carte de premier plan,
ni note technique (`actionsCount === 0`).

### D — L'étape « Contexte de mobilité »
`StepShell` : en-tête (`ProgressHeader` : mascotte `happy` 28, « Contexte de mobilité », « Étape 9
sur 9 », barre 6 px pleine), mot de Ramille small `textTertiary` « Ce qui est possible là où tu vis
change ce que je te proposerai ensuite. » (inchangé, `RAMILLE.entreeDeSection.context`) ; contenu
gap 32, bloc gap 24, champ gap 10 ; pied collant « Retour » secondaire + « Voir mon bilan » primaire
`flex`.
- **Titre** `screenTitle` « Quel est ton contexte de mobilité ? » ; **intro** small `textTertiary`
  « Ton plan ne propose que ce qui tient avec ces réponses. Elles n'entrent pas dans le calcul de
  ton bilan. »
- **Trois questions inchangées** : « Type de zone » Urbain dense / Périurbain / Rural ; « Accès aux
  transports en commun » Bon / Limité / Inexistant ; « Véhicules motorisés dans le foyer » 0 / 1 /
  2 ou plus. `Chip` `flex`, rayon 14, padding 12/4, 15/20, sélection pleine (`accent`, blanc, 600),
  rôle `radio`.
- **Quatrième question** : « Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez
  toi ? » — le nombre est `commute_days_per_week`, « jour » s'accorde. Réponses **Aucun / Un jour /
  Deux ou plus**, libellés accessibles « Aucun jour » / « Un jour par semaine » / « Deux jours par
  semaine ou plus ». Mêmes puces. Aucune phrase d'aide, rien ne s'ouvre au choix.
- **Quand elle se pose** : trajet régulier **et** `commute_days_per_week ≥ 2`. À un jour de trajet,
  aucun gabarit ne peut s'appliquer (`commute_days_per_week <= t.trips` les écarte tous les deux) ;
  la poser demanderait une réponse pour rien. `manqueDeLEtape` suit la même condition ;
  `normaliserReponses` remet la réponse à `null` (« à reposer ») quand les jours passent sous deux.

### F1 — La restitution du premier bilan · sans barre
Le contenu est celui de l'écran actuel en mode `nouveau`, mot pour mot (sur-titre, décision
dominante, répartition, total et bloc de méthode, « Où tu te situes » avec le palier, « Voir ce que je
peux faire », « Modifier mes réponses », le partage). **Ce qui change** : la barre d'onglets n'est pas
rendue tant que le premier parcours n'est pas fini. La bande haute reste.

### F2 — Après « C'est noté » · la feuille des rappels
Inchangée (`FeuilleRappels`) : Ramille dit quand elle revient (ici la boucle mensuelle, l'action
étant un voyage : `boucleDeLAction`), le produit propose le canal, « Tu pourras changer d'avis dans
« Toi ». » Derrière, le plan sans barre. La barre arrive à la fermeture de la feuille.

### F3 — La barre arrive · « Plan et Suivi »
- **La barre** glisse depuis le bas : translateY 60 → 0 et opacité, 320 ms ease-out (Reanimated,
  `ReduceMotion.System`), une fois, à la fermeture de la feuille — ou de la carte « Ton premier plan »
  par « Compris », ou au premier rendu d'un plan à zéro action.
- **La carte « Plan et Suivi »** : motif `CarteDeSaison` (bordure 1 px `border`, fond
  `backgroundTinted`, rayon 18, padding 20, gap 12). Étiquette « PLAN ET SUIVI » 13/18/700 +0,3
  `accentText` ; titre `screenTitle` « Deux endroits, pas plus. » ; corps `body` `textSecondary`
  « Ici, ton plan : l'action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes
  réponses, saison après saison. » ; sortie `TextLink` small 600 `accentText` « Compris ». Elle prend la
  place de la carte d'attente, et « Compris » (marque locale) la lui rend.
- **Ramille dessous**, hors du cadre : `RamilleDit` `calm` 44, tilt − 5, « Je note tes réponses dans ton
  suivi, au fil des saisons. » (`RAMILLE.planEtSuivi`, la jumelle de `suiviSansPoint`).
- Le reste de l'écran est B2 sans le point : cap avec son trait (une action est engagée), carte engagée
  avec son premier pas, seconde carte estompée, porte, encart, note, « Revoir mon bilan ».

### F4 — Le suivi · première visite
Inchangé : « Ton suivi », « Ton point de départ. Refais ton bilan quand tes habitudes changent : tu
verras l'écart ici. », la carte « Ton empreinte transport, bilan après bilan » avec une barre, « Ce que
tu as décidé, saison après saison » avec la décision qui vient d'être prise, la carte « Je note tes
réponses ici, au fil des saisons. », le pied « Refaire mon bilan ». Dessiné pour montrer que l'écran
s'explique lui-même le jour où l'on y entre.

### G — Le parcours, moment par moment
Une page : douze moments, de la première ouverture à la cinquantième, avec ce que la personne voit, ce
qui est nouveau et ce qui l'explique. Reprise en §« Le premier parcours, moment par moment ».

### E — Les sept conditions
Une page : la table question → réponses → ce qu'une réponse écarte → où ça se dit, reprise en §« Les
sept conditions » ci-dessous.

## Copy définitive

| Où | Texte |
|---|---|
| Plan, intro (saison) | Une action par saison, une seule. C'est pas à pas qu'on tient un cap. |
| Plan, intro (cadence sans saison) | Une action par période, une seule. C'est pas à pas qu'on tient un cap. |
| Plan, la porte | Voir toutes les pistes · 11 |
| Plan, encart de contexte | Ton plan tient compte de ton contexte : {zone}, {transports}, {véhicules}, {télétravail}. Ce qui ne tient pas avec ces réponses n'est pas proposé. |
| Plan, porte de l'encart | Modifier ces réponses |
| Premier plan, étiquette | TON PREMIER PLAN |
| Premier plan, titre | Une action pour l'automne. · Une action pour cette période. |
| Premier plan, corps | Choisis-en une, et dis quand. Ensuite, un point régulier te demandera si tu l'as faite — rien d'autre à suivre. |
| Premier plan, sortie | Compris |
| Ramille, sous la carte du premier plan | Prends celle qui te ressemble. |
| Carte « Plan et Suivi », étiquette | PLAN ET SUIVI |
| Carte « Plan et Suivi », titre | Deux endroits, pas plus. |
| Carte « Plan et Suivi », corps | Ici, ton plan : l'action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison. |
| Carte « Plan et Suivi », sortie | Compris |
| Ramille, sous la carte « Plan et Suivi » | Je note tes réponses dans ton suivi, au fil des saisons. |
| Pistes, retour | Retour au plan |
| Pistes, titre | Toutes les pistes |
| Pistes, intro (rien d'engagé) | Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan. |
| Pistes, intro (engagée) | Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici remplace la tienne. |
| Pistes, ligne | {titre} · − {gain} kg · Choisir |
| Pistes, ligne engagée | Engagée |
| Pistes, carte ouverte | Réduire |
| Étape contexte, intro | Ton plan ne propose que ce qui tient avec ces réponses. Elles n'entrent pas dans le calcul de ton bilan. |
| Étape contexte, question 4 | Sur tes {n} jours de trajet, combien pourrais-tu travailler depuis chez toi ? |
| Étape contexte, réponses | Aucun · Un jour · Deux ou plus |

Les phrases de l'encart, une par réponse (table `src/types`, épinglée par un test) :

| Colonne | Valeur | Phrase |
|---|---|---|
| `zone_type` | `urbain_dense` · `periurbain` · `rural` | zone urbaine dense · zone périurbaine · zone rurale |
| `tc_access` | `bon` · `limite` · `inexistant` | bon accès aux transports en commun · accès limité aux transports en commun · pas de transports en commun |
| `household_vehicles` | `0` · `1` · `2_plus` | pas de véhicule dans le foyer · un véhicule dans le foyer · deux véhicules ou plus dans le foyer |
| `teletravail` | `aucun` · `un_jour` · `deux_ou_plus` | pas de télétravail possible · un jour de télétravail possible · deux jours de télétravail possibles ou plus |

Sans trajet régulier (ou à un jour de trajet), le quatrième segment n'est pas écrit.

## Le classement, côté serveur
Dans `generate_plan_cycle_for_user`, le `row_number()` devient : **la piste du poste dominant au gain
le plus élevé en 1, puis `saving_kg_year desc`**. Une écriture possible :

```sql
row_number() over (
  order by (e.poste = rec.dominant_poste
            and e.saving_kg_year = max(e.saving_kg_year) filter (where e.poste = rec.dominant_poste) over ()) desc,
           e.saving_kg_year desc,
           e.action_text)
```

`action_text` départage une égalité exacte de gain, pour que le rang soit déterministe (c'est la clé
naturelle du référentiel). Quand le poste dominant n'a aucune piste, l'ordre est le gain seul — c'est
déjà le cas du plan qui « déborde » (C3.8 §3). `pistesDuPlan` ne change pas, `cadreDuPlan` reçoit les
mêmes entrées. Valeurs attendues des tests 02 et 10 recalculées par requête (`TESTING.md` §2.2).

## L'écran « Toutes les pistes »
- **Route** : `(tabs)/plan/` devient une pile (`_layout.tsx` Stack sans en-tête, `index.tsx` = l'écran
  actuel, `pistes.tsx`), sur le modèle de `suivi/` ; l'onglet Plan reçoit le même `tabPress` que Suivi
  pour revenir à l'index. Ni onglet de plus, ni route dynamique. `assetlinks.json` ne bouge pas.
- **Données** : la même requête que le plan (le cycle et ses `plan_actions`), triées par `rank`,
  groupées par `action_templates.poste` côté écran.
- **États** : `ouvertes: Set<id>` local ; la ligne engagée n'est pas dans l'ensemble ; « Réduire »
  retire ; le retour au plan n'a rien à remettre à zéro.
- **Engagement** : `ActionCommitment` dans la carte ouverte, comme sur le plan ; à `onEngage`, l'écran
  fait `router.back()` et le plan ouvre la feuille (un drapeau local, ou le paramètre
  `?engagee=1`). Le refus `RM001` relit le plan et garde la ligne ouverte.
- **Accessibilité** : la ligne est un `Pressable` au libellé recomposé (« {titre}. − 461 kg par an.
  Choisir. ») ; la ligne engagée n'est pas un contrôle ; les têtes de groupe sont annoncées en
  en-tête ; « Réduire » et « Retour au plan » sont des `TextLink`.

## Le premier plan
- **Signal** : `plan_cycles` n'a qu'une ligne pour la personne, aucune `plan_actions.committed_at`,
  aucune ligne dans `plan_action_commitments_archive`. Dérivé dans `src/types/saison.ts` à côté de
  `ouvertureDeSaison`, avec ses tests.
- **État** : une marque locale « premier plan vu » (préfixe `traceverte.`), posée par « Compris » ;
  le premier engagement la rend inutile. Elle remplace la carte d'attente exactement comme la carte
  d'ouverture de saison (C2.8), et pour la même raison, Ramille parle dessous.
- **Le trait** : `progression !== null && (engagement || !premierPlan)`.
- **La barre** : une marque locale `traceverte.premier_parcours.v1`, posée à la soumission du premier
  questionnaire (à côté de la marque de bilan de C4.5) et effacée à la fermeture de la carte « Ton premier
  plan » ; le layout des onglets la lit (`tabBarStyle: { display: 'none' }`) et la restitution en mode
  `nouveau` aussi. Sans marque — appareil neuf d'un compte existant, session retrouvée — la barre est là.
  Balayée par le préfixe à la déconnexion et à la suppression, comme les autres.
- **La carte « Plan et Suivi »** : une seconde marque, posée par son « Compris » ; rendue quand la barre
  vient d'apparaître sur cet appareil et que cette marque manque, à la place de la carte d'attente.

## L'encart de contexte et sa porte
- Rendu sous la porte des pistes, au-dessus de la note technique ; jamais quand `actionsCount === 0`.
- La requête du plan lit `zone_type`, `tc_access`, `household_vehicles`, `teletravail` et
  `commute_has_regular_trip` / `commute_days_per_week` du bilan du cycle.
- « Modifier ces réponses » ouvre `/bilan?etape=context` : le questionnaire prérempli (brouillon >
  dernier bilan), positionné sur l'étape « Contexte de mobilité ». Soumettre est un re-bilan
  ordinaire : le plan est régénéré, un engagement en cours est archivé et l'encart orphelin le dit
  (C2.2). Un paramètre de plus à côté de `reprise`, rien d'autre.

## Le premier parcours, moment par moment

| Le moment | Ce que la personne voit | Ce qui est nouveau | Ce qui l'explique |
|---|---|---|---|
| Première ouverture (onboarding) | Quatre écrans, un bouton chacun, « J'ai déjà un compte » | Tout ; aucun lieu, un flux | Le flux, Ramille qui se présente. Inchangé |
| Le questionnaire | Neuf étapes, l'en-tête, Retour / Suivant, Ramille à l'entrée des sections | L'intro de la dernière étape dit la règle du plan (D) | Inchangé sauf D |
| Le calcul | Ramille qui réfléchit | — | Une attente. Inchangé |
| La restitution (F1) | La décision dominante, la répartition, le total, « Où tu te situes », le palier, « Voir ce que je peux faire » | **Pas de barre** | La phrase du palier annonce le plan |
| La proposition de compte | Google, email, « Continuer sans compte » | — | Inchangée (v1-04 §1) |
| Le premier plan (B1) | La carte « Ton premier plan », Ramille, le principe, le cap sans trait, deux actions, la porte, l'encart | La règle du jeu en deux phrases ; un geste attendu, rien de forcé | La carte, une fois |
| Le premier engagement (F2) | Les jours ou l'échéance, « C'est noté », la feuille des rappels | — | La feuille. Inchangée |
| La barre arrive (F3) | La barre glisse ; « Deux endroits, pas plus. » ; Ramille : où iront les réponses | Les deux onglets, nommés à l'instant où ils apparaissent | La carte, une fois |
| Le suivi, première visite (F4) | Le point de départ, la décision prise, Ramille, « Refaire mon bilan » | Rien de dessiné | L'écran lui-même. Inchangé |
| Le premier point | La notification ouvre la question ; Oui / Non / « Pas de trajet » ; Ramille répond | La question nomme l'action (C2.1) | La question. Inchangé |
| La saison suivante | « L'hiver commence. », reprendre ou choisir | La troisième carte d'ouverture | La carte de saison (C2.8). Inchangée |
| La cinquantième fois (B2) | Le point ou la carte d'attente, le principe, le cap, l'action, la porte, l'encart | Rien | Rien ne se réexplique |

## Les sept conditions

| Question | Réponses | Ce qu'une réponse écarte | Où ça se dit |
|---|---|---|---|
| Type de zone | Urbain dense · Périurbain · Rural | Périurbain et Rural : « Passer deux trajets sur cinq en métro ou en tram », « Prendre les transports en commun pour deux sorties sur cinq » | Sur le plan, par l'encart. Inchangée. |
| Accès aux transports en commun | Bon · Limité · Inexistant | Inexistant : les trois gabarits de transports en commun. Limité n'écarte rien. | Sur le plan, par l'encart. Inchangée. |
| Véhicules motorisés dans le foyer | 0 · 1 · 2 ou plus | 0 : « Faire ce trajet à deux au moins un jour sur deux », « Partager un de tes longs trajets en voiture » | Sur le plan, par l'encart. Inchangée. |
| Télétravail (dès deux jours de trajet) | Aucun · Un jour · Deux ou plus | Aucun : les deux gabarits ; Un jour : « deux jours par semaine » | Dans la réponse elle-même, et sur le plan. |

Inchangé : une condition qu'on ne peut pas évaluer n'est pas remplie (C3.8).

## Jetons et motifs
**Aucun jeton ajouté** à `Colors`, `TypeScale`, `Radius`, `ControlHeight`. Cinq motifs composés avec
l'existant : la carte d'ouverture réemployée (`CarteDeSaison`), l'encart de contexte (gabarit des
encarts C2.2), la tête de groupe (small 600 tertiaire), la ligne qui se referme (`TextLink`
souligné), la ligne engagée (pastille-coche + mot). Aucun composant natif nouveau ; l'écran des pistes
se compose avec `ActionCard`, `ActionCommitment`, `TextLink`, `ThemedText`.

Les valeurs stockées du télétravail : `aucun` / `un_jour` / `deux_ou_plus` (migration : le `check`,
les deux `teletravail_admissible`, le commentaire de colonne ; les lignes existantes se traduisent
`non → aucun`, `parfois → un_jour`, `oui → deux_ou_plus`). Garder `parfois` en base pour dire « un
jour » serait la dérive silencieuse que ce dépôt chasse partout ailleurs.

## Interactions et états
- **Plan** : la porte pousse l'écran des pistes ; l'encart ouvre le questionnaire ; « Compris » ferme
  la carte du premier plan. Écran d'onglet : rafraîchi au retour (`useRafraichirAuRetour`), donc un
  engagement pris sur l'écran des pistes se voit en revenant.
- **Pistes** : ligne → carte (260 ms), carte → ligne par « Réduire », plusieurs ouvertes ; « C'est
  noté » → retour au plan + feuille des rappels.
- **Étape contexte** : trois puces, pas de réaction au choix ; « Suivant » inactif dit ce qui manque
  (« ta réponse sur le télétravail »).
- **La barre d'onglets** : absente pendant le premier parcours ; entre par le bas (320 ms) à la fermeture
  de la carte « Ton premier plan » ; la carte « Plan et Suivi » arrive avec elle.
- Aucune autre animation ; aucune célébration.

## Règles non négociables (v1-17 §3, v1-18 §5)
Le cap reste calculé sur le poste dominant. Les rangs disent l'insistance, jamais la permission :
toute action affichée est engageable. Une seule action engagée par cycle. Le premier pas ne
s'affiche qu'engagé. Aucune comparaison entre personnes. Le seuil du télétravail ne bouge pas ; sans
réponse, rien n'est proposé ; « n'entrent pas dans le calcul » reste. Ramille : première personne,
court, tutoiement, jamais un nombre, jamais « tu devrais », jamais un accord genré, jamais à côté
d'un chiffre lourd. Deux onglets. Pas de rouge, pas d'icône d'alerte, pas de streak.

## Fichiers
- `Canvas.dc.html` — le canvas (A à E, Écarts, Système). A2 et D sont cliquables ; bascule de thème.
  Ne référence que `support.js`.
- `support.js` — le runtime des `.dc.html` (copie de `docs/design/support.js`).
- `captures/` — une PNG 2× par planche, thème clair, état initial.
- `BRIEF.md` — le brief v1-17 ; le brief v1-18 est dans `../v1-18-question-qui-restreint/`.
- `README.md` — ce qu'il y a dans le dossier et ce qui a été retenu.
