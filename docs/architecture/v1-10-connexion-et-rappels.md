# v1-10 — Connexion par lien, rappels par push

**Date** : 06/09/2026. **Statut** : plan d'increment, **exécuté sauf le chantier G**
(renommage du dépôt GitHub). Ce document décrit l'increment dans son ensemble tel qu'il a été
pensé le 06/09 ; il n'acte aucune implémentation et n'est pas réécrit après coup. Le chantier
E (push) a reçu son propre document, `v1-12-rappels.md`, et a été vérifié sur appareil le
09/09/2026 — c'est là qu'il faut lire ce qui a réellement été construit, pas ici.

Compagnon design : `docs/design/v1-10-retrouver-son-compte/` — quatre écrans et le
raisonnement sur la porte d'entrée et la collision.

## 1. Le fil qui relie tout

Sept chantiers, une seule cause : **la boucle d'engagement n'atteint personne, et le produit
ne sait pas reconnecter quelqu'un.**

| Constat, mesuré le 06/09/2026 | |
| --- | --- |
| Utilisateurs | 223 |
| Sessions anonymes | 222 |
| Comptes permanents | 1 (Google) |
| Comptes avec mot de passe | 0 |
| **Éligibles aux rappels** | **1** |

Les rappels exigent un compte rattaché à email confirmé. Le produit, lui, affirme que le
compte est optionnel — et 99,5 % des gens le prennent au mot. Les deux ne peuvent pas être
vrais en même temps : **la brique 4, celle qui porte toute la promesse d'accompagnement dans
la durée, est structurellement hors d'atteinte.**

Le canal push n'a pas cette contrainte : un token se rattache à une session anonyme aussi
bien qu'à un compte. C'est l'argument central de cet increment — l'économie de quota Resend
n'en est qu'un effet secondaire.

Symétriquement, personne ne peut revenir dans son compte depuis un nouvel appareil : il
n'existe **aucun chemin de connexion à un compte existant** dans tout `src/` (audit du
05/09, cf. le canvas). `sendAccountAccessLink` a été livrée le même jour pour la page de
suppression et fournit la brique manquante.

## 2. Les chantiers, ordonnés par dépendance

### Prérequis — rien ne les bloque, ils débloquent le reste

**A. Étaler le pic du lundi.** Les check-ins hebdomadaires sont générés le lundi 6 h, le cron
d'envoi passe à 7 h et vide la boîte d'un coup : tout le volume de la semaine part dans une
seule salve. **Le plan Resend est le gratuit** (confirmé le 06/09) : 3 000 emails/mois, mais
surtout **100 par jour**. Le mur n'est donc pas vers les 560 utilisateurs rattachés que
laisserait croire le quota mensuel, mais vers **une centaine, un lundi matin** — et le 1er du
mois tombant un lundi, les deux boucles se cumulent et il arrive deux fois plus vite. Correctif : ancrer le jour du check-in hebdomadaire sur une valeur dérivée de
`user_id` plutôt que sur lundi pour tout le monde. Une ligne de calcul, invisible pour
l'utilisateur, la cadence reste hebdomadaire. **Indépendant de tout le reste — à faire en
premier**, il protège le canal email tant qu'il est seul.

**B. Purger sur l'inactivité, pas sur l'âge.** `purge_stale_anonymous_accounts()` supprime
`where is_anonymous and created_at < now() - interval '90 days'`. `v1-04` §3 décrit pourtant
« 90 jours **d'inactivité** (pas de connexion, pas de nouvelle activité) ». L'intention
documentée et le code divergent : **un utilisateur anonyme fidèle depuis 90 jours est
supprimé comme un abandon** — bilans, plan, check-ins compris.

Ça n'a jamais mordu parce que le plus ancien compte a 13 jours ; les premières suppressions
tomberaient vers le **22 novembre 2026**. Mais cet increment a précisément pour but de rendre
les sessions anonymes actives : livrer push avant ce correctif reviendrait à fabriquer des
utilisateurs engagés qu'un cron efface. **À faire avant le chantier push, pas après.**

Signal d'activité à retenir : `usage_events` existe désormais et enregistre `app_open`, ce
qui en fait le candidat naturel. À arbitrer contre `assessments`/`engagement_checkins`, et à
croiser avec la rétention de `usage_events` elle-même (`purge_usage_events` tourne
quotidiennement — une purge d'activité qui s'appuie sur une table elle-même purgée doit être
vérifiée sur la durée, sinon un utilisateur actif redevient « inactif » par effacement de sa
propre trace).

