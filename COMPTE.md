# COMPTE.md — la connexion, la session, le hors-ligne et la suppression

> **Quand ouvrir ce fichier.** Toucher à la connexion, au rattachement, au code reçu par e-mail ou à
> un écran de `/connexion/*` · toucher à la session (`ensureSession`, PKCE, lien profond, jeton
> refusé) · ajouter une provenance vers `/connexion/retrouver` · toucher au démarrage hors ligne ou
> à une marque locale · toucher à la suppression de compte ou à l'export.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier est l'un des cinq fichiers de sujet sortis de la section Architecture de `CLAUDE.md` le
01/10/2026 — `BILAN.md`, `PLAN.md`, `BOUCLE.md`, `COMPTE.md`, `MESURE.md`. `CLAUDE.md` pesait alors
177 Ko, dont 144 pour l'architecture, chargés à chaque session pour des briques qu'on ne touche
qu'une à la fois. Les paragraphes sont venus **tels quels**, à leurs renvois et à quelques faits périmés près, regroupés par thème ; quand
l'un d'eux dit « `CLAUDE.md` a écrit… », c'est là que l'erreur avait été écrite. Tout ici est
propre à Ramille : les leçons qui voyagent vivent dans les fichiers d'outil (`SUPABASE.md`,
`TESTING.md`, `EXPO.md`, `VERCEL.md`) et dans `FRONT.md` §1.

**Les deux paragraphes qui fondent ce modèle sont restés dans `CLAUDE.md`** — une session anonyme
dès l'ouverture, une connexion qui la convertit en gardant le même `user_id` —, parce qu'ils se
cassent sans qu'on ait ouvert ce fichier. Tout ce qui suit en découle. Les pièges de Supabase Auth
sont dans `SUPABASE.md` : §1.1 pour ceux qui voyagent, §2.4 pour ceux de Ramille.

---

## 1. Le modèle d'authentification

**Il n'y a pas de mot de passe** (`v1-10` §2.D, 07/09/2026) : il n'a jamais servi — aucun
`signInWithPassword` dans le produit, zéro compte n'en portait — et la confirmation d'email
faisait déjà tout le travail. Le seul chemin **délibéré** vers un compte existant (nouvel appareil) est
`demanderLaConnexion` (`signInWithOtp` avec `shouldCreateUser: false` — elle s'appelait
`sendAccountAccessLink` tant qu'elle envoyait un lien), écran
`/connexion/retrouver`, atteignable depuis l'accueil de l'onboarding (« J'ai déjà un compte »)
et depuis le lien du même nom sur le formulaire de `/connexion/email`. Trois règles gardées par
`src/types/connexion.ts` : une adresse inconnue
(`422 otp_disabled`) mène au **même** écran qu'un envoi réussi, sinon l'écran dit qui utilise
Ramille ; la limite d'envoi se reconnaît au **code** `over_email_send_rate_limit`, jamais au
message ; et un appareil qui porte déjà un bilan anonyme voit l'écran de collision avant le
formulaire — Supabase ne fusionne pas deux utilisateurs, on le dit et on laisse choisir. **Cet
écran-là n'est pas l'oracle fermé le 21/09/2026 et ne se « corrige » pas par symétrie** : il ne se
rend que sur `/connexion/retrouver`, où la personne vient chercher un compte **existant** et où il
n'y a donc rien à taire ; ce qui a disparu est l'écran homonyme de `/connexion/email`, qui, lui,
répondait « cette adresse a-t-elle un compte ? » à qui n'avait rien demandé.

**`/connexion/email` envoie désormais un code dans les deux cas, et l'écran ne dit pas lequel**
(arbitrage du 21/09/2026, `v1-28` §7.1). Une adresse libre reçoit un code de **rattachement**, une
adresse prise un code de **connexion** — et les deux atterrissent sur le **même** écran de code.
L'oracle qu'on ferme là était mesuré, pas supposé : une seule session anonyme a sondé vingt fois de
suite la même adresse prise, vingt refus, aucun plafond. **Et il n'est fermé qu'à l'écran** (recette
web du 28/09/2026, documenté par décision le même jour) : la réponse du serveur reste `422` ou `200`,
lisible dans la console et par un appel direct, et rien dans GoTrue ne la masque — `SUPABASE.md`
§2.4, et la condition de réouverture en `v1-28` §7.1. Trois choses à ne pas reconfondre :

- **Le contexte suit la branche, la voix suit l'écran hôte.** `ContexteDuCode` décide le `type`
  envoyé à l'API (`email_change` / `email`) et **doit** suivre la branche, les deux flux ne se
  croisant pas. `VoixDeLaSaisie` (`parti` | `peut_etre`) décide ce que l'écran a le droit
  d'**affirmer**, et c'est une propriété de l'hôte : `/connexion/email` est en `parti` dans ses
  **deux** branches. Les confondre rouvrirait par le texte l'oracle fermé par le mécanisme — le
  mécanisme serait juste et la fuite intacte. Détail et gardes en `FRONT-SESSION.md` §2.7 bis.
- **La phrase conditionnelle est le prix de l'arbitrage**, et son « si » n'est pas du style : « S'il
  existait déjà un compte Ramille à cette adresse, ce code t'y ramène — et le bilan de cet appareil
  ne l'y rejoindra pas. » Vraie dans les deux branches, donc montrable aux deux ; et posée **avant**
  la saisie du code, ce qui laisse la sortie. À l'indicatif, elle redeviendrait l'oracle.
- **Ce que ça ne ferme pas** : le renvoi depuis la branche de rattachement peut encore échouer si
  l'adresse a été prise entre les deux envois. Le message y reste le générique, qui ne nomme pas
  l'état de l'adresse, et l'atteindre demande une course que seul celui qui a pris l'adresse peut
  provoquer. Sur
natif, un lien de connexion arrivait hors de l'app (messagerie) et remontait par `Linking.useURL()`
dans `_layout.tsx`. Depuis le 20/09/2026 il n'y a plus de lien : cette branche refuse nommément
une URL à jetons injectée (plus bas, PKCE), échange le `?code=` d'une fenêtre Google dont l'app a été
tuée entre-temps, et se tait sur ce que la fenêtre a pris (plus bas, les trois écouteurs). Le scheme `ramille://` reste
dans les Redirect URLs Supabase pour le retour de Google sur natif : `linkGoogleIdentity` reçoit
l'URL de `openAuthSessionAsync` et appelle lui-même `createSessionFromUrl`.

**Ce paragraphe disait que ce retour « ne passe pas par » le filet, et c'était faux sur Android**
(seconde passe de la revue finale, 04/10/2026). `openAuthSessionAsync` y est un polyfill qui attend
l'événement `url` de `Linking` — le même que `Linking.useURL()` et qu'Expo Router. Les trois le
recevaient : le code partait deux fois à l'échange, le second échec remplaçait l'écran, et Expo
Router empilait la racine. **Ce que la fenêtre a pris n'appartient qu'à elle** : le layout se tait
dessus (`estUnRetourDuNavigateurDAuth`, `src/lib/auth.ts`), et Expo Router ne navigue sur aucune URL
`ramille:` d'authentification arrivée app ouverte (`src/app/+native-intent.tsx`,
`cheminPourLeRouteur`) — les liens `https` du plan, eux, passent, même s'ils portaient un jour un
`code=`. Ajouter un écouteur de `Linking` ailleurs dans l'app impose la même question.

