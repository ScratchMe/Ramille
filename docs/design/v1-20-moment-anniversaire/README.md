# Canvas — un an ensemble : où le moment vit, et ce qu'il a le droit de dire

Réponse livrée le 19/09/2026 par la session Claude Design au brief `BRIEF.md` (v1-20, le moment
anniversaire — `v1-19` postulat 5, questions ouvertes §6.1 et §6.2, issue #233). Le document
d'implémentation qui en découlera est à écrire dans `docs/architecture/` ; ce README dit ce qui est
proposé, **pourquoi**, ce qui a été écarté, et ce qui reste à trancher.

Le dossier contient ce README et `HANDOFF.md` (la spécification, planche par planche, copy
définitive, dérivations, où ça se touche). **Il n'y a ni `Canvas.dc.html` ni `captures/`** : cette
session a produit une spécification textuelle, relevée sur le code et non sur une maquette. Les
planches y sont décrites avec les jetons nommés et les tailles ; un canvas HTML peut en être tiré
après arbitrage, pas avant — dessiner un écran de chiffres avant d'avoir décidé ce qu'il a le droit
d'affirmer aurait été le mauvais ordre.

## La réponse en trois phrases

**L'anniversaire est une page du suivi, et il s'annonce sur le plan.** Le jour où le premier bilan
a un an, une quatrième carte d'ouverture (« UN AN ENSEMBLE », même composant que la saison, le
premier plan et les deux lieux) prend la place de la carte d'attente pendant quatre semaines et
mène à une page « Ton année » dans la pile du suivi — le détail d'une entrée du suivi, comme la
restitution d'un bilan. **La page dit trois choses que le produit sait** — ce que la personne a
répondu, ce qu'elle a décidé, ce que ses deux bilans disent — et jamais ce qu'elle a « évité » ;
elle se termine sur la seule proposition qui regarde l'année suivante, un nouveau bilan, portée par
le régime de C6.3. **La version saisonnière existe déjà et ne grossit pas** : c'est la carte
d'ouverture de saison, et ce qui la distingue de l'annuelle n'est pas le nombre de chiffres, c'est
qu'elle *passe* (une carte, deux semaines) là où l'année *reste* (une page, dans le suivi, pour
toujours).

## Ce que le canvas tranche — les trois questions du §1

### 1. Où vit le moment, combien de temps, et que se passe-t-il si on l'ignore

**Il s'annonce là où la personne est, et il vit là où le passé vit.**

- **L'annonce est sur le plan**, parce que c'est l'écran où l'on revient : c'est la destination
  du rappel, celui que la notification du lundi ouvre. Une carte d'ouverture y a déjà sa place, son
  composant (`CarteDOuverture`), sa règle (elle remplace la carte d'attente, **jamais un point en
  attente**) et sa mémoire (une marque locale). L'anniversaire est la quatrième de la famille, et
  la seule qui se répète chaque année — d'où une marque qui porte le **numéro de l'année** vue,
  comme celle de la saison porte l'identifiant du cycle.
- **La page est dans la pile du suivi** (`/suivi/annee?n=1`), parce que l'année est de
  l'histoire, et que le produit a une règle pour ça : la restitution « n'est pas un troisième
  lieu : c'est la dernière page d'un flux, ou le détail d'une entrée du suivi ». Une année lue
  est le détail d'une entrée du suivi, qui gagne pour l'occasion un lien « Voir mon année » sous
  son intro, dès qu'un premier bilan a un an. La barre reste visible ; le retour est celui de la
  plateforme, et le lien du bas nomme sa destination (« Revenir à mon suivi », `router.replace`,
  comme la restitution).
- **La carte vit vingt-huit jours**, deux fois la fenêtre de la saison (`JOURS_DOUVERTURE = 14`),
  et ce n'est pas un chiffre rond : la carte de saison passe devant quand les deux sont dues le
  même jour, et elle peut occuper la première moitié de la fenêtre. La marque locale la referme
  plus tôt, sur « Voir mon année » comme sur « Plus tard ».
- **Ignorée, elle ne coûte rien** : la page reste dans le suivi, sans date limite, et le lien y est
  permanent. C'est ce qui rend « Plus tard » honnête — il dit où ça se retrouve, et c'est vrai. Il
  n'y a ni notification, ni email, ni relance (§« Ce qui a été écarté », 3).

### 2. Joyeux sans être faux

**La joie est dans le cadre et dans la voix ; les chiffres restent des faits comptés dans le
registre que le produit emploie déjà.** Trois décisions :

