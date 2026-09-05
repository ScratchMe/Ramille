// Identité de l'éditeur — les deux seules informations que le code ne peut pas déduire.
//
// TraceVerte est édité par une personne physique, **à titre non professionnel et sans but
// lucratif**. Ce statut change ce que la loi impose d'afficher, et il l'allège beaucoup :
//
// - **LCEN (loi n° 2004-575), article 6 III-2** : une personne qui édite un service de
//   communication au public en ligne à titre non professionnel peut, pour préserver son
//   anonymat, ne tenir à la disposition du public que **le nom et l'adresse de son
//   hébergeur** — à condition de lui avoir communiqué ses éléments d'identification
//   personnelle. D'où l'absence, dans les pages légales, de statut juridique, d'adresse
//   postale, de numéro d'immatriculation et de directeur de la publication : ce ne sont pas
//   des oublis. Les hébergeurs (Supabase, Vercel) sont nommés dans `/conditions`.
// - **Médiateur de la consommation** (code de la consommation, art. L612-1) : ne s'impose
//   qu'aux **professionnels** pour leurs litiges avec des consommateurs. Sans objet ici, la
//   section correspondante a été retirée plutôt que laissée à compléter.
// - **RGPD, article 13** : impose en revanche l'identité et les coordonnées du responsable
//   de traitement. C'est irréductible, et c'est la raison d'être des deux constantes
//   ci-dessous. Un email suffit comme « coordonnées » — pas besoin d'adresse postale.
//
// Si le projet devenait un jour une activité professionnelle (monétisation, structure
// juridique), ce régime tomberait et les pages légales devraient reprendre les mentions
// complètes de l'article 6 III-1.

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
 */
export const CONTACT_EMAIL = 'contact@traceverte.fr';