**Le flux est en PKCE depuis le 20/09/2026, et le lien ne s'ouvre plus que là où il a été
demandé.** Le défaut d'`auth-js` est `implicit` : tout lien livrait alors `access_token` **et**
`refresh_token` en clair dans le fragment de l'adresse d'arrivée, donc la liste des Redirect URLs
Supabase était le **seul** contrôle existant sur un compte — et quatre entrées trop larges y ont
été trouvées le jour même. En PKCE, le lien ne porte qu'un `code`, qui ne vaut rien sans le
vérifieur resté dans le stockage du client demandeur. Cinq points à connaître :

- **L'injection de session par lien profond est fermée du même geste** : `auth-js` refuse un
  fragment implicite quand le client est en PKCE. Le scheme `ramille` est BROWSABLE, donc
  n'importe quelle page web du téléphone pouvait ouvrir `ramille://x#access_token=<les siens>` et
  faire basculer l'app sur le compte de quelqu'un d'autre. **Mesuré avant et après** : en
  implicite la session de la victime devenait celle de l'attaquant, en PKCE elle ne bouge pas.
- **`createSessionFromUrl` échange un code, et refuse la forme « jetons » nommément.** C'est
  exactement la forme qu'un lien injecté porte — un attaquant ne peut pas fabriquer un `code`
  échangeable —, donc la distinguer permet de la refuser avec une phrase vraie plutôt que de la
  laisser échouer sur un message technique.
- **Le piège du chantier est un silence, pas une erreur** : `_isPKCECallback` rend **faux** quand
  le vérifieur manque, donc sur web le SDK ne tente rien et ne lève rien. Sans la branche `code`
  du layout racine, la personne atterrissait sur l'accueil, déconnectée, sans un mot, son lien
  encore valable dans la barre d'adresse. La branche tranche après `getSession()`, qui attend
  l'initialisation du SDK — donc sans course —, et le signal est le `code` **toujours présent**
  dans l'URL, qu'`auth-js` retire quand il réussit.
- **Un troisième motif de retour existe, `lien_ouvert_ailleurs`**, et c'est le seul des trois qui
  décrit un lien **encore valable** : lui donner le message de l'expiration ferait redemander un
  lien à l'infini, chacun échouant pareil. Le vérifieur manquant se reconnaît au **code**
  (`pkce_code_verifier_not_found`), jamais au message — celui d'`auth-js` est anglais et parle de
  Next.js.
- **Le flux entier est joué à chaque PR** (`scripts/verifier-code-de-connexion.mjs`, `TESTING-GARDES.md`
  §2.9), contre une vraie stack et un vrai e-mail : c'est ce qui a rendu ce chantier vérifiable
  au lieu de plausible, et c'est lui qui a trouvé deux défauts de plus — dont une interversion de
  messages qu'aucun test unitaire ne voyait.