- **La page ne dit que ce que le §4 du brief autorise, un bloc par ligne de sa table.** Les
  points répondus et les changements, dans la phrase de la carte de saison (« Cette année :
  31 points répondus, 18 fois où tu as changé quelque chose. ») ; les décisions, dans la liste du
  suivi (« Ce que tu as décidé ») ; le signal « deux fois de suite », compté sur l'année (« 3
  changements ont tenu deux fois de suite. ») ; et l'écart entre le bilan du départ et le dernier de
  l'année, dans la phrase de la restitution (« 600 kg de moins que ton bilan de mars. »), suivie
  d'une note de méthode qui dit ce que c'est : deux estimations, chacune aux facteurs de sa date,
  pas une mesure. **Aucun gain de `plan_actions` n'apparaît sur la page** — ni sommé, ni multiplié,
  ni « évité ». Les caps de saison non plus : quatre caps sur une page se liraient comme quatre
  jauges, c'est-à-dire comme la mécanique d'échec que le produit refuse.
- **Rien ne dit zéro, et rien ne nomme une absence.** Un bloc sans matière ne se rend pas, comme
  le corps de la carte de saison tombe sans point répondu. C'est ce qui décide du §8.2.
- **Ramille ouvre la page et n'y compte rien.** Elle est en tête, avant l'étiquette et le titre,
  loin des blocs chiffrés, avec une phrase qui nomme une durée sans la chiffrer : « Une année
  ensemble, à ton rythme. » — le même registre que « On repart pour une saison. ». La même
  ligne se lit sous la carte du plan ; la carte et la page ne se voient jamais ensemble. Le
  regard vers l'année suivante est en **voix produit**, dans le bloc de sortie, parce qu'il porte
  une proposition et une raison (les facteurs se mettent à jour), et Ramille ne fait ni l'un ni
  l'autre.

Ce que « joli et dynamique » devient ici : une étiquette qui n'existe nulle part ailleurs (« UN AN
ENSEMBLE »), Ramille `happy` en ouverture, deux barres pour deux bilans, et une entrée des blocs
décalée de 80 ms — la seule animation, une fois, dans les limites du système (« rare et
signifiante », `ReduceMotion.System`). Pas de confettis, pas d'illustration de fête, pas de frise
(§« Ce qui a été écarté », 10). Une page qui ressemble au reste du produit dit la seule chose qui
compte ce jour-là : c'est le même produit, un an plus tard.

### 3. La version saisonnière, et sa distance à l'annuelle

