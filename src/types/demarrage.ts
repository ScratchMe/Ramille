// Ce que la racine fait quand elle ne sait pas — C4.5, page de décision `v1-15-hors-ligne.md`.
//
// Module **pur** : aucune importation de la plateforme, pour la raison donnée en tête de
// `src/types/session.ts`.
//
// ## Pourquoi ce module existe
//
// `src/app/index.tsx` levait dès que la lecture d'`assessments` échouait sans brouillon local, donc
// il affichait « Le démarrage a échoué » et le message brut d'Android à **toute personne ayant déjà
// soumis un bilan** ouvrant l'app sans réseau — le brouillon étant effacé à la soumission. Rien de
// l'app n'était atteignable, questionnaire compris, alors que c'est la seule chose qui marche hors
// ligne. Relevé à la recette sur appareil du 14/09/2026 (`v1-13` §12.5).
//
// Le raisonnement qui empêchait de router quand même reste juste, et il ne se défait pas : sans
// preuve locale, la racine ne peut pas distinguer un visiteur neuf d'un compte existant dont la
// lecture a échoué, et l'envoyer à l'onboarding lui dirait « tu n'as rien ». Ce qui manquait était la
// preuve, pas l'honnêteté. C'est la **marque locale** (`src/lib/marque-de-bilan.ts`), et ce module
// décide ce qu'on en fait.

/**
 * Ce que la racine a pu apprendre du serveur.
 *
 * Trois états et non deux : une lecture qui n'a pas eu lieu **parce que le réseau est coupé** n'est
 * pas une lecture qui a échoué côté serveur, et les deux n'appellent pas le même écran. C'est la
 * même distinction que fait `src/types/session.ts` entre un jeton refusé et une panne de transport.
 */
export type LectureDuBilan =
  /** Le serveur a répondu. `bilanComplete` dit ce qu'il a répondu. */
  | { etat: 'lue'; bilanComplete: boolean }
  /** La requête n'a jamais reçu de réponse HTTP. Personne n'a rien fait de mal. */
  | { etat: 'coupure' }
  /** Le serveur a répondu, et il a refusé. C'est l'écran technique, message brut compris. */
  | { etat: 'erreur' };

/**
 * Traduit la réponse de PostgREST en l'un des trois états.
 *
 * **Le discriminant est `status === 0`, et ce n'est pas celui que l'audit proposait.** A1-5 disait
 * « une erreur PostgREST porte un `code`, une coupure réseau non ». C'est vrai et insuffisant :
 * `@supabase/postgrest-js` (2.116.0, lu le 15/09/2026) rend une erreur **sans `code`** sur trois
 * autres chemins — un corps non-JSON sur une réponse 2xx, un corps d'erreur illisible, et un 404 au
 * corps vide — qui portent tous un statut HTTP réel. Les traiter comme des coupures de réseau
 * afficherait « pas de connexion » devant un serveur qui a parfaitement répondu.
 *
 * Le bloc `catch` du transport, lui, rend explicitement `status: 0` et `statusText: ''`, avec ce
 * commentaire dans le SDK : « We don't populate code/hint for client-side network errors since those
 * fields are meant for upstream service errors ». `status === 0` est donc l'absence de réponse HTTP
 * **dite par le SDK**, et non déduite d'un champ vide. Un `AbortError` y tombe aussi, ce qui est
 * juste : une requête avortée n'a pas eu de réponse non plus.
 *
 * Et surtout : **jamais au message**. « Network request failed », « Failed to fetch », « Unable to
 * resolve host … » varient selon la plateforme, la version et la langue du système. Reconnaître au
 * libellé refabriquerait le piège que ce dépôt documente pour `over_email_send_rate_limit` et pour
 * `PGRST303`.
 */