**Et le lien a disparu des deux e-mails le même jour, au profit d'un code à huit chiffres** — c'est
le correctif de sécurité du 20/09/2026, et PKCE n'en dispensait pas : **il protège la session, pas
la confirmation de l'adresse**. Le défaut mesuré la veille : un `GET /auth/v1/verify` confirme
l'adresse côté serveur **avant** toute redirection, donc n'importe qui recevant l'e-mail de
rattachement rattachait son adresse au compte d'un inconnu d'un seul clic. Sept points à connaître :

- **Le code n'est PAS un jumeau du vérifieur PKCE : c'est un porteur.** Mesuré — un
  `POST /auth/v1/verify` avec le jeton et **aucune session** confirme l'adresse et rend une session
  complète sur le compte du demandeur. Le code ne referme donc pas la porte, il en **relève le
  prix** : un clic devient huit chiffres à recopier dans une app qu'il faut trouver et ouvrir. Ce
  qui reste ouvert, et qu'il ne faut pas prétendre fermé : un tiers qui taperait le code confirme
  l'adresse sur le compte de l'attaquant **et sa propre app bascule sur cette session**. La parade
  est le texte de l'e-mail ; la dette et sa condition de réouverture sont en `v1-27` §12.12.
- **Huit chiffres, pas six, et c'est une valeur de sécurité.** `mailer_otp_length = 8` sur le
  distant ; `supabase/config.toml` portait `6` et la session de design a conclu « six » en le
  lisant. Avec `rate_limit_verify = 30` par tranche de cinq minutes et par adresse IP et une
  validité d'une heure, six chiffres laissent une chance sur trois à un attaquant disposant d'un
  millier d'adresses IP — et le chemin de reconnexion (`shouldCreateUser: false`) fait de cette
  différence une prise de compte. La constante vit dans `src/types/connexion.ts`
  (`LONGUEUR_DU_CODE`) et **y toucher impose de toucher les deux configurations**, ce que rien ne
  vérifie.
- **Le `type` sépare les deux flux et n'est pas interchangeable** : `email_change` confirme un
  rattachement, `email` rouvre un compte existant. Mesuré dans les deux sens — un code émis pour
  l'un et présenté à l'autre rend `403 otp_expired`. C'est ce qui rend sûr de montrer le **même**
  écran de code dans les deux contextes, donc de ne rien divulguer sur l'adresse. Le choix se fait
  en un seul endroit (`verifierLeCode`), et la garde de bout en bout tombe si on l'uniformise.
- **Un code faux et un code expiré rendent la même erreur** (`403 otp_expired`, « Token has
  expired or is invalid »). Les distinguer à l'écran serait inventer une information qu'on n'a
  pas : un seul message, qui nomme les deux causes et donne le même geste.
- **Un renvoi invalide le code précédent** (mesuré), donc « ce n'est pas le plus récent » est vrai
  dans le message de refus ; et le champ ne se vide **qu'au renvoi**, jamais sur un refus — la
  personne compare ses chiffres avec l'e-mail.
- **Les deux gabarits vivent dans le dépôt** (`supabase/templates/`, déclarés dans
  `supabase/config.toml`) pour que la stack locale rejoue le texte de la production. Leur
  référence vivante reste `docs/exploitation/gabarits-email.md`, et **l'égalité entre les deux est
  comparée à chaque PR** depuis le 21/09/2026 (`scripts/verifier-gabarits-email.mjs`, `TESTING-GARDES.md`
  §2.11), avec l'assertion qu'aucun ne porte de lien de confirmation — `CLAUDE.md` affirmait cette
  comparaison avant qu'elle n'existe. **Un gabarit n'est pas relu à
  chaud** : GoTrue l'inline au démarrage du conteneur, donc une mutation de gabarit sans
  `supabase stop && start` ne fait rien — et la garde reste verte pour la mauvaise raison.
- **Les Redirect URLs ne servent plus qu'à Google.** `emailRedirectTo` a disparu des deux appels :
  il ne remplissait que `{{ .ConfirmationURL }}`, que plus aucun gabarit n'emprunte. Le chemin de
  lien profond (`Linking.useURL()` dans `_layout.tsx`) est resté le 20/09/2026 comme **filet** pour
  un lien parti avant le changement — expiré depuis, la validité étant d'une heure. Il refuse une
  URL à jetons injectée, échange le code d'une fenêtre Google dont l'app a été tuée, et se tait sur
  le retour que la fenêtre a pris (plus haut). Le scheme `ramille://` et `createSessionFromUrl`
  servent, eux, au retour OAuth de Google sur natif, qui revient par `openAuthSessionAsync`.

**`estPanneDeTransport` couvre les 5xx, et c'est assumé** — `auth-js` lève
`AuthRetryableFetchError` pour chacun d'eux : `SUPABASE.md` §2.4.

