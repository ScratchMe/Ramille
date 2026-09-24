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
//     OAuth et pour FCM.
//
// **Deux sorties de données qu'il ne faut pas reperdre de vue, parce qu'aucune n'est visible
// depuis cette page** — les deux ont été écrites comme inexistantes ici avant d'être
// contre-vérifiées en base et dans le code :
//   - le **texte du rappel** contient `engagement_checkins.trip_label`, snapshot de
//     `assessment_results.commute_poste_label` / `.extras_poste_label` — donc un résultat du
//     calcul, qui nomme le poste dominant *et* son mode (« Trajet domicile-travail (Voiture
//     seul) », composé dans `20260903120000_precise_poste_labels.sql`). Il part dans le `text`
//     de `api.resend.com` et dans le `title`/`body` de `exp.host`
//     (`20260907230000_rappels_canal.sql`). Aucun chiffre, en revanche.
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
// les renvois d'écran ; le 24/09/2026 pour les réponses aux points de suivi, qui ne se disaient
// que par oui ou par non alors qu'un point se répond aussi « pas concerné » depuis C2.4 (la
// troisième réponse du point, 12/09/2026) — la page décrivait une donnée de moins que ce que le
// produit enregistre (`engagement_checkins.response_kind`).
//
// **Elle porte la date à laquelle le texte atteint le lecteur, pas celle où il a été rédigé.**
// Le lecteur ne peut pas voir autre chose que la page servie : une date antérieure à la mise en
// ligne se lit comme « rien n'a bougé depuis » le jour même où tout a bougé.
const UPDATED_AT = '24 septembre 2026';

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
          'Nous ne collectons rien d’autre que ce qui sert à produire ce résultat et à te le restituer dans le temps.',
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
              'Ton adresse email. Si tu passes par Google, nous recevons l’adresse email et l’identifiant du compte Google, ' +
              'rien de plus — ni tes contacts, ni ton agenda, ni aucune autre donnée Google.',
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
          'Nous enregistrons aussi quelques repères de parcours dans l’application : quels écrans tu as ouverts, à quelle ' +
          'étape du questionnaire tu en es, si tu as rattaché un compte, et le fait qu’un écran n’a pas réussi à ' +
          's’afficher (le type de l’erreur et l’écran concerné, jamais son message). Rien d’autre — pas de texte que tu aurais ' +
          'saisi, pas d’adresse IP, pas d’identifiant d’appareil, et aucun suivi de ce que tu fais ailleurs. Ces repères ' +
          'servent à une seule chose : voir où le produit décroche pour le réparer. Ils restent chez notre hébergeur, ' +
          'aucun outil d’analyse tiers ne les reçoit.',
      },
      {
        kind: 'paragraph',
        text:
          'La base légale est l’exécution du service que tu demandes. Pour les rappels par email et pour les repères de ' +
          'parcours, c’est notre intérêt légitime — maintenir le suivi que tu as commencé dans un cas, corriger ce qui ne ' +
          'fonctionne pas dans l’autre. Tu peux désactiver les rappels à tout moment depuis l’écran « Toi », ou par le ' +
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
          'numéro de téléphone.',
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
          'appel aux prestataires suivants, chacun pour une fonction précise, et chacun ne reçoit que ce que cette ' +
          'fonction exige :',
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
              'texte du rappel, qui nomme le poste concerné.',
          },
          {
            term: 'Expo',
            text:
              'Acheminement des notifications de rappel vers ton téléphone, uniquement si tu as choisi ce canal : ' +
              'reçoit alors l’identifiant de notification de ton appareil et le texte du rappel, qui nomme le poste ' +
              'concerné. Société américaine, serveurs situés aux États-Unis.',
          },
          {
            term: 'Google (Firebase Cloud Messaging)',
            text:
              'La couche du système Android qui remet la notification à ton téléphone, uniquement si tu as choisi ce ' +
              'canal. Société américaine.',
          },
          {
            term: 'Google (connexion avec un compte Google)',
            text:
              'Vérification de ton identité, uniquement si tu choisis de te connecter avec un compte Google. Société ' +
              'américaine.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text:
          'Tes réponses, tes résultats et ton compte sont hébergés dans l’Union européenne, chez Supabase. Trois des ' +
          'fonctions ci-dessus passent par des sociétés américaines, et ce qui leur parvient sort donc de l’Union ' +
          'européenne : l’acheminement des notifications (Expo, puis Google pour Android), la connexion avec un compte ' +
          'Google, et l’hébergement de la version web (Vercel). Pour Resend, nous n’avons pas relevé l’entité ni la ' +
          'région d’envoi : nous préférons ne rien affirmer plutôt qu’écrire plus précis que ce que nous avons lu.',
      },
      {
        kind: 'paragraph',
        text:
          'Ce qui parvient à chacun se limite à sa fonction. Pour le rappel : ce qui permet de te le remettre — ton ' +
          'adresse email, ou l’identifiant de notification de ton appareil — et le texte du rappel. Ce texte nomme le ' +
          'poste sur lequel porte ta question, par exemple « Trajet domicile-travail (Voiture seul) », tel que ton ' +
          'bilan l’a désigné : c’est la seule chose issue de ton bilan qui sorte par ce canal, et il n’y figure aucun ' +
          'chiffre, aucune de tes réponses détaillées, aucun de tes totaux. Pour la connexion Google : l’adresse du ' +
          'compte avec lequel tu choisis de te connecter. Pour la carte de partage : le lien que tu génères toi-même, ' +
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
          'Repères de parcours : supprimés automatiquement au bout de douze mois. Au-delà, ils ne disent plus rien du ' +
            'produit tel qu’il est.',
          'Identifiant de notification de ton téléphone : désactivé dès que ton téléphone cesse d’accepter les ' +
            'notifications — permission retirée dans ses réglages, ou application désinstallée — puis supprimé ' +
            '90 jours plus tard. Il part aussi avec la suppression de ton compte et avec la suppression ' +
            'automatique d’une session anonyme.',
          'Rappels envoyés : une fois le rappel parti (ou abandonné), sa trace — période concernée, canal, date ' +
            'd’envoi, message — est gardée six mois, le temps de pouvoir vérifier qu’un rappel est bien parti quand ' +
            'tu nous dis ne pas l’avoir reçu. Elle est supprimée ensuite.',
          'À la suppression de ton compte, l’ensemble de tes bilans, résultats, points de suivi, plans, retours et ' +
            'repères de parcours est supprimé.',
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
          'questionnaire en cours, l’adresse email de ta dernière demande de lien — pour ne pas te la faire retaper ' +
          'quand un lien expire — et quelques préférences d’affichage. Tout cela reste sur cet appareil, et part avec ' +
          'la suppression de ton compte. Les repères de parcours décrits plus haut ' +
          'n’écrivent rien de plus sur ton appareil : ils sont enregistrés côté serveur, rattachés à la session que le ' +
          'produit a déjà besoin de conserver. C’est la raison pour laquelle aucune bannière de consentement ne t’est ' +
          'présentée : il n’y a rien à consentir.',
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
          'suivi, tes retours et tes repères de parcours disparaissent avec elle.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu n’as plus l’application installée, la suppression reste possible depuis un navigateur, ' +
          `sur ${ORIGINE_CANONIQUE}/compte/suppression : on t’y envoie un lien à l’adresse de ton compte, et la ` +
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
      intro={`${APP_NAME} collecte le strict nécessaire pour estimer l’empreinte carbone de tes déplacements et t’accompagner dans la durée. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger.`}
      sections={SECTIONS}
    />
  );
}
