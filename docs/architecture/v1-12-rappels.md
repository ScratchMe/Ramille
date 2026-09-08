# v1-12 — Rappels : notification, email, ou rien

**Date** : 07/09/2026. **Statut** : document d'implémentation du chantier E de v1-10. Go donné
le 07/09 sur la direction B ; **PR 1 et PR 2 livrées**, PR 3 (mise en service) en attente des
identifiants FCM. Il acte les décisions du 07/09 et le canvas qui en découle ; il ne remplace
ni `v1-02` (la boucle), ni `v1-07` §3.1 (le canal email), ni `v1-10` §2.E (le plan initial du
push) — il les prolonge.

Compagnons : `docs/design/v1-12-rappels/` (brief, canvas publié, README). Le canvas est la
référence pour les écrans ; ce document dit ce qu'il faut construire dessous pour qu'ils
tiennent.

## 1. Ce qu'on livre, en une phrase

Après « C'est noté », Ramille dit ce qui va se passer et demande comment faire signe ; le plan
attend au lieu de dire « rien à rattraper » ; le rappel part par notification, par email, ou
pas du tout — jamais deux fois pour le même point ; et « Toi » porte le réglage, pour tout le
monde, session anonyme comprise.

## 2. Ce qui est tranché

Les décisions du 07/09, puis celles que le canvas a fixées. Elles ne se rediscutent pas dans
les PR ; ce qui reste ouvert est en §9.

1. **Deux canaux, la personne choisit l'un ou l'autre.** Notification par défaut si elle en a
   donné le droit, email sinon, et la possibilité de tout couper. Jamais les deux pour un même
   point.
2. **La permission se demande après l'engagement**, en deux temps : notre feuille d'abord, le
   dialogue système seulement si la ligne « notification » est choisie. Pas au lancement, pas
   à la fin du bilan.
3. **Ramille dit l'attente, pas le vide.** « Rien à rattraper » disparaît (§6.3).
4. **La direction B, la feuille** (`Main.dc.html`) : un espace sans chiffre, le visage
   possible, l'explication avant la question, un bouton qui annonce le dialogue quand il va
   s'ouvrir. Une fois par appareil ; ensuite, « Toi ».
5. **Le push n'a pas besoin de compte.** Le réglage s'ouvre aux sessions anonymes ; seul
   l'email exige un compte rattaché et confirmé, et la ligne le dit (« Rattache un compte pour
   l'activer »).
6. **Sur web, pas de push.** Le réglage ne montre que l'email ; la feuille ne s'ouvre sur web
   que si un compte est rattaché — sans compte il n'y aurait rien à choisir, la carte
   d'attente suffit.
7. **Un point, un message, quel que soit le canal.** `unique(checkin_id)` reste la garantie ;
   le repli push → email est une **mise à jour de la même ligne**, jamais une seconde ligne.
8. **Le push arrive le matin où la question s'ouvre**, sans l'étalement sur cinq jours de
   l'email. Ramille dit « lundi » et tient parole.
9. **Une décision de permission se prend une fois.** Après un refus au système, on ne
   redemande pas au prochain engagement : la carte d'attente nomme les deux portes (réglages
   du téléphone, ou un compte pour l'email) une fois, et « Toi » garde le chemin.

## 3. La résolution du canal — la seule logique du chantier

