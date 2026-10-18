import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import {
  CONTACT_EMAIL,
  EDITOR_NAME,
  HEBERGEUR_DES_DONNEES,
  HEBERGEUR_DU_SITE,
  URL_DU_CODE,
} from '@/constants/editeur';
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
// par l'article 1er-1, II, de la LCEN (ancien article 6 III-2, voir `editeur.ts`). Ce sont des absences
// motivées, pas des oublis.

// Cette page bouge moins que /confidentialite, et sa date ne suit donc pas la sienne : elle
// n'avance que quand une clause change. Le 11/09/2026, c'est la durée de conservation d'un
// bilan non rattaché — la purge porte sur l'inactivité et non sur l'âge du bilan. Le 25/09/2026,
// c'est la connexion : la clause « Accès et compte » disait encore « un lien envoyé à ton
// adresse », alors qu'un code a remplacé le lien le 20/09/2026 (`CLAUDE.md`, « le lien a disparu
// des deux e-mails »). Relevé en contre-lisant `v1-29`. La date est celle de la mise en ligne,
// pour la raison écrite dans `/confidentialite`.
//
// **18/10/2026 : quatre clauses, relevées par l'audit juridique du jour** (`docs/exploitation/
// sous-traitants.md`, « Ce qui reste à faire »). (1) La propriété intellectuelle disait « ses textes et son
// interface sont protégés » et interdisait de « réutiliser le contenu du service à des fins commerciales
// sans autorisation » : c'est le contraire de la licence sous laquelle le dépôt est public (AGPL-3.0 ou
// ultérieure, `LICENSE`, `NOTICE`, `README.md`), qui autorise l'usage commercial du code. Seuls le nom,
// le logo, la mascotte et l'identité visuelle sont réservés (`NOTICE`) ; la clause le dit, avec l'adresse
// du dépôt (`docs/exploitation/depot-public.md` §4 : le §13 de l'AGPL ne crée aucune obligation sur
// l'éditeur lui-même, ce lien n'est donc pas une obligation, seulement l'endroit où on cherchera le code).
// (2) « Ramille ne saurait être tenu responsable » : un nom de produit n'est pas une personne, la
// responsabilité est celle de l'éditeur. (3) L'hébergeur des données était « Supabase, serveurs situés dans
// l'Union européenne », sans l'entité ni l'adresse : c'est Supabase Pte. Ltd. (Singapour) selon ses conditions
// et son avenant de sous-traitance, lus le 18/10/2026 (`HEBERGEUR_DES_DONNEES`). (4) Le renvoi à
// l'« article 6 III-2 » de la LCEN : la loi n° 2024-449 du 21 mai 2024 a déplacé la règle (voir `editeur.ts`).
// **Aucun âge minimal n'est ajouté**, par décision : la fiche Play déclare 18 ans et plus, les conditions
// n'en fixent aucun (`docs/exploitation/fiche-google-play.md` §1.3), et en poser un est une décision de
// produit.
const UPDATED_AT = '18 octobre 2026';

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
          'sont des suggestions, jamais des injonctions : tu restes juge de ce qui est possible dans ta situation.',
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
          'Tu peux créer un compte avec ton adresse email, ou en passant par ton compte Google. Il n’y a pas de mot de passe : avec une adresse email, la connexion se fait par un code à usage unique envoyé à cette adresse.',
          'Tu es responsable de l’accès à ta boîte email et des actions effectuées depuis ton compte.',
          'Sans rattachement à un compte, ton bilan reste lié à l’appareil et au navigateur utilisés, et il est supprimé automatiquement après 90 jours sans utilisation de l’application. Tant que tu reviens, rien n’est effacé.',
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
          `Présenter une autre application ou un autre service sous le nom, avec le logo ou avec la mascotte de ${APP_NAME}, sans autorisation écrite préalable.`,
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
          'L’éditeur ne saurait être tenu responsable des décisions que tu prends sur la base des estimations et ' +
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
          `Le nom ${APP_NAME}, son logo, sa mascotte et son identité visuelle sont réservés : les réutiliser demande ` +
          'l’autorisation écrite de l’éditeur. Les facteurs d’émission proviennent de la Base Empreinte de l’ADEME et ' +
          'restent soumis aux conditions de réutilisation de cette source.',
      },
      {
        kind: 'paragraph',
        text:
          `Le code source de ${APP_NAME}, textes et interface compris, est publié sous licence libre : la GNU Affero ` +
          'General Public License version 3 ou ultérieure (AGPL-3.0-or-later). Tu peux le lire, l’utiliser, le modifier ' +
          'et le redistribuer dans les conditions de cette licence, y compris pour un usage commercial. Elle impose ' +
          'notamment de conserver la mention de l’auteur et de redistribuer sous la même licence toute version modifiée, ' +
          'en offrant son code source aux utilisateurs d’une version modifiée exploitée comme service en ligne. Le ' +
          `code se trouve sur ${URL_DU_CODE}.`,
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
          'Tu peux cesser d’utiliser le service à tout moment. La suppression de ton compte et de tes données se fait ' +
          'sans nous écrire : dans l’application, ouvre « Ton compte » — l’icône en haut à droite de l’écran — puis, ' +
          'sur l’écran « Toi », la section « Mes ' +
          `données » ; depuis un navigateur, même sans l’application, sur ${ORIGINE_CANONIQUE}/compte/suppression. Si tu ` +
          `préfères passer par nous, écris à ${CONTACT_EMAIL}. Nous pouvons suspendre un compte en cas de manquement ` +
          'caractérisé aux règles ci-dessus.',
      },
    ],
  },
  {
    heading: 'Modification des conditions',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Ces conditions peuvent évoluer. En cas de changement significatif, nous t’en informerons dans ' +
          'l’application avant qu’il prenne effet. La date de dernière mise à jour figure en haut de cette page.',
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
          `Hébergement des données applicatives : ${HEBERGEUR_DES_DONNEES.nom}, ${HEBERGEUR_DES_DONNEES.adresse}, avec ` +
          `des serveurs situés à ${HEBERGEUR_DES_DONNEES.emplacementDesServeurs}. Hébergement de la version web : ` +
          `${HEBERGEUR_DU_SITE.nom}, ${HEBERGEUR_DU_SITE.adresse}.`,
      },
      {
        kind: 'paragraph',
        text:
          'L’article 1er-1, II, de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, ' +
          'introduit par la loi n° 2024-449 du 21 mai 2024, permet à une personne éditant un service en ligne à titre ' +
          'non professionnel de ne rendre publics que le nom et l’adresse de son hébergeur, ceux-ci étant indiqués ' +
          'ci-dessus. Les éléments d’identification de l’éditeur ont été communiqués aux hébergeurs et restent à la ' +
          'disposition de l’autorité judiciaire.',
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
