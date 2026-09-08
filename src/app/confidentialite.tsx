import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, EDITOR_NAME } from '@/constants/editeur';
import { APP_NAME } from '@/constants/produit';
import { APP_URL } from '@/lib/app-url';

// Politique de confidentialité — URL exigée par l'écran de consentement Google OAuth et par
// la fiche Google Play.
//
// Règle de rédaction : **ne décrire que ce que le produit fait réellement**. Chaque
// affirmation ci-dessous est vérifiable dans le code ou le schéma :
//   - session anonyme dès l'ouverture -> `ensureSession()` (src/lib/supabase.ts), v1-04 §1 ;
//   - champs collectés -> colonnes de `assessment_answers` (v1-05 §3) ;
//   - rappels par notification ou par email -> `notification_outbox` + `profiles.reminder_channel` ;
//   - purge à 90 jours -> `purge_stale_anonymous_accounts()`, cron quotidien ;
//   - aucune géolocalisation -> non-goal explicite de la spec §2 ;
//   - carte de partage sans lecture serveur -> v1-06 §2 ;
//   - retours utilisateur -> table `feedback`, insert-only côté client, issue #29.
//
// Les deux seules informations que cette page ne peut pas déduire — nom du responsable de
// traitement et email de contact — vivent dans `@/constants/editeur`, où le régime juridique
// applicable (édition non professionnelle) est expliqué. Un texte qui promettrait un
// mécanisme inexistant serait pire que pas de texte du tout.

const UPDATED_AT = '5 septembre 2026';

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
              'type de motorisation, covoiturage et nombre de personnes, fréquence et distance de tes trajets loisirs, ' +
              'nombre de vols, de trajets longue distance en train et en voiture par an, type de zone d’habitation, ' +
              'accès perçu aux transports en commun, nombre de véhicules du foyer.',
          },
          {
            term: 'Les résultats calculés',
            text:
              'Le total annuel estimé, sa répartition par poste, le poste qui pèse le plus, et le plan de réduction associé. ' +
              'Ces résultats sont figés au moment du calcul pour rester comparables dans le temps.',
          },
          {
            term: 'Tes réponses aux points de suivi',
            text: 'Une réponse par oui ou par non à la question périodique, et sa date.',
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
          'échéant, l’écran d’où tu es parti — rattachés à ton compte pour pouvoir te recontacter si tu nous as laissé ' +
          'un moyen de le faire. Ces retours sont lus à la main et ne déclenchent aucune réponse automatique.',
      },
      {
        kind: 'paragraph',
        text:
          'Nous enregistrons aussi quelques repères de parcours dans l’application : quels écrans tu as ouverts, à quelle ' +
          'étape du questionnaire tu es arrivé, si tu as rattaché un compte. Rien d’autre — pas de texte que tu aurais ' +
          'saisi, pas d’adresse IP, pas d’identifiant d’appareil, et aucun suivi de ce que tu fais ailleurs. Ces repères ' +
          'servent à une seule chose : voir où le produit décroche pour le réparer. Ils restent chez notre hébergeur, ' +
          'aucun outil d’analyse tiers ne les reçoit.',
      },
      {
        kind: 'paragraph',
        text:
          'La base légale est l’exécution du service que tu demandes. Pour les rappels par email et pour les repères de ' +
          'parcours, c’est notre intérêt légitime — maintenir le suivi que tu as commencé dans un cas, corriger ce qui ne ' +
          'fonctionne pas dans l’autre. Tu peux désactiver les rappels à tout moment depuis ton suivi.',
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
          'automatiquement après 90 jours. Si tu crées un compte, ton bilan déjà effectué reste attaché à toi : rien n’est ' +
          'à ressaisir.',
      },
    ],
  },
  {
    heading: 'Où sont tes données, et qui les traite pour nous',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Tes données sont hébergées dans l’Union européenne. Nous faisons appel aux prestataires suivants, chacun pour ' +
          'une fonction précise :',
      },
      {
        kind: 'definitions',
        items: [
          {
            term: 'Supabase',
            text: 'Base de données, authentification et hébergement des données applicatives. Serveurs situés à Paris (région eu-west-3).',
          },
          { term: 'Vercel', text: 'Hébergement de la version web de l’application.' },
          { term: 'Resend', text: 'Envoi des emails de rappel, uniquement si tu as choisi ce canal.' },
          {
            term: 'Expo',
            text:
              'Acheminement des notifications de rappel vers ton téléphone, uniquement si tu as choisi ce canal. ' +
              'Serveurs situés aux États-Unis, sur la base de clauses contractuelles types.',
          },
          {
            term: 'Google',
            text:
              'Firebase Cloud Messaging, la couche du système Android qui remet la notification à ton téléphone.',
          },
          {
            term: 'Google',
            text:
              'Vérification de ton identité, uniquement si tu choisis de te connecter avec un compte Google.',
          },
        ],
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
          'Session anonyme jamais rattachée à un compte : supprimée automatiquement 90 jours après sa création.',
          'Compte rattaché : tes données sont conservées tant que ton compte existe, puisque leur intérêt est précisément de te montrer une évolution dans la durée.',
          'Repères de parcours : supprimés automatiquement au bout de douze mois. Au-delà, ils ne disent plus rien du ' +
            'produit tel qu’il est.',
          'Identifiant de notification de ton téléphone : conservé tant que l’application est installée et que tu as ' +
            'choisi les rappels par notification. Il disparaît si tu désinstalles l’application, si tu coupes les ' +
            'notifications, à la suppression de ton compte, et à la suppression automatique d’une session anonyme.',
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
          'questionnaire en cours, et quelques préférences d’affichage. Les repères de parcours décrits plus haut ' +
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
          'Deux d’entre eux s’exercent directement dans l’application, sans avoir à écrire à qui que ce soit, ' +
          'depuis l’écran « Mon suivi », section « Mes données » : télécharger l’intégralité de ce que nous ' +
          'conservons sur toi dans un fichier JSON, et supprimer définitivement ton compte. La suppression est ' +
          'immédiate et sans confirmation par email — tes bilans, ton plan, tes points de suivi, tes retours et ' +
          'tes repères de parcours disparaissent avec elle.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu n’as plus l’application installée, la suppression reste possible depuis un navigateur, ' +
          `sur ${APP_URL}/compte/suppression : on t’y envoie un lien à l’adresse de ton compte, et la ` +
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
          'Tu peux désactiver les rappels par email à tout moment depuis l’écran « Mon suivi », sans avoir à nous écrire.',
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
          'Si cette politique change de manière significative, nous t’en informerons dans l’application avant que le ' +
          'changement prenne effet. La date de dernière mise à jour figure en haut de cette page.',
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