**Elle existe, c'est la carte d'ouverture de saison, et elle ne grossit pas.** Le doute du 18/09
(« une saison, c'est peut-être trop court ») est fondé et déjà tranché par ce qui est livré :
la carte de saison porte une ligne de récapitulatif et regarde devant (« L'hiver commence. »,
« Reprendre la même action »). L'annuelle regarde derrière. La distance entre les deux n'est pas
une question de richesse mais de **forme et de durée** :

| | La saison (C2.8, inchangée) | L'année (ce canvas) |
|---|---|---|
| Forme | Une carte, sur le plan | Une carte qui mène à une page du suivi |
| Regard | Devant : le titre nomme ce qui commence | Derrière : la page nomme ce qui s'est passé |
| Matière | Une ligne : points répondus, changements | Trois blocs : réponses, décisions, bilans |
| Durée | Deux semaines, puis plus rien | Quatre semaines pour la carte ; la page reste |
| Sortie | Reprendre ou choisir une action | Un nouveau bilan, si le régime le propose |
| Ramille | Sous la carte, « On repart pour une saison. » | Sous la carte et en tête de la page, « Une année ensemble, à ton rythme. » |

Enrichir la carte de saison lui ferait perdre ce qu'elle a de juste — elle se lit en trois
secondes, à la place de la carte d'attente, et repart. Et la page d'année ne se compose qu'avec ce
que le suivi lit déjà : **aucune requête nouvelle** — les trois lectures du suivi
(`loadAssessmentHistory`, `loadAnsweredCheckins`, `loadDecisionsEngagees`), bornées à douze mois
par une dérivation pure. C'est l'argument qui a fait pencher vers une page plutôt qu'une carte
riche : la page coûte un module pur, une route et une carte ; une carte riche aurait coûté une
quatrième lecture au plan, sur l'écran qui se recharge à chaque retour au premier plan.

## Le parcours : avant, pendant, après

| Le moment | Ce que la personne voit | Ce qui est nouveau | Ce qui l'explique |
|---|---|---|---|
| La veille | Le plan ordinaire : point ou carte d'attente, cap, action, pistes | Rien | — |
| Le jour du premier anniversaire, sur le plan | La carte « UN AN ENSEMBLE » à la place de la carte d'attente, Ramille dessous ; le point en attente, s'il y en a un, reste sous le titre | La quatrième carte d'ouverture | La carte elle-même |
| Le même jour, si la saison bascule aussi | La carte de saison ; l'anniversaire attendra le passage suivant | Rien de plus | La règle « une nouvelle à la fois » |
| « Voir mon année » | La page « Ton année » dans la pile du suivi : Ramille, l'étiquette, les dates, les blocs, la sortie | La page | Elle s'explique par ce qu'elle contient, comme le suivi |
| « Plus tard » | Le plan, carte d'attente revenue | Rien | Le lien du suivi, permanent |
| Le suivi, après | « Voir mon année » sous l'intro, pour toujours | Une ligne | — |
| « Faire un nouveau bilan » depuis la page | Le questionnaire prérempli ; la feuille de C6.2 s'il y a un engagement dans la période | Rien | Inchangé |
| Le deuxième anniversaire | « DEUX ANS ENSEMBLE », « Ton premier bilan a deux ans. », la page de la deuxième année | Le numéro | La marque porte l'année vue |

## Ce qui a été écarté, et pourquoi

1. **Une carte riche sur le plan, sans page.** Une année ne tient pas dans une carte sans compter
   par-dessus les chiffres qu'elle porte ; et une carte se referme, donc l'année disparaîtrait
   avec elle. Le plan est le **présent** ; le passé a un lieu.
2. **Un flux plein écran, hors des onglets.** Un flux a une entrée et une sortie imposées ; c'est
   la définition d'un écran qui bloque, et le brief l'exclut. La pile du suivi garde la barre,
   le retour de la plateforme, et l'adresse.
3. **Une notification ou un email d'anniversaire.** Trois raisons. La boîte d'envoi est structurée
   sur un point (`notification_outbox.checkin_id unique`) : il n'y a pas de rappel sans point, et
   en fabriquer un serait un mécanisme neuf pour une nouvelle qui n'a pas besoin de partir. La
   spec §7 interdit les rappels de plus, et les rappels s'espacent déjà d'eux-mêmes (C2.9) — un
   message annuel à quelqu'un dont les rappels sont en `silence` défairait cette règle. Et le
   moment est là où la personne est : le plan est ce que la notification du lundi ouvre. Qui n'y
   vient plus ne serait pas rattrapé par un push ; qui y vient voit la carte.
4. **« Les émissions évitées ».** C'est ce que postulat 5 espérait et ce que le §4 du brief
   interdit, et le brief a raison : les gains sont figés à la génération, personne n'a mesuré
   de réduction, et une somme de gains × semaines répondues serait un chiffre inventé sous le
   mot « évité ». La page compte des faits déclarés, et son bloc des bilans porte une note de
   méthode pour que l'écart entre deux estimations ne se lise pas comme une trajectoire.
5. **Une série la plus longue, ou un compte de semaines consécutives.** C'est un streak, donc
   une série cassée en creux. Le seul signal admis est « deux fois de suite », marqué une fois puis
   tu (C2.10) ; la page le compte **tel que le produit le définit** — combien de fois un changement
   a tenu d'une période à la suivante alors qu'il ne tenait pas avant — et jamais au-delà de
   deux. C'est la ligne la plus proche d'un score de toute la page, et elle est nommée comme
   telle dans les questions à trancher.
6. **Un an depuis le premier engagement.** Tout cycliste et tout profil sédentaire a un plan à
   zéro action depuis C2.5 : compter depuis l'engagement leur retirerait l'anniversaire, à eux
   qui « font déjà l'essentiel ». Et la restitution existe sans engagement ; le premier bilan
   est le jour où la personne existe pour le produit (§8.1).
7. **Un an depuis la création du compte.** Une session anonyme naît à l'ouverture de l'app :
   `profiles.created_at` date quelqu'un qui a peut-être fermé l'app à l'onboarding.
8. **Partager l'année.** Le partage montre un bilan (v1-06), et une page de comptes partagée hors
   de son contexte se lit comme un palmarès — de soi, mais un palmarès. Elle demanderait de
   surcroît une seconde fonction de rendu d'image (`api/share-card.ts`, runtime Node.js), sur un
   compte Vercel dont le budget est compté (`VERCEL.md` §2). Le bilan reste partageable depuis sa
   restitution, à un toucher de la page.
9. **Enrichir la carte de saison pour la rapprocher de l'annuelle.** §« Ce que le canvas
   tranche », 3.
10. **Une frise des saisons de l'année, des confettis, une illustration de fête.** Le système
    n'a « aucune célébration, confetti, son » et pas d'illustration finale. La frise a été
    dessinée puis retirée : une année à cheval sur cinq saisons met cinq libellés sous un rail de
    342 px, et à 200 % de taille de police — que rien ne plafonne (A10-21) — ils se chevauchent.
11. **Le repère national sur la page.** La restitution et le suivi le portent déjà ; le répéter
    ferait de la page une seconde restitution. La seule comparaison de la page est la personne
    avec elle-même, à un an d'écart.
12. **Ramille en bas de page**, comme sous les points du suivi. En bas, elle serait sous le bloc
    des bilans, c'est-à-dire sous deux totaux en tonnes ; en tête, elle ouvre le moment et le
    produit compte après elle. Une seule Ramille par écran, donc pas les deux.
13. **« Compris » comme sortie de la carte.** Les deux cartes qui expliquent se referment sur
    « Compris » ; celle-ci mène quelque part, et sa seconde sortie dit où ça se retrouve :
    « Plus tard ».

## Les écarts au design system que j'assume

- **Le rayon 20 des panneaux du suivi n'existe pas dans `Radius`** (`card` vaut 18) ; `suivi/index.tsx`
  l'écrit en dur (`card: { borderRadius: 20, … }`). Le handoff V1 (`docs/design/README.md`) le
  nomme « panneau 20px » ; le readme du kit ne liste que puce 8, item 14, champ 16, carte 18,
  pilule 22, bouton 27. La page d'année réemploie ce panneau tel quel, avec sa valeur en dur, parce
  qu'elle est dans la pile du suivi et doit lui ressembler. Le nommer n'appartient pas à ce
  chantier ; le relevé, si.
- **Ramille en tête d'une page qui porte des chiffres.** La règle est « jamais à côté d'un chiffre
  lourd », et elle est tenue par la distance : entre son visage et le premier total, l'étiquette,
  le titre, l'intro et un bloc entier. C'est la même lecture que le pied de la carte répondue,
  qui porte deux dates sous sa réplique.
- **« Une année » dans sa bouche.** Le test refuse tout chiffre (`\d`) ; « une saison » est déjà
  dans « On repart pour une saison. ». Nommer une période n'est pas compter.
- **Une entrée décalée des blocs (80 ms).** La seule animation ajoutée, une fois, même courbe et
  même durée que l'entrée de la carte d'ouverture. Elle tombe sans rien casser si le titulaire la
  juge de trop.
- **Aucun jeton ajouté** : couleurs, tailles, rayons, hauteurs sont ceux du dépôt.

## Ce que le kit et le code disent différemment — relevé de cette session

Deux écarts déjà consignés ailleurs (`v1-14` README, points 1 et 5 ; readme du kit) : la prop de
saison de la mascotte s'appelle `saison` et non `accessory`, et le catalogue du kit reprend le
handoff V1. Un relevé de plus, hors design system mais qui touche la page : **`formatDate`
(`src/types/suivi.ts`) écrit le jour sur deux chiffres (« 01 mars 2026 ») et passe par
`toLocaleDateString('fr-FR')`**, alors que `MOIS_FRANCAIS` existe précisément parce que Hermes peut
rendre un mois en anglais. La page d'année réutilise `formatDate` **quand même**, parce que ses
dates doivent se lire comme celles du suivi (`FRONT.md` §1.6 : un chiffre vit à un seul endroit,
et sa forme aussi) ; si la forme change un jour, c'est là, et les deux écrans suivront.

## Réponses aux trois questions du §8

**8.1 — Un an de quoi ?** **Du premier bilan.** C'est le jour où tout le reste commence — le
plan, les points, le suivi (« Ton suivi commence au premier bilan ») — et le seul qui existe pour
tout le monde, cyclistes compris. La date est le jour **local** de `assessments.submitted_at` du
premier bilan complété, comme `keepLatestPerDay` regroupe ; l'anniversaire est le même jour un an
plus tard (`setFullYear`, donc un 29 février tombe le 1er mars). L'année *n* est la fenêtre
[premier bilan + (n − 1) an, premier bilan + n ans[, close, donc relue à l'identique six mois
après — comme `assessment_results` fige un bilan.

**8.2 — Un an d'ancienneté et presque aucun point répondu.** **La page est de la taille de ce
qu'elle contient**, et elle ne dit jamais ce qui manque : sans point répondu, pas de bloc des
réponses ; sans décision, pas de bloc des décisions ; un seul bilan, une ligne qui le dit comme un
fait (« Un seul bilan cette année : celui du départ. »). Il reste Ramille, l'étiquette, le bilan du
départ et la sortie — et la sortie est ce que cette personne a de mieux à faire : son bilan a un an,
le régime de C6.3 est `insister`, et la phrase dit pourquoi sans rien lui reprocher (« les facteurs
d'émission se mettent à jour chaque trimestre… même si tes trajets n'ont pas changé »). Ce n'est ni
une fête ni une gêne : c'est le point de départ, un an après, et une porte. La carte du plan, elle,
ne promet rien de précis (« Une page pour relire l'année, depuis ton premier bilan. »), pour ne pas
annoncer des réponses à qui n'en a pas données.

**8.3 — La personne qui a changé de vie sans le dire au produit.** Rien sur la page ne présume de
ce qui s'est passé hors d'elle : les blocs comptent des réponses et des décisions, pas des
comportements, et l'absence d'un bloc n'est pas commentée. Et la sortie lui est adressée en une
phrase, en voix produit : « Ce qui a changé cette année sans que tu l'aies dit ici s'y lira
aussi. » — c'est-à-dire dans le nouveau bilan, le seul endroit où le produit peut voir un
changement qu'on ne lui a pas raconté. Le bloc des bilans à un seul bilan est la forme structurelle
de cette réponse : il ne compare rien, il date, et il laisse la porte.

## Ce qu'il reste à trancher — pour la personne qui pilote

Chaque ligne dit le fait, l'enjeu, la recommandation et ce qu'on casse en se trompant.

1. **La ligne « {k} changements ont tenu deux fois de suite. »** — c'est un compte du signal de
   C2.10 sur l'année, dans la définition du produit (jamais au-delà de deux). Recommandation :
   la garder, elle est la seule trace d'une *habitude* et le brief demande de célébrer ça. Si on la
   retire, la page ne parle plus que de réponses et de bilans ; si on la garde et qu'elle se lit
   comme un score, c'est la ligne la plus facile à retirer après coup (une dérivation, une ligne).
2. **La fenêtre de la carte : vingt-huit jours.** Enjeu : quatorze, et la carte de saison peut la
   manger entière quand les deux tombent le même jour. Recommandation : vingt-huit. Se tromper vers
   le court fait manquer l'annonce à qui ouvre l'app une fois par quinzaine ; vers le long, la
   carte devient un meuble.
3. **L'entrée décalée des blocs.** Recommandation : la garder — c'est ce qui reste de « dynamique »
   une fois les confettis refusés. La retirer ne casse rien.
4. **Mesurer l'ouverture de la page** (`annee_view`, propriété `origine: 'plan' | 'suivi'`). C'est
   la seule question que la mesure peut poser : l'annonce est-elle ouverte ? Un événement demande
   une migration et une entrée dans `src/types/analytics.ts` ; ne pas le déclarer sans l'émettre.
   Recommandation : oui, parce que c'est un moment qu'on a choisi de fabriquer et qu'on ne saura
   pas autrement s'il est vu.
5. **La page se répète-t-elle chaque année ?** Le canvas le suppose (étiquette « DEUX ANS
   ENSEMBLE », page de la deuxième année). Si non, la marque devient booléenne et le paramètre `n`
   tombe. Recommandation : oui — la matière est la même chaque année et rien n'est à redessiner.

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil du chantier C6.5, comme `v1-14-boucle-engagement/README.md` et
`v1-17-densite-du-plan/README.md` le font : le dépôt gagne, le canvas ne se réécrit pas. Deux points
déjà connus au moment de livrer :

1. **Les valeurs des planches sont des valeurs de démonstration** (31 points, 18 changements,
   3 changements tenus, 3,4 t puis 2,8 t — les tonnes sont celles du kit, « à confirmer côté
   produit »), cohérentes avec les dérivations mais relevées sur aucun compte réel.
2. **`recapEnMots` est privée dans `src/types/saison.ts`.** La page en a besoin avec un autre
   sujet (« Cette année ») ; la sortir avec le sujet en paramètre est la façon de garantir que la
   carte de saison et la page d'année ne divergent pas d'un mot. Si l'implémentation préfère une
   seconde phrase, un test doit tenir les deux ensemble.