**C. Brancher le SMTP de Supabase Auth sur Resend.** Les emails d'authentification
(confirmation, lien de connexion) ne passent **pas** par l'extension `http` qui envoie les
rappels : ils partent de Supabase Auth, dont l'expéditeur par défaut est limité à **2 emails
par heure pour tout le projet** et déconseillé en production. Sans ce réglage, la connexion
par lien ne fonctionne pas au-delà de quelques essais. Le domaine `ramille.fr` est déjà
vérifié chez Resend avec DKIM en place : il reste à créer des identifiants SMTP et à les
renseigner dans Supabase → Authentication → SMTP. **Réglage de tableau de bord, prérequis du
chantier D.** Les valeurs exactes, le plafond d'envoi à relever, les URL de redirection à
déclarer et les gabarits d'email à traduire sont en **annexe §8**.

**H. Purger les données de test.** Les 223 profils en base sont des profils de test : rien de
ce qu'ils portent n'a de valeur, et tout fausse ce qui suivra. Les purger avant d'attaquer
l'increment rend mesurable tout ce qu'on livrera ensuite, et lève au passage deux gênes : la
base analytique de `usage_events` repart propre, et les 223 `email_reminders_enabled = true`
qui rendraient tout le monde éligible d'un coup disparaissent.

**La méthode est déjà écrite** : `delete from auth.users`, et la cascade fait le reste. Ne
jamais énumérer les tables — c'est exactement la doctrine de `delete_my_account`, et une
fonction qui listerait les tables deviendrait fausse à la prochaine migration, en silence.

Ne pas toucher aux **référentiels**, qui ne sont pas des données utilisateur :
`transport_modes`, `emission_factors`, `emission_factor_sources`, `action_templates`,
`usage_event_types`. Ni à `emission_factor_sync_runs`, qui est le journal d'exploitation de la
synchronisation ADEME — la seule façon de voir qu'elle tourne vraiment.

**Décision du 06/09 : on purge tout, compte permanent compris.** Il portait 4 bilans,
2 check-ins, 2 actions et les 2 rappels envoyés — donc la seule preuve de bout en bout que la
chaîne d'envoi fonctionne. C'est un coût accepté : l'identité Google se recrée en un geste, et
la recréer a même une vertu, puisqu'elle **rejoue le flux OAuth sur `ramille.fr` avec le
nouvel écran de consentement** — une vérification qu'il faut faire de toute façon depuis le
renommage.

**Ce ne sera pas la dernière.** D'autres purges suivront d'ici l'ouverture au grand public,
donc l'opération mérite d'être écrite une fois correctement plutôt que retapée à chaque fois :
la liste des référentiels à ne pas toucher est le seul endroit où une erreur ferait mal, et
c'est précisément ce qu'on ne veut pas réinventer sous pression.

Vérification après coup, la même qu'à la construction de `delete_my_account` : compter les
lignes restantes table par table plutôt que de faire confiance à la cascade sur parole. Et
recompter les référentiels **avant et après** — c'est le seul contrôle qui attrape une purge
trop large.

### Cœur

**D. Création et connexion par lien, sans mot de passe.** Décision prise le 06/09 :
le mot de passe disparaît.

Justification : **il n'a jamais servi.** Aucun `signInWithPassword` n'existe dans le code —
il est demandé à la création, réinitialisable, et rien ne le consomme. Zéro compte sur 223 en
porte un. Et il ne fait même pas gagner d'étape : la confirmation d'email est déjà active,
`is_anonymous` ne bascule qu'après le clic, et l'écran affiche déjà « Vérifie tes emails ».

Un seul mécanisme, deux verbes, le même geste :

- **créer** → `updateUser({ email })` sans mot de passe → lien de confirmation → même
  `user_id`, le bilan reste attaché (c'est ce qui interdit `signInWithOtp` ici : il créerait
  un utilisateur distinct et abandonnerait le bilan anonyme) ;
- **retrouver** → `signInWithOtp({ shouldCreateUser: false })` → lien de connexion.

Deux règles vérifiées contre l'API le 05/09, à ne pas relâcher : une adresse sans compte
renvoie `422 otp_disabled`, donc la page ne peut pas fabriquer de compte ; et elle ne répond
jamais différemment selon que l'adresse en a un, sinon elle dit qui utilise Ramille. La
limite d'envoi se reconnaît au **code** `over_email_send_rate_limit`, jamais au message.