**« Pas de session » recouvre trois situations, et une seule appelle une création** (C2.11,
`src/types/session.ts`) — un jeton refusé n'en est pas une, sans quoi on donne un compte vide à
quelqu'un qui en a un : `SUPABASE.md` §2.4. **Et au démarrage, le refus ne se voyait pas** jusqu'au
02/10/2026 (`v1-27` §12.27) : `auth-js` retire la session pendant son initialisation, et l'app créait
une session anonyme. Le refus se déduit depuis de **la marque `traceverte.compte_rattache.v1`** — « cet
appareil porte un compte rattaché », posée quand une session non anonyme est vue : une session
anonyme refusée n'a rien à retrouver, et reste une première ouverture. **Toute déconnexion voulue
efface la marque et se déclare** par `pendantUnDepartVolontaire` — « Me déconnecter » et la
suppression du compte le font —, sans quoi elle se lirait comme un refus, et l'écran de reconnexion
s'ouvrirait sur un départ choisi. Et **« Commencer un bilan sur cet appareil » efface les marques du
compte quitté**, comme une déconnexion : ce sont celles d'un autre propriétaire.

**Et depuis le 02/10/2026, les marques locales ont un propriétaire** ([#319](https://github.com/ScratchMe/Ramille/issues/319),
`v1-27` §12.29) : `traceverte.proprietaire_des_marques.v1` retient le compte qu'elles décrivent. La
session que rend `ensureSession()` les balaie si elle est d'un autre compte — c'est ce qui couvre le
seul changement de compte que rien ne déclarait, une session **anonyme** refusée (purgée, révoquée) à
laquelle l'app en substitue une neuve — puis les prend ; sans propriétaire noté, elle note sans rien
effacer. Une reconnexion par code passe par `apresUneReconnexion` (`src/lib/compte.ts`) : elle balaie
si le compte change ou si le propriétaire est inconnu, **pas quand c'est le même compte qui revient**
après un refus, et elle note la reconnexion pour la mesure (`MESURE.md` §1).

**Le lien du rappel porte `?rappel=1`, et le chemin ne doit pas bouger** (C2.11). L'email ne portait
que `/plan` : ouvert sur un ordinateur ou un téléphone neuf, il tombait sur la session anonyme que
l'app venait de créer, et le plan répondait « Ton bilan n'est pas encore fait » avec pour seul bouton
« Faire mon bilan » — et la consigne de désinscription du même email réglait la préférence d'une
session qui n'est personne. Le paramètre ne sert que là, et **seulement sans bilan local**. Une
nouvelle route à la place du paramètre aurait fait ouvrir le lien dans le navigateur sur Android :
le périmètre Android ne revendique nommément que `/plan`, et il est voulu étroit (Play exige que les
pages légales et `/compte/suppression` restent atteignables **sans** l'app). Une chaîne de requête ne
fait pas partie du chemin d'un `intentFilter` ; deux assertions de `09` épinglent les deux moitiés de
la règle.

**Ce périmètre tient au `pathPrefix` d'`app.json`, et à lui seul** — `CLAUDE.md` a écrit jusqu'au
20/09/2026 qu'`assetlinks.json` le portait, et c'est faux : il déclare
`delegate_permission/common.handle_all_urls`, seule relation qu'Android accepte pour un App Link,
donc il délègue **tout** `www.ramille.fr`. Deux conséquences à connaître avant d'y toucher : un
second `intentFilter` ajouté plus tard n'aurait aucun garde-fou du côté d'`assetlinks.json`, et
`pathPrefix` est un préfixe de **chaîne** et non de segment — une future route publique nommée
`/planning` ou `/plan-b` serait capturée par l'app sans que rien ne le dise.

**Un jeton refusé parce qu'il est TROP NEUF n'est pas un refus, c'est une attente** (`PGRST303`
« JWT issued at future », `fetchAvecSecondeChance` dans `src/types/postgrest.ts`) — cinq choses à
savoir avant de chercher ailleurs, dont le fait que ce code couvre aussi l'expiration :
`SUPABASE.md` §2.4, et la recette pour trancher « écart d'horloge ou vrai défaut » en
`docs/exploitation/README.md` §8.6.

**La liste des Redirect URLs Supabase est une frontière de sécurité, pas une commodité de
configuration** — jamais de joker sur un domaine qu'on ne possède pas, et une entrée morte se
retire : `SUPABASE.md` §1.2 et §2.5.

**Un flux de compte terminé vide la pile** (`terminerLeFlux`, 01/10/2026) : `FRONT.md` §2.8. **Et
l'échec de Google ne colle plus le message de Supabase dans la phrase** (`v1-33` T-17) : « La
connexion avec Google n'a pas abouti. » seule dans le message — c'est elle que le lecteur d'écran
annonce —, le texte de Supabase dessous en chasse fixe tertiaire, recopiable.

### Le captcha de la session anonyme et des codes (04/10/2026)

**Deux appels seulement portent un jeton Turnstile** : `signInAnonymously` (`ensureSession`) et
`signInWithOtp` (`demanderLaConnexion`) — ce sont les seuls du produit que Supabase protège quand le
captcha est activé (sa documentation : inscription, session anonyme comprise, connexion,
réinitialisation) ; `updateUser`, `verifyOtp` et `linkIdentity` n'en demandent pas, donc **le code
de rattachement**, envoyé par `updateUser({ email })`, **ne passe pas par lui** : ce flux d'e-mails
relève des plafonds d'e-mail. Le jeton vient de `jetonDuCaptcha` (`src/lib/captcha.ts`), qui ne
lève jamais : sans clé de site (développement, CI, parcours réel), hors du web sans vue web branchée
(`brancherLeCaptchaNatif` — le rendu de l'export, ou l'app avant le montage du layout), ou sans jeton
au bout de trente secondes — **deux minutes à partir du moment où Cloudflare demande de cocher**
(`DELAI_POUR_COCHER_MS`) ; un plafond absolu, sans lequel un visiteur qui ne cochait pas restait sur
l'écran de lancement, la racine attendant la session —, l'appel part **sans** jeton, et c'est Supabase qui tranche. Avant
l'activation, il passe. Après, il rend `400 captcha_failed` : les écrans de code le disent
(`estRefusDuCaptcha`, la phrase de la panne de transport) au lieu d'annoncer un code jamais parti,
et **au démarrage**, la racine lui donne son propre écran (`issueDeLaSession`, `src/types/demarrage.ts`) :
ni le repli hors ligne, ni l'écran technique et le message anglais de GoTrue qu'il recevait d'abord,
mais « La vérification n'a pas abouti », la cause réaliste selon la plateforme (un bloqueur sur le
web, le réseau dans l'app) et « Réessayer », qui relance la racine et donc un nouveau widget.
Un widget à la fois (une file), et `ensureSession` relit la session après l'attente : une session
ouverte entre-temps n'est plus écrasée par une anonyme. **D'où l'ordre d'activation du registre
d'exploitation (§3.11)**, qui ne se discute pas : l'app Android n'envoie un jeton qu'à partir du
build qui embarque sa vue web (`CaptchaNatif`, `src/components/captcha-natif.tsx`, écrit le
04/10/2026), et l'activer avant que ce build soit installé laisserait chaque nouvelle installation à
la porte.

### Les plafonds d'e-mail (05/10/2026)

**Les deux codes partent de la base, plus de Supabase, dès que le hook d'envoi est allumé**
(`public.envoyer_l_e_mail_d_auth`, registre d'exploitation §3.1) : Supabase lui confie chaque e-mail
d'authentification, il compte, puis envoie avec les deux gabarits du dépôt, recopiés à l'identique —
**par l'API de Brevo dès que sa clé est posée, sinon par celle de Resend** (depuis le 05/10/2026,
`20261005125029_les_codes_par_brevo.sql` : seuls les codes passent par Brevo, les rappels restent
chez Resend). **Seul le rattachement est plafonné**, et les valeurs sont celles de la personne
qui pilote : **5 codes par heure et par compte demandeur, 5 par heure et par adresse, et pour tout le
projet 200 par jour quand Brevo envoie, 60 quand c'est Resend** — 200 sur les 300 de Brevo en laisse 100
aux reconnexions ; 60 sur les 100 de Resend laisse leur part aux rappels. Le hook choisit son
fournisseur avant de compter, donc le plafond suit la clé. La minute de Supabase entre deux codes d'un même compte reste devant ; son plafond
horaire (30) n'est pas compté, faute de mesure qui tranche pour la production. Six choses à savoir
avant d'y toucher :

- **La reconnexion n'est pas plafonnée par le hook, et c'est voulu** (décision du 05/10/2026, après la
  seconde contre-lecture) : elle coûte déjà une case cochée par code. Plafonnée, elle laissait n'importe
  qui bloquer celle d'un autre — cinq demandes vers une adresse, et son titulaire ne recevait plus rien
  de l'heure. Ce qu'on accepte : qui coche une case par e-mail peut épuiser le quota de Brevo par des
  codes de reconnexion — les rappels, chez Resend, n'en souffrent plus tant que la clé Brevo est posée.
- **Les plafonds du rattachement sont muets, et c'est la non-divulgation qui l'impose** : au-delà, rien
  ne part et l'écran de code s'ouvre comme pour un envoi accepté. Sur `/connexion/email`, une adresse
  libre part en rattachement quand une adresse prise bascule en reconnexion : si le rattachement
  refusait, l'écran dirait laquelle des deux branches est partie — sans même qu'un e-mail parte chez le
  titulaire. **Ce que le silence coûte** : Supabase renouvelle le code avant d'appeler le hook, donc un
  plafond atteint tue le code de rattachement déjà reçu sans en envoyer d'autre — l'écran dit « Un
  nouveau code vient de partir ». Et le plafond de l'adresse compte les demandes de tout le monde :
  cinq rattachements vers une adresse dans l'heure, d'où qu'ils viennent, et la personne qui la possède
  ne peut plus la rattacher avant que la fenêtre passe — son compte et sa reconnexion ne sont pas
  touchés. « Trop de demandes pour le moment. Réessaie plus tard. » ne vient donc que des limites de
  Supabase lui-même, et un échec d'envoi rend un `500`, lu comme une panne de transport (ce qu'il dit
  d'une adresse : `SUPABASE.md` §2.4).
- **Le hook a deux secondes, imposées par Supabase** (`statement_timeout`, mesuré) : l'envoi est
  synchrone et borné à 1,5 s (mesuré : une requête qui pend est coupée à 1 502 ms). Le verrou qui
  sérialise les demandes ne vaut que pour une même adresse : un verrou commun ferait attendre chaque
  demande derrière l'envoi des autres, dans ses deux secondes.
- **Deux types d'e-mail seulement partent** : `magiclink` (la reconnexion, vérifiée en `email`) et
  `email_change` (le rattachement). Les autres — inscription par mot de passe, réinitialisation,
  invitation — ne partent plus du tout hook allumé, sans erreur, parce qu'une erreur dirait qui a un
  compte.
- **Les gabarits ont trois copies dans le dépôt** — le document, `supabase/templates/` et la migration
  — que `scripts/verifier-gabarits-email.mjs` compare ; `gabarits-email.md` dit pourquoi les trois.
- **La stack locale passe par le même chemin** : `supabase/config.toml` allume le hook, qui poste au
  collecteur d'e-mails faute de clé Brevo ou Resend — `verifier-code-de-connexion.mjs` joue donc le hook de
  bout en bout à chaque PR. Le journal des plafonds (`envois_d_e_mails_d_auth`, une empreinte d'adresse
  et jamais l'adresse, purgé au plus tard au bout de deux jours) entre dans l'export, et la page de
  confidentialité le nomme, comme elle nomme Resend pour les codes.

## 2. Retrouver un compte existant

`/connexion/retrouver`, seul chemin **délibéré** vers un compte existant, s'atteint depuis **huit**
endroits, et `SOURCES_RETROUVER` les énumère — le compte ne s'écrit ici que parce que la liste est
la source, pas ce paragraphe. Quatre sont d'origine : l'accueil de l'onboarding (« J'ai déjà un
compte »), le lien délibéré « J'ai déjà un compte » du formulaire de `/connexion/email` — **et
non plus l'adresse déjà prise, qui depuis le 21/09/2026 reçoit un code au lieu d'un écran**,
`v1-28` §7.1 —, `/connexion` sur une collision
Google, et un lien de connexion arrivé en **échec** (expiré, déjà utilisé), que le layout racine
route ici avec son motif (`src/app/_layout.tsx`) — un lien valide, lui, ouvre la session et ne
passe pas par cet écran. **Les quatre autres étaient muettes jusqu'au 20/09/2026** : les deux
états vides du plan et celui du suivi (ouverts par C2.11) et l'écran de session refusée ne
passaient aucune provenance, donc le repli les comptait toutes comme l'accueil de l'onboarding.
La plus coûteuse était `rappel` — le rappel e-mail ouvert sur un appareil sans session,
c'est-à-dire le chiffre même que C2.11 existe pour produire. **Et le garde qui les ramenait aux
valeurs déclarées vivait dans l'écran, avec une seconde liste écrite à la main** ; il est
désormais `sourceRetrouver` dans `src/types/analytics.ts`, dérivé de la liste et testé comme sa
jumelle `sourceConnexion` — la règle du dépôt, qu'il ne suivait pas.

**La collision Google n'arrivait jamais sur natif, et c'est l'URL de retour qui la porte** (04/10/2026,
revue finale avant la production). `linkIdentity` ne fait que rendre l'adresse de Google ; le serveur
d'auth découvre au retour que l'identité appartient déjà à un compte, et le dit dans la redirection
(`error_code=identity_already_exists`). Tout retour en erreur était lu comme une annulation, donc
l'aiguillage de `/connexion` (#60) ne partait jamais : quelqu'un qui change de téléphone et touche
« Continuer avec Google » lisait « Tu peux réessayer quand tu veux. », à chaque essai.
`linkGoogleIdentity` lit désormais ce code (`codeDErreurDuRetourDeLien`) et rend un échec qui
porte le code, que `identiteDejaRattachee` reconnaît ; un refus de consentement reste une
annulation. **Et la collision a deux formes** : l'identité déjà prise, et l'adresse d'un compte
rattaché par code e-mail, que le serveur rend en `email_exists` après avoir lié l'identité à la
session anonyme. Les deux mènent à `/connexion/retrouver` (`compteGoogleDejaConnu`) — même personne,
même situation que #60, et rien n'est divulgué : elle vient de prouver par Google qu'elle possède
l'adresse. **Sur web, le retour arrive sur `/plan?error=…`, que le layout ignore** — pas encore
corrigé (`v1-27` §12.35).

