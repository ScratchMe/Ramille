import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, EDITOR_NAME } from '@/constants/editeur';
// **`ORIGINE_CANONIQUE` et non `APP_URL`, et ce n'est pas interchangeable ici.** `APP_URL`
// vaut l'origine réelle côté client et le domaine canonique au rendu statique : écrite dans
// un **texte**, elle produit un écart d'hydratation — le HTML exporté dit
// `https://www.ramille.fr/…`, le client recalcule autre chose, et React remplace le texte
// sans rien signaler (erreur 418, que `scripts/verifier-rendu-export.mjs` classe en
// avertissement par conception, donc la CI reste verte). Sur une preview Vercel, les deux
// seules surfaces publiques du produit afficheraient l'hôte de preview dans un texte
// juridique. C'est le raisonnement que `titre-de-page.tsx` applique déjà à l'`og:url`, et
// l'origine canonique est celle que `sitemap.xml` annonce pour cette même page. `APP_URL`
// reste pour ce qui doit suivre l'origine réelle : les `redirectTo` de connexion et le
// lien de partage.
import { APP_NAME, ORIGINE_CANONIQUE } from '@/constants/produit';

// Politique de confidentialité — URL exigée par l'écran de consentement Google OAuth et par
// la fiche Google Play.
//
// Règle de rédaction : **ne décrire que ce que le produit fait réellement**. Chaque
// affirmation ci-dessous est vérifiable dans le code ou le schéma :
//   - session anonyme dès l'ouverture -> `ensureSession()` (src/lib/supabase.ts), v1-04 §1 ;
//   - champs collectés -> colonnes de `assessment_answers` (v1-05 §3) ;
//   - réponses aux points de suivi, oui, non ou sans objet -> `engagement_checkins.response_kind`
//     et `responded_at` (C2.4) ;
//   - rappels par notification ou par email -> `notification_outbox` + `profiles.reminder_channel` ;
//   - décroissance des rappels (un par mois à partir de quatre questions sans réponse, silence à
//     huit, remise à zéro par une réponse ou une ouverture) -> `public.regime_de_rappel()` et la
//     clause `where` d'`enqueue_checkin_reminders()` (C2.9) ;
//   - sortie sans ouvrir l'app -> `desinscrire_des_rappels(uuid)` et
//     `notification_outbox.unsubscribe_token`, page `/rappels/stop` ;
//   - purge à 90 jours sans activité -> `purge_stale_anonymous_accounts()`, cron quotidien ;
//   - rétention des rappels (6 mois) et des jetons désactivés (90 jours) ->
//     `purge_notification_outbox()`, cron quotidien 1h ;
//   - panne d'affichage enregistrée sans son message -> événement `app_error` de `usage_events` ;
//   - aucune géolocalisation -> non-goal explicite de la spec §2 ;
//   - retours utilisateur -> table `feedback`, insert-only côté client, issue #29 ;
//   - sous-traitants et localisation -> les seuls tiers appelés par le produit :
//     `api.resend.com` et `exp.host` dans `send_pending_reminders()`, Supabase (Paris) pour la
//     base, Vercel pour servir la version web et fabriquer la carte de partage, Google pour
//     OAuth et pour FCM, GitHub Actions et Cloudflare R2 pour la sauvegarde
//     (`.github/workflows/sauvegarde.yml`, `docs/exploitation/sauvegarde.md`), et depuis le
//     04/10/2026 Cloudflare Turnstile pour le captcha de la session anonyme et des codes
//     (`src/lib/captcha.ts` — sur le web d'abord, l'app Android au build qui suit) ;
//   - identifiant de notification enregistré dès que le téléphone accepte les notifications,
//     quel que soit le canal -> `enregistrerLeJetonPour`, appelé à chaque démarrage par
//     `src/app/_layout.tsx`, ne regarde que la permission (`src/lib/rappels.ts`) ;
//   - adresse IP et appareil de chaque session -> colonnes `ip` et `user_agent` de
//     `auth.sessions`, posées par Supabase Auth (110 sessions sur 110, mesuré le 02/10/2026) ;
//   - ce que la connexion Google transmet -> le droit `userinfo.profile` que Supabase Auth
//     demande, d'où le nom et la photo dans `auth.identities.identity_data`.
//
// **Deux sorties de données qu'il ne faut pas reperdre de vue, parce qu'aucune n'est visible
// depuis cette page** — les deux ont été écrites comme inexistantes ici avant d'être
// contre-vérifiées en base et dans le code :
//   - le **texte du rappel** contient la question du point, figée à la génération
//     (`engagement_checkins.committed_question`), et, en notification, le poste en étiquette
//     (`poste_inserable`) — donc des faits tirés du bilan : le poste (« ton trajet
//     domicile-travail », « tes voyages »), parfois le mode (« ton trajet s’est-il fait à
//     vélo ? ») ou l'action engagée. Ce commentaire disait `trip_label`, le libellé figé avec son
//     mode entre parenthèses : `enqueue_checkin_reminders` ne le lit plus (relu le 27/09/2026).
//     Il part dans le `text` de `api.resend.com` et dans le `body` de `exp.host`. Aucun chiffre,
//     en revanche.
//   - « Partager mon bilan » (`src/app/(tabs)/suivi/bilan.tsx`) construit
//     `/api/partage?total=&poste=&percent=` : le total annuel en tonnes, le libellé du poste
//     dominant et sa part partent en clair dans l'URL d'une Vercel Function, à l'émission du
//     lien comme à chaque ouverture par un destinataire. Que le serveur ne lise **rien** dans
//     la base (v1-06 §2) ne veut pas dire qu'il ne reçoive rien.
//
// Sur les transferts hors UE, cette page **s'en tient au fait** (« société américaine »,
// « serveurs situés aux États-Unis ») et ne qualifie pas le mécanisme juridique : tant que la
// référence exacte du contrat de sous-traitance de chaque prestataire n'a pas été relevée et
// consignée (v1-12 §6.5 le demandait pour Expo), écrire « clauses contractuelles types » serait
// plus précis que ce que nous avons lu. C'est le défaut A11-12, et il se répare en lisant les
// contrats, pas en reformulant cette page. **Même règle dans l'autre sens** : la localisation de
// Resend n'a pas été relevée pièce en main, donc la page ne la qualifie pas — ni « américaine »,
// ni « européenne ». Déclarer un transfert hors UE de l'adresse email sur une impression serait
// exactement le même défaut.
//
// Les renvois qui nomment un écran sont ce qui vieillit le plus vite ici : « Mes données » vit
// dans `src/app/compte/index.tsx` (écran « Toi »), atteignable par `CompteBouton` en haut à
// droite des deux onglets. Rien en CI ne garde ce point — il se relit à la main. Ils nomment
// l'icône **comme le produit l'annonce** (« Ton compte », `accessibilityLabel` de
// `src/components/compte-bouton.tsx`) : « icône de compte » était un mot à nous, introuvable à
// l'écran comme au lecteur d'écran pour quelqu'un — examinateur Play compris — qui cherche
// exactement ce qu'on lui a dit de chercher.
//
// Les deux seules informations que cette page ne peut pas déduire — nom du responsable de
// traitement et email de contact — vivent dans `@/constants/editeur`, où le régime juridique
// applicable (édition non professionnelle) est expliqué. Un texte qui promettrait un
// mécanisme inexistant serait pire que pas de texte du tout.

