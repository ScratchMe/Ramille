# Recette — ce qui reste à recetter, au 2 octobre

> **Écrite le 02/10/2026**, le jour de la fusion de [#315](https://github.com/ScratchMe/Ramille/pull/315)
> (la session refusée au démarrage), quelques heures après celle de
> [#314](https://github.com/ScratchMe/Ramille/pull/314) (les lois de l'UX, `v1-33`, sur les décisions du 01/10). C'est **la seule
> feuille ouverte au navigateur** ; celle du 29/09
> ([`ce-qui-reste-apres-le-29-septembre.md`](ce-qui-reste-apres-le-29-septembre.md)) ne garde que son
> bloc 07, qui attend le build natif. Elle reprend :
>
> - **les lignes que #314 a réécrites le 01/10/2026 dans trois feuilles déjà jouées**, dont la
>   nouvelle attente n'a jamais été regardée sur la production — une ligne réécrite est une ligne
>   neuve (`RECETTE.md` §2.5) : 02.4 de la feuille du 29/09, 06.4 du
>   [premier parcours](premier-parcours-web.md), 02.9, 03.11, 08.1, 08.5, 09.1, 10.4 et 10.8 de
>   [`le-compte-et-les-modes.md`](le-compte-et-les-modes.md), et les tableaux de profil des trois.
>   Elles sont **transposées** au profil 1 plutôt que rejouées sur le leur : ce qu'elles regardent ne
>   dépend pas du profil ;
> - **ce que `v1-13` §11.W dit encore ouvert** : l'encart orphelin à revoir dans un navigateur neuf
>   (W.8, [#312](https://github.com/ScratchMe/Ramille/issues/312)), et l'e-mail de rattachement à
>   relire dans une vraie boîte depuis que son gabarit a été recopié au tableau de bord (W.9,
>   [#313](https://github.com/ScratchMe/Ramille/issues/313)) ;
> - **la moitié web de `v1-13` §11.27**, ouverte par #315 : la session refusée au démarrage.
>
> **Jouée le 02/10/2026 de 12 h 34 à 13 h 48** par l'agent (`v1-13` §20) : 40 lignes sur 40, toutes
> conformes, et un constat hors feuille ([#319](https://github.com/ScratchMe/Ramille/issues/319)).
>
> À jouer **dans un navigateur**, sur `https://www.ramille.fr`, **en une journée** — mais le bloc 03
> attend au moins une heure entre son début et sa fin.

## Pourquoi cette séance, et ce qu'elle ne fait pas

| | Sujet | D'où ça vient |
|---|---|---|
| 1 | Les vols et les longs trajets ne supposent plus rien : aucune puce cochée d'avance, et une question d'entrée « Oui / Non » | `v1-33` D1, [#314](https://github.com/ScratchMe/Ramille/pull/314) ; 02.9 du compte et des modes et les tableaux de profil réécrits |
| 2 | La restitution : le total juste sous la carte dominante, la méthode et la contestation sous le total | `v1-33` D9 et D11 ; 09.1 réécrite |
| 3 | La carte « Deux endroits, pas plus. » vue une fois, puis partie, « Compris » touché ou non | `v1-33` §6 ; 10.4 et 10.8 réécrites |
| 4 | « C’est noté » qui agit et dit ce qui manque, au lieu d'être inactif | `v1-33` D13 ; 02.4, 06.4 et 03.11 réécrites |
| 5 | La feuille « Ton plan va être recalculé » à l'entrée du nouveau bilan, plus à la soumission | `v1-33` §6 ; 08.1 et 08.5 réécrites |
| 6 | L'e-mail de rattachement : « Si ce n'est pas toi, ne fais rien » avant le code | [#313](https://github.com/ScratchMe/Ramille/issues/313), recopié au tableau de bord le 02/10/2026 ; `v1-13` §11.W.9 |
| 7 | L'encart « … n’y est plus » se tait au-dessus de l'action revenue, dans un navigateur neuf | [#312](https://github.com/ScratchMe/Ramille/issues/312) ; `v1-13` §11.W.8, `RECETTE.md` §1.10 |
| 8 | Une session refusée au démarrage ne donne plus un compte vide | [#315](https://github.com/ScratchMe/Ramille/pull/315) ; `v1-13` §11.27, `v1-27` §12.27 |
| 9 | Refermer : le compte de test supprimé, plus aucun e-mail | — |

**Elle ne rejoue pas le reste.** Les lignes revenues conformes des quatre séances précédentes
(`v1-13` §15 à §19) sont consignées dans les bases de leurs artefacts, et le parcours réel rejoue le
chemin nominal à chaque PR, sur trois profils. Le prix est celui de `RECETTE.md` §2.5 : une
régression sur un écran ancien que ni la CI ni une feuille ne regardent passera. **Et elle ne joue
rien de §11.26** — le retour matériel, le clavier, TalkBack, le voile au doigt — : c'est le bloc 07
de la feuille du 29/09, au build natif.

## Le calendrier

| Bloc | Quand | Pourquoi |
|---|---|---|
| 00 | À chaque reprise | Trente secondes qui évitent de jouer contre une base muette, ou contre la version d'avant #315 |
| 01 et 02 | Le même jour, dans cet ordre, dès que #315 est servi (00.2) | Rien n'y dépend d'une date, sauf que 01.5 à 01.13 tiennent dans la même journée : le suivi ne garde qu'un bilan par jour ; le bloc 03 reprend les comptes qu'ils laissent |
| 03 | Juste après le bloc 02, **puis au moins une heure d'attente** au milieu | Un jeton d'accès vit une heure : le refus ne se voit qu'une fois le jeton expiré |
| 04 | Après le bloc 03 | Le compte de test sert jusqu'à 03.9 |

**Si le bloc 03 est interrompu**, il reprend tant que les trois fenêtres vivent : ses comptes restent
sans session côté serveur, et l'attente est déjà faite. Mais les fenêtres ne survivent ni à l'arrêt du
pilote ni au conteneur (`RECETTE.md` §2.6) : sans elles, plus de jeton stocké à refuser, et le bloc
repart de zéro sur un compte neuf.

## Qui la joue

**L'agent joue toute la feuille**, au navigateur sans interface, sur la production, avec l'accord de
la personne qui pilote (`RECETTE.md` §1.9 et §2.6) : un seul compte de test est créé, sur l'alias
`…+ramille-p2@gmail.com` de sa boîte, et les codes y sont lus — jamais une adresse qu'on ne contrôle
pas. **Aucune ligne n'est un jugement** : chacune a son attendu, décidé le 01/10/2026 (`v1-33`) ou
avant. La capture de l'e-mail (02.3) part quand même à la personne qui pilote : c'est elle qui avait
rendu le jugement 05.2.

## Quatre précautions qui décident du résultat

- **C'est la production.** Le compte est réel et les e-mails partent vraiment. **Un compte rattaché
  part sur « Par email »** — la carte d'attente le dit aussitôt : le passer sur **« Sans rappel »**
  dès le rattachement (02.4), et ne plus y toucher, sans quoi un vrai rappel partirait
  (`RECETTE.md` §2.3). On ne déclenche jamais un rappel exprès.
- **Trois navigateurs, ou trois contextes sans stockage partagé** (A, B et C — pour l'agent, `S.C = S.A`
  puis `S.nouvelle('C', 'C')` : un contexte de plus dans le même Chromium, que `S.nouvelle(…, 'A')` ne
  ferme pas) : les fenêtres privées
  d'un même Chrome partagent le leur. Une fenêtre déjà utilisée fausse les blocs 01 et 02 (le
  brouillon, les marques du premier parcours, la marque de l'encart).
- **Une minute entre deux codes pour la même adresse** : c'est la limite du distant, pas un défaut.
- **Le bloc 03 supprime en base les sessions de deux comptes de la séance, et d'eux seuls** — celui
  de `…+ramille-p2` et le compte anonyme du bloc 01 (accord de la personne qui pilote, 02/10/2026). C'est
  le seul moyen d'obtenir un rafraîchissement refusé sans attendre des semaines ; aucune autre ligne
  d'`auth.sessions` n'est touchée, et la requête nomme ses deux identifiants.

## Comment consigner

Trois états, **jamais deux** : **conforme**, **écart**, **non joué**. Une case laissée vide est
*muette*, et se lit « non joué » — jamais « conforme ». Et **noter ce qui a été vu, pas son
interprétation** : « l'écran disait “Reconnecte-toi” » vaut mieux que « le refus a été détecté ». Les
notes de l'agent commencent par « [agent] ».

## Les profils, et ce qu'ils rendent

### Profil 1 — le rouleur du RER (blocs 01 et 03, un compte anonyme jetable)

**Mesuré le 21/09 et le 27/09/2026, puis de nouveau le 02/10/2026 après la resynchronisation ADEME
du 1er octobre** — bilan calculé puis plan généré sur la production, dans une transaction annulée :
les mêmes chiffres au dixième. À saisir **à la lettre** :

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
| Vols | **2** — rien n'est coché d'avance (01.1) —, dont **1** court (donc **un long-courrier**) |
| « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? » | **Oui** — rien n'est coché d'avance (01.3) |
| Longs trajets en train | **0**, ou laisser la série vide : elle vaut zéro |
| Longs trajets en autocar | **2** |
| Longs trajets en voiture | **2** → **Thermique** → « Vous êtes combien dans la voiture ? » → **2** |
| Zone | **Périurbain** |
| Transports en commun | **Limité** |
| Véhicules du foyer | **1** |
| Télétravail | **Deux ou plus** |

**Ce qu'il rend** : **2,5 t** (2 453,7 kg), le poste dominant « voyages longue distance », le cap
**− 406 kg**, et **dix pistes**. L'écran « Toutes les pistes » les groupe par poste :

| Groupe | Piste | Gain | Rang au plan |
|---|---|---|---|
| **Voyages longue distance** | **Renoncer à un vol long-courrier cette année** | **1 601 kg** | 1 |
| | Renoncer à un vol court ou moyen-courrier cette année | 277 kg | 2 |
| | Remplacer un aller-retour en avion par le train | 273 kg | 3 |
| | Faire un de tes longs trajets en train plutôt qu'en voiture | 48 kg | 6 |
| | Remplacer un de tes longs trajets en autocar par le train | 24 kg | 8 |
| | Faire un de tes longs trajets en autocar plutôt qu'en voiture | 23 kg | 9 |
| **Loisirs du week-end** | Faire une sortie sur trois à vélo à assistance électrique | 101 kg | 4 |
| | Regrouper deux sorties en une seule, une fois sur cinq | 67 kg | 5 |
| **Trajet domicile-travail** | Travailler depuis chez toi deux jours par semaine | 36 kg | 7 |
| | Travailler depuis chez toi un jour par semaine | 18 kg | 10 |

La piste en gras est celle qu'on engage au bloc 01, avec une **échéance** : c'est ce qui fait dire
à la feuille du nouveau bilan « et le moment que tu avais choisi » (01.11).

### Profil 2 — le cycliste passé à la voiture (blocs 02 et 03, le compte `…+ramille-p2`)

Le profil 2 de la feuille du 29/09, **saisi d'emblée en voiture** : c'est le bilan sur lequel le
contexte a été joué le 30/09. **Mesuré le 02/10/2026** de la même façon :

| Étape | Réponse, dans les mots de l'écran |
|---|---|
| Trajet régulier | **Oui** |
| Jours par semaine | **5** |
| Distance | **8 km** (saisie libre) |
| Mode | **Voiture (seul)** → « Quelle motorisation ? » → **Thermique** |
| Second mode ? | **Non** |
| Sorties | **Rarement — une fois par mois ou moins** |
| Vols | **0** |
| « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? » | **Oui** |
| Longs trajets en train | **1** |
| Longs trajets en autocar et en voiture | laisser vides, ou **0** |
| Zone | **Urbain dense** |
| Transports en commun | **Bon** |
| Véhicules du foyer | **1** |
| Télétravail | **Aucun** |

**Ce qu'il rend** : **570 kg** (569,9 kg), le trajet pour poste dominant, le cap **− 102 kg**, et
**quatre pistes**, toutes du trajet : « Passer deux trajets sur cinq en métro ou en tram » 199 kg,
« Passer deux trajets sur cinq en train » 165 kg, « Faire ce trajet à deux au moins un jour sur
deux » 128 kg, « Faire un trajet sur cinq à vélo » 102 kg.

**Et ce que `/contexte` en fait** — mesuré le 02/10/2026 sur la production, dans la même transaction
annulée, par les vrais RPC (`commit_plan_action` puis `mettre_a_jour_le_contexte`) :

| Après | Total | Plan | Archive |
|---|---|---|---|
| S'engager sur « Passer deux trajets sur cinq en métro ou en tram », deux jours | 569,9 kg | 4 pistes, la première engagée | — |
| Transports en commun → **Inexistant** | 569,9 kg | **2 pistes** : « Faire ce trajet à deux au moins un jour sur deux » 128 kg, « Faire un trajet sur cinq à vélo » 102 kg | l'action du métro, raison `contexte` |
| Puis transports → **Bon** | 569,9 kg | les **4 pistes** d'avant, **aucune engagée** : l'engagement libéré ne revient pas | inchangée (1 ligne) |

C'est exactement l'état du 1er octobre au matin (`v1-13` §19, H1) : l'action revenue au plan, sa
libération dans l'archive. Les lignes 02.9 et 02.10 regardent ce que l'encart en dit, dont 02.10 sur un appareil qui ne l'a
jamais refermé.

### Ce qui tient, et ce qui peut bouger

- **tient** : les formes (le nombre de pistes, leur groupe, leur ordre), les phrases, la présence et
  l'absence de chaque carte et de chaque écran ;
- **peut bouger** : rien des chiffres, sauf une resynchronisation des facteurs ADEME entre la mesure et
  la séance (`sync-emission-factors`, le 1er du mois à 3 h UTC) — la prochaine est le 1er novembre ;
- **dépend de l'heure** : le moment où le refus du bloc 03 se voit, qui suit l'expiration de chaque
  jeton, donc la dernière fois que chaque fenêtre l'a rafraîchi.

---

## Bloc 00 — À chaque reprise

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Ouvrir `https://www.ramille.fr/status` | « OK — N modes de transport en base », **24** jusqu'ici. Autre chose qu'un « OK » : arrêter là | |
| 00.2 | Relever la version servie | **`95c6b4c`** ([#315](https://github.com/ScratchMe/Ramille/pull/315)) ou une plus récente, lue sur Vercel par l'agent ; à défaut, le paquet JavaScript de la page porte la clé `compte_rattache`. **Avant #315, ne pas jouer le bloc 03** : il regarderait le défaut, pas sa correction | |

## Bloc 01 — Le questionnaire, la restitution et le plan d'après `v1-33` (navigateur A, profil 1)

> Décidé le 01/10/2026, fusionné le 02/10 à 2 h 52 ([#314](https://github.com/ScratchMe/Ramille/pull/314)) et vu par l'agent sur
> l'export local, jamais sur la production. Une seule fenêtre, **neuve**, du premier écran à la
> soumission d'un second bilan : le premier parcours, la carte des deux lieux et la feuille du
> nouveau bilan ne se voient qu'à ce prix. **Le compte anonyme qu'il laisse sert au bloc 03** : ne
> pas le supprimer.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | **Navigateur A**, fenêtre neuve à **390 × 844** : l'onboarding jusqu'à « Commencer », puis le **profil 1** jusqu'à l'étape des vols | « **Combien de vols prends-tu dans une année type ?** », « Un aller-retour compte pour deux vols. », les puces de 0 à 9 puis « 10+ », et **aucune n'est cochée** — « 0 » ne l'est plus d'avance. « Suivant » gris | |
| 01.2 | Toucher le « Suivant » gris | On **reste** sur l'étape ; au-dessus du bouton, « **Il manque encore le nombre de vols.** », et le focus sur « **0** ». Puis **2**, et **1** court | |
| 01.3 | « Suivant » | « **Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?** », dessous « Un aller-retour compte pour deux trajets. », deux puces « **Oui** » et « **Non** », **aucune cochée**, et aucun compteur à l'écran. Toucher le « Suivant » gris : « **Il manque encore une réponse.** » | |
| 01.4 | « **Oui** » | Trois séries s'ouvrent dessous : « **En train** », « **En autocar** », « **En voiture** », **aucune puce cochée**. Sous l'autocar, **aucune** question de motorisation ni de remplissage. « **Il manque encore le nombre de trajets.** » — dès « Oui » si la demande de 01.3 court encore, puisqu'elle suit ce qui manque (`v1-31` §2.9), sinon au toucher du « Suivant » gris *(02.9 du compte et des modes, réécrite le 01/10/2026)* | |
| 01.5 | Finir le profil 1 et soumettre | La restitution, **sans barre d'onglets**. Sous la carte du poste dominant : « Estimation annuelle, tous déplacements », le total **2,5 t**, puis « **Comment ce chiffre est calculé** », « **Un chiffre me semble faux** » et « **Ce bilan ne me ressemble pas** », alignés à gauche — un lien discret, jamais un bouton. La répartition par poste vient **après** le total *(09.1 du compte et des modes, réécrite le 01/10/2026 ; D9 et D11)* | |
| 01.6 | « **Voir ce que je peux faire** », puis « **Compris** » sur « **TON PREMIER PLAN** » | La barre d'onglets arrive, avec la carte « **PLAN ET SUIVI** » : « **Deux endroits, pas plus.** », « Ici, ton plan : l’action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison. », et Ramille : « Je note tes réponses dans ton suivi, au fil des saisons. » **Ne pas toucher son « Compris »** | |
| 01.7 | L'onglet « **Suivi** », puis de nouveau « **Plan** » ; puis recharger la page | La carte « Deux endroits, pas plus. » **ne revient pas** — ni au retour sur le plan, ni au rechargement : elle s'est vue une fois, et cela suffit *(10.4 et 10.8 du compte et des modes, réécrites le 01/10/2026)* | |
| 01.8 | « **Voir toutes les pistes · 10** », puis « **Choisir** » sur « Renoncer à un vol long-courrier cette année » | La ligne devient une carte **ouverte sur « Quand ? »** — « À mon prochain projet de voyage », « Avant mon prochain bilan » —, rien de coché, et « **C’est noté** » **gris mais actif**. Le toucher : « **Choisis une échéance.** » apparaît sous les choix, le focus va sur « À mon prochain projet de voyage », **rien ne part** (l'agent relit la base : aucun engagement) *(02.4, 06.4 et 03.11, réécrites le 01/10/2026 ; D13)* | |
| 01.9 | « **Annuler** », puis « **Choisir** » sur la dernière ligne, « Travailler depuis chez toi un jour par semaine », et « **C’est noté** » sans rien choisir | La carte s'ouvre sur « **Quels jours ?** » ; le toucher fait apparaître « **Choisis au moins un jour.** », le focus va sur le premier jour, rien ne part. Choisir un jour : la phrase **disparaît**. « Annuler » | |
| 01.10 | « **Choisir** » sur « Renoncer à un vol long-courrier cette année », « **À mon prochain projet de voyage** », « C’est noté » | Le plan, ce vol en tête sous « **TON ENGAGEMENT** ». Sur le web sans compte rattaché, la feuille des rappels ne s'ouvre pas : c'est normal | |
| 01.11 | En bas du plan, « **Revoir mon bilan** », puis « **Faire un nouveau bilan** » | **Par-dessus la première étape, dès que la lecture de l'engagement revient, avant tout geste**, une feuille : « **Ton plan va être recalculé** », « L’action que tu suis — Renoncer à un vol long-courrier cette année — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, elle ne sera plus engagée. », puis en petit « Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé, ton bilan actuel est toujours juste. », « **Commencer** » et « **Pas maintenant** » *(08.1 du compte et des modes, réécrite le 01/10/2026)* | |
| 01.12 | « **Pas maintenant** » | On **ressort** vers la restitution d'où l'on venait — pas de questionnaire, pas de première étape entrevue | |
| 01.13 | « **Faire un nouveau bilan** », « **Commencer** », puis « Suivant » à chaque étape sans rien changer, jusqu'à « **Voir mon bilan** » | La feuille redescend sur la première étape, préremplie. **La soumission ne la rouvre pas** : on arrive sur la restitution, 2,5 t. Le suivi n'en montre qu'un — deux bilans le même jour, le second est une correction —, et le plan garde le vol en tête, toujours engagé *(08.5 du compte et des modes, réécrite le 01/10/2026)* | |
| 01.14 | Laisser cette fenêtre telle quelle | — Son compte anonyme sert au 03.8 | |

## Bloc 02 — L'e-mail de rattachement, puis l'encart dans un navigateur neuf (profil 2, `…+ramille-p2`)

> **L'encart.** Le 1er octobre, sur un navigateur neuf, « … n’y est plus » se rendait au-dessus de
> l'action même que le contexte remis comme avant avait rendue au plan (`v1-13` §19, H1). Corrigé dans
> [#299](https://github.com/ScratchMe/Ramille/pull/299) : l'encart se tait quand le gabarit archivé est
> de nouveau au plan, et ne parle que d'une perte de la saison affichée. Ce bloc rejoue le chemin du
> 30/09 sur un compte neuf, **sans jamais toucher « Compris »** : le silence de 02.9 et 02.10 ne peut
> donc venir d'aucune marque locale. Et il vérifie d'abord, en 02.7 et 02.8, que l'encart **parle encore**
> quand l'action est vraiment partie.
>
> **L'e-mail.** Le gabarit réordonné a été recopié au tableau de bord le 02/10/2026, et l'agent a relu
> la configuration (identique au document). Le rattachement de ce bloc fait partir le premier vrai
> e-mail depuis la recopie.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | **Navigateur B**, fenêtre neuve : l'onboarding, le **profil 2**, soumettre ; « **Voir ce que je peux faire** », « **Compris** » | La restitution dit **570 kg** ; le plan, « Passer deux trajets sur cinq en métro ou en tram » − 199 kg en tête, « **Voir toutes les pistes · 4** » | |
| 02.2 | Le compte (icône), « **Rattacher un compte** » → « **Utiliser un email à la place** » → `…+ramille-p2@gmail.com` → « **Recevoir un code** » | L'écran du code | |
| 02.3 | **L'e-mail**, dans la boîte de l'alias | Objet « **Cette adresse vient d'être saisie dans Ramille** ». Le corps, **dans cet ordre** : « Bonjour, » ; « L'adresse …+ramille-p2@gmail.com vient d'être saisie dans Ramille, pour qu'un bilan transport puisse être retrouvé depuis un autre appareil. » ; **« Si ce n'est pas toi, ne fais rien : sans ce code, cette adresse n'est rattachée à rien — et personne ne peut le taper à ta place. »** ; « Si c'est toi, voici le code à taper dans Ramille, sur l'écran qui l'attend : » ; le code, **huit chiffres** ; « Il vaut une heure, une seule fois. » ; « — Ramille ». Aucun lien. La capture part à la personne qui pilote ([#313](https://github.com/ScratchMe/Ramille/issues/313)) | |
| 02.4 | Taper le code, puis « Toi » → « **Sans rappel** » | Le compte est rattaché : « Ton compte est rattaché à … » ; la carte d'attente passe à « Je te fais signe lundi. Par email, à … » — le canal d'un compte rattaché. « Sans rappel » coché dans « Toi » ; l'agent relit la base : canal `none`, aucun message en file | |
| 02.5 | « **Je m’y engage** » sur « Passer deux trajets sur cinq en métro ou en tram », puis « **C’est noté** » sans choisir de jour | « **Quels jours ?** », puis « **Choisis au moins un jour.** » sous les jours, le focus sur le premier, rien ne part — la même demande que sur la liste (D13), sur le plan cette fois | |
| 02.6 | Deux jours au choix, « **C’est noté** » | **La feuille des rappels s'ouvre** (le compte a une adresse confirmée), « **Sans rappel** » présélectionné — c'est le choix de 02.4 : « **Continuer sans rappel** », sans rien changer. Puis « **TON ENGAGEMENT** », l'action en tête, « le mardi et le jeudi » si ce sont les jours choisis. L'agent relit la base : canal `none`, aucun message en file | |
| 02.7 | « Toi » → « **Mon contexte de mobilité** » → « Comment sont les transports en commun près de chez toi ? » → **Inexistant**, « **Enregistrer** », puis le plan | L'encart « **Ton plan a changé avec tes nouvelles réponses de contexte. « Passer deux trajets sur cinq en métro ou en tram » n’y est plus ; elle reste dans ton suivi.** », et deux pistes : − 128 kg et − 102 kg. **Ne pas toucher « Compris »** | |
| 02.8 | **Navigateur C**, fenêtre neuve : `/connexion/retrouver`, `…+ramille-p2@gmail.com`, le code, puis le plan | **Le même encart** : l'action est vraiment partie, et un appareil qui ne l'a jamais refermé le dit. C'est le témoin — sans lui, le silence de 02.10 ne prouverait rien. **Ne pas toucher son « Compris »**. « TON PREMIER PLAN » **ne se pose pas** : l'archive porte une ligne depuis 02.7, et un compte qui s'est déjà engagé n'a plus de premier plan (`estPremierPlan`) — si elle se pose, c'est un écart | |
| 02.9 | **Navigateur B** : « Toi » → « Mon contexte de mobilité » → transports **Bon**, « **Enregistrer** », puis le plan | Les **quatre pistes** reviennent, métro ou tram en tête, **aucune engagée** — et **aucun encart « … n’y est plus »**, alors que « Compris » n'a jamais été touché ([#312](https://github.com/ScratchMe/Ramille/issues/312)). L'encart du contexte en bas du plan (« Ton plan tient compte de ton contexte : … ») reste, et c'est normal | |
| 02.10 | **Navigateur C** : recharger le plan | **Aucun encart « … n’y est plus »** au-dessus de « Passer deux trajets sur cinq en métro ou en tram ». L'agent relève de quoi attribuer ce silence à la règle et à rien d'autre : le stockage de C ne porte pas `traceverte.engagement_orphelin_vu.v1` (aucune marque) ; l'archive se lit — l'encart de 02.8 venait d'elle — et sa ligne est du **cycle affiché** (la borne de saison ne joue pas) ; et son gabarit est au plan. C'est alors la règle de [#312](https://github.com/ScratchMe/Ramille/issues/312) qui tait l'encart (`v1-13` §11.W.8, `RECETTE.md` §1.10) | |
| 02.11 | Laisser B et C sur le plan | — Le bloc 03 part de là | |

## Bloc 03 — La session refusée au démarrage (`v1-13` §11.27, moitié web)

> Livré le 02/10/2026 ([#315](https://github.com/ScratchMe/Ramille/pull/315)). **Avant**, un compte
> rattaché dont le rafraîchissement était refusé — sessions révoquées côté serveur, jeton
> d'accès expiré — se rouvrait sur une **session anonyme vide** : `auth-js` retirait lui-même la
> session pendant son initialisation, et l'app y voyait une première ouverture (`v1-27` §12.27).
> **Désormais**, une marque locale dit « cet appareil porte un compte rattaché » : sans session, sans
> erreur, avec la marque, c'est un refus, et l'écran « Reconnecte-toi pour retrouver ton bilan »
> s'affiche ; sans la marque — une session anonyme —, c'est une première ouverture.
>
> Trois fenêtres, trois chemins : **B** rouvre l'app jeton expiré (le défaut d'origine), **C** reste
> ouverte et voit le refus **en cours de route**, **A** est la session **anonyme** du bloc 01. **Une
> heure d'attente au milieu**, entre 03.3 et 03.4.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 03.1 | L'agent lit le stockage local des trois fenêtres | B et C portent `traceverte.compte_rattache.v1` ; A, anonyme, ne le porte pas | |
| 03.2 | **Quitter l'app dans A et dans B** — l'agent les mène sur `about:blank`, stockage gardé, comme on ferme un onglet. **C reste sur le plan, et on n'y touche plus** | — L'agent relève l'expiration du jeton stocké dans chaque fenêtre (`expires_at`) : c'est l'heure à partir de laquelle 03.4, 03.5 et 03.8 se jouent. Celle de C se relit encore après 03.3 : C est ouverte, et un rafraîchissement l'aurait déplacée | |
| 03.3 | L'agent supprime en base les sessions de `…+ramille-p2` et du compte anonyme de A (`delete from auth.sessions where user_id in (…)`, les deux identifiants nommés), puis relit | **Zéro** session pour ces deux comptes ; aucune autre ligne touchée. Puis **attendre** l'expiration des jetons | |
| 03.4 | **C**, laissée ouverte **sans rien y toucher**, une fois son jeton expiré — compter jusqu'à une minute de plus | L'écran « **Reconnecte-toi pour retrouver ton bilan** » se pose de lui-même sur le plan : « Ton bilan, ton plan et tes points sont rattachés à ton compte, pas à cet appareil. », « **J’ai déjà un compte** », « **Commencer un bilan sur cet appareil** » — le refus **en cours de route**. Jamais de questionnaire. L'agent note la requête qui l'a déclenché : le rafraîchissement en **400** (`POST /auth/v1/token`), ou une lecture du compte en **403** (`GET /auth/v1/user`, `session_not_found`) si quelque chose sur C a relu le compte avant l'expiration — `auth-js` retire alors la session sans attendre, d'où « sans rien y toucher » | |
| 03.5 | **B**, jeton expiré : ouvrir `https://www.ramille.fr/` | **Le même écran**, au démarrage — jamais l'onboarding, jamais « Ton bilan n’est pas encore fait ». L'agent lit le réseau : le rafraîchissement du jeton en **400**, et **aucun** `POST /auth/v1/signup` ; et en base, aucun compte anonyme créé à cette minute. **C'est le défaut que #315 ferme** | |
| 03.6 | B : « **J’ai déjà un compte** », puis le lien « **Retour** » de `/connexion/retrouver` | `/connexion/retrouver` s'affiche **sans** l'écran par-dessus ; au « Retour », **l'écran revient** : on est ressorti sans s'être reconnecté. (Le retour **du navigateur**, lui, suit l'historique — `v1-33` §9 — et peut sortir de l'app : il se note à part, ce n'est pas la ligne) | |
| 03.7 | B : « J’ai déjà un compte », puis, sur `/connexion/retrouver`, ouvrir `https://www.ramille.fr/` dans le même onglet — l'app tuée puis rouverte | **L'écran revient** au démarrage : la marque a survécu au rechargement | |
| 03.8 | **A**, jeton expiré : ouvrir `https://www.ramille.fr/` | **L'onboarding**, sans écran de reconnexion : une session anonyme refusée est une première ouverture. L'agent lit le réseau : le rafraîchissement en **400**, puis un `POST /auth/v1/signup` — une session anonyme neuve. Le bilan du bloc 01 est perdu pour cet appareil, et c'est attendu : il n'était rattaché à aucune adresse | |
| 03.9 | B : « J’ai déjà un compte » → `…+ramille-p2@gmail.com` → « **Recevoir un code** » → le code | L'écran de reconnexion ne revient pas ; le plan de `…+ramille-p2`, ses **quatre pistes**, aucune engagée, sans « TON PREMIER PLAN » (une ligne d'archive, comme en 02.8). L'agent relit le stockage : `traceverte.compte_rattache.v1` **est là** | |
| 03.10 | **C** : « **Commencer un bilan sur cet appareil** » | L'écran part, l'onboarding s'ouvre. L'agent relit le stockage de C : la marque **n’y est plus** | |

## Bloc 04 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | **B** : « Toi » → « **Supprimer mon compte** » → « **Supprimer définitivement** » | « C’est fait. » et « Revenir au début ». Au réseau, `POST /auth/v1/logout?scope=local` en **403 est attendu** (`v1-13` §16, n° 3) : ce n'est pas un écart. L'agent relit `auth.users` : plus de ligne pour l'alias | |
| 04.2 | `/connexion/retrouver` avec `…+ramille-p2@gmail.com`, une minute au moins après le dernier code | L'écran ne dit rien, et c'est voulu. **Aucun e-mail n'arrive** : le compte n'existe plus | |
| 04.3 | L'agent relève les comptes anonymes de la séance | Ceux qu'ont ouverts : le bloc 01 (A, sans session depuis 03.3) ; la fenêtre neuve de 02.8, avant que le code ne la rattache au compte ; 03.8 (A) ; et la racine de B après « Revenir au début » (04.1). Laissés à la purge des 90 jours. Leur canal est celui par défaut, « email », **sans adresse** : leur canal effectif est nul, et aucun message n'est en file | |

## Ce qui ne se joue pas ici

- **§11.26 et §11.25** : le retour matériel, le clavier, TalkBack, le voile d'une feuille au doigt,
  « Toi » au doigt — au build natif, bloc 07 de la feuille du 29/09.
- **La moitié native de §11.27** : l'app tuée par le système pendant qu'on va chercher son code, et
  le démarrage hors ligne d'un compte refusé.
- **Le refus d'un compte supprimé depuis un autre appareil** : l'écran de reconnexion s'y affiche avec
  une phrase fausse, et c'est **accepté** (`v1-27` §12.27) — pas un écart.
- **Les textes de `v1-33` §9 à valider** : ce sont des décisions de produit, pas des lignes de recette.
- **Le 403 sur `/logout`** après une suppression de compte, et **un 502 sans `x-vercel-id`** (le proxy
  de sortie de l'environnement de l'agent) : attendus, pas des constats.

## Ce que cette séance ne prouve pas

- **Rien de natif**, ni la carte des deux lieux sur un plan à zéro action : 01.6 et 01.7 la regardent
  sur un plan à dix pistes, **après** « Ton premier plan ». 10.4 et 10.8 du compte et des modes la
  regardaient **avant** — sur un plan à zéro action, la barre arrive au chargement et la carte avec elle,
  puis « Ton premier plan » se referme sans la faire revenir. La règle est la même
  (`etatDuPremierParcours`), mais cet ordre-là et le corps de cette carte-là ne sont pas rejoués.
- **Que le refus se voit à temps sur toutes les durées** : la séance le regarde une fois, une heure
  après la révocation, pas après des jours d'app fermée.
- **Que la marque est posée sur les comptes rattachés d'avant le 02/10/2026** : elle l'est à leur
  premier lancement suivant, et seul un refus survenu **avant** ce lancement retombe encore sur une
  session anonyme (`v1-27` §12.27). La séance n'a pas de tel compte.
- **Les écrans anciens** que ni la CI ni cette feuille ne regardent : le pari est écrit en tête.

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle du
§19 : ce que la séance a trouvé, **une issue par constat**, et l'accrochage à une vague. Les lignes
de §11 et de §11.W jouées le disent **en tête de leur case** — cette feuille joue §11.W.8, W.9 et la
moitié web de §11.27. Une question de produit se pose à la personne qui pilote, une par une
(`CLAUDE.md`).