Le travail est plus petit qu'il n'y paraît : **l'écran « Mot de passe oublié » *est* déjà
l'écran de reconnexion**, mal nommé — il demande une adresse, envoie un lien, et sur web ce
lien reconnecte par effet de bord. Il s'agit de le renommer et de le rebrancher, pas d'en
construire un. Disparaissent : le champ mot de passe, sa validation, `requestPasswordReset`.

Le reste vient du canvas : la porte d'entrée « J'ai déjà un compte » sur l'accueil de
l'onboarding (la seule modification d'un écran existant, et celle qui supprime la collision
au lieu de la gérer), l'écran de reconnexion, son état d'attente, et l'écran de collision.

**Livré le 07/09.** `linkEmail` remplace `linkEmailPassword`, `requestPasswordReset` et
l'écran `mot-de-passe-oublie` disparaissent, `/connexion/retrouver` porte les quatre états du
canvas, et la logique partagée avec la page de suppression (limite d'envoi, adresse
plausible) vit dans `src/types/connexion.ts`, testée. Deux points qui n'étaient pas dans le
canvas :

- **`/connexion/email` renvoie de lui-même vers « retrouver »** quand `updateUser` répond
  `422 email_exists` : c'est la personne qui a un compte et qui a pris l'entrée « créer » sur
  un nouvel appareil — au mauvais écran, pas en erreur. L'adresse est passée en paramètre
  pour ne pas la faire retaper. Ce chemin révèle qu'une adresse a un compte, mais c'est
  Supabase qui le dit dans sa réponse, pas l'écran : rien à protéger ici qui ne le soit déjà.
- **Sur natif, le lien arrive hors de l'app.** Contrairement au retour Google, personne
  n'attend cette URL : `_layout.tsx` écoute `Linking.useURL()` et ouvre la session dès qu'un
  fragment porte `access_token`, puis renvoie sur la racine qui route. Le scheme `ramille://`
  doit figurer dans les Redirect URLs (§8.4) — à faire avec le build EAS (chantier F), il n'y
  a pas d'app native pour l'exercer avant.

La collision n'est détectée qu'à l'entrée de `/connexion/retrouver` (session anonyme portant
un bilan, même test que la page de suppression). Le cas symétrique — un compte Google
existant et un bilan anonyme sur le nouvel appareil, puis « Continuer avec Google » depuis
`/connexion` — échoue toujours sur `linkIdentity` (l'identité appartient à un autre
utilisateur) avec un message brut. C'est le cas que la porte d'entrée sur l'onboarding vise
à rendre rare ; à traiter si les chiffres montrent qu'il ne l'est pas.

**E. Push en canal principal, email en repli.** `v1-02` §5 rangeait les notifications push en
« increment dédié avec validation d'outil au préalable » : c'est cet increment.

Ce qui ne change pas : `notification_outbox` et son `unique(checkin_id)` garantissent un
message par check-in quel que soit le nombre de passages du cron. **Cette garantie
anti-relance, exigée par la spec §7, est indépendante du transport** — on change le tuyau,
pas l'architecture. L'envoi vers l'API Expo Push depuis `pg_cron` suit la même mécanique que
`send_pending_reminders` avec l'extension `http`.

