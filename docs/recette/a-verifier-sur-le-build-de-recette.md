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
> séance, où elles se jouent : A1 à A3 en 00.2 à 00.4, B1 et B1′ en 02.4 et 02.5, B5 en 02.8, B3 en
> 03.3, 03.4 et 03.8, B4 en 03.9, B2 en 04.1, B7 en 04.2 et 04.3, B8 en 11.2, B3b et B6 en 12.4 et
> 12.5. Trois libellés y sont corrigés d'après le code : sur Android, l'export s'appelle « Exporter mes
> données » (« Télécharger mes données » est celui du web) ; le lien de « Toi » vers la politique
> s'appelle « Confidentialité » ; et la page publique de suppression ne s'atteint pas depuis l'app —
> « Supprimer mon compte », dans « Toi », ouvre la confirmation —, elle s'ouvre dans Chrome. Ce
> document reste la liste d'origine, et ce qu'un écart y déclenche (§3) vaut toujours.

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
