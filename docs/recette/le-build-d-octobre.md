# Recette sur téléphone — le build d'octobre

> **Écrite le 03/10/2026**, pour la séance sur le premier build Android depuis le 14/09/2026, et
> contre-lue le même jour avant d'être jouée (`RECETTE.md` §1.5). C'est **la seule feuille
> ouverte**, et elle réunit tout ce qui attend un téléphone :
>
> - **le bloc 07 de [`ce-qui-reste-apres-le-29-septembre.md`](ce-qui-reste-apres-le-29-septembre.md)**
>   (07.1 à 07.19, les lignes de `v1-13` §11 qui attendaient le build natif), repris ici et mis à jour
>   pour ce qui a changé depuis. Ces lignes sont citées **« 07.N du 29/09 »**, pour ne pas les
>   confondre avec le bloc 07 de cette feuille-ci ;
> - **les lignes à verser de [`a-verifier-sur-le-build-de-recette.md`](a-verifier-sur-le-build-de-recette.md)**
>   (A1 à A3 pour l'agent, B1 à B8 sur le téléphone), avec leurs libellés corrigés : sur Android,
>   l'export s'appelle « Exporter mes données », le lien de « Toi » s'appelle « Confidentialité », et la
>   page de suppression ne s'ouvre que dans Chrome ;
> - **les PR fusionnées depuis la dernière séance** (02/10/2026, `v1-13` §20), dont §11.28 à §11.33 :
>   le champ sous « 10+ », la quatrième fréquence des sorties, ce qui passe près de chez soi
>   (`v1-34`), la feuille qui nomme le mois, « Modifier les jours », la réponse au point qui se
>   corrige, les liens, les sorties à deux places, la bande haute, la ligne de chargement, le
>   lancement, l'export et les pages publiques, les marques locales qui suivent leur propriétaire
>   ([#319](https://github.com/ScratchMe/Ramille/issues/319), corrigée par [#323](https://github.com/ScratchMe/Ramille/pull/323)),
>   et la réponse de Claude Design à l'étape du contexte ([#343](https://github.com/ScratchMe/Ramille/pull/343)) :
>   la question d'abord, la puce à case, le bouton grisé sur un encart.
>
> À jouer **sur un téléphone Android 13 ou plus récent**, sur l'APK `preview` du build, branché sur la
> production, **en trois temps** : le jour de l'installation, la semaine qui suit, puis plus tard.

## Pourquoi cette séance, et ce qu'elle ne fait pas

| Blocs | Sujet | D'où ça vient |
|---|---|---|
| 00 | Ce que le build embarque, relevé par l'agent sur l'APK : l'identifiant publicitaire, Firebase, les permissions | `a-verifier-sur-le-build-de-recette.md` A1 à A3 ; la fiche Play |
| 01 | Le questionnaire au doigt : l'écran du mode, le second mode vierge, le champ sous « 10+ », la quatrième fréquence, les transports cochés et le dessin de leur étape | `v1-13` §11.19, §11.16, §11.31, §11.33 ; `v1-33` D5 ; `v1-34` ([#330](https://github.com/ScratchMe/Ramille/pull/330), #343) |
| 02 | Le premier parcours, la bande haute et les sorties en haut | §11.17, §11.26 (T-13, T-10) |
| 02, 04 | Le compte Google, le lien du plan, l'export et les pages publiques | B1, B1′, B2, B5, B7 ; [#324](https://github.com/ScratchMe/Ramille/pull/324) |
| 03 | La feuille des rappels, les notifications, le jeton, « Modifier l’échéance » et « Modifier les jours » | §11.29, §11.30, §11.22, §11.24, §11.33 ; B3, B4 |
| 01, 04, 05 | Le retour matériel, le clavier, le voile, la ligne de chargement, le lancement, hors ligne, la police à 200 % | §11.26, §11.5, §11.33 ; [#323](https://github.com/ScratchMe/Ramille/pull/323), [#336](https://github.com/ScratchMe/Ramille/pull/336), [#337](https://github.com/ScratchMe/Ramille/pull/337) |
| 06 | TalkBack, en une passe | §11.1 et ce que les décisions récentes y ajoutent |
| 07 | Le mouvement, avec et sans « Supprimer les animations » | §11.21 |
| 08 | La semaine qui suit : le point, sa notification, sa réponse corrigée, le mot de la veille, les deux canaux | §11.32, §11.22 |
| 09 | La session refusée sur Android, et les phases du compte sous TalkBack | §11.27 ; [#315](https://github.com/ScratchMe/Ramille/pull/315), #323 ; §11.26 (T-4) |
| 10 | La soumission coupée, retirer un bilan | §11.2, §11.20 |
| 11 | Refermer : le seul bilan retiré, le bilan suivant, la suppression du compte, « Toi » sur un compte anonyme | §11.23, §11.20, §11.25 ; B8 |
| 12 | Ce qui se joue plus tard | §11.9 à §11.11, §11.3 ; B3b, B6 |
| 13 | Ce qui se juge | — |

**Elle ne rejoue pas ce qui est revenu conforme au navigateur** : les séances du 28/09 au 02/10
(`v1-13` §15 à §20) ont vu, sur la production, tout ce que le web peut montrer de ces écrans. Elle
regarde ce que seul un téléphone montre — le doigt, le retour matériel, le clavier, TalkBack, les
notifications, les liens, AsyncStorage, Reanimated — et ce que le web n'a pas encore vu des PR du
02 et du 03/10. **Et l'étape du contexte s'y voit pour la première fois dessinée** : la réponse de
Claude Design, livrée le 03/10 (#343, `v1-34` §10), n'a été mesurée que sur l'export, sans taille de
police (§11.33).

## Le calendrier

| Bloc | Quand | Pourquoi |
|---|---|---|
| 00 | Le jour de l'installation, avant tout | L'agent relève le build pendant qu'on installe |
| 01 à 07 | Le jour de l'installation (J0), dans cet ordre | Chaque bloc part de l'état que le précédent laisse : le premier engagement doit voir la feuille des rappels, qui ne s'ouvre qu'une fois par téléphone |
| 08 | **Du dimanche soir au mardi qui suivent J0** | Le dimanche, on coupe un canal ; le point se génère le lundi matin et sa notification part ensuite ; le mot de la veille part le lundi à 18 h 30, la veille du mardi ; la réponse se corrige le mardi |
| 09 | Après le bloc 08, un jour où l'on peut attendre une heure, **avec l'accord de la personne qui pilote donné ce jour-là** | L'agent supprime en base les sessions du compte de test, puis il faut que le jeton expire |
| 10 | Juste après le bloc 09 | Il termine le brouillon commencé en 07.2 et retouché en 09.1, puis retire deux bilans |
| 11 | En dernier | Le seul bilan retiré, la suppression du compte de test ; 11.5, facultative, demande une heure et l'accord de la personne qui pilote, donné ce jour-là |
| 12 | Plus tard : à partir du 1er décembre, et juste avant Play | Des lignes qui ne se jouent qu'à une date |
| 13 | Au fil de la séance | Les jugements |

**Si J0 tombe un lundi**, jouer le bloc 08 la semaine suivante : le point du jour aura été généré
avant le premier engagement.

**Un brouillon vit de 07.2 à 10.1, et c'est voulu** : en ligne, avec un bilan complété, l'app ouvre le
plan et non la reprise, et le refus du bloc 09 passe avant lui ; aucune ligne des blocs 08 et 09 ne
démarre hors ligne, seul cas où il passerait devant le plan. 10.1 le termine, et la soumission réussie
l'efface — d'où l'onboarding de 11.1. **Sur le build suivant, un premier brouillon vit du rejeu de
01.3 à 01.8 jusqu'au bloc 06**, qui le soumet : il naît après le bloc 05, le seul qui relance l'app
hors ligne (« Le build suivant »).

**Les heures du lundi suivent l'heure d'été.** Le point se génère à 6 h UTC et les notifications
partent à 7 h UTC : **8 h et vers 9 h** à Paris jusqu'au 25 octobre, **7 h et vers 8 h** ensuite. Le
mot de la veille, lui, part toujours à 18 h 30, heure de Paris.

## Qui la joue

**La personne qui pilote joue tout ce qui se fait sur le téléphone.** L'agent fait le reste, et le
dit dans ses notes (« [agent] ») :
- il relève A1 à A3 sur l'APK, dès que le build existe ;
- il lit la base de production **en lecture seule** pour les lignes « en base », par l'identifiant du
  compte de test : `select id from auth.users where email = '<adresse du compte Google de test>';` —
  et, si la colonne `email` est vide (02.5 le dit), par
  `select user_id from auth.identities where identity_data->>'email' = '<la même adresse>';`. Un
  compte **anonyme** n'a pas d'adresse : son identifiant se lit dans « Exporter mes données »
  (`compte.identifiant`), que la personne qui pilote lui transmet ;
- il **n'écrit en base qu'au bloc 09 et en 11.5**, la suppression des sessions d'un compte nommé par
  son identifiant, et seulement avec l'accord donné ce jour-là — comme le 02/10.

## Six précautions qui décident du résultat

- **C'est la production, et le téléphone est le vrai.** Les notifications arrivent vraiment ; les
  rappels d'un compte de test aussi. Le compte est supprimé au bloc 11.
- **Une installation neuve** : désinstaller toute version précédente de Ramille avant le bloc 00. Le
  JavaScript du build est **figé au commit construit** (il n'y a pas d'`expo-updates`) : une PR fusionnée
  après le build n'est pas sur le téléphone. Relever le commit en 00.2.
- **Un compte Google de test**, dont on accepte que le nom et la photo soient enregistrés, et dont on
  lit la boîte : le bloc 09 y reçoit un code. Il est supprimé au bloc 11, et tout part avec lui.
- **La feuille des rappels ne s'ouvre qu'une fois par téléphone**, après le premier « C’est noté ».
  L'ordre du bloc 03 est fait pour elle : ne pas s'engager avant 03.2.
- **« Sans rappel » éteint aussi le mot de la veille** : 03.8 y passe, puis revient à « Par
  notification sur ce téléphone ». Sans ce retour, le bloc 08 n'a pas de mot du soir.
- **Les notifications coupées dans Android basculent le rappel sur l'e-mail** (le compte a une
  adresse) : 03.9 les coupe puis les rouvre. Sans la réouverture, un vrai e-mail partirait le lundi.

## Comment consigner

Trois états, **jamais deux** : **conforme**, **écart**, **non joué**. Une case laissée vide est
*muette*, et se lit « non joué » — jamais « conforme ». **Noter ce qui a été vu, pas son
interprétation** : « la bande a glissé avec l'écran » vaut mieux que « la bande n'est pas dans la
pile ». Les lignes « en base » sont de l'agent ; il y note la valeur relevée.

## Le profil, et ce qu'il rend

### Le profil — la conductrice qui a un RER près de chez elle

**Mesuré le 03/10/2026** sur la production, bilan calculé puis plan généré dans une transaction
annulée. À saisir **à la lettre** — le bloc 01 fait d'abord des détours sur certaines étapes, puis
revient à ces réponses :

| Étape | Réponse, dans les mots de l'écran |
|---|---|
| « As-tu un trajet régulier pour le travail ou les études ? » | **Oui** |
| Jours par semaine | **5** |
| « Quelle distance pour un aller ? » | **15** km |
| Mode | **Voiture (seul)** → « Quelle motorisation ? » → **Thermique** |
| « Utilises-tu un second mode en complément ? » | **Non** |
| Sorties du week-end | **Deux ou trois fois par mois** |
| Mode des sorties | **Voiture (seul)** → **Thermique** |
| « Quelle distance aller, en général ? » | **15 à 30 km** |
| Vols | **0** — après le détour de 01.7 |
| « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? » | **Non** — après le détour de 01.8 |
| « Dans quel type de zone vis-tu ? » | **Périurbain** |
| « Près de chez toi, qu’est-ce que tu pourrais prendre ? » | **RER ou Transilien** et **Bus** |
| « Combien de véhicules motorisés dans ton foyer ? » | **1** |
| « Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez toi ? » | **Aucun** |

**Ce qu'il rend** : **1,2 t** (1 159,9 kg), le trajet domicile-travail en voiture thermique pour poste
dominant (960 kg, 83 %), les sorties à 200 kg, aucun voyage. Le cap **− 192 kg**. **Six pistes**, et
l'action du train n'y est pas : le RER coché la remplace (`v1-34`) ; le bus ne débloque rien.

| Groupe | Piste | Gain | Rang au plan | Le choix qu'elle ouvre |
|---|---|---|---|---|
| **Trajet domicile-travail** | **Passer deux trajets sur cinq en RER** | **358 kg** | 1 | « Quels jours ? » |
| | Faire ce trajet à deux au moins un jour sur deux | 240 kg | 2 | « Quels jours ? » |
| | Faire un trajet sur cinq à vélo à assistance électrique | 177 kg | 3 | « Quels jours ? » |
| **Loisirs du week-end** | **Prendre le RER pour deux sorties sur cinq** | **74 kg** | 4 | « Quand ? » |
| | Faire une sortie sur trois à vélo à assistance électrique | 61 kg | 5 | « Quand ? » |
| | Regrouper deux sorties en une seule, une fois sur cinq | 40 kg | 6 | « Quand ? » |

Les deux pistes en gras sont celles du bloc 03 : la sortie d'abord, pour que la feuille des rappels
nomme un mois (§11.29), puis le RER du trajet, pour le mot de la veille et le point du lundi —
« Mardi ou jeudi, as-tu fait ce trajet en RER ? ».

### Ce qui tient, et ce qui peut bouger

- **tient** : les formes, les phrases, la présence et l'absence de chaque carte, l'ordre des pistes ;
- **ne bouge pas avant le 1er janvier** : les kilos. La synchronisation ADEME est trimestrielle (1er
  janvier, avril, juillet et octobre), et la mesure a été faite après celle du 1er octobre — un kilo
  ou un rang qui change est un écart, **sauf migration fusionnée depuis le 03/10** : le JavaScript du
  build est figé, la base ne l'est pas, et l'agent le vérifie avant de conclure ;
- **dépend du jour** : le mois que nomme la feuille (« Début décembre » si J0 est en octobre) ; la
  carte d'attente, qui dit « Je te fais signe lundi. » ou, quand le 1er du mois arrive avant le lundi,
  « Je te fais signe au début du mois prochain. » ; les heures du lundi (plus haut) ; les dates des
  pieds de carte.

---

## Bloc 00 — Avant la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Dans Chrome, `https://www.ramille.fr/status` (`RECETTE.md` §2.2) | « OK — N modes de transport en base ». Autre chose : on arrête, le défaut est côté configuration | |
| 00.2 | Désinstaller toute version précédente, puis installer l'APK depuis la page du build sur expo.dev | Relever le numéro du build et le **commit construit**. L'agent l'inscrit au registre d'exploitation (§3.3, la table des builds) et vérifie qu'il porte au moins `f6407cd` ([#343](https://github.com/ScratchMe/Ramille/pull/343), la réponse de Claude Design) | |
| 00.3 | **[agent]** Le manifeste Android fusionné de l'APK : la permission `com.google.android.gms.permission.AD_ID` (A1) | **Absente** : la fiche Play répond « non » à l'identifiant publicitaire. Présente : la retirer avant le build de production, ou changer la réponse | |
| 00.4 | **[agent]** L'initialisation automatique de Firebase Cloud Messaging (A2) | **Active** : la page de confidentialité dit que FCM reçoit l'identifiant de l'appareil dès le premier lancement. Inactive : la page en dit trop, à corriger, non bloquant | |
| 00.5 | **[agent]** La liste des permissions demandées (A3) | Internet, notifications, et ce qu'`expo-notifications` apporte. Autre chose : relire le formulaire « Sécurité des données » | |

## Bloc 01 — Le premier lancement et le questionnaire, au doigt (J0)

> **Avant**, chacune de ces étapes n'a été vue qu'au navigateur, à la souris. Ce bloc saisit le profil,
> avec des détours sur cinq étapes pour voir ce que les décisions du 01 et du 02/10 y ont mis. Pas
> de TalkBack ici : c'est le bloc 06.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | **Premier lancement en mode avion** | L'onboarding, « Moi, c’est Ramille. … », et aucun écran qui affirme quoi que ce soit des données de la personne (§11.5, une installation neuve ; 07.7 du 29/09). Puis couper le mode avion | |
| 01.2 | L'onboarding jusqu'à « Commencer » ; sur un petit téléphone, regarder l'illustration et la demi-barre | « J’ai déjà un compte » souligné sur l'accroche ([#335](https://github.com/ScratchMe/Ramille/pull/335)). Sur un petit écran : l'illustration recadrée garde tous ses éléments, et à l'étape 2 la demi-barre sous le bouton se lit comme « il y a une suite » (07.12 du 29/09, §11.13, §11.14). Ramille, à l'accroche, porte ses joues d'automne, qui ne font pas tache au bord (07.13 du 29/09, §11.11). Aucune invite de notification : elle viendra de la feuille des rappels | |
| 01.3 | Trajet : **Oui**, **5**, puis la distance **15** | Le clavier **numérique** s'ouvre sous « Quelle distance pour un aller ? » ; le pied et « Suivant » restent visibles au-dessus du clavier | |
| 01.4 | **L'écran du mode, au doigt** (07.1 du 29/09, §11.19) : toucher « Suivant » gris, puis **Voiture (covoiturage)**, puis **Voiture (seul)** → **Thermique** | Le « Suivant » gris mène à ce qui manque ; la taille du covoiturage se lit comme une précision de l'option (07.10 du 29/09, §11.16) ; la motorisation reste dans le champ de vision après la sélection, et le défilement qui l'amène ne se sent pas comme un saut ; changer d'avis sur le mode ne donne pas l'impression de tout recommencer. Le **filet du pied** se voit quand la suite est cachée, et les neuf modes tiennent sous les barres d'Android. Le jugement est au 13.1 | |
| 01.5 | Au second mode, toucher « Suivant » sans rien choisir, puis **Non** ; puis le **retour matériel**, et revenir | « Il manque encore une réponse sur le second mode. », rien de coché d'avance (07.10 du 29/09). Le retour matériel recule **d'une étape**, sans quitter le questionnaire (§11.26, 07.18 du 29/09) | |
| 01.6 | Sorties : **Deux ou trois fois par mois** ([#325](https://github.com/ScratchMe/Ramille/pull/325)), puis **Voiture (seul)** → **Thermique**, **15 à 30 km** | Ramille, à l'entrée de l'étape : « Pense à un mois ordinaire, pas au meilleur ni au pire. ». Quatre réponses : « Rarement — une fois par mois ou moins », « Deux ou trois fois par mois », « Une fois par semaine », « Plusieurs fois par semaine ». L'étape suivante demande le mode et la distance | |
| 01.7 | **Les vols, le champ sous « 10+ »** (§11.31) : « 10+ », « Suivant », puis taper **25**, puis **30** dans la part des courts, puis **250**, puis **10**, effacer un chiffre et taper **6** ; enfin toucher **0** | « 10+ » ouvre « Environ combien, sur une année ? », vide, et l'écran y défile **juste assez**. « Suivant » : « Il manque encore le nombre de vols. », le focus dans le champ, **un clavier numérique sans virgule**. 25 : « Sur ces 25, combien sont courts ? » arrive en champ, et 30 s'y affiche 25. 250 : « C’est beaucoup pour une année : vérifie le chiffre. ». De 10 à 16, **le champ reste ouvert et le clavier levé**. « 0 » referme le champ | |
| 01.8 | **Les longs trajets** : « Oui », « 10+ » sous « En voiture », « Suivant » champ vide, puis **14** ; enfin **Non** | « Il manque encore le nombre de trajets en voiture. » ; 14 fait apparaître « Quelle motorisation ? ». « Non » referme tout | |
| 01.9 | Le brouillon : à cette étape, **fermer l'app** (la tuer), passer en mode avion, la rouvrir ; puis couper le mode avion | « On reprend là où tu en étais. » et « Continuer mon bilan », **hors ligne** ; le questionnaire reprend à l'étape quittée (§11.5, « brouillon seul » ; 07.7 du 29/09) | |
| 01.10 | **Le contexte** (`v1-34`) : zone **Périurbain** ; « Près de chez toi… » : cocher **Métro ou tram**, puis **Rien de tout ça**, puis **RER ou Transilien** ; tout décocher, « Voir mon bilan » ; enfin **RER ou Transilien** et **Bus**, véhicules **1**, télétravail **Aucun** | Chaque question à l'encre, son aide dessous, plus claire (#343). L'aide de la zone, **une ligne par zone** : « Urbain dense : une grande ville et sa proche banlieue. », « Périurbain : sa couronne, ou une ville moyenne ou petite. », « Rural : un bourg, un village, la campagne. ». Sous la question des transports : « Coche tout ce qui passe assez souvent pour t’en servir. ». Chaque puce porte **sa case**, cochée avec la coche de l'action engagée ; « Rien de tout ça » est **sur sa ligne**, **décoche** les autres, et une autre puce la décoche. Tout décoché : « Il manque encore ce qui passe près de chez toi. ». Dès que l'étape défile, **un filet** sous la phrase de Ramille, sans rien déplacer (§11.33) | |
| 01.11 | « **Voir mon bilan** », et le **retour matériel** pendant le calcul | Le retour matériel **ne fait rien** pendant le calcul (§11.26, T-8). Puis la restitution | |

## Bloc 02 — La restitution, le premier parcours, « Toi » et le compte Google (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | La restitution | **Sans barre d'onglets**, et **sans bande vide** en bas à sa place (07.9 du 29/09, §11.17). « Ton trajet domicile-travail en voiture thermique », « 960 kg CO₂e par an, soit 83 % … », « Estimation annuelle, tous déplacements », **1,2 t CO₂e**. Le cap : « 192 kg CO₂e de moins » | |
| 02.2 | Envoyer l'app en arrière-plan (bouton d'accueil), puis la rouvrir | La barre **ne revient pas** avant l'heure (07.9 du 29/09) | |
| 02.3 | L'icône du compte → « **Toi** », compte **anonyme**, notifications pas encore demandées | « ‹ Retour » gris en haut à gauche ([#341](https://github.com/ScratchMe/Ramille/pull/341)) ; « Chargement de ton compte… », au corps courant, **si la lecture dure plus de 300 ms** — en deçà, rien, et ce n'est pas un écart ([#336](https://github.com/ScratchMe/Ramille/pull/336)) ; et **« Supprimer mon compte » ne saute pas** au point qu'un toucher s'y perde (07.19 du 29/09, §11.25). Revenir | |
| 02.4 | Sur la restitution, « **Le retrouver ailleurs** » → « **Se connecter avec Google** » → le compte Google de test (B1) | Un onglet Chrome s'ouvre, le compte se choisit, et **l'app reprend la main sans écran intermédiaire** : compte rattaché, et elle arrive **sur le plan**, où le bilan est toujours là. Sinon : noter mot pour mot ce que l'écran montre — le greffon `expo-web-browser`, sans option, n'y changerait rien (registre d'exploitation §4, tranché le 04/10/2026) : l'écart se diagnostique avant tout build —, puis, **pour que la séance continue**, rattacher la même adresse par « Utiliser un email à la place » et son code : 02.5 sera un écart, le reste se joue | |
| 02.5 | **[agent]** En base (B1′) : `select provider, identity_data ? 'full_name' or identity_data ? 'name' as nom, identity_data ? 'avatar_url' or identity_data ? 'picture' as photo from auth.identities where user_id = '<id>';` ; et `select email is not null as adresse, is_anonymous from auth.users where id = '<id>';` | **Une ligne `google`**, `nom` et `photo` à `true` ; `adresse` à `true` et `is_anonymous` à `false` — sans adresse, le code de 09.6 ne peut pas arriver. L'agent date l'entrée `ramille://**` de `docs/exploitation/redirect-urls.md` : le retour natif est éprouvé | |
| 02.6 | Le plan où 02.4 a mené : « **Compris** » sur « TON PREMIER PLAN » ; puis l'onglet « Suivi », et revenir sur « Plan » | « TON PREMIER PLAN », « Une action pour l’automne. », sans barre, et la carte **entre** — elle démarre transparente (07.9 du 29/09, §11.17) ; « Compris » : la barre arrive avec « Deux endroits, pas plus. » ; au retour de « Suivi », **la carte est partie** (§11.26, la fin de visite au changement d'onglet) | |
| 02.7 | « **Voir toutes les pistes · 6** », puis le retour matériel | **La bande haute ne glisse pas** avec l'écran : « Ramille » et l'icône du compte restent immobiles, **une seule** bande, sous l'encoche, sans espace en double (T-13). « ‹ Retour au plan » gris en haut à gauche (T-10). Le retour matériel ramène au plan | |
| 02.8 | Dans une note ou un e-mail à soi-même, toucher `https://www.ramille.fr/plan` (B5) | Il s'ouvre **dans Ramille**, pas dans le navigateur. Le build signé par Play aura une autre empreinte : c'est une autre étape (12.3). **Garder ce lien** : 11.4 s'en sert | |

## Bloc 03 — Le premier engagement, la feuille des rappels, les notifications (J0)

> **L'ordre est le cœur du bloc** : la feuille ne s'ouvre qu'une fois par téléphone. Une sortie d'abord
> (pour que la feuille nomme un mois), puis le RER du trajet (pour le mot de la veille et le point du
> lundi).

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 03.1 | Sur « Toutes les pistes » | Deux groupes, **Trajet domicile-travail** puis **Loisirs du week-end**, trois pistes chacun, dans l'ordre du tableau du profil ; **aucune action du train**. **Au doigt** (07.2 du 29/09, §11.24) : la pastille bordée « Choisir » se lit comme un bouton, et la rangée entière répond sous le doigt | |
| 03.2 | « **Choisir** » sur « **Prendre le RER pour deux sorties sur cinq** », puis « C’est noté » sans rien choisir, puis « **Le mois prochain** », « **C’est noté** » | La carte s'ouvre sur « Quand ? » — « Ce mois-ci », « Le mois prochain », « À ma prochaine occasion » ; quand « C’est noté » sort de l'écran, le défilement qui l'amène se sent naturel (§11.24). « Choisis une échéance. » au premier toucher. Puis **la feuille des rappels** s'ouvre : « Je te laisse mener ton action. **Début décembre**, je reviens te demander si tu l’as faite. » (§11.29, si J0 est en octobre), et « Comment tu préfères que je te fasse signe ? » | |
| 03.3 | Dans la feuille : « **Par notification sur ce téléphone** » → « **Autoriser les notifications** » → l'invite d'Android → **Autoriser** (B3) | La feuille redescend, le plan revient avec l'action engagée | |
| 03.4 | **[agent]** En base : `select platform, created_at, disabled_at, disabled_reason from public.push_tokens where user_id = '<id>';` (sans afficher `token`) | Une ligne `android`, `disabled_at` vide | |
| 03.5 | La carte engagée ; « **Modifier l’échéance** », puis « **Annuler** » ; à 360 dp si le téléphone le permet | « TON ENGAGEMENT », « Prendre le RER pour deux sorties sur cinq », « par an · **en novembre** · … » (§11.29) — et non « le mois prochain ». « Modifier l’échéance » et « Changer d’avis », soulignés. « Modifier l’échéance » rouvre « Quand ? » sur « Le mois prochain » (§11.30) ; « Annuler » rend la carte. À 360 dp, les deux liens passent à la ligne sans se chevaucher | |
| 03.6 | Sur la carte de « Passer deux trajets sur cinq en RER » : « **Choisir celle-ci à la place** » → « Quels jours ? » → **mardi** (la **deuxième** puce « M ») et **jeudi** → « **C’est noté** » | À 360 dp, « Quels jours ? » tient sur **quatre colonnes**, une case et une initiale par cellule (07.2 du 29/09, §11.24, §11.33). La feuille se rouvre, **directement** sur « Et la veille de tes jours de trajet, je te fais signe aussi ? », avec sa date (« Par notification, jusqu’au … »). « **Oui, la veille aussi** » | |
| 03.7 | La carte engagée du RER ; « **Modifier les jours** » : décocher jeudi, « C’est noté » ; puis tout décocher, « C’est noté » ; puis remettre **mardi et jeudi**, « C’est noté » | « par an · le mardi et le jeudi · … », « PREMIER PAS », « Vérifie l'horaire qui te convient, puis essaie-le une fois. ». « Modifier les jours » rouvre « Quels jours ? » **avec mardi et jeudi cochés**. Jeudi décoché : le bouton reste inactif jusqu'à la relecture, la carte revient avec « le mardi », et **aucune feuille** ne s'ouvre (§11.30). « C’est noté » en attente, puis grisé pendant l'envoi, **garde un bord** sur l'encart du choix des jours (§11.33). Tout décoché : « Choisis au moins un jour. ». **[agent]** L'archive porte une ligne `modification` par changement, et la sortie de 03.2 en `changement` | |
| 03.8 | « Toi » → « Les rappels » : « **Sans rappel** » ; **[agent]** la même requête qu'en 03.4 ; puis revenir à « **Par notification sur ce téléphone** » | Le jeton reste enregistré sous « Sans rappel » — `disabled_at` vide (B3). Au retour sur la notification, le réglage du mot de la veille réapparaît sous les rappels | |
| 03.9 | Couper les notifications de Ramille dans les réglages d'Android, **tuer** l'app, la rouvrir ; **[agent]** la requête ; puis **les rouvrir**, tuer, rouvrir ; **[agent]** de nouveau | Au départ à froid, **dès le premier affichage**, la carte d'attente du plan dit « Je te fais signe lundi. » (ou « au début du mois prochain » : plus haut, ce qui dépend du jour) et « Par email, à … — les notifications sont coupées sur ce téléphone. » ([#337](https://github.com/ScratchMe/Ramille/pull/337)) ; en base, `disabled_at` posé, `disabled_reason` = `permission retirée` (B4). Rouvertes : « Par notification sur ce téléphone. », et `disabled_at` de nouveau vide. **Ne pas laisser les notifications coupées** : un vrai e-mail partirait lundi | |

## Bloc 04 — « Toi », l'export, les pages publiques, le retour à nous faire, le voile (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | « Toi » → « Mes données » → « **Exporter mes données** » ; l'envoyer en note à soi-même (B2) | Le texte contient `identites_de_connexion` (fournisseur `google`, et sous `donnees_transmises` le nom et la photo), `sessions` (avec `adresse_ip` et `appareil`), et **aucun** identifiant de session ni `jeton=` suivi d'une valeur. Relever les clés présentes | |
| 04.2 | « Toi » → « **Confidentialité** » ; lire jusqu'en bas (B7) | « Politique de confidentialité », « Dernière mise à jour : 2 octobre 2026 » ; la page parle des sessions de connexion et nomme Google (nom et photo). Le texte long se lit **en entier**, sans coupure ; « ‹ Retour » en haut **et** en bas (T-10) | |
| 04.3 | Dans **Chrome** : `https://www.ramille.fr/compte/suppression` (B7) | La page s'affiche, pleine (la politique de sécurité du site est en production depuis le 03/10) ; elle dit : « … Nos sauvegardes chiffrées en gardent une copie, sessions exceptées, jusqu’à 90 jours, puis s’effacent d’elles-mêmes. … » | |
| 04.4 | « Toi » → « **Un retour à nous faire ?** » : taper deux caractères, puis toucher « **Envoyer** », **clavier ouvert** ; puis « Annuler » | « Trois caractères au moins pour pouvoir l’envoyer. » en gris pendant la frappe ; « Envoyer » s'atteint clavier ouvert (en faisant défiler s'il le faut — l'écran n'a pas de pied collant), et **un seul toucher** suffit : la phrase passe en vert gras, le focus revient au champ, **rien ne part** ([#316](https://github.com/ScratchMe/Ramille/pull/316), T-3). « Annuler » souligné | |
| 04.5 | « Toi » → « **Supprimer mon compte** », puis le **retour matériel** | La confirmation s'ouvre sur place ; le retour matériel **la referme**, sans rien supprimer (§11.26, T-8) | |
| 04.6 | « Revoir mon bilan » → « **Faire un nouveau bilan** » ; sur la feuille « Ton plan va être recalculé », toucher **le voile**, au-dessus d'elle | La feuille se referme, et l'on revient au bilan relu, comme avec « Pas maintenant » (§11.26, T-7) — sans brouillon : aucune réponse n'a changé | |
| 04.7 | À 360 dp si le téléphone le permet : « Toi », « Toutes les pistes », un bilan relu | Le trait du chevron de la sortie (« ‹ Retour », « ‹ Retour au plan », « ‹ Revenir à mon suivi ») tombe sur la marge du titre (§11.26) | |
| 04.8 | Dans les réglages d'Android, la **taille de police au plus grand** (200 % si le téléphone le permet) ; « Toi » → « **Mon contexte de mobilité** », puis « Annuler » ou la sortie ; sur le plan, « Modifier les jours », puis « Annuler » ; remettre la taille de police | Dans les transports, une pilule dont le libellé passe à la ligne (« Train (TER, Intercités) ») le fait **à côté de sa case**, sans déborder de la puce. La grille des jours, une case et une initiale par cellule, passe à **trois colonnes** plutôt que de rogner (§11.33) | |

## Bloc 05 — Le lancement, hors ligne, et les états d'échec (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 05.1 | En **4G**, wifi coupé : tuer l'app, la rouvrir, **chronométrer** de l'icône jusqu'au plan qui montre son action | Le plan arrive **sans** « Chargement de ton plan… » (T-12). Relever la durée | |
| 05.2 | **Mode avion**, tuer l'app, la rouvrir (§11.5, « bilan soumis » ; 07.7 du 29/09) ; chronométrer jusqu'à l'écran hors ligne | Le plan hors ligne et son « Réessayer », en **bien moins de 7 s** (§11.26, R-5) ; aucun écran n'affirme un fait sur les données de la personne. Toucher « Réessayer » : « Chargement de ton plan… » apparaît **tout de suite** (T-9) | |
| 05.3 | Couper le mode avion et **laisser le plan se lire** ; puis remettre le mode avion **sans tuer l'app**, et, sur la carte engagée, « **Changer d’avis** » | « Le changement n’a pas été enregistré. Vérifie ta connexion et réessaie. » (#323). **Si le changement passe quand même** (le réseau revenu entre-temps), l'engagement du RER est perdu : le reprendre, mardi et jeudi, avant le rejeu de 01.3 à 01.8 (« Le build suivant ») — 06.2 en dépend aussi — et avant le bloc 08 | |
| 05.4 | Toujours hors ligne : « Voir toutes les pistes », puis l'onglet « Suivi » | Chaque écran d'échec garde sa sortie **en haut** (T-10). Le suivi : « Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion. » et « Réessayer » ([#316](https://github.com/ScratchMe/Ramille/pull/316)) — ou son écran d'échec, s'il ne s'était jamais lu | |
| 05.5 | Couper le mode avion ; laisser l'app **en arrière-plan plus d'une heure**, puis la ramener devant | Le plan se relit **sans ligne d'erreur** : le renouvellement de la session s'arrête en arrière-plan et repart au premier plan (#323, §11.27) | |

## Bloc 06 — TalkBack, en une passe (J0)

> TalkBack activé pour tout le bloc, puis désactivé. Un nouveau bilan rejoue le questionnaire sous
> TalkBack ; les détours de 06.3 reviennent aux réponses du profil avant « Voir mon bilan », donc la
> soumission refait le même plan, et l'engagement du RER le traverse.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 06.1 | Sur le plan, « Revoir mon bilan » ; puis l'onglet « Suivi », et revenir | Une restitution relue a sa sortie « ‹ Revenir à mon suivi » **en haut**, au-dessus de « Ton bilan transport » (T-10). L'ordre de lecture suit l'écran ; les titres sont annoncés comme titres ; la mascotte est muette (07.11 du 29/09, §11.1) | |
| 06.2 | « **Faire un nouveau bilan** » | La feuille « Ton plan va être recalculé » nomme l'action du RER et « le moment que tu avais choisi ». « Commencer » | |
| 06.3 | Le questionnaire, étape par étape. **À l'écran du mode** : choisir **Voiture (covoiturage)** sans sa taille, toucher « Suivant » gris, puis revenir à **Voiture (seul)** → **Thermique**. **Au mode des sorties** : « Voir les autres modes », puis laisser **Voiture (seul)** | Le focus va au titre à chaque changement d'étape ; les puces et les rangées choisies s'annoncent comme **choisies** (noter le mot que dit TalkBack) ; « Suivant » gris s'annonce sans « indisponible », et son toucher envoie le focus au groupe qui manque (07.1 du 29/09, §11.19) ; les sorties : « **Deux ou trois fois par mois** » **cochée** (§11.28) ; « Voir les autres modes » envoie le focus sur un mode qui entre en fondu, et TalkBack l'annonce (§11.21) ; les vols : la puce « 10 vols ou plus » ; **la série des transports s'annonce en cases à cocher** : « case à cocher, cochée » sur RER et Bus, **sans lire la case** dessinée (`v1-34`, §11.33) | |
| 06.4 | Aux vols, « 10+ » puis revenir à « 0 » | Le champ s'annonce « Nombre de vols sur une année », sans « en vols » (§11.31) | |
| 06.5 | « Voir mon bilan », puis le plan ; sur la carte engagée : « Modifier les jours », puis « Annuler » ; puis « Modifier les jours », un jour décoché, « C’est noté », et le remettre | Les deux liens s'annoncent avec leur précision, « Rouvre le choix, sans libérer cette action » ; le focus va à la question, puis, après « C’est noté », à la carte qui annonce « Action engagée » et la nouvelle intention ; après « Annuler », sur « Modifier les jours » (§11.30) | |
| 06.6 | Sur le plan, « Choisir celle-ci à la place » sur une autre carte, puis « Annuler ». Puis « Toutes les pistes », « **Choisir à la place** » sur une piste — l'action du RER étant engagée —, « C’est noté » sans rien choisir, puis « Annuler » | Sur le plan : le focus va à la question, puis revient au bouton (§11.24). Sur la liste : après « Choisir à la place », la question est annoncée (« Quand ? » ou « Quels jours ? ») ; « C’est noté » en attente : le focus va sur **le premier choix** (D13) ; après « Annuler », la rangée est annoncée avec son libellé entier (07.2 du 29/09, §11.24) | |
| 06.7 | « Toi », jusqu'aux rappels | La case du mot de la veille s'annonce avec son état coché et sa ligne de détail, qui porte la date (07.3 du 29/09, §11.22) | |
| 06.8 | Désactiver TalkBack | — | |

## Bloc 07 — Le mouvement, avec et sans « Supprimer les animations » (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 07.1 | Les transitions du produit, telles que listées en `v1-30` §8.3 : ouvrir et refermer une carte de piste, une feuille, passer d'une étape à l'autre, pousser les pistes et une restitution (07.4 du 29/09, §11.21) | C'est fluide sur ce téléphone ; aucune entrée ne laisse une cible transparente ou découpée. **Sur le build qui suit le 03/10**, ce qui s'ouvre sous un choix et la carte d'une piste se **posent** sur Android, sans grandir (`FRONT-MOUVEMENT.md` §2.12) : un saut là n'est pas un écart. Le rail de progression, lui, avance-t-il ? (`v1-27` §12.32) | |
| 07.2 | Activer « Supprimer les animations » dans les réglages d'Android, **relancer** l'app, refaire 07.1 ; puis « Revoir mon bilan » → « Faire un nouveau bilan » → « Commencer » jusqu'à l'**écran du mode**, y toucher une autre option puis revenir à **Voiture (seul)** → **Thermique**, et le **retour matériel** jusqu'à sortir du questionnaire | Tout se pose d'un coup, rien ne manque ; le défilement vers « C’est noté » d'une carte de piste qui sort de l'écran se fait aussi, d'un coup (07.2 du 29/09, §11.24) ; l'écran du mode tient sans animation, la précision posée d'un coup (07.1 du 29/09, §11.19). Le brouillon laissé là sert au bloc 09 | |
| 07.3 | Désactiver « Supprimer les animations » | — | |

## Bloc 08 — La semaine qui suit : le point, le mot de la veille, la réponse corrigée

> **Du dimanche soir au mardi qui suivent J0.** Le point se génère le lundi matin, et sa notification
> part une heure après, dans le canal « Points de suivi » (les heures, plus haut). Le lundi à 18 h 30,
> la veille du mardi, le mot du soir part dans le canal « Mot de la veille ».

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 08.1 | **Le dimanche soir**, dans les réglages d'Android, les notifications de Ramille ; **couper le canal « Mot de la veille »** seul ; laisser l'app en arrière-plan | Deux canaux, « Points de suivi » et « Mot de la veille », **séparés** : l'un se coupe sans l'autre | |
| 08.2 | **Le lundi matin** : attendre la notification, la toucher ; puis **rouvrir le canal « Mot de la veille »** | La notification du point arrive **malgré le canal coupé**, rangée sous « Points de suivi » (§11.22). La toucher ouvre **le plan avec la question** — et non le plan d'avant, l'app survivant en arrière-plan (`v1-12` §8.1) | |
| 08.3 | La carte du point | « **Mardi ou jeudi, as-tu fait ce trajet en RER ?** », « Non », « Oui », et le lien sans objet. **[agent]** En base : le point `commute`, en attente, sa question figée | |
| 08.4 | « **Oui** » | La réplique de Ramille, puis le pied : « Répondu lundi. Prochain point : lundi … » | |
| 08.5 | **Le lundi à 18 h 30** | La notification « Pour demain », « **Demain, tu as prévu de faire ton trajet en RER.** », rangée sous « Mot de la veille » ; la toucher ouvre `/plan` (§11.22, 07.3 du 29/09) | |
| 08.6 | **Le mardi** : « **Modifier ma réponse** » (souligné), puis « **Annuler** » ; puis de nouveau, et « **Non** » | « Ta réponse : oui. » au-dessus de « Non », « Oui » et du lien sans objet ; « Annuler » rend la carte telle quelle. « Non » : la réplique change, le pied dit **« Répondu mardi. … »**, le jour de la correction (§11.32). Le suivi montre « **Pas cette fois** ». **[agent]** `response_kind` et `responded_at` réécrits | |
| 08.7 | Le mardi, **sous TalkBack** : « Modifier ma réponse », « **Oui** » ; puis « Modifier ma réponse », « Annuler » ; désactiver TalkBack | Le focus va à la question, qui est lue ; après « Oui », à la réplique de Ramille, qui entre en fondu et que TalkBack annonce (§11.32, §11.21) ; après « Annuler », sur « Modifier ma réponse ». Le suivi montre « Changement fait » | |

## Bloc 09 — La session refusée sur Android (l'agent écrit en base)

> **Avec l'accord de la personne qui pilote, donné le jour même**, l'agent supprime les sessions du
> compte de test (`delete from auth.sessions where user_id = '<id>'`, l'identifiant nommé, aucune autre
> ligne), puis relit : zéro. Le refus ne se voit qu'une fois le jeton d'accès expiré, **une heure** au
> plus après la dernière fois que l'app l'a rafraîchi. Joué au navigateur le 02/10 (`v1-13` §20) ;
> c'est ici la moitié Android (§11.27, 07.17 du 29/09), et les phases du compte sous TalkBack (T-4).

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 09.1 | « Revoir mon bilan » → « **Faire un nouveau bilan** » → « Commencer » ; le questionnaire reprend le brouillon de 07.2, aux réponses du profil ; à l'étape des jours par semaine, passer de **5** à **4** ; « Suivant », puis **tuer** l'app | — Le brouillon de ce compte, qui doit survivre au 09.7 | |
| 09.2 | **[agent]** La suppression des sessions, puis la relecture ; noter l'heure | Zéro session pour ce compte | |
| 09.3 | Une heure plus tard, rouvrir l'app | « **Reconnecte-toi pour retrouver ton bilan** », « Ton bilan, ton plan et tes points sont rattachés à ton compte, pas à cet appareil. », « J’ai déjà un compte », « Commencer un bilan sur cet appareil » — **jamais un questionnaire vide** | |
| 09.4 | « J’ai déjà un compte » ; sur `/connexion/retrouver`, **tuer l'app**, la rouvrir ; puis le **retour matériel** depuis `/connexion/retrouver` | L'écran revient au démarrage ; le retour matériel ramène aussi à l'écran de reconnexion, pas dans le plan | |
| 09.5 | **TalkBack activé** : « J’ai déjà un compte » → l'adresse du compte Google de test → « **Recevoir un code** » ; puis le **retour matériel** depuis l'étape du code ; désactiver TalkBack | À chaque changement de phase, le focus va au **titre** (§11.26, T-4). « Ton compte est un compte Google ? » et sa phrase sont là. Le retour matériel recule **d'une phase**, vers la saisie de l'adresse, sans quitter l'écran (§11.26, T-8 ; 07.18 du 29/09) | |
| 09.6 | Une minute plus tard, « **Recevoir un code** » de nouveau → le dernier code reçu, lu dans la boîte du compte → la **touche d'action du clavier** pour l'envoyer | La touche d'action envoie (T-3). Le plan du compte revient, sans écran de reconnexion. **C'est la première reconnexion par code d'un compte né de Google** : si aucun code n'arrive, c'est un écart sur la phrase de l'écran (« C’est la même adresse — celle de ton compte Google. »), et l'agent relit 02.5 | |
| 09.7 | « Revoir mon bilan » → « **Faire un nouveau bilan** » → « Commencer » | Le questionnaire s'ouvre sur l'étape quittée en 09.1, l'écran du mode ; un « Retour » montre les jours à **4** — une reconnexion du même compte garde son brouillon (#323). **Ne pas aller plus loin** : le bloc 10 termine ce brouillon | |

## Bloc 10 — La soumission coupée, et retirer un bilan (après le bloc 09)

> **Trois bilans valides à l'issue de 10.1** : ceux des blocs 01 et 06, tous deux de J0 — le suivi
> n'en montre qu'un par jour, le dernier, mais le plan les compte tous les deux —, et celui que 10.1
> termine. 10.2 et 10.3 en retirent deux ; 11.1 retire le dernier.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 10.1 | Dans le brouillon de 09.7, à l'étape des jours : les remettre à **5**, puis aller jusqu'à « Voir mon bilan », et passer **en mode avion juste après l'avoir touché** (§11.2, 07.8 du 29/09) | Un message d'échec, pas de restitution. Couper le mode avion, toucher de nouveau « Voir mon bilan » : la restitution, **1,2 t**. **[agent]** Aucun bilan `completed` sans réponses ; et, si la coupure est tombée après la création du bilan, la seconde tentative a repris le bilan `in_progress`. **Si la restitution s'affiche dès le premier toucher**, la coupure est arrivée trop tard : « non joué », pas « conforme » — et l'agent relève où elle est tombée | |
| 10.2 | L'onglet « Suivi » → le bilan du jour → « **Ce bilan ne me ressemble pas** » → la confirmation → retirer (07.5 du 29/09, §11.20) | « Retirer ce bilan ? », « Il n’apparaîtra plus dans ton suivi, et ton plan repartira de ton bilan précédent. », et ce que devient l'action du RER ; après le retrait, « ‹ Revenir à mon suivi » **en haut**, au-dessus de « Ce bilan a été retiré. » (T-10). Le suivi ne montre plus que J0 ; le plan : relever ce qui reste | |
| 10.3 | **Sous TalkBack** : le suivi → le bilan de J0 (celui du bloc 06) → le même retrait ; désactiver TalkBack | L'indice du lien « Ce bilan ne me ressemble pas » (« Demande une confirmation avant de retirer ce bilan ») ; le focus au titre « Retirer ce bilan ? », la même phrase qu'en 10.2 ; après le retrait, le focus au titre « Ce bilan a été retiré. », la sortie **au-dessus** de lui : le balayage vers l'avant ne la trouve plus — le jugement est au 13.4. Le suivi montre de nouveau J0 : le bilan du bloc 01 | |

## Bloc 11 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 11.1 | Le suivi : retirer **le seul bilan** qui reste, celui du bloc 01 (07.6 du 29/09, §11.23) ; puis mode avion, tuer l'app, la rouvrir ; couper le mode avion | « C’est ton seul bilan : il n’apparaîtra plus dans ton suivi, et tu repartiras d’un nouveau bilan. », et « L’action que tu suis — Passer deux trajets sur cinq en RER — ne sera plus engagée. » ; après le retrait, l'onboarding. Rouverte hors ligne : l'onboarding — **jamais** « ton plan t'attend » ni un plan | |
| 11.2 | Depuis l'onboarding, un nouveau bilan, **le profil saisi de nouveau** | La restitution **avec** la barre d'onglets, et « Deux endroits, pas plus. » ne revient pas : le premier parcours ne recommence pas sur un téléphone qui l'a vu (07.5 du 29/09, §11.20) | |
| 11.3 | « Toi » → « Supprimer mon compte », jusqu'au bout (B8) | « C’est fait. » et « Revenir au début ». **[agent]** `select count(*) from auth.users where id = '<id>';` et la même sur `public.push_tokens where user_id = '<id>'` : **0** et **0** | |
| 11.4 | « Revenir au début » ; toucher le lien `https://www.ramille.fr/plan` gardé en 02.8 ; l'icône du compte → « **Toi** » ; puis couper les notifications de Ramille dans Android, revenir, rouvrir « Toi » ; les rouvrir | « Ton bilan n’est pas encore fait », sous la bande haute. « Toi » est celui d'un **compte anonyme**, notifications ouvertes puis fermées : dans les deux cas, « Supprimer mon compte » **ne saute pas** au point qu'un toucher s'y perde (07.19 du 29/09, §11.25) | |
| 11.5 | *(Facultatif : une heure de plus, et l'accord de la personne qui pilote ce jour-là.)* Sur ce compte anonyme : « Faire mon bilan », **le profil** saisi de nouveau, jusqu'à « Compris » sur « TON PREMIER PLAN » ; « Toi » → « Exporter mes données », transmettre `compte.identifiant` à l'agent, puis **tuer** l'app ; **[agent]** supprime ses sessions ; une heure plus tard, rouvrir l'app ; **aussitôt**, mode avion, tuer, rouvrir ; couper le mode avion, puis refaire un bilan, **le profil** encore, **sans rien engager** | Le premier bilan de ce compte ouvre le premier parcours : la marque du compte supprimé ne le suit pas. Rouverte après le refus : l'onboarding, **sans** écran de reconnexion. Hors ligne : l'onboarding, jamais un plan. Le bilan suivant **rouvre le premier parcours** — restitution sans barre, « TON PREMIER PLAN » : les marques de l'ancien compte anonyme sont parties avec lui ([#319](https://github.com/ScratchMe/Ramille/issues/319), #323). Garder ce compte, sans engagement : il sert au 12.1 | |

## Bloc 12 — Plus tard

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 12.1 | **À partir du 1er décembre**, sur un compte dont le bilan d'automne a des pistes et **aucune action engagée** — celui de 11.5, gardé, ou à défaut le profil saisi exprès en novembre : la carte d'ouverture de saison (07.15 du 29/09, §11.9), puis « **Choisir une action** », sous TalkBack si possible ; enfin « Revoir mon bilan » → « Faire un nouveau bilan », regarder l'en-tête du questionnaire, et le retour matériel jusqu'à en sortir | La carte entre (elle démarre transparente) ; le trait se lit comme une mesure du temps ; Ramille dessous ne commente pas les deux nombres ; « Choisir une action » **referme la carte et amène la première piste du plan**, le focus sur elle (D16, §11.26) ; dans l'en-tête du questionnaire, le bonnet d'hiver de Ramille reste un bonnet à 28 px, sans moignon sous le revers (07.13 du 29/09, §11.11) — aucune réponse touchée, donc aucun brouillon. Sans carte : l'agent lit `plan_cycles` de ce compte avant de conclure | |
| 12.2 | Sur un compte qui a des points de plusieurs saisons : « Voir tout », sur un téléphone étroit (07.14 du 29/09, §11.10) | La liste des points groupée par saison tient | |
| 12.3 | **Juste avant la publication sur Play** (07.16 du 29/09, §11.3) | `/compte/suppression` se trouve depuis un navigateur neuf, sans l'app ; et l'empreinte de signature de Play est dans `assetlinks.json` | |
| 12.4 | *(Facultatif, Android 12 ou moins.)* Premier lancement d'une installation neuve, sans rien toucher (B3b) ; puis le lien `https://www.ramille.fr/plan` sur ce téléphone-là, l'icône du compte, « Toi » → « Exporter mes données », et transmettre `compte.identifiant` ; **[agent]** la requête de 03.4 | Le jeton est enregistré **sans aucune invite** | |
| 12.5 | *(Facultatif, `adb` branché.)* Premier lancement, **refuser** les notifications, lire `adb logcat` filtré sur `FirebaseMessaging` et `FirebaseInstallations` (B6) | Firebase s'initialise et obtient son identifiant malgré le refus — ce que dit la page de confidentialité | |

## Bloc 13 — Ce qui se juge

> **Des jugements, pas des conformités** : la question, et l'avis de qui tient le téléphone.

| # | Ce qu'on regarde | La question | Constat |
|---|---|---|---|
| 13.1 | **L'écran du mode** (01.4) | Est-ce encore pénible, au doigt ? La précision reste-t-elle dans le champ de vision, comprend-on qu'il reste quelque chose à faire quand « Suivant » est gris, et changer d'avis donne-t-il l'impression de tout recommencer ? (07.1 du 29/09, §11.19) | |
| 13.2 | **Un bilan relu** dont la sortie est montée en haut (06.1) | Lu jusqu'au bout, la cherche-t-on en bas — et l'onglet « Suivi », qui ramène à la liste, suffit-il ? C'est le seul pari de T-10 (§11.26) | |
| 13.3 | **Les liens** ([#335](https://github.com/ScratchMe/Ramille/pull/335)) : verts, gris, soulignés | Se lisent-ils au soleil et à petite taille, et chacun dit-il ce qu'il est — une action, une sortie discrète ? | |
| 13.4 | **Le focus après « Retirer ce bilan »** (10.3) | La sortie au-dessus du titre, introuvable en balayant vers l'avant : acceptable, ou le focus doit-il partir ailleurs ? (§11.26) | |
| 13.5 | **Le mouvement** (bloc 07) | Rien ne se sent comme un saut — hors ce qui se pose sur Android depuis le 03/10, qu'on juge à part : manque-t-il ? ; la carte de saison refermée, le 1er décembre (12.1), laisse-t-elle le plan remonter d'un coup — on garde l'écart, ou c'est un chantier ? (07.4 du 29/09, §11.21) | |

## Ce qui ne se joue pas ici

- **« Oui » et « Non » du point, et « Retirer ce bilan », pendant leur envoi** : §11.33 leur donne un
  bord sur l'encart, mais l'envoi dure une fraction de seconde. Vu, il se note ; pas vu, la ligne reste
  muette sur ce point — le web l'a mesuré sur l'export.
- **Le point du 1er novembre**, si la séance l'enjambe : la sortie de 03.2 ayant été remplacée par le
  RER en 03.6, il arrive avec la question générale des sorties, pas avec celle de « Prendre le RER
  pour deux sorties sur cinq » — pas un écart. Le serveur est gardé par pgTAP.
- **La carte du point répondu qui disparaît le lendemain du point suivant** (§11.32) : elle demande une
  semaine de plus, et c'est du rendu que le navigateur montre.
- **Un e-mail d'alerte d'exploitation** reçu pendant la séance ([#326](https://github.com/ScratchMe/Ramille/pull/326)) : la séance
  peut en déclencher un ; ce n'est pas un écart.
- **Le 403 sur `/logout`** après la suppression du compte : attendu (`SUPABASE.md` §1.1).

## Le build suivant

Le bloc 01, joué le 03/10/2026 au soir sur le build du jour, a rendu cinq écarts (01.3, 01.4 et
01.6 à 01.8), corrigés le même soir ([#351](https://github.com/ScratchMe/Ramille/pull/351)) : ce qui
s'ouvre sous un choix se pose sur Android, et le pied reste au-dessus du clavier. Le build suivant,
lancé le 04/10/2026 à 1 h 30 (heure de Paris), **s'installe par-dessus**, sans désinstaller : le
compte Google et la séance restent. Ce qu'il change à la séance :

- **01.3, 01.4 et 01.6 à 01.8 se rejouent entre le bloc 05 et le bloc 06, et pas avant.** Rejouer
  le questionnaire laisse un brouillon, et **hors ligne, un brouillon passe devant le plan** : avant
  le bloc 05, il prendrait la place de l'écran que 05.2 attend. Le bloc 06 le termine, donc il n'y a
  pas de bilan de plus à compter au bloc 10.
- **Par « Revoir mon bilan » → « Faire un nouveau bilan » → « Commencer »** — la feuille « Ton plan
  va être recalculé » s'ouvre d'abord, l'action du RER étant engagée (si 05.3 l'a perdue, la
  reprendre avant). Les réponses sont préremplies, donc chaque ligne se joue autrement qu'écrite :
  01.3, toucher le champ de la distance ; 01.4, **Voiture (covoiturage)** sans sa taille, toucher
  « Suivant » gris, puis **Voiture (seul)** → **Thermique** ; 01.6, « Voir les autres modes », un
  autre mode, puis revenir à **Voiture (seul)** → **Thermique** ; 01.7 et 01.8 comme écrits, depuis
  0 vol et « Non ». **01.5 ne se rejoue pas** : « Non » y est déjà coché, et son message ne peut pas
  s'afficher.
- **Sortir par le retour matériel, étape par étape, jusqu'à quitter le questionnaire.** Le brouillon
  reste alors sur la première étape, avec les réponses du profil : 06.2 le rouvre là, et le bloc 06
  le soumet.
- **J0, pour le suivi et le bloc 10, est le 04/10** : le bilan du bloc 01 a été soumis ce jour-là à
  1 h 12. Joué le même jour, le bloc 06 garde vrai ce que disent l'introduction du bloc 10, 10.2 et
  10.3 (le suivi ne montre qu'un bilan par jour) ; joué un autre jour, le suivi en montre deux, et
  l'agent réécrit ces lignes avant le bloc 10. Le bloc 08 peut commencer le soir même, si le bloc 03
  est joué avant le lundi 8 h ; sinon, la semaine suivante.
- **Ce qui s'ouvre sous un choix se pose d'un coup, sans grandir** : c'est voulu sur Android
  (`FRONT-MOUVEMENT.md` §2.12), et un saut là n'est pas un écart. L'écart, c'est que rien ne
  s'affiche.
- **Le clavier se regarde aussi en 04.4 et 09.6.**
- **L'agent a rejoué 00.3 à 00.5 sur le nouvel APK** : `AD_ID` toujours absente (A1),
  l'initialisation automatique de Firebase toujours active (A2), et les quatre permissions bloquées
  par [#350](https://github.com/ScratchMe/Ramille/pull/350) absentes de son manifeste (A3).

## Le build d'après la revue finale (04/10/2026)

La revue du 04/10/2026, faite avant la production, a été corrigée avant le build suivant (`v1-27`
§12.35 dit ce qu'elle laisse). Ce build-là **s'installe par-dessus**, comme le précédent. Quatre
lignes s'ajoutent à la séance ; les autres restent telles qu'écrites.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| R.1 | **La collision Google, entre le bloc 10 et le bloc 11** — avant la suppression du compte de test, qui la rendrait impossible. « Toi » → « **Me déconnecter de cet appareil** » : l'app repart sur l'onboarding, sans « Toi » à portée. « Commencer », un bilan avec n'importe quelles réponses, puis sur la restitution « **Le retrouver ailleurs** » → « **Se connecter avec Google** » → **le même compte Google de test**. Ensuite, sur l'écran qui s'ouvre, « **Retrouver mon compte** », l'adresse du compte de test et son code : la séance reprend sur le compte pour le bloc 11 | « **Cet appareil porte déjà un bilan** », avec « Retrouver mon compte » et « Garder ce bilan sur cet appareil ». **Jamais** « Tu peux réessayer quand tu veux. », qui était l'écart : la collision revenait comme une annulation. **[agent]** Le bloc 11 ne trouve toujours que les bilans du compte de test : celui de R.1 vit sur la session anonyme abandonnée | |
| R.2 | **La désinscription, à la fin du bloc 08.** Le point du lundi part par notification, donc aucun e-mail n'en porte le lien : **[agent]** relève le `unsubscribe_token` de la ligne d'envoi du point de 08.2 (`notification_outbox`), et envoie le lien `https://www.ramille.fr/rappels/stop?jeton=<jeton>` à qui tient le téléphone, qui l'ouvre dans Chrome | La page « Ne plus recevoir de rappels », « Tu ne recevras plus de rappels, ni par email ni par notification. Ton compte, tes bilans et ton plan ne changent pas. » et le bouton « **Couper mes rappels** » | |
| R.3 | **[agent]** La page de R.2 ouverte, **avant** le toucher : `select reminder_channel from profiles where id = '<id>';` ; puis toucher « **Couper mes rappels** », et relire | `push` avant le toucher : la page n'a rien coupé à l'ouverture. Après : « C’est fait : tu ne recevras plus de rappels, ni par email ni par notification. », et `none`. Puis rouvrir les rappels depuis « Toi », **par notification**, avant de continuer | |
| R.4 | **[agent]** Dans un navigateur, `https://www.ramille.fr/n-existe-pas` | « **Cette page n’existe pas** » et « Revenir à l’accueil » — la page de l'app, en français, et non plus « The page could not be found » | |

## Ce que cette séance ne prouve pas

- **Le build signé par Play** : B5 regarde le lien sur la clé EAS ; l'empreinte de Play est 12.3.
- **Un autre téléphone** : la séance regarde un modèle ; un écran plus petit, une autre version
  d'Android ou une surcouche de constructeur peuvent montrer autre chose.
- **La correction d'un champ « 10+ » sur un re-bilan prérempli** : 01.7 joue la même correction sur une
  première saisie, puis, au rejeu, sur un re-bilan parti de 0 vol — pas sur un bilan qui portait
  déjà 10 (§11.31).
- **Ce que la base ne voit pas d'AsyncStorage** : les marques locales se jugent au comportement (11.1,
  11.2, 11.5), pas en les lisant — dont la marque `traceverte.compte_rattache.v1` qu'attendait 07.17 du
  29/09 après la reconnexion : sans `adb`, elle ne se lit pas.
- **Une coupure entre les deux premières écritures** de la soumission : 10.1 coupe à la main, donc où
  elle tombe ; l'agent le relève, il ne le choisit pas.

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle du
§12 (la séance sur appareil du 14/09) : ce que la séance a trouvé, **une issue par constat**, et
l'accrochage à une vague. Les lignes de §11 jouées le disent **en tête de leur case**. Ce que déclenche
un écart sur une ligne de `a-verifier-sur-le-build-de-recette.md` (son §3) : sur **B1**, un
diagnostic avant tout nouveau build — le greffon `expo-web-browser` sans option ne change rien
(registre d'exploitation §4, 04/10/2026) ; sur **B1′, B2, B3, B4, B6
ou A2**, une correction de la page de confidentialité ou de l'export, avant le formulaire « Sécurité
des données » ; sur **A1**, une correction avant le build de production ; sur **B5**, une vérification
de `assetlinks.json` et de l'empreinte de la clé EAS.