Tout le reste est de la plomberie. Cette table de vérité est écrite **deux fois** — en SQL
dans `enqueue_checkin_reminders` (ce qui part vraiment) et en TypeScript dans
`src/types/rappels.ts` (ce que la carte d'attente et « Toi » affichent) — et **un test de
chaque côté épingle exactement les mêmes lignes**. C'est le même risque que
`estimate_action_savings` / `assessment_results` : deux implémentations d'une même règle
divergent le jour où l'une bouge seule. Le côté serveur ne connaît pas la permission Android ;
il connaît **l'existence d'un jeton actif**, qui en est la trace (§4.2). Le côté client connaît
les deux et n'affiche que ce que le serveur fera.

| Préférence (`profiles.reminder_channel`) | Jeton actif | Email possible (rattaché **et** confirmé) | Canal effectif | La carte d'attente dit |
| --- | --- | --- | --- | --- |
| `none` | — | — | aucun | « On se retrouve ici lundi. » |
| `push` | oui | — | push | « Je te fais signe lundi. » · Par notification sur ce téléphone. |
| `push` | non | oui | email | « Je te fais signe lundi. » · Par email, à {adresse} — les notifications sont coupées sur ce téléphone. |
| `push` | non | non | aucun | « On se retrouve ici lundi. » · Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l'email. |
| `email` | — | oui | email | « Je te fais signe lundi. » · Par email, à {adresse}. |
| `email` | — | non | aucun | « On se retrouve ici lundi. » · Rattache un compte pour l'email. |

Deux règles qui découlent de la table :

- **La préférence ne se dégrade jamais toute seule.** Un refus au système laisse
  `reminder_channel = 'push'` : si la personne rouvre les notifications dans les réglages du
  téléphone, l'app enregistre un jeton à l'ouverture suivante et le push repart sans qu'elle
  ait rien à retoucher. C'est ce qui rend la « porte ouverte » vraie.
- **« Lundi » ou « au début du mois prochain » se décide par la boucle qui existe**, pas par
  l'action engagée : hebdo dès que `assessment_results.commute_poste_label` est non nul
  (la boucle du lundi est alors générée pour cette personne), mensuel sinon. Le prochain
  contact est celui qui vient en premier.

## 4. La base

Une migration, `supabase/migrations/2026090[8-9]…_rappels_canal.sql`, puis régénérer
`src/lib/database.types.ts`.

### 4.1 `profiles.reminder_channel` remplace `email_reminders_enabled`

`reminder_channel text not null default 'email' check (reminder_channel in ('push', 'email',
'none'))`. Migration des profils existants (109 au 07/09, la purge sur inactivité étant
passée depuis le comptage de v1-10) : `false → 'none'`, `true → 'email'` — le
comportement d'aujourd'hui, à l'identique (un `'email'` sans compte rattaché ne part pas, comme
avant). Puis `drop column email_reminders_enabled` **dans la même migration** : aucune app n'est
sur Play, les seuls builds natifs sont les APK de test, et faire coexister deux colonnes pour
rien, c'est la colonne morte de `profiles` qu'on a déjà supprimée une fois
(`20260905180000`). La policy `profiles update own` existe : le client écrit la colonne
directement, comme aujourd'hui.

Le défaut reste `'email'` et non `'push'` : la ligne de la table ci-dessus rend `'push'` sans
jeton équivalent à `'email'`, mais un défaut `'push'` afficherait « coupées sur ce téléphone »
à quelqu'un à qui on n'a jamais rien demandé.

### 4.2 `push_tokens`

```sql
create table public.push_tokens (
  token text primary key,                                   -- ExponentPushToken[…]
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,                                  -- DeviceNotRegistered, ou permission retirée
  disabled_reason text
);
```

- **Unicité sur le jeton, pas sur l'utilisateur** (v1-10 §3.4) : plusieurs appareils par
  personne, et un jeton identifie un appareil — il appartient à *qui est connecté dessus*.
- **Deux RPC `security definer`, jamais d'`insert` direct** : `register_push_token(p_token,
  p_platform)` fait un `upsert` sous `auth.uid()` qui **reprend le jeton à son propriétaire
  précédent** (`on conflict (token) do update set user_id = auth.uid(), last_seen_at = now(),
  disabled_at = null`), et `unregister_push_token(p_token)` le désactive. C'est le cas « le
  jeton doit suivre le rattachement » de v1-10 §3.4 : sur un nouvel appareil, la session
  anonyme A enregistre le jeton, puis le lien de connexion la remplace par le compte B — une
  policy RLS owner-scoped refuserait à B de toucher la ligne de A, et les rappels partiraient
  vers un utilisateur fantôme. `revoke execute … from public, anon` ; `grant … to
  authenticated` (une session anonyme est `authenticated` avec `is_anonymous` : le push n'a
  pas besoin de compte).
- Policies : `select` et `delete` owner-scoped (`user_id = auth.uid()`), aucune policy
  `insert`/`update` — tout passe par les RPC. Le test `03` gagne ces lignes.
- **La purge des sessions anonymes inactives emporte les jetons** par cascade : un appareil
  qui reçoit des rappels sans jamais rouvrir l'app cesse d'en recevoir au bout de la période
  d'inactivité (`20260907093000`). Aucun code à écrire, une propriété à épingler dans le test
  `16`.
- `delete_my_account` : rien à faire (cascade) ; le test `15` vérifie la chaîne, y ajouter
  `push_tokens`. `export_my_data` **énumère** les tables : ajouter `jetons_d_appareil`
  (plateforme, dates — jamais le jeton lui-même, qui n'est pas une donnée de la personne mais
  une adresse technique de l'appareil ; à trancher, §9) et `canal_de_rappel`.

### 4.3 `notification_outbox` gagne un canal

```sql
alter table public.notification_outbox
  add column channel text not null default 'email' check (channel in ('email', 'push')),
  add column provider_ticket text,               -- id de ticket Expo, pour les reçus (§4.5)
  alter column recipient_email drop not null;    -- null pour un push