**« Me déconnecter » désinscrit le jeton de notification avant de fermer la session** (04/10/2026) :
après, plus rien ne peut le désactiver, et un compte dont la permission est coupée ne retombait
jamais sur le rappel par e-mail. Au mieux de ce qui est possible — hors ligne, la déconnexion se fait
quand même —, et la raison enregistrée reste « permission retirée » (`desinscrireLeJetonDeCetAppareil`,
`src/lib/notification-prefs.ts`, qui dit pourquoi).

## 3. Le démarrage hors ligne

**Hors ligne, la racine route au lieu de lever, et c'est une marque locale qui l'y autorise** (C4.5,
15/09/2026, `v1-15-hors-ligne.md`). La moitié « session expirée » du chantier était **déjà livrée**
par C2.11, et **l'instantané local du plan est resté hors périmètre** — il serait un troisième
endroit où vivent les chiffres de la personne, ce que ce dépôt refuse partout ailleurs ; `v1-15` §7
dit à quelles conditions le rouvrir. Sept points à connaître :

- **La coupure de transport se reconnaît à `status === 0`, jamais à l'absence de `code`**
  (`lireLeBilan`, `src/types/demarrage.ts`). C'est le critère que l'audit proposait, et il est faux :
  le `catch` du transport de `@supabase/postgrest-js` rend bien une erreur sans `code`, mais **trois
  autres chemins** du même paquet en rendent une sans `code` avec un statut réel — un corps non-JSON
  sur une réponse 2xx, un corps d'erreur illisible, un 404 au corps vide. Les classer « pas de
  connexion » ferait taire un serveur qui a parfaitement répondu. Le mauvais critère est rendu
  **inexprimable** — la fonction ne reçoit pas de `code` du tout — et une assertion dit pourquoi.