// Cette date est le seul repère qu'a le lecteur pour voir que la page a changé, et la page
// s'engage elle-même à l'afficher (« Évolutions de ce document »). Elle avance à chaque
// modification de fond : le 11/09/2026 pour les sous-traitants, les durées de conservation et
// les renvois d'écran ; le 25/09/2026 pour les réponses aux points de suivi, qui ne se disaient
// que par oui ou par non alors qu'un point se répond aussi « pas concerné » depuis C2.4 (la
// troisième réponse du point, 12/09/2026) — la page décrivait une donnée de moins que ce que le
// produit enregistre (`engagement_checkins.response_kind`).
//
// **Elle porte la date à laquelle le texte atteint le lecteur, pas celle où il a été rédigé.**
// Le lecteur ne peut pas voir autre chose que la page servie : une date antérieure à la mise en
// ligne se lit comme « rien n'a bougé depuis » le jour même où tout a bougé.
//
// Rédigé le 24/09/2026, mis en ligne le 25 : la date est celle du second jour, pour cette raison-là
// (contre-lecture de `v1-29`). Le même passage a retiré deux « liens » que le code a remplacés le
// 20/09/2026 : l'adresse gardée sur l'appareil sert à reprendre la saisie d'un code, et
// `/compte/suppression` envoie un code, plus un lien.
//
// **27/09/2026 : ce que le rappel fait sortir était décrit à l'état d'avant le lot 2.** La page disait
// que seul le nom du poste partait vers Resend et Expo, « Trajet domicile-travail (Voiture seul) » en
// exemple, et que c'était « la seule chose issue de ton bilan ». Ce libellé a quitté le rappel avec
// C2.6 (`poste_inserable`), et la question figée du point y est entrée avec C2.1 : elle peut nommer
// le mode, l'action choisie et les jours fixés (relevé dans les migrations le 27/09/2026). Corrigé sur décision de la personne qui pilote
// (relevé par la contre-lecture de `v1-27` §4) ; la date suit la mise en ligne.
//
// **Et le même jour, un bilan retiré** (C4.7, décision de la personne qui pilote) : « retirer » peut se
// lire « effacer », et ce n'en est pas un — la ligne reste, l'export la rend avec son statut
// (`v1-22` D1). Sans cette phrase, la page laisserait croire à un effacement qui n'a pas lieu. Elle
// nomme la session anonyme parce que la purge à 90 jours l'emporte aussi, comme le reste. Mise en
// ligne à la fusion de C4.7 — la date suit, **heure de Paris** (la fusion a lieu dans la nuit du 27 au
// 28 : le 27 en UTC, déjà le 28 pour qui lit la page), et la feuille de recette la cite (11.1).
//
// **Et les compteurs qui survivent à une suppression** (lot 6, décidé le 27/09/2026 : « la page de
// confidentialité le dit »). La page écrivait que la session « et toutes les données associées »
// partent, et c'est toujours vrai de ses données ; ce qui reste est un +1 dans un compteur, sans
// identifiant ni date plus fine que la semaine (`20260927230611`). Le taire aurait laissé croire à
// une suppression sans aucune trace, sur la page même qui promet de dire ce qu'on garde. **Et les
// sauvegardes** (décision du 27/09/2026) : l'archive hebdomadaire chiffrée garde une copie de la base
// jusqu'à ce que la règle de cycle de vie du bucket l'efface (`docs/exploitation/sauvegarde.md`
// §3 bis) ; les taire rendait « il ne reste que des compteurs » faux pendant 90 jours. Le chiffre de
// la page est celui de cette règle, et il se vérifie au tableau de bord Cloudflare, pas d'ici.
//
// **02/10/2026 : six choses que le produit enregistrait sans que la page les dise** (relevées en
// préparant le formulaire « Sécurité des données » de Play, `docs/exploitation/fiche-google-play.md`
// §1.4, corrigées sur décision de la personne qui pilote). Ce que la connexion Google transmet en
// plus de l'adresse ; l'identifiant de notification, enregistré quel que soit le canal ; l'adresse IP
// et l'appareil de chaque session ; l'échec d'une soumission du bilan, qui est un repère de parcours ;
// GitHub et Cloudflare pour les sauvegardes ; et un export qui ne rendait ni les identités ni les
// sessions (`20261002195246_l_export_rend_les_identites_et_les_sessions.sql`, puis
// `20261002201448_l_export_rend_aussi_les_messages.sql` pour les messages, et
// `20261002203559_l_export_retire_le_jeton_du_message.sql`, qui retire du message le jeton de
// désinscription que la deuxième y avait laissé). **Aucune ne change ce
// que le produit fait** : la page décrit ce qui existait déjà, donc ce n'est pas l'élargissement que
// « Évolutions de ce document » promet d'annoncer dans l'application avant qu'il prenne effet.
// Une phrase repose sur une lecture et non sur une mesure, et se vérifie sur le premier build :
// que Firebase attribue son identifiant dès le premier lancement, permission accordée ou non
// (initialisation automatique de `firebase-messaging`, embarqué par `expo-notifications`).
// La page déclare plutôt trop que pas assez. La réécriture de l'adresse IP d'une session à chaque
// renouvellement, elle, est mesurée (stack locale, GoTrue v2.196, 02/10/2026 : `203.0.113.10` puis
// `198.51.100.20` après un rafraîchissement).
//
// **02/10/2026 : la file d'attente locale des erreurs** (`src/types/erreurs-en-attente.ts`). La page
// écrivait que les repères de parcours « n'écrivent rien de plus sur ton appareil », et la file y garde
// désormais une panne qui n'a pas pu partir — le type de l'erreur, l'écran et l'heure, trente jours au
// plus. Relevé par la contre-lecture de la file ; la phrase a été validée par la personne qui pilote
// le même jour (« OK pour corriger la phrase »), comme chaque phrase de cette page. La date suit la
// mise en ligne, heure de Paris.
//
// **04/10/2026 : Cloudflare Turnstile** (`src/lib/captcha.ts`, plan anti-abus). Celle-ci **change ce
// que le produit fait** : l'adresse IP et des informations techniques sur le navigateur partent chez
// un nouveau destinataire, dès la mise en ligne. C'est donc l'élargissement que « Évolutions de ce
// document » promet d'annoncer dans l'application avant qu'il prenne effet — relevé par la
// contre-lecture du captcha —, et la personne qui pilote a décidé le même soir que la mise à jour
// datée de cette page en tient lieu, sans annonce dans l'application, **parce qu'aucun lancement
// officiel n'a eu lieu et qu'elle en est alors la seule utilisatrice**. La raison ne vaut que pour
// cette fois : après le lancement, un élargissement s'annonce. Le texte de l'entrée
// Cloudflare et du paragraphe des transferts a été validé par elle, comme chaque phrase de cette page.
//
// **05/10/2026 : la trace des codes de connexion envoyés** (plafonds d'e-mail, plan anti-abus,
// `20261005100000_les_plafonds_d_e_mail.sql`). Les plafonds comptent chaque code parti — compte, date,
// empreinte de l'adresse — dans un journal purgé au bout de deux jours : une donnée de plus, que la
// liste des durées de conservation devait nommer, et que l'export rend. Ligne validée par la personne
// qui pilote le même jour.
const UPDATED_AT = '5 octobre 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Qui est responsable de tes données',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} est un projet personnel, développé et publié par ${EDITOR_NAME} à titre non ` +
          'professionnel et sans but lucratif. C’est donc une personne physique, et non une société, ' +
          'qui est responsable du traitement de tes données.',
      },
      {
        kind: 'paragraph',
        text:
          'Pour toute question sur tes données, ou pour exercer les droits décrits plus bas, écris à ' +
          `${CONTACT_EMAIL}.`,
      },
    ],
  },
  {
    heading: 'Ce que nous collectons, et pourquoi',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} estime l’empreinte carbone de tes déplacements à partir de ce que tu déclares. ` +
          'Ce que tu déclares ne sert qu’à produire ce résultat et à te le restituer dans le temps. S’y ajoutent ce ' +
          'que nos services techniques enregistrent d’eux-mêmes — tes sessions, ce que Google transmet si tu passes ' +
          'par lui — et l’identifiant de notification que l’application enregistre, décrits ci-dessous, dont nous ' +
          'ne nous servons pas pour autre chose que faire fonctionner la connexion et les notifications.',
      },
      {
        kind: 'definitions',
        items: [
          {
            term: 'Tes réponses au bilan',
            text:
              'Existence d’un trajet domicile-travail régulier, nombre de jours par semaine, distance, mode ou modes de transport, ' +
              'précisions sur ce mode (motorisation, type de deux-roues, type de train, vélo mécanique ou à assistance), ' +
              'covoiturage et nombre de personnes, fréquence et distance de tes trajets loisirs, ' +
              'nombre de vols, de trajets longue distance en train, en autocar et en voiture par an, type de zone d’habitation, ' +
              'accès perçu aux transports en commun, nombre de véhicules du foyer, jours de télétravail possibles.',
          },
          {
            term: 'Les résultats calculés',
            text:
              'Le total annuel estimé, sa répartition par poste, le poste qui pèse le plus, et le plan de réduction associé. ' +
              'Ces résultats sont figés au moment du calcul pour rester comparables dans le temps.',
          },
          {
            term: 'Tes réponses aux points de suivi',
            text: 'Ta réponse à la question périodique (oui, non, ou pas concerné cette fois-là), et sa date.',
          },
          {
            term: 'Ton compte, si tu en crées un',
            text:
              'Ton adresse email. Si tu passes par Google, nous recevons aussi l’identifiant du compte Google, ainsi ' +
              'que le nom et l’adresse de la photo de profil, que notre service d’authentification demande à Google par ' +
              'défaut : nous ne les lisons ni ne ' +
              'les affichons. Rien d’autre — ni tes contacts, ni ton agenda, ni aucune autre donnée Google.',
          },
          {
            term: 'Tes sessions de connexion',
            text:
              'Pour chaque session ouverte sur un appareil, la session anonyme comprise, notre service ' +
              'd’authentification enregistre l’adresse IP et le navigateur ou le système de sa dernière utilisation, ' +
              'remplacés à chaque renouvellement de la session. ' +
              'C’est son fonctionnement ordinaire : nous ne nous en servons pas, et nous n’en tirons aucune position.',
          },
          {
            term: 'L’identifiant de notification de ton téléphone',
            text:
              'Dès que ton téléphone accepte les notifications de l’application, nous enregistrons l’identifiant qui ' +
              'permet de lui en envoyer, quel que soit le canal de rappel que tu choisis. Sur les versions d’Android ' +
              'antérieures à la 13, les notifications sont acceptées d’office : l’identifiant est donc enregistré dès le ' +
              'premier lancement. Les couper dans les réglages du téléphone le désactive au prochain démarrage de ' +
              'l’application.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text:
          'Si tu nous envoies un retour, nous enregistrons ton message, la catégorie que tu as choisie et, le cas ' +
          'échéant, l’écran d’où il part — rattachés à ton compte pour pouvoir rapprocher ton retour de ce que tu ' +
          'vois. Ces retours sont lus à la main et ne déclenchent aucune réponse : il n’existe aucun canal pour t’en ' +
          'adresser une, et nous préférons te le dire plutôt que de te laisser l’attendre.',
      },
      {
        kind: 'paragraph',
        text:
          'Nous enregistrons aussi quelques repères de parcours dans l’application : quels écrans tu as ouverts et ' +
          'd’où tu y arrivais, à quelle étape du questionnaire tu en es, si tu as partagé ton bilan, demandé un code ' +
          'de connexion ou rattaché un compte — et, quand tu cherches un compte existant, si cet appareil portait déjà ' +
          'un bilan —, et le fait qu’un écran n’a pas réussi à ' +
          's’afficher ou qu’un envoi de ton bilan a échoué (le type de l’erreur et l’endroit, jamais son message). Ces ' +
          'repères ne portent rien d’autre : ni texte que tu aurais saisi, ni adresse IP, ni identifiant d’appareil, et ' +
          'aucun suivi de ce que tu fais ailleurs. Ils servent à voir où le produit décroche pour le réparer. ' +
          'L’ouverture de l’application sert aussi à savoir que tu es toujours là : elle remet tes rappels à leur ' +
          'rythme normal et repousse la suppression automatique d’une session anonyme (le détail plus bas). Ces ' +
          'repères restent chez notre hébergeur, aucun outil d’analyse tiers ne les reçoit.',
      },
      {
        kind: 'paragraph',
        text:
          'La base légale est l’exécution du service que tu demandes. Pour les rappels par email et pour les repères de ' +
          'parcours, c’est notre intérêt légitime — maintenir le suivi que tu as commencé dans un cas, corriger ce qui ne ' +
          'fonctionne pas dans l’autre. Ce que nos services techniques enregistrent d’eux-mêmes — tes sessions, ce que ' +
          'Google transmet — relève de l’exécution du service : la connexion ne fonctionne pas sans. L’identifiant de ' +
          'notification, enregistré quel que soit le canal choisi, relève de notre intérêt légitime : pouvoir t’envoyer ' +
          'des notifications dès que tu les choisis, sans réglage à refaire. Tu peux désactiver les rappels à tout moment depuis l’écran « Toi », ou par le ' +
          'lien « ne plus recevoir ces rappels » au bas de chaque email : ce lien agit sans ouvrir l’application, et sans ' +
          'que tu aies à te connecter.',
      },
      {
        kind: 'paragraph',
        // **La décroissance se dit, parce qu'elle décrit un traitement automatisé** : les rappels
        // s'espacent puis s'arrêtent selon ce que la personne fait, et ce qui est observé pour en
        // décider est une donnée la concernant. Le dire ici vaut mieux que de la laisser découvrir
        // qu'on a cessé d'écrire.
        text:
          'Les rappels s’espacent d’eux-mêmes, puis s’arrêtent. Si plusieurs questions de suite passent sans réponse, ' +
          'nous n’envoyons plus qu’un message par mois, et au bout de huit nous n’écrivons plus du tout — il suffit ' +
          'd’ouvrir l’application, ou de répondre à une question, pour que le rythme normal reprenne. La question, elle, ' +
          'continue de t’attendre dans l’application : c’est seulement le message qui s’espace.',
      },
      {
        kind: 'paragraph',
        // **Le mot de la veille (C4.2) se dit ici, à côté de l'espacement qui le coupe** : c'est un
        // second message, qui part la veille d'un jour choisi. Sa règle d'envoi vit dans
        // `mettre_en_file_les_mots_de_la_veille` — notification seule, dix semaines, régime normal —,
        // et la retoucher là-bas impose de relire cette phrase.
        text:
          'Le mot de la veille ne part que si tu l’as demandé : par notification, pendant les dix semaines qui ' +
          'suivent la première action de trajet que tu choisis dans la saison, et jamais une fois les rappels ' +
          'espacés. Tu l’arrêtes depuis l’écran « Toi », et choisir « Sans rappel » l’arrête aussi.',
      },
    ],
  },
  {
    heading: 'Ce que nous ne collectons pas',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Cette liste n’est pas une intention, c’est une description du produit tel qu’il est construit.',
      },
      {
        kind: 'bullets',
        items: [
          'Aucune géolocalisation, aucun suivi automatique de tes déplacements. Le produit repose sur ce que tu déclares, parce que la prise de conscience passe par le moment où tu choisis, pas par une mesure passive.',
          'Aucun traceur publicitaire, aucun cookie de mesure d’audience tierce. Les repères de parcours décrits plus ' +
            'haut ne quittent pas notre hébergeur et ne permettent de te suivre sur aucun autre site.',
          'Aucune revente, location ou cession de tes données à qui que ce soit.',
          'Aucune comparaison entre utilisateurs. Ton bilan n’est jamais rapproché de celui de quelqu’un d’autre, ni classé.',
        ],
      },
    ],
  },
  {
    heading: 'Avant même que tu crées un compte',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Dès l’ouverture de l’application, une session anonyme est créée pour que ton bilan puisse être enregistré et te ' +
          'revenir si tu fermes puis rouvres l’app. Cette session n’est reliée à aucune identité : ni email, ni nom, ni ' +
          'numéro de téléphone — sauf l’adresse que tu saisis pour recevoir un code, gardée même si tu ne vas pas au ' +
          'bout, jusqu’à ce que tu la confirmes, en saisisses une autre ou que la session soit supprimée. Comme toute ' +
          'session, elle garde l’adresse IP et l’appareil de sa dernière utilisation, et l’identifiant de ' +
          'notification dès que ton téléphone accepte les notifications (le détail plus haut).',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu ne rattaches jamais cette session à un compte, elle et toutes les données associées sont supprimées ' +
          'automatiquement après 90 jours sans utilisation de l’application. Tant que tu reviens, rien n’est effacé. ' +
          'Si tu crées un compte, ton bilan déjà effectué reste attaché à toi : rien n’est à ressaisir.',
      },
    ],
  },
  {
    heading: 'Où sont tes données, et qui les traite pour nous',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Tout ce que tu déclares et tout ce que nous en calculons sont hébergés dans l’Union européenne. Nous faisons ' +
          'appel aux prestataires suivants, chacun pour une fonction précise, et chacun ne reçoit que ce qui sert à ' +
          'cette fonction :',
      },
      {
        kind: 'definitions',
        items: [
          {
            term: 'Supabase',
            text:
              'Base de données, authentification et hébergement des données applicatives — donc l’intégralité de tes ' +
              'réponses, de tes résultats et de ton compte. Serveurs situés à Paris (région eu-west-3).',
          },
          {
            term: 'Vercel',
            text:
              'Hébergement de la version web de l’application. Vercel sert les pages, sans rien lire dans la base. ' +
              'Si tu utilises « Partager mon bilan », c’est aussi Vercel qui fabrique la carte d’aperçu à partir du ' +
              'lien que tu génères : ce lien porte ton total annuel, ton poste principal et sa part — rien d’autre. ' +
              'Société américaine.',
          },
          {
            term: 'Resend',
            text:
              'Envoi des emails de rappel, uniquement si tu as choisi ce canal : reçoit alors ton adresse email et le ' +
              'texte du rappel, c’est-à-dire la question de ton point (le détail plus bas).',
          },
          {
            term: 'Expo',
            text:
              'Acheminement des notifications vers ton téléphone. Dès que ton téléphone accepte les notifications, quel ' +
              'que soit le canal choisi, Expo reçoit l’identifiant que Google attribue à l’application sur ton téléphone ' +
              'et un identifiant d’installation, et nous rend l’identifiant de notification. Il ne reçoit ' +
              'le texte d’un message que si tu as choisi les notifications comme canal de rappel, ou demandé le mot ' +
              'de la veille : la question de ton point, ou ce mot (le détail plus bas). Société américaine, serveurs ' +
              'situés aux États-Unis.',
          },
          {
            term: 'Google (Firebase Cloud Messaging)',
            text:
              'La couche du système Android qui remet les notifications à ton téléphone. Elle attribue un identifiant à ' +
              'l’application sur ton téléphone, dès son premier lancement, que tu acceptes les notifications ou non, et ' +
              'ne remet un message que dans les cas décrits juste au-dessus. Société américaine.',
          },
          {
            term: 'Google (connexion avec un compte Google)',
            text:
              'Vérification de ton identité, uniquement si tu choisis de te connecter avec un compte Google. Google ' +
              'nous transmet alors ton adresse email, l’identifiant de ton compte Google, ton nom et l’adresse de ta ' +
              'photo de profil. Société américaine.',
          },
          {
            term: 'GitHub',
            text:
              'Fabrication de la sauvegarde hebdomadaire de la base : une machine de GitHub Actions en fait une copie, ' +
              'sessions exceptées, et la chiffre, puis la machine est effacée à la fin de l’opération. Société ' +
              'américaine.',
          },
          {
            term: 'Cloudflare',
            text:
              'Vérification que c’est bien une personne, et non un robot, qui ouvre une session ou demande un code de ' +
              'connexion : Cloudflare reçoit alors ton adresse IP et des informations techniques sur ton navigateur ou ' +
              'ton téléphone, rien de ce que tu déclares. Stockage des sauvegardes, déjà chiffrées, dans un espace situé ' +
              'dans l’Union européenne. Elles s’effacent d’elles-mêmes au bout de 90 jours. Société américaine.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text:
          'Tes réponses, tes résultats et ton compte sont hébergés dans l’Union européenne, chez Supabase. Plusieurs des ' +
          'fonctions ci-dessus passent par des sociétés américaines, et ce qui leur parvient sort donc de l’Union ' +
          'européenne : l’acheminement des notifications (Expo, puis Google pour Android), la connexion avec un compte ' +
          'Google, l’hébergement de la version web (Vercel), la vérification anti-robot (Cloudflare) et la fabrication ' +
          'des sauvegardes (GitHub). Cloudflare garde par ailleurs les sauvegardes chiffrées dans l’Union européenne. Pour Resend, nous ' +
          'n’avons pas relevé l’entité ni la région d’envoi : nous préférons ne rien affirmer plutôt qu’écrire plus ' +
          'précis que ce que nous avons lu.',
      },
      {
        kind: 'paragraph',
        text:
          'Ce qui parvient à chacun se limite à sa fonction. Pour le rappel : ce qui permet de te le remettre — ton ' +
          'adresse email, ou l’identifiant de notification de ton appareil — et le texte du rappel. Ce texte est la ' +
          'question de ton point, par exemple « Mardi ou jeudi, as-tu fait ce trajet à vélo ? » : selon le cas, elle ' +
          'nomme le poste sur lequel elle porte, ton mode de transport, l’action que tu as choisie et les jours que tu ' +
          't’es fixés. Si tu as demandé le mot de la veille, la notification du soir nomme aussi ce que tu as prévu ' +
          'pour ton trajet, par exemple « Demain, tu as prévu de faire ton trajet à vélo. » C’est tout ce qui sort de ' +
          'ton bilan et de ton plan par ce canal : il n’y figure aucun chiffre, ' +
          'aucun de tes totaux, aucune autre de tes réponses. Pour la connexion Google : l’adresse du ' +
          'compte avec lequel tu choisis de te connecter. Pour la sauvegarde : une copie de la base, sessions exceptées, que ' +
          'GitHub chiffre avant qu’elle quitte sa machine, et que Cloudflare ne reçoit que chiffrée. Pour la carte de ' +
          'partage : le lien que tu génères toi-même, ' +
          'avec ton total annuel, ton poste principal et sa part — tant que tu ne partages rien, rien ne part. Le canal ' +
          'de rappel se choisit — et s’éteint complètement — depuis l’écran « Toi », ou par le lien de désinscription de ' +
          'n’importe quel email de rappel.',
      },
      {
        kind: 'paragraph',
        text:
          'L’accès à tes données est cloisonné au niveau de la base : les règles de sécurité n’autorisent la lecture et ' +
          'l’écriture de tes lignes qu’à toi. Aucun autre utilisateur ne peut y accéder.',
      },
    ],
  },
  {
    heading: 'Combien de temps nous les gardons',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Session anonyme jamais rattachée à un compte : supprimée automatiquement après 90 jours sans utilisation ' +
            'de l’application. Tant que tu reviens, rien n’est effacé — ouvrir l’application, commencer un bilan, ' +
            'répondre à un point de suivi ou nous envoyer un retour remet le compteur à zéro.',
          'Compte rattaché : tes données sont conservées tant que ton compte existe, puisque leur intérêt est précisément de te montrer une évolution dans la durée.',
          'Bilan retiré : un bilan que tu retires n’apparaît plus dans ton suivi, mais il reste conservé — et ' +
            'dans l’export de tes données — jusqu’à la suppression de ton compte, ou de ta session anonyme si ' +
            'tu n’as pas créé de compte.',
          'Repères de parcours : supprimés automatiquement au bout de douze mois. Au-delà, ils ne disent plus rien du ' +
            'produit tel qu’il est.',
          'Sessions de connexion, avec leur adresse IP et leur appareil : gardées sans limite de durée tant que ton ' +
            'compte existe. Une session part quand tu te déconnectes de cet appareil, si l’appareil joint alors notre ' +
            'service, et toutes partent avec la ' +
            'suppression de ton compte ou la suppression automatique d’une session anonyme.',
          'Identifiant de notification de ton téléphone : désactivé au prochain démarrage de l’application si tu ' +
            'as retiré la permission dans les réglages du téléphone, ou au premier envoi qui échoue si l’application ' +
            'est désinstallée, puis supprimé 90 jours plus tard. Si aucun envoi ne part vers ce téléphone, par exemple ' +
            'parce que tu as choisi les rappels par email ou aucun rappel, il reste enregistré tant que ton compte existe. Il ' +
            'part dans tous les cas avec la suppression de ton compte et avec la suppression automatique d’une ' +
            'session anonyme.',
          'Rappels envoyés : une fois le rappel parti (ou abandonné), sa trace — période concernée, canal, date ' +
            'd’envoi, message — est gardée six mois, le temps de pouvoir vérifier qu’un rappel est bien parti quand ' +
            'tu nous dis ne pas l’avoir reçu. Elle est supprimée ensuite.',
          'Codes de connexion envoyés par e-mail : pour chacun, nous gardons deux jours une trace — le compte ' +
            'concerné, la date et une empreinte de l’adresse, jamais l’adresse elle-même — le temps d’appliquer les ' +
            'plafonds qui empêchent les envois abusifs. Elle est supprimée ensuite.',
          'À la suppression de ton compte, l’ensemble de tes bilans, résultats, points de suivi, plans, retours, ' +
            'repères de parcours et sessions est supprimé.',
          'Après une suppression, il ne reste que des compteurs, sans aucun identifiant — et, le temps qu’elles ' +
            'expirent, nos sauvegardes chiffrées, effacées d’elles-mêmes au bout de 90 jours. Quand une session anonyme ' +
            'est supprimée automatiquement, nous ajoutons un à un compteur qui ne retient que sa semaine d’arrivée, jusqu’où elle ' +
            'était allée (bilan, action choisie, point répondu), combien de semaines elle avait duré et où en étaient ' +
            'ses rappels ; quand tu supprimes ton compte, un au compteur du mois. Ces compteurs ne portent ni ' +
            'adresse, ni identifiant, ni date plus précise que la semaine, et ils sont gardés sans limite de durée.',
        ],
      },
    ],
  },
  {
    heading: 'Cookies et stockage local',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} n’utilise aucun cookie publicitaire ni aucun outil de mesure d’audience tierce. Le stockage utilisé ` +
          'sur ton appareil est strictement nécessaire au fonctionnement : il conserve ta session, le brouillon du ' +
          'questionnaire en cours, l’adresse email de ta dernière demande de code — pour ne pas te la faire retaper ' +
          'si tu reviens saisir ce code plus tard — et quelques préférences d’affichage. Tout cela reste sur cet appareil, et part avec ' +
          'la suppression de ton compte. Les repères de parcours décrits plus haut sont enregistrés côté serveur, ' +
          'rattachés à la session que le produit a déjà besoin de conserver, à une exception près : quand un écran n’a ' +
          'pas réussi à s’afficher et que ce repère n’a pas pu partir tout de suite — hors connexion, par exemple —, le ' +
          'type de l’erreur et l’écran concerné attendent sur ton appareil, trente jours au plus, de pouvoir partir. ' +
          'C’est la raison pour laquelle aucune bannière de consentement ne t’est présentée : il n’y a rien à consentir.',
      },
    ],
  },
  {
    heading: 'Tes droits',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Conformément au RGPD, tu disposes d’un droit d’accès, de rectification, d’effacement, de portabilité, ' +
          'de limitation et d’opposition sur tes données.',
      },
      {
        kind: 'paragraph',
        text:
          'Deux d’entre eux s’exercent directement dans l’application, sans avoir à écrire à qui que ce soit : ouvre ' +
          '« Ton compte », l’icône en haut à droite de l’écran, puis la section « Mes données » de l’écran « Toi ». ' +
          'Tu y trouves de quoi récupérer ' +
          'l’intégralité de ce que nous conservons sur toi, au format JSON, et de quoi supprimer définitivement ton ' +
          'compte. La suppression est immédiate et sans confirmation par email — tes bilans, ton plan, tes points de ' +
          'suivi, tes retours, tes repères de parcours et tes sessions disparaissent avec elle.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu n’as plus l’application installée, la suppression reste possible depuis un navigateur, ' +
          `sur ${ORIGINE_CANONIQUE}/compte/suppression : on t’y envoie un code à l’adresse de ton compte, et la ` +
          'suppression se confirme sur place. Cette page ne peut jamais créer de compte.',
      },
      {
        kind: 'paragraph',
        text:
          `Pour tout le reste, écris à ${CONTACT_EMAIL}. Nous répondons dans un délai d’un mois.`,
      },
      {
        kind: 'paragraph',
        text:
          'Tu peux choisir ton canal de rappel, ou n’en recevoir aucun, à tout moment depuis l’écran « Toi » — ' +
          '« Ton compte », l’icône en haut à droite — sans avoir à nous écrire.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation auprès de la CNIL ' +
          '(Commission nationale de l’informatique et des libertés), 3 place de Fontenoy, 75007 Paris, ou sur cnil.fr.',
      },
    ],
  },
  {
    heading: 'Les chiffres que nous affichons',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Les facteurs d’émission utilisés proviennent de la Base Empreinte de l’ADEME, consultée via l’API publique ' +
          'Impact CO2. Ton bilan est une estimation déclarative, pas une mesure : il sert à faire apparaître des ordres ' +
          'de grandeur et le poste sur lequel tu as le plus de prise, pas à produire un chiffre exact.',
      },
    ],
  },
  {
    heading: 'Évolutions de ce document',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Si cette politique change, la date de dernière mise à jour en haut de cette page le dit : c’est aujourd’hui ' +
          'le seul signal dont tu disposes. Un changement qui élargirait ce que nous collectons, ou ce que nous en ' +
          'faisons, serait annoncé dans l’application avant de prendre effet.',
      },
    ],
  },
];

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt={UPDATED_AT}
      intro={`${APP_NAME} collecte ce qui sert à estimer l’empreinte carbone de tes déplacements et à t’accompagner dans la durée, et ses services techniques enregistrent d’eux-mêmes quelques données de fonctionnement. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger.`}
      sections={SECTIONS}
    />
  );
}