```

**Écart assumé avec le plan initial, décidé à l'implémentation** : le corps du push vit dans
une colonne **`push_body`** à côté de `body` (l'email complet, signé), au lieu que `body` porte
l'un ou l'autre selon le canal. Sans cela, le repli push → email devrait reconstruire le texte
de l'email au moment de l'envoi — et le message ne serait plus celui figé à la génération, ce
qui est précisément ce que la boîte d'envoi existe pour garantir. Même raison pour
`recipient_email`, renseignée **même sur une ligne push** dès qu'une adresse est utilisable :
le repli n'a alors rien à relire dans `auth.users`. Et `provider_ticket` est un `jsonb`
`{id du ticket: jeton}` plutôt qu'un texte : les reçus (§4.5) ne rendent que des identifiants
de ticket, sans cette correspondance ils ne pourraient désactiver aucun jeton.

`enqueue_checkin_reminders()` applique la table du §3, une ligne par point : `channel`,
`recipient_email` (email seulement), `send_after` = `now()` pour un push (pas d'étalement), le
décalage stable de 0 à 4 jours pour un email (inchangé). `subject`/`body` servent aux deux : le
titre « Ton point de la semaine » / « Ton point du mois » et, pour le push, **la question
seule** comme corps (« As-tu changé de mode de transport au moins une fois cette semaine pour
tes trajets domicile-travail ? ») — Android replie le corps à deux lignes, le titre et le
début de la question doivent suffire (`Rappel.dc.html`). Le corps de l'email est celui de
`20260905240000`, signé, inchangé.

La résolution vit dans une fonction SQL **pure** `public.reminder_channel_for(p_user_id)
returns text` (`'push'`, `'email'` ou `null`), appelée par `enqueue_checkin_reminders` et
testable sans HTTP. C'est elle que le test `17` confronte à la table du §3.

### 4.4 L'envoi

`send_pending_reminders()` branche sur `channel` :

- `email` : Resend, comme aujourd'hui, rien ne bouge.
- `push` : `POST https://exp.host/--/api/v2/push/send`, corps
  `{ "to": [jetons actifs de l'utilisateur], "title": subject, "body": body, "data": { "url":
  "/plan" }, "channelId": "rappels" }` — **un point, un message par appareil**, tous les jetons
  actifs de la personne dans la même requête. En-tête `Authorization: Bearer …` **seulement si**
  un secret Vault `expo_access_token` existe (même mécanique que `resend_api_key` : sans lui,
  l'appel part sans en-tête, ce qui suffit tant que la sécurité renforcée du push n'est pas
  activée sur expo.dev — la recommander en §7). La réponse porte un ticket par jeton :
  `status: 'ok'` avec un `id` (à stocker dans `provider_ticket`, séparés par des virgules si
  plusieurs), ou `status: 'error'` avec `details.error = 'DeviceNotRegistered'` → le jeton
  passe `disabled_at = now()`. **Si aucun jeton n'a accepté** : repli par mise à jour de la
  même ligne — `channel = 'email'`, `recipient_email`, `send_after = now()` si l'email est
  possible, sinon `status = 'failed'`. La contrainte d'unicité n'est jamais contournée.
- Le cron `send-pending-reminders` reste **quotidien à 7 h UTC** : 9 h à Paris l'été, 8 h
  l'hiver — le matin où la question s'ouvre, à une heure raisonnable, après les deux
  générations de 6 h. Rien à changer.

### 4.5 Les reçus

Expo répond « ticket accepté », pas « notification remise » : un jeton d'app désinstallée est
souvent signalé **dans le reçu** seulement, quinze minutes plus tard, et continuer d'envoyer
vers des jetons morts fait dégrader la réputation de l'app auprès de FCM. Une fonction
`collect_push_receipts()` — `POST https://exp.host/--/api/v2/push/getReceipts` avec les
`provider_ticket` des lignes `sent` du jour, `DeviceNotRegistered` → jeton désactivé — sur un
cron `collect-push-receipts` à 8 h UTC. Petit, mais pas optionnel.

