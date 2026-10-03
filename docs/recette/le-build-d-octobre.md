# Recette sur téléphone — le build d'octobre

> **Écrite le 03/10/2026**, pour la séance sur le premier build Android depuis le 14/09/2026. C'est
> **la seule feuille ouverte**, et elle réunit tout ce qui attend un téléphone :
>
> - **le bloc 07 de [`ce-qui-reste-apres-le-29-septembre.md`](ce-qui-reste-apres-le-29-septembre.md)**
>   (07.1 à 07.19, les lignes de `v1-13` §11 qui attendaient le build natif), repris ici ligne à ligne
>   et mis à jour pour ce qui a changé depuis ;
> - **les lignes à verser de [`a-verifier-sur-le-build-de-recette.md`](a-verifier-sur-le-build-de-recette.md)**
>   (A1 à A3 pour l'agent, B1 à B8 sur le téléphone), avec leurs libellés corrigés : sur Android,
>   l'export s'appelle « Exporter mes données », le lien de « Toi » s'appelle « Confidentialité », et la
>   page de suppression ne s'ouvre que dans Chrome ;
> - **les vingt-trois PR fusionnées depuis la dernière séance** (02/10/2026, `v1-13` §20), dont
>   §11.28 à §11.32 : le champ sous « 10+ », la quatrième fréquence des sorties, ce qui passe près de
>   chez soi (`v1-34`), la feuille qui nomme le mois, « Modifier les jours », la réponse au point
>   qui se corrige, les liens, les sorties à deux places, la bande haute, la ligne de chargement, le
>   lancement, l'export et les pages publiques, et les marques locales qui suivent leur propriétaire
>   ([#319](https://github.com/ScratchMe/Ramille/issues/319), corrigée par [#323](https://github.com/ScratchMe/Ramille/pull/323)).
>
> À jouer **sur un téléphone Android 13 ou plus récent**, sur l'APK `preview` du build, branché sur la
> production, **en trois temps** : le jour de l'installation, le lundi qui suit, puis plus tard.

## Pourquoi cette séance, et ce qu'elle ne fait pas

| | Sujet | D'où ça vient |
|---|---|---|
| 1 | Ce que le build embarque, relevé par l'agent sur l'APK : l'identifiant publicitaire, Firebase, les permissions | `a-verifier-sur-le-build-de-recette.md` A1 à A3 ; la fiche Play |
| 2 | Le questionnaire au doigt : l'écran du mode, le second mode vierge, le champ sous « 10+ », la quatrième fréquence, les transports cochés | `v1-13` §11.19, §11.16, §11.31 ; `v1-33` D5 ; `v1-34` ([#330](https://github.com/ScratchMe/Ramille/pull/330)) |
| 3 | Le premier parcours, la bande haute et les sorties en haut | §11.17, §11.26 (T-13, T-10) |
| 4 | Le compte Google, le lien du plan, l'export et les pages publiques | B1, B1′, B2, B5, B7 ; [#324](https://github.com/ScratchMe/Ramille/pull/324) |
| 5 | La feuille des rappels, les notifications, le jeton, le mot de la veille, « Modifier les jours » | §11.29, §11.30, §11.22, §11.24 ; B3, B4 |
| 6 | Le retour matériel, le clavier, le voile, la ligne de chargement, le lancement, hors ligne | §11.26, §11.5 ; [#323](https://github.com/ScratchMe/Ramille/pull/323), [#336](https://github.com/ScratchMe/Ramille/pull/336), [#337](https://github.com/ScratchMe/Ramille/pull/337) |
| 7 | TalkBack, en une passe | §11.1 et ce que les décisions récentes y ajoutent |
| 8 | Le mouvement, avec et sans « Supprimer les animations » | §11.21 |
| 9 | Le lundi : le point, sa notification, sa réponse corrigée, le mot de la veille | §11.32, §11.22 |
| 10 | Retirer un bilan, la soumission coupée | §11.20, §11.23, §11.2 |
| 11 | La session refusée sur Android | §11.27 ; [#315](https://github.com/ScratchMe/Ramille/pull/315), #323 |
| 12 | Refermer, et ce qui se joue plus tard | B8, §11.9, §11.3 |
| 13 | Ce qui se juge | — |

**Elle ne rejoue pas ce qui est revenu conforme au navigateur** : les séances du 28/09 au 02/10
(`v1-13` §15 à §20) ont vu, sur la production, tout ce que le web peut montrer de ces écrans. Elle
regarde ce que seul un téléphone montre — le doigt, le retour matériel, le clavier, TalkBack, les
notifications, les liens, AsyncStorage, Reanimated — et ce que le web n'a pas encore vu des PR du
02 et du 03/10. **Et la mise en page de l'étape du contexte ne se juge pas ici** : Claude Design doit
encore la reprendre (`v1-34` §8) ; on y regarde son comportement.

## Le calendrier

| Bloc | Quand | Pourquoi |
|---|---|---|
| 00 | Le jour de l'installation, avant tout | L'agent relève le build pendant qu'on installe |
| 01 à 07 | Le jour de l'installation (J0), dans cet ordre | Chaque bloc part de l'état que le précédent laisse : le premier engagement doit voir la feuille des rappels, qui ne s'ouvre qu'une fois par téléphone |
| 08 | **Le lundi qui suit J0**, le matin puis le soir | Le point hebdomadaire se génère le lundi à 8 h (heure de Paris) ; le mot de la veille part à 18 h 30 la veille d'un jour choisi |
| 09 | Après le bloc 08 | Retirer un bilan change le plan : pas avant que le point du lundi ait été vu |
| 10 | Un jour où l'on peut attendre une heure, **avec l'accord de la personne qui pilote donné ce jour-là** | L'agent supprime en base les sessions du compte de test, puis il faut que le jeton expire |
| 11 | En dernier | La suppression du compte de test |
| 12 | Plus tard : le 1er décembre, et juste avant Play | Des lignes qui ne se jouent qu'à une date |
| 13 | Au fil de la séance | Les jugements |

**Si J0 tombe un lundi**, jouer le bloc 08 le lundi suivant : le point du jour aura été généré avant
le premier engagement.

## Qui la joue

**La personne qui pilote joue tout ce qui se fait sur le téléphone.** L'agent fait le reste, et le
dit dans ses notes (« [agent] ») :
- il relève A1 à A3 sur l'APK, dès que le build existe ;
- il lit la base de production **en lecture seule** pour les lignes « en base », par l'identifiant du
  compte de test (`select id from auth.users where email = '<adresse du compte Google de test>';`) ;
- il **n'écrit en base qu'au bloc 10**, la suppression des sessions du compte de test, et seulement
  avec l'accord donné ce jour-là — comme le 02/10.

## Six précautions qui décident du résultat

- **C'est la production, et le téléphone est le vrai.** Les notifications arrivent vraiment ; les
  rappels d'un compte de test aussi. Le compte est supprimé au bloc 11.
- **Une installation neuve** : désinstaller toute version précédente de Ramille avant le bloc 00. Le
  JavaScript du build est **figé au commit construit** (il n'y a pas d'`expo-updates`) : une PR fusionnée
  après le build n'est pas sur le téléphone. Relever le commit en 00.1.
- **Un compte Google de test**, dont on accepte que le nom et la photo soient enregistrés, et dont on
  lit la boîte : le bloc 10 y reçoit un code. Il est supprimé au bloc 11, et tout part avec lui.
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
| « Distance pour un aller, en km » | **15** |
| Mode | **Voiture (seul)** → « Quelle motorisation ? » → **Thermique** |
| « Utilises-tu un second mode en complément ? » | **Non** |
| Sorties du week-end | **Deux ou trois fois par mois** |
| Mode des sorties | **Voiture (seul)** → **Thermique** |
| « Quelle distance aller, en général ? » | **15 à 30 km** |
| Vols | **0** — après le détour de 01.6 |
| « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? » | **Non** — après le détour de 01.7 |
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
- **peut bouger** : les kilos, si les facteurs ADEME se resynchronisent avant la séance (le 1er du
  mois) — de quelques unités. Un rang qui change est un écart ;
- **dépend du jour** : le mois que nomme la feuille (« Début décembre » si J0 est en octobre), et les
  dates des pieds de carte.

---

## Bloc 00 — Avant la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Désinstaller toute version précédente, puis installer l'APK depuis la page du build sur expo.dev | Relever le numéro du build et le **commit construit**. L'agent l'inscrit au registre d'exploitation (§3.3, la table des builds) et vérifie qu'il porte au moins `1b5b024` ([#341](https://github.com/ScratchMe/Ramille/pull/341)) | |
| 00.2 | **[agent]** Le manifeste Android fusionné de l'APK : la permission `com.google.android.gms.permission.AD_ID` (A1) | **Absente** : la fiche Play répond « non » à l'identifiant publicitaire. Présente : la retirer avant le build de production, ou changer la réponse | |
| 00.3 | **[agent]** L'initialisation automatique de Firebase Cloud Messaging (A2) | **Active** : la page de confidentialité dit que FCM reçoit l'identifiant de l'appareil dès le premier lancement. Inactive : la page en dit trop, à corriger, non bloquant | |
| 00.4 | **[agent]** La liste des permissions demandées (A3) | Internet, notifications, et ce qu'`expo-notifications` apporte. Autre chose : relire le formulaire « Sécurité des données » | |

## Bloc 01 — Le premier lancement et le questionnaire, au doigt (J0)

> **Avant**, chacune de ces étapes n'a été vue qu'au navigateur, à la souris. Ce bloc saisit le profil,
> avec des détours sur quatre étapes pour voir ce que les décisions du 01 et du 02/10 y ont mis. Pas
> de TalkBack ici : c'est le bloc 06.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | **Premier lancement en mode avion** | L'onboarding, « Moi, c’est Ramille. … », et aucun écran qui affirme quoi que ce soit des données de la personne (§11.5, une installation neuve). Puis couper le mode avion | |
| 01.2 | L'onboarding jusqu'à « Commencer » ; sur un petit téléphone, regarder l'illustration et la demi-barre | « J’ai déjà un compte » souligné sur l'accroche ([#335](https://github.com/ScratchMe/Ramille/pull/335)). Sur un petit écran : l'illustration recadrée garde tous ses éléments, et à l'étape 2 la demi-barre sous le bouton se lit comme « il y a une suite » (07.12, §11.13, §11.14). Aucune invite de notification : elle viendra de la feuille des rappels | |
| 01.3 | Trajet : **Oui**, **5**, puis la distance **15** | Le clavier **numérique** s'ouvre sur « Distance pour un aller, en km » ; le pied et « Suivant » restent visibles au-dessus du clavier | |
| 01.4 | **L'écran du mode, au doigt** (07.1, §11.19) : toucher « Suivant » gris, puis **Voiture (covoiturage)**, puis **Voiture (seul)** → **Thermique** | Le « Suivant » gris mène à ce qui manque ; la taille du covoiturage se lit comme une précision de l'option (07.10, §11.16) ; la motorisation reste dans le champ de vision après la sélection ; changer d'avis sur le mode ne donne pas l'impression de tout recommencer. Le jugement est au 13.1 | |
| 01.5 | Au second mode, toucher « Suivant » sans rien choisir, puis **Non** ; puis le **retour matériel**, et revenir | « Il manque encore une réponse sur le second mode. », rien de coché d'avance (07.10). Le retour matériel recule **d'une étape**, sans quitter le questionnaire (§11.26) | |
| 01.6 | Sorties : **Deux ou trois fois par mois** ([#325](https://github.com/ScratchMe/Ramille/pull/325)), puis **Voiture (seul)** → **Thermique**, **15 à 30 km** | Ramille, à l'entrée de l'étape : « Pense à un mois ordinaire, pas au meilleur ni au pire. ». Quatre réponses : « Rarement — une fois par mois ou moins », « Deux ou trois fois par mois », « Une fois par semaine », « Plusieurs fois par semaine ». L'étape suivante demande le mode et la distance | |
| 01.7 | **Les vols, le champ sous « 10+ »** (§11.31) : « 10+ », « Suivant », puis taper **25**, puis **30** dans la part des courts, puis **250**, puis **10**, effacer un chiffre et taper **6** ; enfin toucher **0** | « 10+ » ouvre « Environ combien, sur une année ? », vide, et l'écran y défile **juste assez**. « Suivant » : « Il manque encore le nombre de vols. », le focus dans le champ, **un clavier numérique sans virgule**. 25 : « Sur ces 25, combien sont courts ? » arrive en champ, et 30 s'y affiche 25. 250 : « C’est beaucoup pour une année : vérifie le chiffre. ». De 10 à 16, **le champ reste ouvert et le clavier levé**. « 0 » referme le champ | |
| 01.8 | **Les longs trajets** : « Oui », « 10+ » sous « En voiture », « Suivant » champ vide, puis **14** ; enfin **Non** | « Il manque encore le nombre de trajets en voiture. » ; 14 fait apparaître « Quelle motorisation ? ». « Non » referme tout | |
| 01.9 | Le brouillon : à cette étape, **fermer l'app** (la tuer), passer en mode avion, la rouvrir ; puis couper le mode avion | Le questionnaire **reprend** où il en était, hors ligne (§11.5, « brouillon seul ») | |
| 01.10 | **Le contexte** (`v1-34`) : zone **Périurbain** ; « Près de chez toi… » : cocher **Métro ou tram**, puis **Rien de tout ça**, puis **RER ou Transilien** ; tout décocher, « Voir mon bilan » ; enfin **RER ou Transilien** et **Bus**, véhicules **1**, télétravail **Aucun** | L'aide de la zone : « Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne. ». Sous la question des transports : « Coche tout ce qui passe assez souvent pour t’en servir. ». « Rien de tout ça » **décoche** les autres, et une autre puce la décoche. Tout décoché : « Il manque encore ce qui passe près de chez toi. ». **La mise en page ne se juge pas** | |
| 01.11 | « **Voir mon bilan** », et le **retour matériel** pendant le calcul | Le retour matériel **ne fait rien** pendant le calcul (§11.26, T-8). Puis la restitution | |

## Bloc 02 — La restitution, le premier parcours, « Toi » et le compte Google (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | La restitution | **Sans barre d'onglets**, et **sans bande vide** en bas à sa place (07.9, §11.17). « Ton trajet domicile-travail en voiture thermique », « 960 kg CO₂e par an, soit 83 % … », « Estimation annuelle, tous déplacements », **1,2 t CO₂e**. Le cap : « 192 kg CO₂e de moins » | |
| 02.2 | Envoyer l'app en arrière-plan (bouton d'accueil), puis la rouvrir | La barre **ne revient pas** avant l'heure (07.9) | |
| 02.3 | L'icône du compte → « **Toi** », compte **anonyme**, notifications pas encore demandées | « ‹ Retour » gris en haut à gauche ([#341](https://github.com/ScratchMe/Ramille/pull/341)) ; « Chargement de ton compte… » le temps de la lecture, au corps courant ([#336](https://github.com/ScratchMe/Ramille/pull/336)) ; et **« Supprimer mon compte » ne saute pas** au point qu'un toucher s'y perde (07.19, §11.25). Revenir | |
| 02.4 | Sur la restitution, « **Le retrouver ailleurs** » → « **Se connecter avec Google** » → le compte Google de test (B1) | Un onglet Chrome s'ouvre, le compte se choisit, et **l'app reprend la main sans écran intermédiaire** : compte rattaché, le bilan toujours là. Sinon : noter mot pour mot ce que l'écran montre — c'est le seul cas où l'agent ajoute le greffon `expo-web-browser` | |
| 02.5 | **[agent]** En base (B1′) : `select provider, identity_data ? 'full_name' or identity_data ? 'name' as nom, identity_data ? 'avatar_url' or identity_data ? 'picture' as photo from auth.identities where user_id = '<id>';` | **Une ligne `google`**, `nom` et `photo` à `true`. L'agent date l'entrée `ramille://**` de `docs/exploitation/redirect-urls.md` : le retour natif est éprouvé | |
| 02.6 | « **Voir ce que je peux faire** », puis « **Compris** » sur « TON PREMIER PLAN » ; puis l'onglet « Suivi », et revenir sur « Plan » | « TON PREMIER PLAN », « Une action pour l’automne. », sans barre ; « Compris » : la barre arrive avec « Deux endroits, pas plus. » ; au retour de « Suivi », **la carte est partie** (§11.26, la fin de visite au changement d'onglet) | |
| 02.7 | « **Voir toutes les pistes · 6** », puis le retour matériel | **La bande haute ne glisse pas** avec l'écran : « Ramille » et l'icône du compte restent immobiles, **une seule** bande, sous l'encoche, sans espace en double (T-13). « ‹ Retour au plan » gris en haut à gauche (T-10). Le retour matériel ramène au plan | |
| 02.8 | Dans une note ou un e-mail à soi-même, toucher `https://www.ramille.fr/plan` (B5) | Il s'ouvre **dans Ramille**, pas dans le navigateur. Le build signé par Play aura une autre empreinte : c'est une autre étape (12.3) | |

## Bloc 03 — Le premier engagement, la feuille des rappels, les notifications (J0)

> **L'ordre est le cœur du bloc** : la feuille ne s'ouvre qu'une fois par téléphone. Une sortie d'abord
> (pour que la feuille nomme un mois), puis le RER du trajet (pour le mot de la veille et le point du
> lundi).

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 03.1 | Sur « Toutes les pistes » | Deux groupes, **Trajet domicile-travail** puis **Loisirs du week-end**, trois pistes chacun, dans l'ordre du tableau du profil ; **aucune action du train**. **Au doigt** (07.2, §11.24) : la pastille bordée « Choisir » se lit comme un bouton, et la rangée entière répond sous le doigt | |
| 03.2 | « **Choisir** » sur « **Prendre le RER pour deux sorties sur cinq** », puis « C’est noté » sans rien choisir, puis « **Le mois prochain** », « **C’est noté** » | La carte s'ouvre sur « Quand ? » — « Ce mois-ci », « Le mois prochain », « À ma prochaine occasion » ; « Choisis une échéance. » au premier toucher. Puis **la feuille des rappels** s'ouvre : « Je te laisse mener ton action. **Début décembre**, je reviens te demander si tu l’as faite. » (§11.29, si J0 est en octobre), et « Comment tu préfères que je te fasse signe ? » | |
| 03.3 | Dans la feuille : « **Par notification sur ce téléphone** » → « **Autoriser les notifications** » → l'invite d'Android → **Autoriser** (B3) | La feuille redescend, le plan revient avec l'action engagée | |
| 03.4 | **[agent]** En base : `select platform, created_at, disabled_at, disabled_reason from public.push_tokens where user_id = '<id>';` (sans afficher `token`) | Une ligne `android`, `disabled_at` vide | |
| 03.5 | La carte engagée ; « **Modifier l’échéance** », puis « **Annuler** » ; à 360 dp si le téléphone le permet | « TON ENGAGEMENT », « Prendre le RER pour deux sorties sur cinq », « par an · **en novembre** · … » (§11.29) — et non « le mois prochain ». « Modifier l’échéance » et « Changer d’avis », soulignés. « Modifier l’échéance » rouvre « Quand ? » sur « Le mois prochain » (§11.30) ; « Annuler » rend la carte. À 360 dp, les deux liens passent à la ligne sans se chevaucher | |
| 03.6 | Sur la carte de « Passer deux trajets sur cinq en RER » : « **Choisir celle-ci à la place** » → « Quels jours ? » → **mardi** et **jeudi** → « **C’est noté** » | La feuille se rouvre, **directement** sur « Et la veille de tes jours de trajet, je te fais signe aussi ? », avec sa règle et sa date. « **Oui, la veille aussi** » | |
| 03.7 | La carte engagée du RER ; « **Modifier les jours** » : décocher jeudi, « C’est noté » ; puis tout décocher, « C’est noté » ; puis remettre **mardi et jeudi**, « C’est noté » | « par an · le mardi et le jeudi · … », « PREMIER PAS », « Vérifie l'horaire qui te convient, puis essaie-le une fois. ». « Modifier les jours » rouvre « Quels jours ? » **avec mardi et jeudi cochés**. Jeudi décoché : le bouton reste inactif jusqu'à la relecture, la carte revient avec « le mardi », et **aucune feuille** ne s'ouvre (§11.30). Tout décoché : « Choisis au moins un jour. ». **[agent]** L'archive porte une ligne `modification` par changement, et la sortie de 03.2 en `changement` | |
| 03.8 | « Toi » → « Les rappels » : « **Sans rappel** » ; **[agent]** la même requête qu'en 03.4 ; puis revenir à « **Par notification sur ce téléphone** » | Le jeton reste enregistré sous « Sans rappel » — `disabled_at` vide (B3). Au retour sur la notification, le réglage du mot de la veille réapparaît sous les rappels | |
| 03.9 | Couper les notifications de Ramille dans les réglages d'Android, **tuer** l'app, la rouvrir ; **[agent]** la requête ; puis **les rouvrir**, tuer, rouvrir ; **[agent]** de nouveau | Au départ à froid, **dès le premier affichage**, la carte d'attente du plan dit « Je te fais signe lundi. » et « Par email, à … — les notifications sont coupées sur ce téléphone. » ([#337](https://github.com/ScratchMe/Ramille/pull/337)) ; en base, `disabled_at` posé, `disabled_reason` = `permission retirée` (B4). Rouvertes : « Par notification sur ce téléphone. », et `disabled_at` de nouveau vide. **Ne pas laisser les notifications coupées** : un vrai e-mail partirait lundi | |

## Bloc 04 — « Toi », l'export, les pages publiques, le retour à nous faire (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | « Toi » → « Mes données » → « **Exporter mes données** » ; l'envoyer en note à soi-même (B2) | Le texte contient `identites_de_connexion` (fournisseur `google`, et sous `donnees_transmises` le nom et la photo), `sessions` (avec `adresse_ip` et `appareil`), et **aucun** identifiant de session ni `jeton=` suivi d'une valeur. Relever les clés présentes | |
| 04.2 | « Toi » → « **Confidentialité** » ; lire jusqu'en bas (B7) | « Politique de confidentialité », « Dernière mise à jour : 2 octobre 2026 » ; la page parle des sessions de connexion et nomme Google (nom et photo). Le texte long se lit **en entier**, sans coupure ; « ‹ Retour » en haut **et** en bas (T-10) | |
| 04.3 | Dans **Chrome** : `https://www.ramille.fr/compte/suppression` (B7) | La page s'affiche, pleine (la politique de sécurité du site est en production depuis le 03/10) ; elle dit : « … Nos sauvegardes chiffrées en gardent une copie, sessions exceptées, jusqu’à 90 jours, puis s’effacent d’elles-mêmes. … » | |
| 04.4 | « Toi » → « **Un retour à nous faire ?** » : taper deux caractères, puis toucher « **Envoyer** », **clavier ouvert** ; puis « Annuler » | « Trois caractères au moins pour pouvoir l’envoyer. » en gris pendant la frappe ; **un seul toucher** sur « Envoyer », clavier ouvert, suffit : la phrase passe en vert gras, le focus revient au champ, **rien ne part** ([#316](https://github.com/ScratchMe/Ramille/pull/316), T-3). Le pied reste au-dessus du clavier. « Annuler » souligné | |
| 04.5 | « Toi » → « **Supprimer mon compte** », puis le **retour matériel** | La confirmation s'ouvre sur place ; le retour matériel **la referme**, sans rien supprimer (§11.26, T-8) | |

## Bloc 05 — Le lancement, hors ligne, et les états d'échec (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 05.1 | En **4G**, wifi coupé : tuer l'app, la rouvrir, **chronométrer** de l'icône jusqu'au plan qui montre son action | Le plan arrive **sans** « Chargement de ton plan… » (T-12). Relever la durée | |
| 05.2 | **Mode avion**, tuer l'app, la rouvrir (§11.5, « bilan soumis ») | Le plan hors ligne et son « Réessayer » ; aucun écran n'affirme un fait sur les données de la personne. Toucher « Réessayer » : « Chargement de ton plan… » apparaît **tout de suite** (T-9) | |
| 05.3 | Toujours hors ligne, si le plan s'est lu avant : sur la carte engagée, « **Changer d’avis** » | « Le changement n’a pas été enregistré. Vérifie ta connexion et réessaie. » (#323) | |
| 05.4 | Toujours hors ligne : « Toutes les pistes », puis l'onglet « Suivi » | Chaque écran d'échec garde sa sortie **en haut** (T-10). Le suivi : « Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion. » et « Réessayer » ([#316](https://github.com/ScratchMe/Ramille/pull/316)) — ou son écran d'échec, s'il ne s'était jamais lu | |
| 05.5 | Couper le mode avion ; laisser l'app **en arrière-plan plus d'une heure**, puis la ramener devant | Le plan se relit **sans ligne d'erreur** : le renouvellement de la session s'arrête en arrière-plan et repart au premier plan (#323, §11.27) | |

## Bloc 06 — TalkBack, en une passe (J0)

> TalkBack activé pour tout le bloc, puis désactivé. Un nouveau bilan rejoue le questionnaire sous
> TalkBack, sans rien changer aux réponses : la soumission refait le même plan, et l'engagement du
> RER le traverse.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 06.1 | Le plan, l'onglet « Suivi », « Revoir mon bilan » | Une restitution relue a sa sortie « ‹ Revenir à mon suivi » **en haut**, au-dessus de « Ton bilan transport » (T-10). L'ordre de lecture suit l'écran ; les titres sont annoncés comme titres ; la mascotte est muette (07.11, §11.1) | |
| 06.2 | « **Faire un nouveau bilan** » | La feuille « Ton plan va être recalculé » nomme l'action du RER et « le moment que tu avais choisi ». « Commencer » | |
| 06.3 | Le questionnaire, étape par étape, sans rien changer | Le focus va au titre à chaque changement d'étape ; « sélectionné » sur les puces cochées ; les sorties : « **Deux ou trois fois par mois** » **cochée** (§11.28) ; les vols : la puce « 10 vols ou plus » ; **la série des transports s'annonce en cases à cocher**, « coché » sur RER et Bus (`v1-34`) | |
| 06.4 | Aux vols, « 10+ » puis revenir à « 0 » | Le champ s'annonce « Nombre de vols sur une année », sans « en vols » (§11.31) | |
| 06.5 | « Voir mon bilan », puis le plan ; sur la carte engagée : « Modifier les jours », puis « Annuler » ; puis « Modifier les jours », un jour décoché, « C’est noté », et le remettre | Les deux liens s'annoncent avec leur précision, « Rouvre le choix, sans libérer cette action » ; le focus va à la question, puis, après « C’est noté », à la carte qui annonce « Action engagée » et la nouvelle intention ; après « Annuler », sur « Modifier les jours » (§11.30) | |
| 06.6 | « Toutes les pistes », « Choisir » sur une piste, « C’est noté » sans rien choisir, puis « Annuler » | Après « Choisir », la question est annoncée (« Quand ? » ou « Quels jours ? ») ; « C’est noté » en attente : le focus va sur **le premier choix** (D13) ; après « Annuler », la rangée est annoncée avec son libellé entier (07.2, §11.24) | |
| 06.7 | « Toi », puis « Rattacher un compte » si on le voit, ou un écran de connexion | Le focus va au **titre** à chaque changement de phase des écrans de compte (§11.26, T-4) ; la case du mot de la veille sous les rappels se lit avec sa date (07.3) | |
| 06.8 | Désactiver TalkBack | — | |

## Bloc 07 — Le mouvement, avec et sans « Supprimer les animations » (J0)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 07.1 | Les transitions du produit, telles que listées en `v1-30` §8.3 : ouvrir et refermer une carte de piste, une feuille, passer d'une étape à l'autre, pousser les pistes et une restitution (07.4, §11.21) | C'est fluide sur ce téléphone ; aucune entrée ne laisse une cible transparente ou découpée | |
| 07.2 | Activer « Supprimer les animations » dans les réglages d'Android, **relancer** l'app, refaire 07.1 | Tout se pose d'un coup, rien ne manque ; le défilement vers « C’est noté » d'une carte de piste qui sort de l'écran se fait aussi (07.2 de la feuille du 29/09, §11.24) | |
| 07.3 | Désactiver « Supprimer les animations » | — | |

## Bloc 08 — Le lundi : le point, sa réponse corrigée, le mot de la veille

> **Le lundi qui suit J0.** Le point se génère à 8 h (heure de Paris) ; sa notification part ensuite,
> dans le canal « Points de suivi ». Le soir, à 18 h 30, la veille du mardi, le mot du soir part dans
> le canal « Mot de la veille ».

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 08.1 | Le matin, **l'app en arrière-plan depuis la veille** : attendre la notification, la toucher | La notification du point, rangée sous « Points de suivi ». La toucher ouvre **le plan avec la question** — et non le plan d'avant, l'app survivant en arrière-plan (`v1-12` §8.1) | |
| 08.2 | La carte du point | « **Mardi ou jeudi, as-tu fait ce trajet en RER ?** », « Non », « Oui », et le lien sans objet. **[agent]** En base : le point `commute`, en attente, sa question figée | |
| 08.3 | « **Oui** » | La réplique de Ramille, puis le pied : « Répondu lundi. Prochain point : lundi … » | |
| 08.4 | « **Modifier ma réponse** » (souligné), puis « **Annuler** » ; puis de nouveau, et « **Non** » | « Ta réponse : oui. » au-dessus de « Non », « Oui » et du lien sans objet ; « Annuler » rend la carte telle quelle. « Non » : la réplique change, le pied dit le jour de la correction (§11.32). Le suivi montre « non ». **[agent]** `response_kind` et `responded_at` réécrits | |
| 08.5 | Le soir, à 18 h 30 | La notification « **Demain, tu as prévu de faire ton trajet en RER.** », rangée sous « Mot de la veille » ; la toucher ouvre `/plan` (§11.22, 07.3) | |
| 08.6 | Dans les réglages d'Android, les deux canaux de Ramille | « Points de suivi » et « Mot de la veille », **séparés** : couper l'un ne coupe pas l'autre | |

## Bloc 09 — Retirer un bilan, et la soumission coupée (après le bloc 08)

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 09.1 | « Revoir mon bilan » → « Faire un nouveau bilan » → « Commencer », puis jusqu'à « Voir mon bilan », et **le mode avion juste après l'avoir touché** (§11.2) | Un message d'échec, pas de restitution. Couper le mode avion, toucher de nouveau « Voir mon bilan » : la restitution. **[agent]** Aucun bilan `completed` sans réponses, et la seconde tentative a repris le bilan `in_progress` | |
| 09.2 | Le suivi → le bilan du jour → « **Ce bilan ne me ressemble pas** » → la confirmation → retirer (07.5, §11.20) | « Retirer ce bilan ? », sa phrase selon la place du bilan ; après le retrait, « ‹ Revenir à mon suivi » **en haut**, au-dessus de « Ce bilan a été retiré. » (T-10). Le suivi, le plan : relever ce qui reste | |
| 09.3 | Le même retrait **sous TalkBack**, sur un autre bilan s'il en reste deux, sinon au bloc 11 | L'indice du lien « Ce bilan ne me ressemble pas » ; le focus au titre « Retirer ce bilan ? » ; après le retrait, le focus au titre « Ce bilan a été retiré. », la sortie **au-dessus** de lui : le balayage vers l'avant ne la trouve plus — le jugement est au 13.4 | |

## Bloc 10 — La session refusée sur Android (l'agent écrit en base)

> **Avec l'accord de la personne qui pilote, donné le jour même**, l'agent supprime les sessions du
> compte de test (`delete from auth.sessions where user_id = '<id>'`, l'identifiant nommé, aucune autre
> ligne), puis relit : zéro. Le refus ne se voit qu'une fois le jeton d'accès expiré, **une heure** au
> plus après la dernière fois que l'app l'a rafraîchi. Joué au navigateur le 02/10 (`v1-13` §20) ;
> c'est ici la moitié Android (§11.27).

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 10.1 | Commencer un nouveau bilan, répondre à deux étapes en **changeant** une réponse, puis tuer l'app | — Le brouillon de ce compte, qui doit survivre au 10.5 | |
| 10.2 | **[agent]** La suppression des sessions, puis la relecture ; noter l'heure | Zéro session pour ce compte | |
| 10.3 | Une heure plus tard, rouvrir l'app | « **Reconnecte-toi pour retrouver ton bilan** », « Ton bilan, ton plan et tes points sont rattachés à ton compte, pas à cet appareil. », « J’ai déjà un compte », « Commencer un bilan sur cet appareil » — **jamais un questionnaire vide** | |
| 10.4 | « J’ai déjà un compte » ; sur `/connexion/retrouver`, **tuer l'app**, la rouvrir ; puis le **retour matériel** depuis `/connexion/retrouver` | L'écran revient au démarrage ; le retour matériel ramène aussi à l'écran de reconnexion, pas dans le plan | |
| 10.5 | « J’ai déjà un compte » → l'adresse du compte Google de test → « Recevoir un code » → le code, lu dans sa boîte ; la **touche d'action du clavier** pour envoyer | La touche d'action envoie (T-3). Le plan du compte revient, sans écran de reconnexion ; puis « Revoir mon bilan » → « Faire un nouveau bilan » : **la réponse changée en 10.1 est toujours là** — une reconnexion du même compte garde son brouillon (#323) | |

## Bloc 11 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 11.1 | Le suivi : retirer **le seul bilan** qui reste (07.6, §11.23), puis mode avion, tuer l'app, la rouvrir | L'onboarding — **jamais** « ton plan t'attend » ni un plan. Couper le mode avion | |
| 11.2 | « Toi » → « Supprimer mon compte », jusqu'au bout (B8) | « C’est fait. » et « Revenir au début ». **[agent]** `select count(*) from auth.users where id = '<id>';` et la même sur `public.push_tokens where user_id = '<id>'` : **0** et **0** | |
| 11.3 | *(Facultatif, une heure de plus.)* « Revenir au début », un bilan anonyme quelconque ; **[agent]** supprime ses sessions ; une heure plus tard, rouvrir l'app, puis refaire un bilan | L'onboarding, **sans** écran de reconnexion ; et le bilan suivant **rouvre le premier parcours** — restitution sans barre, « TON PREMIER PLAN » : les marques de l'ancien compte anonyme sont parties avec lui ([#319](https://github.com/ScratchMe/Ramille/issues/319), #323). Hors ligne ensuite : l'onboarding, jamais un plan | |

## Bloc 12 — Plus tard

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 12.1 | **À partir du 1er décembre**, sur un compte qui a un bilan d'automne — par exemple le bilan anonyme de 11.3, gardé : la carte d'ouverture de saison (07.15, §11.9), et « Choisir une action » | La carte entre (elle démarre transparente) ; le trait se lit comme une mesure du temps ; Ramille dessous ne commente pas les deux nombres ; « Choisir une action » mène à la liste et y amène la première piste (D16) ; le bonnet de Ramille reste un bonnet à 28 px, sans moignon sous le revers (07.13, §11.11) | |
| 12.2 | Sur un compte qui a des points de plusieurs saisons : « Voir tout », sur un téléphone étroit (07.14, §11.10) | La liste des points groupée par saison tient | |
| 12.3 | **Juste avant la publication sur Play** (07.16, §11.3) | `/compte/suppression` se trouve depuis un navigateur neuf, sans l'app ; et l'empreinte de signature de Play est dans `assetlinks.json` | |
| 12.4 | *(Facultatif, Android 12 ou moins.)* Premier lancement d'une installation neuve, sans rien toucher (B3b) ; **[agent]** la requête de 03.4 | Le jeton est enregistré **sans aucune invite** | |
| 12.5 | *(Facultatif, `adb` branché.)* Premier lancement, **refuser** les notifications, lire `adb logcat` filtré sur `FirebaseMessaging` et `FirebaseInstallations` (B6) | Firebase s'initialise et obtient son identifiant malgré le refus — ce que dit la page de confidentialité | |

## Bloc 13 — Ce qui se juge

> **Des jugements, pas des conformités** : la question, et l'avis de qui tient le téléphone.

| # | Ce qu'on regarde | La question | Constat |
|---|---|---|---|
| 13.1 | **L'écran du mode** (01.4) | Est-ce encore pénible, au doigt ? La précision reste-t-elle dans le champ de vision, comprend-on qu'il reste quelque chose à faire quand « Suivant » est gris, et changer d'avis donne-t-il l'impression de tout recommencer ? (07.1, §11.19) | |
| 13.2 | **Un bilan relu** dont la sortie est montée en haut (06.1) | Lu jusqu'au bout, la cherche-t-on en bas — et l'onglet « Suivi », qui ramène à la liste, suffit-il ? C'est le seul pari de T-10 (§11.26) | |
| 13.3 | **Les liens** ([#335](https://github.com/ScratchMe/Ramille/pull/335)) : verts, gris, soulignés | Se lisent-ils au soleil et à petite taille, et chacun dit-il ce qu'il est — une action, une sortie discrète ? | |
| 13.4 | **Le focus après « Retirer ce bilan »** (09.3) | La sortie au-dessus du titre, introuvable en balayant vers l'avant : acceptable, ou le focus doit-il partir ailleurs ? (§11.26) | |
| 13.5 | **Le mouvement** (bloc 07) | Rien ne se sent comme un saut ; la carte de saison refermée, le 1er décembre (12.1), laisse-t-elle le plan remonter d'un coup — on garde l'écart, ou c'est un chantier ? (07.4) | |

## Ce qui ne se joue pas ici

- **La mise en page de l'étape du contexte** : Claude Design la reprend (`v1-34` §8). Son comportement
  se joue en 01.10 ; son dessin se jugera sur le build qui la portera.
- **« C’est noté » en attente qui se fond dans l'encart gris du choix des jours** : une question
  ouverte côté design (brief de `v1-34`, §4.5) — pas un écart.
- **La question du point du 1er novembre** pour une sortie engagée « Le mois prochain » : la sortie de
  03.2 est remplacée par le RER en 03.6, donc aucun point du 1er novembre ne la portera. Le serveur est
  gardé par pgTAP.
- **Un e-mail d'alerte d'exploitation** reçu pendant la séance ([#326](https://github.com/ScratchMe/Ramille/pull/326)) : la séance
  peut en déclencher un ; ce n'est pas un écart.
- **Le 403 sur `/logout`** après la suppression du compte : attendu (`SUPABASE.md` §1.1).

## Ce que cette séance ne prouve pas

- **Le build signé par Play** : B5 regarde le lien sur la clé EAS ; l'empreinte de Play est 12.3.
- **Un autre téléphone** : la séance regarde un modèle ; un écran plus petit, une autre version
  d'Android ou une surcouche de constructeur peuvent montrer autre chose.
- **La correction d'un champ « 10+ » sur un re-bilan prérempli** : 01.7 joue la même correction sur une
  première saisie, pas sur un bilan qui portait déjà 10 (§11.31).
- **Ce que la base ne voit pas d'AsyncStorage** : les marques locales se jugent au comportement (11.3),
  pas en les lisant.

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle du
§12 (la séance sur appareil du 14/09) : ce que la séance a trouvé, **une issue par constat**, et
l'accrochage à une vague. Les lignes de §11 jouées le disent **en tête de leur case**. Un écart sur
A1, B1′, B2, B3, B4 ou A2 déclenche une correction de la page de confidentialité ou de l'export
avant le formulaire « Sécurité des données » ; un écart sur B1, le greffon `expo-web-browser` et un
nouveau build — au plus un tous les deux jours.
