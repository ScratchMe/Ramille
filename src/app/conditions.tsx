import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, EDITOR_NAME } from '@/constants/editeur';
import { APP_NAME } from '@/constants/produit';

// Conditions générales d'utilisation — exigées par la fiche Google Play au même titre que la
// politique de confidentialité, et attendues par l'écran de consentement Google OAuth.
//
// Même règle de rédaction que /confidentialite : ne décrire que ce que le produit fait, et
// ne rien promettre qu'il ne tienne. En particulier, les limites annoncées ici sur la valeur
// du chiffre ne sont pas une clause de style — c'est ce que dit la spec fonctionnelle §5
// (« estimation déclarative ») et ce que l'audit v1-07 a confirmé sur la précision réelle des
// facteurs.
//
// L'identité de l'éditeur vit dans `@/constants/editeur`, qui explique aussi pourquoi cette
// page ne porte ni statut juridique, ni adresse postale, ni directeur de la publication, ni
// médiateur de la consommation : le projet est édité à titre non professionnel, régime prévu
// par l'article 6 III-2 de la LCEN. Ce sont des absences motivées, pas des oublis.

const UPDATED_AT = '5 septembre 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Objet',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} est un service gratuit qui estime l’empreinte carbone de tes déplacements à partir de ce que tu ` +
          'déclares, t’indique le poste sur lequel tu as le plus de prise, et te propose un suivi périodique pour ' +
          'accompagner un changement d’habitude dans la durée.',
      },
      {
        kind: 'paragraph',
        text:
          'Ces conditions régissent l’utilisation du service, accessible sur le web et sur Android. En utilisant ' +
          `${APP_NAME}, tu les acceptes.`,
      },
    ],
  },
  {
    heading: 'Ce que le service est, et ce qu’il n’est pas',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `Le chiffre que ${APP_NAME} t’affiche est une estimation construite à partir de tes réponses et de facteurs ` +
          'd’émission moyens publiés par l’ADEME. Ce n’est pas une mesure de tes émissions réelles.',
      },
      {
        kind: 'bullets',
        items: [
          'Les distances de tes voyages longue distance ne te sont pas demandées : des distances moyennes sont utilisées, pour limiter la longueur du questionnaire.',
          'Les facteurs d’émission sont des moyennes nationales par mode de transport. Ton véhicule, ton taux de remplissage réel ou ton itinéraire précis ne sont pas pris en compte.',
          'Le résultat sert à faire apparaître des ordres de grandeur et une hiérarchie entre tes postes de déplacement. Il n’a pas vocation à être utilisé comme un bilan carbone certifié, ni à des fins réglementaires, contractuelles ou comptables.',
        ],
      },
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} ne fournit ni conseil professionnel, ni prestation de conseil en mobilité. Les actions proposées ` +
          'sont des suggestions, jamais des injonctions : tu restes seul juge de ce qui est possible dans ta situation.',
      },
    ],
  },
  {
    heading: 'Accès et compte',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Tu peux faire ton bilan et consulter ton résultat sans créer de compte. Créer un compte sert à conserver ton ' +
          'suivi dans le temps et à le retrouver sur un autre appareil.',
      },
      {
        kind: 'bullets',
        items: [
          'Tu peux créer un compte avec ton adresse email et un mot de passe, ou en passant par ton compte Google.',
          'Tu es responsable de la confidentialité de ton mot de passe et des actions effectuées depuis ton compte.',
          'Sans rattachement à un compte, ton bilan reste lié à l’appareil et au navigateur utilisés, et il est supprimé automatiquement après 90 jours.',
        ],
      },
    ],
  },
  {
    heading: 'Ce que tu t’engages à ne pas faire',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Tenter d’accéder aux données d’un autre utilisateur, ou de contourner les protections du service.',
          'Perturber le fonctionnement du service, notamment par des requêtes automatisées massives.',
          'Réutiliser le contenu du service à des fins commerciales sans autorisation écrite préalable.',
        ],
      },
    ],
  },
  {
    heading: 'Disponibilité',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Le service est fourni en l’état, sans garantie de disponibilité continue. Il peut être interrompu pour ' +
          'maintenance, évoluer, ou cesser d’être proposé. Nous t’informerons dans l’application en cas d’arrêt ' +
          'définitif, dans un délai te permettant de récupérer tes données.',
      },
    ],
  },
  {
    heading: 'Responsabilité',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} ne saurait être tenu responsable des décisions que tu prends sur la base des estimations et ` +
          'suggestions affichées, ni des conséquences d’une indisponibilité du service. Aucune limitation ci-dessus ne ' +
          'vise à écarter une responsabilité qui ne peut légalement l’être.',
      },
    ],
  },
  {
    heading: 'Propriété intellectuelle',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `Le nom ${APP_NAME}, son identité visuelle, ses textes et son interface sont protégés. Les facteurs d’émission ` +
          'proviennent de la Base Empreinte de l’ADEME et restent soumis aux conditions de réutilisation de cette source.',
      },
      {
        kind: 'paragraph',
        text: 'Les données que tu saisis restent les tiennes. Nous ne les exploitons pas à d’autres fins que le service.',
      },
    ],
  },
  {
    heading: 'Fin d’utilisation',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Tu peux cesser d’utiliser le service à tout moment et demander la suppression de ton compte et de tes données ' +
          `en écrivant à ${CONTACT_EMAIL}. Nous pouvons suspendre un compte en cas de ` +
          'manquement caractérisé aux règles ci-dessus.',
      },
    ],
  },
  {
    heading: 'Modification des conditions',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Ces conditions peuvent évoluer. En cas de changement significatif, tu en seras informé dans l’application ' +
          'avant qu’il prenne effet. La date de dernière mise à jour figure en haut de cette page.',
      },
    ],
  },
  {
    heading: 'Droit applicable et litiges',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Ces conditions sont soumises au droit français. En cas de différend, une solution amiable sera recherchée en ' +
          `priorité, en écrivant à ${CONTACT_EMAIL}.`,
      },
    ],
  },
  {
    heading: 'Éditeur',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} est édité par ${EDITOR_NAME}, à titre non professionnel et sans but lucratif. ` +
          `Contact : ${CONTACT_EMAIL}.`,
      },
      {
        kind: 'paragraph',
        text:
          'Hébergement des données applicatives : Supabase, serveurs situés dans l’Union européenne. Hébergement de la ' +
          'version web : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
      },
      {
        kind: 'paragraph',
        text:
          'L’article 6 III-2 de la loi du 21 juin 2004 pour la confiance dans l’économie numérique permet à une personne ' +
          'éditant un service en ligne à titre non professionnel de ne rendre publiques que les coordonnées de son ' +
          'hébergeur, celles-ci étant indiquées ci-dessus. Les éléments d’identification de l’éditeur ont été communiqués ' +
          'aux hébergeurs et restent à la disposition de l’autorité judiciaire.',
      },
    ],
  },
];

export default function Conditions() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      updatedAt={UPDATED_AT}
      intro={`${APP_NAME} est gratuit et sans publicité. Cette page dit ce que le service fait, ce qu’il ne prétend pas faire, et ce sur quoi chacun s’engage.`}
      sections={SECTIONS}
    />
  );
}