export function lireLeBilan(reponse: {
  /** La requête a-t-elle rendu une ligne ? */
  aUnBilan: boolean;
  /** Y a-t-il une erreur ? */
  enErreur: boolean;
  /** Le statut HTTP, `0` quand la requête n'a jamais reçu de réponse. */
  status: number;
}): LectureDuBilan {
  if (!reponse.enErreur) return { etat: 'lue', bilanComplete: reponse.aUnBilan };
  return reponse.status === 0 ? { etat: 'coupure' } : { etat: 'erreur' };
}

/**
 * Où la racine envoie la personne.
 *
 * **Il n'y a pas de drapeau « hors ligne » sur `plan`, et c'est une découverte de l'implémentation.**
 * `v1-15` §6 prévoyait un bandeau doux à passer à l'écran ; il est inutile, parce que C1.4 a déjà
 * construit l'écran honnête — arrivé sur le plan sans réseau, sa propre lecture échoue et il rend
 * « Ton plan n'a pas pu être relu. Vérifie ta connexion. » avec son « Réessayer ». Ajouter un
 * paramètre de route et une seconde phrase aurait fait deux textes à tenir d'accord pour le même
 * état, et un drapeau que personne ne lit se lit « mort ». Ce qui reste à voir avec le canvas est un
 * détail de copie et non un écran : « relu » suppose une lecture précédente, ce qui n'est pas le cas
 * au premier lancement.
 */
export type Destination =
  /** L'onglet du présent, qui dira lui-même s'il n'a pas pu relire. */
  | { vers: 'plan' }
  /** Le questionnaire, à l'étape où il avait été laissé. */
  | { vers: 'reprise' }
  /** La présentation du produit, qui n'affirme rien et marche sans réseau. */
  | { vers: 'onboarding' }
  /** L'écran technique, destiné à être recopié. */
  | { vers: 'echec' };

/**
 * La table de décision de `v1-15` §6, et elle est écrite pour être un test.
 *
 * Trois choses à ne pas défaire :
 *
 * **La marque n'est lue que dans la branche `coupure`.** Quand le serveur a répondu, c'est lui qui
 * décide — toujours. C'est ce qui empêche une marque fausse (un appareil restauré depuis une
 * sauvegarde, `allowBackup` étant vrai par défaut) de contredire la vérité : elle ne parle que là où
 * l'on ne sait rien, et son coût maximal est décrit en `v1-15` §9.
 *
 * **Hors ligne, le brouillon passe devant la marque**, à l'inverse de la règle en ligne où un bilan
 * complété l'emporte (C3.9 : « un re-bilan commencé ne doit pas s'emparer de l'ouverture de l'app »).
 * Ce n'est pas une incohérence, c'est le statu quo et il est plus utile : le questionnaire se remplit
 * sans réseau, le plan non. Router vers le plan retirerait à quelqu'un la seule chose qu'il pouvait
 * faire, et c'est déjà ce que le code fait aujourd'hui — l'inverser serait une régression.
 *
 * **Sans marque, la destination est l'onboarding et non l'écran d'échec.** Il n'affirme rien sur les
 * données de la personne (c'est une présentation, pas un constat), il marche hors ligne de bout en
 * bout, il mène au questionnaire — et il porte « J'ai déjà un compte », c'est-à-dire le recours du
 * seul cas où l'absence de marque trompe : un téléphone neuf, ou un stockage local vidé.
 */
export function destinationDuDemarrage(
  lecture: LectureDuBilan,
  local: { brouillon: boolean; marqueDeBilan: boolean },
): Destination {
  if (lecture.etat === 'lue') {
    if (lecture.bilanComplete) return { vers: 'plan' };
    return local.brouillon ? { vers: 'reprise' } : { vers: 'onboarding' };
  }

  // Le serveur a répondu et refusé : l'écran technique reste, et il reste pour ce cas-là. Son
  // registre développeur est une décision explicite, et son message brut est fait pour être recopié.
  if (lecture.etat === 'erreur') return { vers: 'echec' };

  if (local.brouillon) return { vers: 'reprise' };
  return local.marqueDeBilan ? { vers: 'plan' } : { vers: 'onboarding' };
}