Ce que push ne remplace pas, et qui justifie de garder l'email en repli : un token meurt avec
l'app (désinstallation = plus aucun contact, alors que l'email survit), et le web n'est pas
couvert (service worker + VAPID, autre chantier ; acceptable en V1 Google Play only, où le
web est la surface publique et non la surface d'usage).

**F. Préparer le build EAS.** Prérequis technique de E — les tokens push exigent un build
natif. À faire dans le même passage que la publication Play, pour ne pas monter la chaîne
deux fois : `npx eas init` depuis un poste avec le compte Expo (le slug est passé à
`ramille`), credentials Android, plugin de configuration `expo-notifications`.

### Logistique

**G. Renommer le dépôt GitHub** en `ScratchMe/Ramille`. Indépendant, à faire un jour calme.
GitHub redirige l'ancien nom, mais l'intégration Vercel et les remotes locaux y sont
attachés : vérifier que Vercel déploie toujours après coup, puis aligner les URL de PR et
d'issues citées dans `docs/` et `CLAUDE.md`.

## 3. Ce qui manquait à la liste

Sept points relevés en préparant ce document, absents de l'énoncé initial.

1. **La purge anonyme sur l'âge** (chantier B) — le plus important, et le seul avec une
   échéance : 22 novembre 2026.
2. **Le SMTP de Supabase Auth** (chantier C) — distinct de Resend pour les rappels, et
   prérequis dur du magic link.
3. **La préférence de rappel devient un choix de canal.** `profiles.email_reminders_enabled`
   est un booléen, à `true` sur les 223 profils. Avec deux canaux il faut arbitrer : un
   réglage à trois états (push / email / aucun), ou deux booléens. À noter au passage que
   **le jour où ces 223 comptes se rattachent, ils deviennent tous éligibles d'un coup** —
   l'opt-out existe mais personne n'a eu l'occasion de s'en servir.
4. **Le token push doit suivre le rattachement.** Sur un nouvel appareil, le lien de connexion
   remplace la session anonyme : un token enregistré sous l'utilisateur anonyme doit être
   repointé sur le compte retrouvé, sinon les rappels partent vers un utilisateur fantôme. Et
   un utilisateur a plusieurs appareils : la table doit être `(user_id, token, plateforme)`
   avec unicité sur le token, pas sur l'utilisateur.
5. **Le moment de la demande d'autorisation.** Android 13+ demande `POST_NOTIFICATIONS` à
   l'exécution et un refus est collant. Surtout pas au premier lancement : le bon moment est
   après le premier bilan, quand la personne a vu ce que le produit lui apporte et qu'on lui
   propose justement un suivi.
6. **Le token push est une donnée à déclarer.** C'est un identifiant d'appareil : la
   politique de confidentialité doit le mentionner (durée, finalité, suppression), et le
   formulaire « Sécurité des données » de Google Play doit le déclarer. Oublier ce point est
   un motif de rejet Play, pas un détail RGPD.
7. **Deux affirmations deviennent enfin vraies.** L'écran `/connexion` promet « Avec un
   compte, il te suit d'un appareil à l'autre » et `v1-04` §1 affirme qu'« après rattachement,
   la synchronisation multi-appareil fonctionne normalement ». Les deux sont fausses
   aujourd'hui. Le chantier D les rend vraies **sans qu'il faille retoucher une seule de ces
   phrases** — à vérifier plutôt qu'à réécrire.

## 4. Pièges du repo qui vont mordre

- **Ajouter un événement d'usage impose deux écritures** : une ligne dans
  `public.usage_event_types` par migration **et** une entrée dans `src/types/analytics.ts`.
  Sans les deux, l'insert est rejeté et l'événement perdu en silence. Et un événement déclaré
  qu'aucun code n'émet se lit **zéro**, pas « pas encore instrumenté ».
- **Renommer une route touche trois endroits** : `src/constants/page-titles.ts` (indexé par
  chemin d'URL), le job CI d'export web qui refuse toute page sans titre, et les Redirect URLs
  de Supabase Auth. Ajouter la nouvelle sans retirer l'ancienne tant que rien ne casse.
- **Toucher à `enqueue_checkin_reminders` ou à la génération des check-ins touche pgTAP.**
  Rejouer la séquence entière des fichiers concernés, bascules de `request.jwt.claims`
  comprises — un scénario extrait de son contexte ne reproduit pas le rôle sous lequel il
  tourne.
- **Les clés AsyncStorage gardent le préfixe `traceverte.`** et ne doivent pas être
  renommées : les changer effacerait le brouillon de bilan de quiconque en a un.

## 5. Séquencement recommandé

| Ordre | Chantier | Nature | Débloque |
| --- | --- | --- | --- |
| 0 | H — purger les données de test | SQL | rend mesurable tout ce qui suit |
| 1 | A — étaler le pic du lundi | SQL | rien, mais protège l'email tant qu'il est seul |
| 2 | B — purge sur l'inactivité | SQL | le chantier E |
| 3 | C — SMTP Supabase Auth | tableau de bord | le chantier D |
| 4 | D — connexion par lien | code + design | la promesse multi-appareil |
| 5 | F — build EAS | outillage | le chantier E |
| 6 | E — push | code + SQL | la boucle d'engagement, enfin atteignable |
| 7 | G — renommage GitHub | logistique | rien |

H, A et B sont du SQL pur, sans build : ils peuvent partir immédiatement. H vient en premier
parce qu'il repart d'une base propre — mesurer l'effet de A ou de B sur 223 profils de test
n'apprendrait rien. C est un réglage de quelques minutes qui conditionne tout D. G peut se
glisser n'importe où.

## 6. Ce qui reste à décider

- Le réglage de canal : trois états ou deux booléens (§3.4).
- Le signal d'activité retenu pour la purge (§2.B).
- La collision du nouvel appareil : le canvas recommande de la dire et de laisser choisir,
  plutôt que de transférer les lignes vers le compte permanent — cette dernière option reste
  la vraie réponse à terme, écartée pour la V1 faute de justifier son coût serveur.

Répondu le 06/09 : **la purge emporte tout**, compte permanent compris (§2.H). Et le plan
Resend est le gratuit, donc **100 emails par jour** — c'est ce plafond, et non le quota
mensuel, qui fixe l'urgence du chantier A.

## 7. Piste ouverte — ne pas créer de session avant que la personne agisse

Relevée le 07/09 en mesurant l'effet d'une nuit : **127 sessions anonymes créées en une nuit,
266 au total, dont 4 seulement portent un bilan** et 59 ont émis le moindre événement d'usage.
Près de 200 lignes `auth.users` vides.

C'est le fonctionnement nominal : `ensureSession()` est appelée en fire-and-forget depuis
`_layout.tsx` à chaque ouverture, donc **tout visiteur reçoit un utilisateur** — un crawler, un
aperçu de lien dans une messagerie, un onglet privé. Rien n'est cassé, mais trois conséquences :

- **la purge nettoie un compteur qui se remplit tout seul.** Purger 266 lignes aujourd'hui
  n'empêche pas d'en avoir autant la semaine prochaine ;
- **tous les dénominateurs sont faux.** « 266 utilisateurs » n'a aucun sens, et le taux de
  complétion du bilan est divisé par du bruit ;
- **le plus sérieux : Supabase limite les inscriptions anonymes** (`rate_limit.anonymous_users`).
  À l'échelle, un crawler un peu insistant peut consommer le quota et **empêcher un vrai
  visiteur d'obtenir une session** — donc de faire son bilan.

L'alternative : créer la session **paresseusement**, au premier geste qui a besoin d'un
`user_id` — c'est-à-dire à la première écriture du bilan. Le mécanisme existe déjà :
`ensureSession` est décrite comme « re-vérifiée avant toute écriture bilan pour couvrir un
démarrage à froid » (cf. `src/lib/supabase.ts`). L'appel de `_layout.tsx` serait donc
supprimable sans rien réécrire d'autre.

**Ce que ça coûte, et pourquoi ce n'est pas tranché ici** : `usage_events` exige un `user_id`,
donc `app_open` ne serait plus enregistré pour un visiteur qui n'a rien fait — or c'est
précisément le dénominateur de tous les entonnoirs (`v1-08`). On échangerait un compteur
d'utilisateurs faux contre un compteur de visites incomplet. Trancher demande de décider
lequel des deux on veut juste, et éventuellement de mesurer les visites autrement que par une
table exigeant un compte.

À instruire dans un increment dédié, pas dans celui-ci : c'est une modification du modèle
d'authentification acté en `v1-04` §1, pas un correctif.

## 8. Annexe — réglages du chantier C (SMTP de Supabase Auth)

Le chantier C (§2.C) n'est que du tableau de bord, mais il porte cinq réglages dont **quatre
ne se voient pas** tant que le chantier D n'est pas livré : ils sont écrits ici pour ne pas
être redécouverts un par un le jour où la connexion par lien tombera en panne.

**8.1 — Un identifiant SMTP distinct de celui du cron.** Chez Resend, le mot de passe SMTP
*est* une clé d'API. En réutiliser une seule pour les deux canaux lierait leur sort : révoquer
la clé des rappels couperait aussi la connexion. Créer donc une **seconde** clé, dédiée à
Supabase Auth, avec permission d'envoi et si possible restreinte au domaine `ramille.fr`. Le
secret Vault `resend_api_key` (rappels via l'extension `http`) reste inchangé.

**8.2 — Les valeurs à saisir** dans Supabase → Project Settings → Authentication → SMTP
Settings (« Enable Custom SMTP ») :

| Champ | Valeur |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` (TLS implicite) — `587` en STARTTLS si `465` est filtré |
| Username | `resend` (littéral, ce n'est pas une adresse) |
| Password | la clé d'API créée en 8.1 |
| Sender email | `connexion@ramille.fr` (domaine vérifié, aucune boîte requise) |
| Sender name | `Ramille` |

**8.3 — Le plafond d'envoi de Supabase Auth, à relever.** Sans SMTP personnalisé, Supabase
limite les emails d'authentification à **2 par heure pour tout le projet** (`email_sent`).
Brancher le SMTP ne suffit pas : le plafond reste un réglage à part, sous Authentication →
Rate Limits. Il faut le porter à une valeur cohérente avec Resend — dont le plan gratuit donne
**100 emails par jour, partagés avec les rappels du cron**. Un plafond horaire d'une trentaine
laisse de la marge sans pouvoir vider le quota quotidien en un incident.

**8.4 — Les URL de redirection, sinon le lien renvoie sur la racine.** `sendAccountAccessLink`
passe `emailRedirectTo` (`${APP_URL}/compte/suppression`, et demain les écrans du chantier D).
Supabase **ignore silencieusement** toute redirection absente de la liste d'autorisation et
retombe sur la Site URL : le lien marche, mais atterrit au mauvais endroit. À déclarer sous
Authentication → URL Configuration : Site URL `https://www.ramille.fr`, et en Redirect URLs
`https://www.ramille.fr/**` plus `https://*.vercel.app/**` pour les previews. Avec le build
natif (chantier F) s'ajoutera `ramille://**` : le lien de connexion ouvert depuis la
messagerie du téléphone revient par ce scheme (`makeRedirectUri()` dans
`/connexion/retrouver`).

**8.5 — Les gabarits d'email sont en anglais par défaut.** Le produit est exclusivement
francophone : un « Confirm your signup » signé Supabase est le premier email que recevra un
utilisateur. Les quatre gabarits à réécrire sous Authentication → Emails sont *Magic Link*,
*Confirm signup*, *Change Email Address* et *Reset Password* — les quatre, parce que le
gabarit retenu pour la conversion d'une session anonyme en compte permanent dépend du chemin
emprunté (`updateUser({ email })` vs. lien de connexion) et qu'un gabarit non traduit ne se
signale pas.

La voix est celle des rappels (`20260905240000_rappels_signes_ramille.sql`) : tutoiement,
première personne, aucune injonction, signature. *Reset Password* disparaîtra avec le
chantier D, mais il est câblé aujourd'hui (`resetPasswordForEmail`) et doit donc être traduit
en attendant.

Magic Link — objet « Ton lien de connexion » :

```html
<p>Bonjour,</p>
<p>Voici ton lien pour retrouver ton compte Ramille :</p>
<p><a href="{{ .ConfirmationURL }}">Me connecter</a></p>
<p>Il ne fonctionne qu'une fois, et seulement pendant une heure. Si tu n'as rien demandé, tu
peux ignorer ce message : personne ne peut entrer sans ce lien.</p>
<p>— Ramille</p>
```

Confirm signup — objet « Confirme ton adresse » :

```html
<p>Bonjour,</p>
<p>Encore un geste et ton bilan te suivra d'un appareil à l'autre :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon adresse</a></p>
<p>Si tu n'as rien demandé, tu peux ignorer ce message.</p>
<p>— Ramille</p>
```

Change Email Address — objet « Confirme ta nouvelle adresse » :

```html
<p>Bonjour,</p>
<p>Tu as demandé à utiliser {{ .NewEmail }} pour ton compte Ramille. Confirme-le ici :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer</a></p>
<p>Si tu n'as rien demandé, ignore ce message : ton adresse actuelle reste en place.</p>
<p>— Ramille</p>
```

Reset Password — objet « Réinitialiser ton mot de passe » :

```html
<p>Bonjour,</p>
<p>Voici ton lien pour choisir un nouveau mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Choisir un nouveau mot de passe</a></p>
<p>Si tu n'as rien demandé, ignore ce message : ton mot de passe actuel reste valable.</p>
<p>— Ramille</p>
```

**8.6 — Vérification.** Ouvrir `/compte/suppression` en production, saisir l'adresse du compte
Google recréé après la purge, et vérifier trois choses : l'email arrive (donc le SMTP est
branché), il est en français et signé Ramille (donc les gabarits sont pris), et le lien ramène
bien sur `/compte/suppression` et non sur la racine (donc 8.4 est fait). Une adresse inconnue
doit, elle, afficher exactement le même message — c'est le garde-fou de non-divulgation, il ne
dépend pas du SMTP mais se re-vérifie gratuitement au passage.

## 9. État des lieux du 07/09 — après les chantiers A, B, C, D

Tour rapide demandé après la livraison du chantier D (PR #57), pour vérifier que rien ne
traîne avant d'attaquer F et E.

**Rien à réparer.** `main` propre, CI verte, production à jour (`/connexion/retrouver`
répond, la porte d'entrée est visible sur l'accueil). Les sept crons sont actifs ; les quatre
qui devaient tourner dans la nuit ont réussi, les trois autres (lundi, 1er du mois, trimestre)
n'ont simplement pas encore eu leur tour. Zéro TODO, zéro `console.log`, bundle web à 2,4 Mo.
Les advisors Supabase ne remontent que du connu : les policies ouvertes aux anonymes sont le
modèle d'auth de `v1-04` §1, et **`auth_leaked_password_protection` est désormais sans objet**
— il n'y a plus de mot de passe à protéger (§2.D). Il continuera d'être signalé ; c'est attendu.

**Ce qui a été relevé, et où ça vit** — le backlog est dans les issues GitHub, pas ici :

| Issue | Quoi | Pourquoi maintenant |
| --- | --- | --- |
| #58 | Mettre à jour les dépendances Expo SDK 57 (patchs) | avant le premier build EAS, pour ne pas figer un SDK en retard |
| #59 | Remplacer les cinq `Alert.alert` restants par un message inline | `window.alert()` sur web, boîte système grise en plein produit |
| #60 | Collision Google : bilan anonyme + « Continuer avec Google » sur un compte existant | le chemin email est couvert depuis #57, pas le chemin Google |
| #61 | Instrumenter `/connexion/retrouver` | sans ça, la question ouverte de §2.D (« est-ce rare ? ») n'aura jamais de réponse |
| #62 | Dire à l'écran que le compte est rattaché après confirmation | la boucle ouverte par « Vérifie tes emails » ne se ferme jamais |

**Ce qui a été relevé et volontairement laissé** :

- Trois vulnérabilités npm transitives (`uuid`, `fflate` via `satori`, `decode-uri-component`),
  toutes « déni de service sur entrée malformée », aucune exploitable dans notre usage. Le
  `npm audit fix --force` proposé casserait `satori` (carte de partage). À revoir avec #58.
- Deux index inutilisés et cinq clés étrangères non indexées, en INFO. Sans effet à cette
  échelle ; à reprendre quand la base pèsera quelque chose.

## 10. Annexe — procédure du chantier F (premier build Android avec EAS)

Écrite pour quelqu'un qui travaille dans un navigateur et n'a pas l'habitude d'un terminal.
Vérifiée contre la documentation Expo le 07/09/2026. **Une seule session de terminal est
incontournable** : la doc « Build from GitHub » exige d'avoir « successfully run a build from
your computer for each platform » avant de pouvoir déclencher des builds depuis le site — c'est
là que le keystore Android est généré et confié à EAS. Tout le reste se fait dans le navigateur,
avant comme après.

**10.1 — Ce que ça produit.** Un fichier APK installable sur un téléphone Android (profil
`preview` d'`eas.json`), construit dans le cloud d'Expo. Pas encore le bundle AAB pour Google
Play (profil `production`) : il suppose le compte Play Console, qui est un chantier à part.

**10.2 — Dans le navigateur, avant.**

1. Créer un compte sur expo.dev. Le plan gratuit suffit : 15 builds Android par mois, file
   d'attente basse priorité (jusqu'à 90 minutes aux heures de pointe), 45 minutes par build.
2. Installer Node.js LTS depuis nodejs.org (l'installateur, version 22). C'est le seul
   logiciel à installer.
3. Installer GitHub Desktop (desktop.github.com), se connecter, et cloner
   `ScratchMe/TraceVerte` (File → Clone repository). C'est lui qui servira à ouvrir un terminal
   au bon endroit et à envoyer le commit final, sans `git` à taper.

**10.3 — Dans le terminal, une fois.** Depuis GitHub Desktop : Repository → « Open in
Terminal » (Mac) ou « Open in Command Prompt » (Windows). Puis, ligne par ligne :

```
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

`init` crée le projet `ramille` sur expo.dev et écrit son identifiant dans `app.json`
(`extra.eas.projectId`, et `owner`). Ces deux lignes doivent être **commitées** — c'est
l'étape 10.5.

**10.4 — Dans le navigateur, les variables d'environnement. À faire AVANT de lancer le
build.** Le fichier `.env` local n'est pas envoyé au build (il est ignoré par git, EAS ne le
voit pas). Sur expo.dev → projet → Environment variables, créer `EXPO_PUBLIC_SUPABASE_URL` et
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, environnements `preview` **et** `production`, visibilité
« Plain text » (elles finissent dans le code client de toute façon). Les valeurs sont celles
du tableau de bord Supabase (Project Settings → API) — déjà en place chez Vercel.

**Ce point a coûté un build le 07/09, et il n'est pas une question de rigueur : la panne
qu'il produit ne dit rien.** `src/lib/supabase.ts` lève dès son chargement quand les deux
variables manquent — avant le premier rendu, donc avant qu'un écran puisse exister. Dans un
build de production, cette exception n'a nulle part où s'afficher : **l'app s'ouvre et se
ferme instantanément, sans message, sans trace visible sur le téléphone.** Rien ne distingue
ce cas d'un plantage natif, et le journal du build est vert puisque la construction, elle,
a parfaitement réussi.

Deux corollaires :

- **Les variables sont figées dans le code au moment du build** (c'est tout le sens du préfixe
  `EXPO_PUBLIC_`). Les créer après coup ne répare rien : il faut reconstruire.
- **Le diagnostic ne se fait pas sur le téléphone mais sur la page du build**, section
  « Environment variables », qui liste ce que la construction a réellement utilisé. C'est le
  seul endroit où l'absence se voit.

L'environnement visé n'est plus laissé à la déduction : chaque profil d'`eas.json` porte
désormais une clé `environment` explicite. Sans elle, EAS le devine — `production` si
`distribution: store`, `development` si `developmentClient`, `preview` sinon — une règle
exacte mais invisible, qui suffit à ranger les variables au mauvais endroit sans que rien ne
proteste.

**10.5 — Le premier build, dans le terminal.**

```
npx eas-cli@latest build --platform android --profile preview
```

**Piège vérifié le 07/09 : EAS n'envoie pas l'état commité, il envoie le dossier de travail**
— modifications non commitées comprises (`cli.requireCommit` vaut `false` par défaut). Or
`npm install` réécrit volontiers `package-lock.json` quand la version locale de npm diffère
de celle qui l'a produit. Le build échoue alors sur `npm ci`, avec des paquets « missing from
lock file » (`@emnapi/*`, épinglés par `@unrs/resolver-binding-wasm32-wasi`) — alors que le
lockfile du dépôt, lui, est parfaitement sain : la CI le prouve à chaque PR, `npm ci` y passe.

Le message accuse donc un fichier qui n'est pas celui qu'on lit. La méthode qui tranche en
une minute : vérifier si le paquet dit manquant existe dans le `package-lock.json` du dépôt.
S'il y est, le fichier envoyé n'était pas celui-là. Correctif : annuler la modification locale
du lockfile (GitHub Desktop → clic droit sur le fichier → « Discard changes »), et ne jamais
le commiter avec une autre version de npm que celle de la CI (Node 22).

À la question sur le keystore, répondre **oui, laisser EAS en générer un**. Il est stocké chez
Expo et réutilisé pour tous les builds suivants — c'est ce qui rend la commande unique. Le
terminal donne un lien vers la page du build ; on peut fermer le terminal, la suite se suit sur
expo.dev. Compter dix à vingt minutes hors file d'attente.

Puis, dans GitHub Desktop : `app.json` apparaît modifié. Commit (« Lier le projet EAS »), Push.
Sans ça, les builds depuis GitHub ne sauront pas à quel projet Expo ils appartiennent.

**10.6 — Installer l'APK.** Sur la page du build, bouton « Install » : un QR code à scanner
avec le téléphone, ou un lien à s'envoyer. Android demande une fois d'autoriser l'installation
depuis cette source. L'app s'ouvre sur l'onboarding ; le bilan et la restitution doivent
fonctionner exactement comme sur le web.

**10.7 — Dans le navigateur, pour ne plus jamais rouvrir le terminal.** Sur expo.dev → projet
→ Settings → GitHub : installer l'app GitHub d'Expo sur `ScratchMe/TraceVerte` et lier le
dépôt. Dès lors, le bouton « Build from GitHub » de la page Builds prend une branche, une
plateforme et un profil — c'est tout. `eas.json` porte déjà l'`image: latest` que cette voie
exige.

**10.8 — Ce que ça débloque, et ce que ça ne fait pas encore.** Le chantier E (push) ajoute
`expo-notifications`, donc un nouveau build à chaque fois qu'une dépendance native entre —
depuis GitHub, en un clic. Il demandera aussi un projet Firebase (navigateur) pour les
identifiants FCM, à téléverser sur expo.dev → Credentials ; détail dans le chantier E le moment
venu. La publication sur Google Play (compte développeur, 25 $ une fois, fiche, AAB de
production) reste un chantier à part.
