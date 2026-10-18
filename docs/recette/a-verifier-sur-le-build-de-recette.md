# À vérifier sur le build de recette — la liste remise à l'agent de recette

> **Écrite le 03/10/2026 par l'agent technique**, à la demande de la personne qui pilote : la
> recette sur appareil se jouera sur le premier build Android depuis le 14/09/2026, et on profite
> de ce build pour vérifier ce qui était prévu « sur le premier build » (feuille de lancement :
> rejouer la connexion Google). **Ce n'est pas une feuille de séance** au sens de
> [`RECETTE.md`](../../RECETTE.md) : ce sont des lignes à **verser dans la feuille** de la recette sur
> appareil, chacune avec son attente et ce qu'il faut relever. L'agent de recette garde le format,
> le profil et la numérotation de sa feuille.
>
> **Pourquoi ces lignes.** Chacune vérifie une phrase **déjà publiée** — sur la page de
> confidentialité, sur la page de suppression, ou dans la fiche Play qui sera déclarée à Google
> ([`fiche-google-play.md`](../exploitation/fiche-google-play.md)) — et qui n'a été que **lue dans le
> code**, jamais constatée sur un build. Un écart ici veut dire une page ou une déclaration à
> corriger avant le test fermé, pas un défaut de l'app.
>
> **Versées le 03/10/2026 dans [`le-build-d-octobre.md`](le-build-d-octobre.md)**, la feuille de la
> séance, où elles se jouent : A1 à A3 en 00.3 à 00.5, B1 et B1′ en 02.4 et 02.5, B5 en 02.8, B3 en
> 03.3, 03.4 et 03.8, B4 en 03.9, B2 en 04.1, B7 en 04.2 et 04.3, B8 en 11.3, B3b et B6 en 12.4 et
> 12.5. Trois libellés y sont corrigés d'après le code : sur Android, l'export s'appelle « Exporter mes
> données » (« Télécharger mes données » est celui du web) ; le lien de « Toi » vers la politique
> s'appelle « Confidentialité » ; et la page publique de suppression ne s'atteint pas depuis l'app —
> « Supprimer mon compte », dans « Toi », ouvre la confirmation —, elle s'ouvre dans Chrome. Ce
> document reste la liste d'origine, et ce qu'un écart y déclenche (§3) vaut toujours.
>
> **B9 à B14, ajoutées le 18/10/2026, ne sont versées dans aucune feuille.** Elles vérifient ce que la vague
> d'audit du jour a écrit et qu'un appareil seul peut montrer : les pannes que le rendu ne voit pas, la
> version lue du module natif, le jeton d'appareil retenté, le démarrage quand le jeton d'accès a expiré hors
> ligne (`remontee-erreurs.md` §3 ter, `COMPTE.md` §3, `FRONT-SESSION.md`). Elles attendent un build qui porte
> cette vague, et se versent dans la feuille qui le jouera ; `v1-13` §11.35 à §11.38 les portent.

## 1. Ce que l'agent technique relève seul, sur l'artefact du build

Rien à faire en séance : ces trois lignes se lisent dans le manifeste Android **fusionné** de l'APK,
que l'agent technique télécharge dès que le build existe. Elles sont ici pour que la séance sache
qu'elles sont couvertes.

| | Ce qui est relevé | Attendu | Si ce n'est pas le cas |
|---|---|---|---|
| A1 | La permission `com.google.android.gms.permission.AD_ID` | **Absente** : la fiche répond « non » à l'identifiant publicitaire (§4) | La retirer (`android.blockedPermissions` dans `app.json`) avant le build de production, ou changer la réponse — Play refuse un « non » contredit par le manifeste |
| A2 | L'initialisation automatique de Firebase Cloud Messaging (`firebase_messaging_auto_init_enabled`, ou son absence) | **Active** : la page de confidentialité dit que FCM reçoit l'identifiant de l'appareil dès le premier lancement, que les notifications soient acceptées ou non | La page en dit trop : la corriger. Elle déclare plutôt trop que pas assez, donc ce n'est pas bloquant |
| A3 | La liste des permissions demandées | Celles que la fiche suppose : Internet, notifications, et ce que `expo-notifications` apporte | Relire le formulaire « Sécurité des données » (fiche §5) |