### 4.6 Un événement d'usage, pas deux

`rappels_view` (la feuille s'est affichée), sans propriété : elle ne s'ouvre que depuis
l'engagement. Le choix lui-même **n'est pas un événement** — il est dans
`profiles.reminder_channel`, et la permission dans `push_tokens` : les instrumenter, c'est le
doublon que `v1-08` interdit. Le rapport « feuilles vues / préférences à `push` avec jeton »
est la mesure du chantier, et il se calcule avec ce qui est déjà en base. Deux écritures,
comme toujours : la ligne dans `usage_event_types` et l'entrée dans `src/types/analytics.ts` ;
le test `12` passe à quinze.

## 5. Le natif

### 5.1 Dépendance, plugin, build

- `npx expo install expo-notifications` — `~57.0.17` pour ce SDK (`expo/bundledNativeModules.json`),
  aux côtés d'`expo-device` et `expo-constants` déjà présents.
- `app.json`, plugin `["expo-notifications", { "icon": "./assets/images/notification-icon.png",
  "color": "#1F6F4A", "defaultChannel": "rappels" }]`. L'icône est une **silhouette blanche
  sur fond transparent** (96 × 96) — Android la teinte lui-même, une icône en couleur devient
  un carré. La feuille de la mascotte, réduite à son contour.
- **Nouvelle dépendance native = nouveau build EAS** (v1-10 §10.8). Expo Go ne reçoit plus de
  push depuis le SDK 53 : le profil `preview` d'`eas.json` produit l'APK de test.
- Le `projectId` existe déjà dans `app.json` (`extra.eas.projectId`, posé par le chantier F) :
  `getExpoPushTokenAsync({ projectId })` le lit via `Constants.expoConfig`.

### 5.2 Les identifiants FCM — actions de compte, pas de code

Même régime que la clé Resend : **le titulaire les fait, rien ne se colle dans le chat, je ne
vérifie que la présence.**

1. Un projet Firebase (console.firebase.google.com), une app Android avec le paquet
   `fr.ramille.app` (celui d'`app.json`), et le fichier `google-services.json` téléchargé.
2. Une clé de compte de service (JSON) pour l'API FCM v1, téléversée sur expo.dev → projet
   `ramille` → Credentials → Android → *FCM V1 service account key*. C'est elle qui autorise
   Expo à parler à FCM pour cette app.
3. `google-services.json` **hors du dépôt** : une variable d'environnement EAS de type
   *fichier* (`GOOGLE_SERVICES_JSON`), lue par un `app.config.js` qui étend `app.json` et pose
   `android.googleServicesFile`. Rien à voir avec le piège `EXPO_PUBLIC_*` (CLAUDE.md) : la
   config d'app se lit au moment du build, pas dans le bundle.

Sans ces trois points, tout le code de ce chantier tourne, `register_push_token` enregistre des
jetons, et **rien n'arrive sur le téléphone** — sans autre message qu'un ticket en erreur dans
`notification_outbox.last_error`. C'est le seul endroit où on le verra ; le dire ici.

### 5.3 `src/lib/rappels.ts` — le jeton suit la personne

- `enregistrerLeJeton()` : si natif, permission accordée (`getPermissionsAsync`) et pas un
  simulateur (`expo-device`) → `getExpoPushTokenAsync` → RPC `register_push_token`. Appelée
  **à chaque ouverture** dans `_layout.tsx`, après `ensureSession()`, et après un rattachement
  réussi : c'est ainsi que le jeton reste au nom de qui est connecté (le RPC reprend le jeton
  à l'ancien propriétaire). Idempotente et silencieuse — jamais de message à l'écran pour ça.
- Permission **retirée** depuis les réglages du téléphone : à l'ouverture,
  `getPermissionsAsync` répond `denied` → RPC `unregister_push_token`, pour que le serveur
  retombe sur l'email au prochain point au lieu d'envoyer dans le vide.
- Canal Android **`rappels`** (« Points de suivi »), importance par défaut, pas de son
  personnalisé, créé au démarrage par `setNotificationChannelAsync`. Un seul canal : le
  produit n'envoie qu'une sorte de message.
- Au premier plan, le rappel s'affiche comme bannière (`setNotificationHandler`) — sinon un
  push reçu app ouverte disparaît sans trace.

### 5.4 Le retour dans l'app

`data.url = '/plan'`. Appuyer sur la notification ouvre l'app : la racine route déjà vers le
plan dès qu'un bilan existe, le point en tête (v1-11 flux 4) — **rien à écrire pour le cas
courant**. Le seul cas à couvrir est l'app déjà ouverte ailleurs (sur « Toi », dans le
questionnaire) : `addNotificationResponseReceivedListener` dans `_layout.tsx`, à côté du
`Linking.useURL()` existant, `router.navigate('/plan')`. Pas de deep link vers le point
lui-même : il est en tête du plan, et un lien plus précis vieillirait mal.

## 6. Les écrans

Tout vient du canvas ; ici, ce que le code doit savoir.

### 6.1 La feuille — `src/components/plan/feuille-rappels.tsx`

- Déclenchée par le succès de `commitPlanAction` dans `ActionCommitment` : le composant
  gagne un rappel `onEngage` (à côté d'`onChanged`), `plan.tsx` décide. Un `Modal` de
  React Native, `animationType="slide"`, vue ancrée en bas — pas de bibliothèque de feuille,
  c'est la première du produit et elle n'a qu'un contenu.
- **S'ouvre une fois par appareil** : clé AsyncStorage `traceverte.rappels_proposes.v1`, posée
  à la fermeture quel que soit le chemin (choix, « Continuer sans rappel », geste de
  fermeture). La dérivation `doitProposerLaFeuille({ plateforme, compte, dejaProposee })` vit
  dans `src/types/rappels.ts` : native → oui ; web → seulement si le compte est rattaché.
- Trois lignes en **`radio`** (même rôle que `ChoiceRow`, avec un sous-titre — une prop de plus
  sur `ChoiceRow` ou un composant frère), présélection selon la table du §3 avec
  `reminder_channel` courant. La ligne email dit sa condition quand elle manque (« Rattache un
  compte pour l'activer ») et **reste visible, non sélectionnable**.
- **Un bouton, trois libellés** (`libelleBouton(canal, permission)`) : « Autoriser les
  notifications » quand la ligne notification est choisie **et qu'un dialogue va s'ouvrir**
  (`canAskAgain` et pas encore accordée) ; « C'est bon » quand elle est déjà accordée
  (Android 12 et avant, ou permission déjà donnée) ou pour l'email ; « Continuer sans rappel »
  pour rien. Le bouton n'annonce un dialogue que s'il y en a un.
- Au bouton : écrire `reminder_channel`, puis si notification → `requestPermissionsAsync` →
  accordée : `enregistrerLeJeton()` ; refusée : rien d'autre (la préférence reste `push`,
  §3). Puis fermer, et la carte d'attente prend le relais. **Aucune boîte à nous** : un échec
  d'écriture est un `MessageInline` dans la feuille (règle ESLint sur `Alert`).
- La phrase de Ramille et la question sont `RAMILLE.engagementAttente` / `.choixCanal` (§6.3),
  rendues par `RamilleDit` avec le visage — il n'y a aucun chiffre sur la feuille, c'est ce qui
  l'autorise.

### 6.2 La carte d'attente — `plan.tsx`

Remplace la carte « Rien à rattraper », **au même endroit** (au-dessus du cap ; v1-11 §8
demande de vérifier sur appareil que la mascotte n'y semble pas commenter le cap). Contenu par
la table du §3 : la ligne de Ramille (`attenteSigne` / `attenteIci`, en `resting`), puis la
ligne de détail **du produit** — jamais dans sa bouche, une adresse peut porter un chiffre.
Entrées : `reminder_channel`, permission locale, jeton (existence, via `push_tokens` en
lecture owner-scoped), état du rattachement, présence de la boucle hebdo. Une seule
dérivation, `carteAttente(entrees)`, testée.

### 6.3 `src/constants/mascotte.ts`

| Clé | Ligne |
| --- | --- |
| `engagementAttente.hebdo` | Je te laisse mener ton action. Lundi, je reviens te demander si tu l'as faite. |
| `engagementAttente.mensuel` | Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l'as faite. |
| `choixCanal` | Comment tu préfères que je te fasse signe ? |
| `attenteSigne.hebdo` / `.mensuel` | Je te fais signe lundi. / Je te fais signe au début du mois prochain. |
| `attenteIci.hebdo` / `.mensuel` | On se retrouve ici lundi. / On se retrouve ici au début du mois prochain. |

`periodeCalme` et `periodeCalmeDetail` **sont retirées**. C'est la seule réplique validée en
maquette (v1-08) qui soit réécrite, sur un retour d'usage explicite ; le test de `mascotte.ts`
n'a rien à changer (aucun chiffre, aucune injonction, moins de 120 caractères — la plus longue
fait 98). Le `RAMILLE` devient un objet à deux niveaux pour ces clés ; le test itère déjà sur
les valeurs, à aplatir.

### 6.4 « Toi » — `src/app/compte/index.tsx`

L'interrupteur « Rappels par email » devient le réglage à trois du canvas (`Toi.dc.html`),
**visible pour toutes les sessions** : notification / email / aucun, en `radio`, avec la
raison quand une ligne n'est pas disponible (« Rattache un compte pour l'activer » ; « Coupées
dans les réglages du téléphone » quand la permission est refusée — et alors la ligne reste
sélectionnable : la préférence ne se dégrade pas, §3). Sur web, la ligne notification n'existe
pas. `loadReminderPrefs`/`setReminderPrefs` (`src/lib/notification-prefs.ts`) passent au
canal ; le fichier garde son nom.

### 6.5 Confidentialité et Play

- `src/app/confidentialite.tsx` : un prestataire de plus dans « Où sont tes données » —
  **Expo** (service d'envoi des notifications, États-Unis) et **Google** (Firebase Cloud
  Messaging, la remise sur Android) — et une ligne dans « Combien de temps » : le jeton
  d'appareil, conservé tant que l'app est installée et que le compte existe, retiré à la
  désinstallation (reçus, §4.5), à la suppression du compte et à la purge d'inactivité. Les
  garanties de transfert d'Expo (clauses contractuelles) sont **à vérifier avant** de publier
  la page, pas à affirmer de mémoire.
- Le formulaire *Sécurité des données* de Google Play doit déclarer « identifiants
  d'appareil » (v1-10 §3.6) : motif de rejet, pas détail.

## 7. Mise en service — ce que le titulaire fait

Dans l'ordre, et rien ne bloque le code d'avancer entre-temps :

1. Firebase + `google-services.json` + clé de compte de service sur expo.dev (§5.2).
2. Variable EAS *fichier* `GOOGLE_SERVICES_JSON`.
3. Optionnel mais recommandé : activer la sécurité renforcée du push sur expo.dev et déposer
   un jeton d'accès dans Vault sous `expo_access_token` — je vérifie le nom, jamais la valeur.
4. Build `preview`, installation, et le test d'appareil du §8.

## 8. Tests

**Jest** — `src/types/rappels.test.ts` : la table du §3 ligne à ligne (`canalEffectif`),
`carteAttente`, `doitProposerLaFeuille` (natif / web × compte / anonyme × déjà proposée),
`libelleBouton` (les trois libellés, dont « C'est bon » sans dialogue). `mascotte.test.ts` et
`analytics.test.ts` absorbent les nouvelles entrées sans changer de règle.

**pgTAP** — `17_rappels_canal.test.sql`, rejoué **en séquence entière** avec ses bascules de
`request.jwt.claims` (CLAUDE.md) :

- `reminder_channel_for` contre la table du §3 — six lignes, chacune nommée ;
- une ligne par point quel que soit le canal, et le repli push → email **met à jour** la ligne
  (même `id`, `channel` changé) ;
- `register_push_token` reprend un jeton à un autre utilisateur ; `unregister` désactive sans
  supprimer ; `insert` direct sur `push_tokens` refusé (`42501`), `select` d'un tiers vide ;
- `notification_outbox` reste serveur-only ; la chaîne de cascade jusqu'à `push_tokens` ;
  `export_my_data` porte les nouvelles clés (`15`) ; `usage_event_types` à quinze (`12`) ;
  `03` gagne les policies de la table.

Un piège à ne pas retrouver : remplir `push_tokens` sous `postgres` par commodité, puis
tester une RPC qui vérifie `auth.uid()` — même erreur que le garde-fou de volume de
`usage_events` (CLAUDE.md), dans le seul rôle où elle ne se voit pas.

**Sur appareil** (le titulaire, avec l'APK `preview`) :

1. Android 13+ : s'engager → la feuille → « Autoriser les notifications » → le dialogue
   s'ouvre **une fois** ; refuser → la carte dit « coupées sur ce téléphone » ; revenir sur
   « Toi » → la ligne notification est là avec sa raison ; rouvrir dans les réglages du
   téléphone → à l'ouverture suivante, la carte repasse à « Par notification ».
2. Android 12 ou avant : la feuille dit « C'est bon », aucun dialogue.
3. Un vrai rappel un lundi matin, ou provoqué : un point `pending` inséré pour le compte de
   test puis `select public.send_pending_reminders()` sur le projet distant — la seule façon
   de voir la notification sans attendre lundi. Appuyer dessus ouvre le plan, point en tête.

## 9. Ce qui reste ouvert

**Tranché le 07/09**, et retiré de cette liste : le jeton **n'est pas exporté en entier** — la
plateforme, les dates et les six derniers caractères suffisent à reconnaître un appareil, là
où la chaîne complète est l'adresse à laquelle on peut lui pousser une notification, sans
aucune valeur de portabilité (elle ne se réimporte nulle part et meurt à la désinstallation).
Trois assertions du test `15` l'épinglent. Et la base sera **repurgée avant l'ouverture** :
la question de ce que les comptes existants verront à leur prochain engagement ne se pose
plus.

- **La sécurité renforcée du push** (jeton d'accès Expo) : recommandée, pas requise pour le
  premier test.

## 10. Découpage en PR

Une PR par étage, chacune verte seule ; le push depuis GitHub en un clic après la seconde.

1. **La base et le réglage** — *livrée le 07/09*. Migration (§4), types régénérés,
   `notification-prefs.ts` au canal, « Toi » à trois lignes (§6.4), `src/types/rappels.ts` +
   tests, pgTAP `17` et les mises à jour de `09`, `15`, `16`. L'app continue de marcher sans
   `expo-notifications` : `push_tokens` est simplement vide, la table du §3 retombe sur
   l'email. Deux écarts avec le plan : l'interrupteur de rappel qui subsistait **aussi** sur
   `/suivi` a été retiré (le réglage vit sur « Toi », qui est le lieu du compte depuis v1-11
   §2.5), et la RLS de `push_tokens` est couverte par `17` plutôt que par `03` — elle est
   inséparable du RPC qui remplace la policy INSERT, et la séparer aurait donné deux tests qui
   ne se lisent qu'ensemble.
2. **Le natif et le moment** — *livrée le 08/09*. `expo-notifications` et son plugin,
   `app.config.js` (la variable EAS `GOOGLE_SERVICES_JSON`, §5.2), `rappels.ts` (§5.3), le
   retour (§5.4), la feuille (§6.1), la carte d'attente (§6.2), `mascotte.ts` (§6.3), la page
   de confidentialité (§6.5), l'événement `rappels_view`, et les retouches de `CLAUDE.md`
   (§11). Trois écarts avec le plan : le rayon de la feuille est `Radius.card` et non une
   valeur nommée (le point ouvert du §9 est tranché ainsi — un seul usage ne justifie pas un
   jeton) ; `/suivi` gagne sa propre réplique `suiviSansPoint` plutôt que de reprendre celle
   du plan, parce que la cadence y est inconnue et qu'une date fausse serait pire que pas de
   date ; et l'icône de notification est dérivée de l'icône monochrome existante, silhouette
   blanche sur transparent, Android n'utilisant que le canal alpha.
3. **Mise en service** (§7) et le test d'appareil (§8) — pas de code, sauf ce que le test
   révèle.

## 11. Ce que `CLAUDE.md` devra dire ensuite

À reprendre dans la PR 2, pas avant :

- « quatre conditions d'éligibilité » du rappel par email → la table du §3 et
  `reminder_channel_for` ; `email_reminders_enabled` et « opt-out réglable depuis `/suivi` »
  disparaissent ;
- « les répliques de check-in et de période calme viennent des maquettes validées et ne se
  réécrivent pas » → la période calme est réécrite le 07/09 sur retour d'usage, les
  check-ins restent ;
- le jeton suit la personne (RPC `register_push_token`, jamais une policy `insert`), et une
  dépendance native nouvelle impose un build — deux pièges silencieux de plus à la liste.