- **La marque `traceverte.a_un_bilan.v1` n'est pas un cache : c'est ce qui autorise une phrase.**
  Sans elle, aucun écran ne peut dire « ton plan t'attend » sans affirmer ce qu'il ne sait pas — tout
  le raisonnement de C1.4. Le préfixe historique n'est pas négociable : c'est par lui que
  `src/lib/compte.ts` balaie les marques locales depuis ses **deux** sorties, suppression de compte
  **et** déconnexion de l'appareil, ce qui resserre le risque de marque fausse à l'appareil
  restauré depuis une sauvegarde (`allowBackup` est absent d'`app.json`, donc vrai par défaut) — **et
  à un second chemin, vu en recette le 02/10/2026** (`v1-13` §20) : une session **anonyme** refusée,
  par exemple purgée au bout de 90 jours, laissait ses marques à la session anonyme suivante, que rien
  ne balayait ([#319](https://github.com/ScratchMe/Ramille/issues/319)) — corrigé le même jour : les
  marques suivent leur propriétaire (§1).
  **Et un troisième effacement depuis C4.7, qui n'est pas une sortie** : retirer son seul bilan
  efface **cette marque-là et elle seule** (`effacerLaMarqueDeBilan`) — le compte n'est pas quitté,
  donc le balayage par préfixe serait de trop. Il ne vaut que pour l'appareil du geste : un autre
  appareil du compte garde sa marque, que le repli ne lit qu'hors ligne — le risque connu de C4.5.
- **Elle n'est consultée qu'en repli, jamais quand le serveur a répondu**, et c'est ce qui la rend
  sûre : une marque fausse ne peut pas contredire une vérité. Un test l'épingle, et le jour où il
  tombe, c'est que quelqu'un en a fait une seconde source de vérité.
- **Elle s'écrit à deux endroits** : sur une lecture réussie à la racine, et à la soumission du
  questionnaire. Le second n'est pas du confort — le questionnaire mène à la restitution puis au plan
  sans repasser par la racine, donc sans lui, quelqu'un qui soumet son premier bilan puis rouvre
  l'app sans réseau retomberait sur l'onboarding. Elle se pose juste après `clearBilanDraft()`, qui
  est exactement ce qui la rend nécessaire : le brouillon était jusque-là la preuve locale.
- **Hors ligne, le brouillon passe devant la marque**, à l'inverse de la règle en ligne où un bilan
  complété gagne sur un questionnaire commencé (C3.9) : le questionnaire se remplit sans réseau, le
  plan non. Le repli sans marque est `/onboarding`, qui n'affirme rien, marche hors ligne et porte
  « J'ai déjà un compte » — ce qui rend le questionnaire atteignable sans remettre « Faire mon
  bilan » sur un écran d'erreur, que C1.4 en avait délibérément retiré.
- **Aucun drapeau `horsLigne` ne descend de la racine vers le plan, et aucun bandeau n'a été écrit.**
  L'écran `erreur_reseau` de `/plan` existe depuis C1.4 et dit déjà la chose, en français, avec un
  « Réessayer » et la barre d'onglets intacte. Un drapeau serait la seule chose à devoir rester juste
  entre deux écrans, pour une information que l'onglet relit lui-même à chaque retour. L'écran
  `erreur_reseau` (le nom date d'avant D19) porte depuis le 01/10/2026 le **genre** de l'échec : hors
  ligne, il dit toujours « Ton plan n’a pas pu être relu. Vérifie ta connexion. » ; sur une réponse
  du serveur, « … Réessaie dans un instant. » (`v1-33` D19) — le discriminant est le même
  `status === 0` que `lireLeBilan`.
- **Un `ensureSession()` qui échoue par coupure ne fait pas interroger la base.** La racine note la
  coupure et s'arrête là : sans session, la requête partirait en `anon`, qui n'a aucun privilège sur
  `assessments`, et le `42501` se lirait « erreur serveur » alors que c'est le réseau — le défaut que
  ce chantier ferme, atteint par un autre chemin. C'est la famille d'erreurs d'`auth-js`, donc
  `estPanneDeTransport` (`src/types/connexion.ts`) et non `lireLeBilan` : les deux se côtoient dans
  la racine et les confondre ferait passer l'une pour l'autre.

## 4. Suppression de compte et export

**Suppression de compte et export** (`delete_my_account`, `export_my_data`) : bloqueur Google
Play — toute app permettant de créer un compte doit offrir un chemin de suppression **dans**
l'app, et Ramille en crée un dès l'ouverture, session anonyme comprise. Play exige **en plus**
une URL web atteignable sans l'app : `/compte/suppression`.

Cette page a imposé la seule fonction du produit qui **connecte à un compte existant** au lieu
d'en rattacher un (`demanderLaConnexion` : un code à huit chiffres par e-mail, un lien à usage
unique jusqu'au 20/09/2026). Tout le reste de
`src/lib/auth.ts` lie une identité à la session anonyme courante — ce qui ne peut pas aider
quelqu'un qui a désinstallé l'app et arrive dans un navigateur neuf, où `ensureSession` vient
de lui créer une session anonyme **vide qui n'est pas son compte**. Deux garde-fous non
négociables : `shouldCreateUser: false` (une page de suppression qui fabrique des comptes
serait le contraire de ce qu'elle affiche), et **aucune réponse différenciée à l'écran** selon que
l'adresse a un compte ou non — une adresse inconnue renvoie un 422 `otp_disabled` qu'il faut
traiter comme un succès, sinon la page devient un moyen de savoir qui utilise Ramille. (Le 422
lui-même reste lisible au réseau, et la limite d'envoi ne frappe qu'une adresse connue : deux limites
assumées, `SUPABASE.md` §2.4.) La
limite d'envoi, elle, se reconnaît au **code** `over_email_send_rate_limit` : le message de
Supabase ne contient pas le mot « rate ».

Et le piège central, dérivé dans `src/types/compte-suppression.ts` : **une session anonyme
vide n'est pas un compte à supprimer.** Sans le test « porte-t-elle au moins un bilan ? », la
page effacerait la session créée par sa propre ouverture et annoncerait une suppression qui
n'a rien supprimé. Le test épingle aussi qu'une session anonyme portant déjà une adresse non
confirmée (entre `updateUser({ email })` et la saisie du code — le clic d'un lien jusqu'au 20/09/2026) n'est **pas** un compte
rattaché. **La suppression
efface une seule ligne, `auth.users`, et laisse la cascade faire le reste** : une fonction qui
énumérerait les tables deviendrait fausse à la prochaine migration, en silence. **Parcourue une fois
pour de bon le 14/09/2026**, en clôture de la recette sur appareil : un compte réel supprimé depuis
`/compte/suppression`, puis neuf tables relevées pour son identifiant — zéro ligne partout,
`auth.users` comprise. Ne jamais
rattacher une table à `profiles` avec autre chose que `on delete cascade` — un test pgTAP
vérifie la chaîne niveau par niveau. L'export est `security definer` pour une autre raison :
`usage_events` n'ayant aucune policy de lecture, une fonction en `security invoker` rendrait un
export silencieusement incomplet.

**Et l'export énumère, à l'inverse de la suppression** : là où la cascade efface tout ce qui dépend
d'`auth.users` sans qu'on nomme rien, l'export ne rend que les tables qu'il nomme. Une table qui
garde quelque chose de la personne et qu'il oublie rend fausse la promesse de la page de
confidentialité (« l'intégralité de ce que nous conservons sur toi », RGPD art. 15), sans que rien
ne rougisse. C'est arrivé avec les tables d'auth : `auth.identities` (ce que la connexion Google
transmet, nom et photo compris) et `auth.sessions` (l'adresse IP et l'appareil de chaque session)
n'y sont entrées que le 02/10/2026 (`20261002195246_l_export_rend_les_identites_et_les_sessions.sql`),
trouvées en préparant le formulaire de Play (`docs/exploitation/fiche-google-play.md` §1.4). Les deux
contre-lectures du même soir en ont trouvé d'autres, **et c'étaient des colonnes de tables déjà
exportées, pas des tables** : le message de chaque rappel, la question figée de chaque point, les
métadonnées du compte (`20261002201448_l_export_rend_aussi_les_messages.sql`), puis l'adresse en
attente de confirmation et l'action suivie par chaque point (`20261002203559`). **Une table neuve qui
porte un `user_id`, ou une colonne neuve sur une table exportée, impose donc une ligne dans l'export**,
et une assertion dans `15_suppression_et_export.test.sql`. Ni les clés ni les jetons n'y partent,
seulement les faits — **et une clé peut se cacher dans un texte** : le corps d'un rappel porte le lien
de désinscription avec son jeton, que `20261002201448` a exporté tel quel avant que `20261002203559`
ne l'en retire. Un jeu d'essai écrit à la main sans ce lien laissait passer la fuite.

**`engagements_relaches` porte aussi les intentions modifiées** depuis le 02/10/2026 (`v1-33` D15) :
l'export rend toute l'archive, et une ligne `raison: modification` y dit une intention remplacée sur
une action restée engagée — `relache_le` est alors le jour de la modification, et l'action est
toujours dans `plan_actions`. Les clés n'ont pas été renommées : elles sont ce que la personne a déjà
pu télécharger, et la raison suffit à lire la ligne juste.