## 2. Sur l'appareil

**Avant de commencer.**
- **Une installation neuve** : désinstaller toute version précédente de Ramille.
- **Android 13 ou plus récent** pour tout le bloc. Un second téléphone sous **Android 12 ou moins**
  sert à la ligne B3b seulement, s'il y en a un.
- **Un compte Google de test**, dont on accepte que le nom et la photo soient enregistrés : la
  ligne B8 supprime le compte à la fin, et tout part avec lui.
- **L'agent de recette lit la base de production en lecture seule** (requêtes ci-dessous). L'identifiant du
  compte se retrouve par l'adresse du compte Google de test :
  `select id from auth.users where email = '<adresse du compte de test>';`
- **B9 et B11 demandent une exception volontaire, et aucun geste du produit n'en provoque une** : aucun
  déclencheur de panne n'a été trouvé dans `src/` (relevé le 18/10/2026). Le build qui les joue doit en porter
  un, temporaire — une exception levée dans un minuteur, un rejet de promesse que personne n'attend —, retiré
  avant la production et jamais fusionné. C'est un build de plus : un par deux jours au plus (registre
  d'exploitation §3.3), donc **une décision de la personne qui pilote, avant le build**.

| | À faire | Attendu | À relever |
|---|---|---|---|
| B1 | Faire un bilan, puis, sur l'écran de connexion (atteint depuis la restitution ou depuis « Toi »), **« Se connecter avec Google »**, et choisir le compte de test | Un onglet Chrome s'ouvre, le compte se choisit, et **l'app reprend la main sans écran intermédiaire** : compte rattaché, et le bilan est toujours là — le même compte, pas un nouveau | Si l'onglet ne revient pas dans l'app, reste blanc ou affiche une erreur : le noter mot pour mot, avec ce que l'écran montre. **C'est le seul cas où l'agent technique ajoute le greffon `expo-web-browser`** — il n'est volontairement pas dans `app.json` |
| B1′ | — (en base) | `select provider, identity_data ? 'full_name' or identity_data ? 'name' as nom, identity_data ? 'avatar_url' or identity_data ? 'picture' as photo from auth.identities where user_id = '<id>';` rend **une ligne `google`**, avec `nom` et `photo` à `true` | Les trois valeurs. La page dit que Google nous transmet le nom et la photo : jusqu'ici, c'est lu dans la documentation de Supabase, jamais constaté — la production ne portait aucune identité Google au 02/10/2026 |
| B2 | « Toi » → « Mes données » → **« Télécharger mes données »**. Sur Android, le JSON part en texte dans la feuille de partage : l'envoyer dans une note ou à soi-même | Le texte contient `identites_de_connexion` (fournisseur `google`, et sous `donnees_transmises` le nom et la photo), `sessions` (avec `adresse_ip` et `appareil`), et **aucun** identifiant de session ni `jeton=` suivi d'une valeur | Les clés présentes ; la présence d'une adresse IP dans `sessions` |
| B3 | À l'invite des notifications : **accepter**. Puis, dans « Toi », choisir **« Sans rappel »** (ou les rappels par e-mail) | Le jeton de l'appareil est enregistré **quel que soit le canal** — la page le dit | `select platform, created_at, disabled_at, disabled_reason from public.push_tokens where user_id = '<id>';` : une ligne `android`, `disabled_at` vide. Ne pas afficher la colonne `token` |
| B3b | *(Facultatif, Android 12 ou moins.)* Premier lancement, sans toucher à rien | Le jeton est enregistré **sans aucune invite** — la page le dit | La même requête |
| B4 | Couper les notifications de Ramille dans les réglages d'Android, puis **fermer complètement l'app** et la rouvrir | Au démarrage à froid, le jeton est désactivé | La même requête : `disabled_at` posé, `disabled_reason` = `permission retirée` |
| B5 | Sur le téléphone, toucher un lien `https://www.ramille.fr/plan` (dans une note, un e-mail à soi-même) | Il s'ouvre **dans Ramille**, pas dans le navigateur — le build est signé par la clé EAS dont l'empreinte est dans `assetlinks.json` | Où il s'ouvre. Le build signé par Play aura une autre empreinte : c'est une étape à part (feuille de lancement), pas cette séance |
| B6 | *(Facultatif, si `adb` est branché.)* Premier lancement, **refuser** les notifications, et lire `adb logcat` filtré sur `FirebaseMessaging` et `FirebaseInstallations` | Firebase s'initialise et obtient son identifiant malgré le refus — ce que dit la page | Les lignes qui le montrent, ou leur absence. A2 couvre déjà la configuration ; ceci couvre le comportement |
| B7 | Ouvrir les deux pages publiques dans l'app : « Politique de confidentialité » et « Supprimer mon compte » | La première porte « 2 octobre 2026 » et parle des sessions de connexion ; la seconde dit ce que les sauvegardes gardent (« sessions exceptées », 90 jours) | Que le texte long se lit en entier, sans coupure |
| B8 | « Toi » → **« Supprimer mon compte »**, jusqu'au bout | Le compte de test disparaît, et tout ce qui s'y rattache | `select count(*) from auth.users where id = '<id>';` et la même sur `public.push_tokens where user_id = '<id>'` : **0** et **0** |
| B9 | App ouverte au moins une seconde, réseau là : déclencher l'**exception volontaire dans un minuteur** (voir plus haut). Puis relancer l'app à froid, toujours avec le réseau. Ouvrir « Confidentialité » et lire le paragraphe des repères de parcours | L'app **se ferme** dans la seconde qui suit l'exception (elle ne se fige pas, ne reste pas sur un écran blanc). Au lancement suivant, une ligne arrive : `select occurred_at, props from public.usage_events where user_id = '<id>' and name = 'app_error' order by occurred_at desc limit 5;` porte `origine` = `fatale`, `differee` = `true`, `retard_h` (0 si le relancement suit de moins d'une demi-heure), `version` du build, `category` et `route`, **et aucun message**. La page dit « une erreur qui a fermé l'application » | Le temps entre l'exception et la fermeture ; la ligne mot pour mot (les `props` seuls) ; si elle n'arrive qu'au deuxième lancement. **Une app qui ne se ferme pas** veut dire que le gestionnaire d'avant n'a pas été rappelé : défaut, à signaler en premier |
| B10 | Premier lancement du build, sans rien toucher. Relever le numéro de build sur la page du build (expo.dev, « Version code ») | L'app **démarre normalement**, et `select props ->> 'version' as version, platform from public.usage_events where user_id = '<id>' and name = 'app_open' order by occurred_at desc limit 3;` rend `1.0.0+N` (N le numéro relevé) et `android` | La valeur lue. `1.0.0` seule sur Android veut dire que le module natif `ExpoApplication` n'a pas été lu (repli prévu, pas un plantage) : à noter, pas à corriger en séance. Un démarrage qui plante ou reste sur l'écran de lancement est un défaut bloquant |
| B11 | Avec le même build que B9 : déclencher le **rejet de promesse volontaire**, deux fois de suite dans le même lancement | L'app **reste ouverte**. La même requête que B9 porte **une seule** ligne `origine` = `promesse`, sans `differee` (le réseau était là) | Le nombre de lignes (une, pas deux) ; si l'app a bougé. Cette écoute ne s'installe qu'en production : sur un build de développement, rien ne part (B14) |
| B12 | Premier lancement, réseau là, notifications **refusées** à l'invite (ou jamais accordées). Aller dans les réglages d'Android (Applications → Ramille → Notifications), les autoriser, **revenir dans Ramille sans la fermer** | Le jeton s'inscrit **au retour, sans redémarrage** : `select platform, created_at, disabled_at from public.push_tokens where user_id = '<id>';` rend une ligne `android`, `disabled_at` vide | L'heure de `created_at` rapportée à celle du retour. Une ligne qui n'apparaît qu'après un démarrage à froid veut dire que la garde du jeton ne retente pas au retour (`gardeDuJeton`). Ne pas afficher la colonne `token` |
| B12′ | Réseau coupé (mode avion) **avant** d'accepter les notifications ; les accepter ; la même requête que B12 ; rétablir le réseau, mettre Ramille en arrière-plan puis la rouvrir | Pas de ligne tant que le réseau est coupé ; **une ligne `android` après le retour** | Les deux lectures (avant, après). La garde retente à chaque retour tant que rien n'est inscrit, sans boucle : une seule tentative par retour |
| B13 | Un compte ou une session sur le téléphone, l'app fermée **plus d'une heure** (le jeton d'accès a expiré). Couper le réseau (mode avion), puis ouvrir l'app à froid. Chronométrer jusqu'au premier écran | **Jamais « Le démarrage a échoué »** : l'app route comme hors ligne (avec un bilan soumis, le plan et son « Réessayer », comme §11.5 de `v1-13`). L'écran de lancement peut attendre longtemps : `auth-js` rejoue un rafraîchissement en panne de transport pendant près de trente secondes avant de rendre l'erreur | **Le temps d'attente, en secondes** — le code l'annonce, aucune mesure sur appareil ne l'a jamais confirmé (`COMPTE.md` §3) — et ce que l'écran montre pendant ; puis, le réseau rétabli, si « Réessayer » rouvre le plan. Trente secondes devant l'écran de lancement sont ce que le code prévoit : si cela paraît trop long, c'est une question de produit (la durée tolérée), pas seulement un défaut |
| B14 | *(Facultatif, sur un build de **débogage** relié à Metro : `npx expo run:android` sur une machine qui a la chaîne Android — l'APK de `android.yml` n'est pas publié.)* Lever une exception non rattrapée dans un minuteur | L'**écran rouge de React Native s'affiche** comme avant : la remontée n'écoute rien en développement. Aucune ligne `app_error` d'origine `globale` ni `fatale` n'arrive pour ce compte | Si l'écran rouge manque, le gestionnaire est remplacé au lieu d'être chaîné. Le développement écrit dans la base de production : relire `usage_events` après coup |

## 3. Ce qu'il faut rendre

Pour chaque ligne : conforme ou écart, **avec la valeur relevée** (la ligne trouvée en base, les
clés présentes, l'endroit où le lien s'ouvre). Une ligne muette n'est pas une ligne conforme
(`RECETTE.md` §1.3).

Ce que chaque écart déclenche, côté agent technique :
- **B1** : le greffon `expo-web-browser`, puis un nouveau build — au plus un tous les deux jours
  (registre d'exploitation, §3.3) ;
- **B1′, B2, B3, B4, B6, A2** : une correction de la page de confidentialité ou de l'export, avant
  la saisie du formulaire « Sécurité des données » ;
- **A1** : une correction avant le build de production ;
- **B5** : une vérification de `assetlinks.json` et de l'empreinte de la clé EAS.
- **B9, B11** : la remontée des pannes (`src/lib/remontee-des-pannes.ts`), et, si l'app ne se ferme pas ou si
  la ligne n'arrive pas, la phrase « une erreur qui a fermé l'application » de la page de confidentialité à
  corriger avant le test fermé ;
- **B10** : la lecture de la version, dont un plantage au démarrage est le cas bloquant ;
- **B12, B12′** : la garde du jeton d'appareil (`gardeDuJeton`, `FRONT-SESSION.md`) ;
- **B13** : `suiteDuDemarrage` (`COMPTE.md` §3), et la durée d'attente si elle est jugée trop longue ;
- **B14** : `installerLaRemonteeDesPannes`, dont la garde du développement.
