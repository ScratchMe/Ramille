// Identité de l'éditeur — les deux seules informations que le code ne peut pas déduire.
//
// Ramille est édité par une personne physique, **à titre non professionnel et sans but
// lucratif**. Ce statut change ce que la loi impose d'afficher, et il l'allège beaucoup :
//
// - **LCEN (loi n° 2004-575), article 1er-1, II** : une personne qui édite un service de
//   communication au public en ligne à titre non professionnel peut, pour préserver son
//   anonymat, ne tenir à la disposition du public que **le nom, la dénomination ou la raison
//   sociale et l'adresse de son hébergeur** — sous réserve de lui avoir communiqué ses éléments
//   d'identification personnelle (le I, 1° : nom, prénoms, domicile et numéro de téléphone).
//   D'où l'absence, dans les pages légales, de statut juridique, d'adresse postale, de numéro
//   d'immatriculation et de directeur de la publication : ce ne sont pas des oublis. Les
//   hébergeurs (Supabase, Vercel) sont nommés dans `/conditions`, avec l'entité et l'adresse que
//   donnent leurs contrats (constantes plus bas).
//   **Ce n'est plus l'article 6 III-2 depuis la loi n° 2024-449 du 21 mai 2024** (article 48) :
//   elle réécrit l'article 6 et loge la règle dans un article 1er-1 neuf, qui ajoute au I le
//   stockage de données par des tiers (5°) et, à l'article 1er-2, une peine d'un an et de
//   75 000 € pour qui manque aux I et II. Ce commentaire, `/conditions` et `FRONT.md` §2.2
//   écrivaient l'ancien numéro. **Lu le 18/10/2026 dans le texte définitif adopté** (Assemblée
//   nationale, texte adopté n° 286 du 10/04/2024, article 48, I, 1°) ; la décision n° 2024-866 DC
//   du Conseil constitutionnel ne censure pas cet article (elle censure les articles 10, 11, 18, 19
//   et 58). **Pas lu sur la version consolidée de Légifrance** : le site répond 403 à l'environnement
//   distant (défi anti-robot), donc une modification postérieure à 2024 reste à écarter à la
//   main (`docs/exploitation/sous-traitants.md`, « Ce qui reste à faire »).
// - **Médiateur de la consommation** (code de la consommation, art. L612-1) : ne s'impose
//   qu'aux **professionnels** pour leurs litiges avec des consommateurs. Sans objet ici, la
//   section correspondante a été retirée plutôt que laissée à compléter.
// - **RGPD, article 13** : impose en revanche l'identité et les coordonnées du responsable
//   de traitement. C'est irréductible, et c'est la raison d'être des deux constantes
//   ci-dessous. Un email suffit comme « coordonnées » — pas besoin d'adresse postale.
//
// Si le projet devenait un jour une activité professionnelle (monétisation, structure
// juridique), ce régime tomberait et les pages légales devraient reprendre les mentions
// complètes du I de l'article 1er-1 (ancien article 6 III-1).

/**
 * Nom de la personne responsable du traitement, tel qu'affiché dans les pages légales.
 * Exigé par le RGPD art. 13 : il doit permettre d'identifier le responsable, donc un pseudonyme
 * seul ne convient pas.
 */
export const EDITOR_NAME = 'Antoine Berthaud';

/**
 * Adresse de contact pour toute question et pour l'exercice des droits RGPD.
 *
 * **Cette adresse doit pouvoir RECEVOIR du courrier**, pas seulement en émettre. La
 * vérification du domaine déjà faite chez Resend ne couvre que l'envoi (SPF/DKIM) : la
 * réception demande un enregistrement MX distinct. Une adresse de contact qui n'arrive nulle
 * part serait un manquement au RGPD art. 12, qui impose de répondre sous un mois — et le pire
 * des cas, puisque l'utilisateur croirait avoir écrit.
 *
 * C'est pour ça qu'elle a basculé sur ramille.fr **après** le reste du renommage et pas avec
 * lui : afficher `contact@ramille.fr` avant que la boîte n'existe aurait été pire que de
 * laisser l'ancien nom. Vérifié au moment de la bascule : MX présents sur le domaine, et
 * réception confirmée par l'éditeur (les MX prouvent le routage, pas l'existence de la boîte).
 */
export const CONTACT_EMAIL = 'contact@ramille.fr';

/**
 * Les deux hébergeurs que `/conditions` nomme au titre de l'article 1er-1, II, de la LCEN (plus haut).
 * **L'entité qui contracte, avec l'adresse que son contrat donne** — pas la marque : « Supabase » seul
 * ne dit ni quelle société, ni dans quel pays, et c'est ce que l'audit du 18/10/2026 a reproché à la
 * mention d'avant.
 *
 * - **Supabase Pte. Ltd.** (Singapour) : « Supabase » au sens de ses conditions d'utilisation, sauf achat
 *   par la place de marché d'AWS, et la partie à son avenant de sous-traitance (version 1 du 1er août
 *   2026, lue le 18/10/2026). Les serveurs du projet sont à Paris (région `eu-west-3`), chez Amazon Web
 *   Services selon la liste de ses sous-traitants (12 octobre 2026) : c'est l'emplacement des données,
 *   pas l'entité qui contracte, d'où deux champs.
 * - **Vercel Inc.** (Californie) : l'adresse que donnent ses conditions et son avis de confidentialité
 *   (juin 2026), et l'inscription au Data Privacy Framework, lues le 18/10/2026.
 *
 * Toute mention d'un hébergeur passe par ici, comme `EDITOR_NAME` : une adresse recopiée dans un écran
 * finit par ne plus être celle du contrat.
 */
export const HEBERGEUR_DES_DONNEES = {
  nom: 'Supabase Pte. Ltd.',
  adresse: '65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513',
  emplacementDesServeurs: 'Paris',
} as const;

export const HEBERGEUR_DU_SITE = {
  nom: 'Vercel Inc.',
  adresse: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
} as const;


/**
 * Page personnelle de l'éditeur, liée depuis le pied des pages légales.
 *
 * Le lien va **de Ramille vers le CV**, et pas l'inverse : c'est le CV qu'il s'agit de
 * référencer. Deux conditions pour qu'il serve à quelque chose, et aucune n'est acquise par
 * défaut ici :
 *
 * - il doit être rendu comme une vraie balise `<a href>`. Un `onPress` sur du texte produit un
 *   `<div>` en react-native-web : cliquable, mais invisible pour un crawler. D'où le `Link`
 *   d'Expo Router dans `legal-page.tsx`, et pas un `Pressable` ;
 * - il doit être présent dans le HTML **statique** exporté, pas seulement après hydratation.
 *   Vérifié en cherchant l'URL dans `dist/conditions.html` — c'est le même genre de piège
 *   silencieux que `cleanUrls` (cf. CLAUDE.md).
 *
 * Pas de `rel="nofollow"` : on veut précisément que le lien transmette quelque chose.
 */
export const EDITOR_CV_URL = 'https://cv.antoine.berthaud.me/';
