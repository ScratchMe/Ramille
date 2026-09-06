# v1-10 — Connexion par lien, rappels par push

**Date** : 06/09/2026. **Statut** : plan d'increment, à exécuter. Ce document décrit le
prochain increment dans son ensemble ; il n'acte aucune implémentation.

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
chantier D.**

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
