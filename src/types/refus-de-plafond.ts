/**
 * Ce qu'un écran dit quand la base refuse une écriture parce qu'un **plafond par compte et par jour**
 * est atteint (`RM002`) — pour les engagements et pour les bilans.
 *
 * Module **pur**, pour la raison donnée en tête de `src/types/session.ts` : la reconnaissance du refus
 * et les deux phrases se partagent entre `src/lib/plan-engagement.ts` et `src/types/soumission.ts`, et
 * c'est ici qu'elles se gardent ensemble.
 *
 * ## Le défaut
 *
 * Les deux refus tombaient dans `messageDEcriture` (`src/types/ecriture-en-echec.ts`) : « … Réessaie
 * dans un instant. », la phrase d'une panne du serveur. Elle est **fausse** pour un plafond : le refus
 * dure jusqu'à vingt-quatre heures après la première écriture de la fenêtre (le serveur la compte
 * ainsi, pas jusqu'à minuit), et chaque essai de plus se heurte au même refus. Même constat que pour
 * le plafond des corrections du contexte (`TROP_DE_CORRECTIONS`, `src/lib/contexte.ts`), dont ces
 * phrases gardent la forme : ce qui n'a pas été enregistré, la cause, puis « Réessaie demain. » —
 * l'arrondi qu'a gardé la personne qui pilote le 19/10/2026 (`v1-27` §12.41).
 *
 * ## Ce que les phrases ne disent pas
 *
 * Ni chiffre ni « plafond » (la limite est un réglage du serveur, que le client ne connaît pas), ni
 * « serveur », ni « instant », ni « connexion » — le test du fichier voisin garde ces mots hors des
 * phrases. Et aucune ne propose de réessayer tout de suite.
 *
 * Phrases à valider par la personne qui pilote, comme celles de `messageDEcriture` (`v1-27` §12.29).
 *
 * ## Les autres refus `RM002`
 *
 * Le plafond des corrections du contexte (`CODE_TROP_DE_CORRECTIONS`, `src/lib/contexte.ts`) et celui
 * des retours (`CODE_TROP_DE_RETOURS`, `src/lib/feedback.ts`) ont chacun leur constante, de même valeur
 * et écrites avant ce module : elles disent leur refus avec leur phrase et n'en dépendent pas.
 */

/**
 * **Le SQLSTATE d'un plafond atteint.** Classe `R`, réservée aux conditions applicatives du produit :
 * Postgres ne l'emploie pour rien, donc il ne peut pas se confondre avec une panne ou une contrainte.
 * Reconnu au code et **jamais au message** — une migration peut reformuler la phrase que la base
 * accompagne ce code (`20261005170000` pour les bilans et les engagements).
 *
 * Exporté pour que les tests ne le recopient pas : un code recopié dans une assertion est exactement
 * aussi faux qu'un code recopié dans le code.
 */
export const CODE_REFUS_DE_PLAFOND = 'RM002';

/**
 * Cette erreur est-elle un plafond atteint ? Lit `code` tel quel, comme `genreErreurSoumission` :
 * l'erreur d'`@supabase/supabase-js` est un objet `{ message, details, hint, code }`, et un échec qui
 * n'a jamais atteint Postgres n'en porte pas — `false`, ce qui laisse la phrase d'une panne.
 */
export function estUnRefusDePlafond(erreur: unknown): boolean {
  if (typeof erreur !== 'object' || erreur === null) return false;
  return (erreur as { code?: unknown }).code === CODE_REFUS_DE_PLAFOND;
}

/**
 * Le plafond des changements d'engagement : trente archivages par compte et par fenêtre de vingt-quatre
 * heures, vérifiés à l'entrée de `commit_plan_action`. **« Ton engagement a déjà changé »** et non « tu
 * as changé ton engagement » : l'archive que le serveur compte (`released_reason`) reçoit aussi les
 * engagements que libèrent une correction du contexte, un nouveau bilan, un retrait ou un changement de
 * saison — la phrase reste vraie dans chacun, et ne met personne en faute. Seul `commit_plan_action`
 * refuse : « Changer d'avis » (`clear_plan_action_commitment`) n'est jamais plafonné, donc ce refus ne
 * peut venir que d'un engagement qu'on prend ou qu'on modifie.
 */
export const TROP_DE_CHANGEMENTS_D_ENGAGEMENT =
  'Ton choix n’a pas été enregistré : ton engagement a déjà changé de nombreuses fois aujourd’hui. Réessaie demain.';

/**
 * Le plafond des bilans : dix par compte et par fenêtre de vingt-quatre heures, vérifiés à la création
 * (`plafonner_les_bilans`). **« Tes réponses sont conservées » est vrai** : le brouillon ne s'efface
 * qu'au succès de la soumission (`clearBilanDraft`), et un refus à la création n'a rien écrit côté
 * serveur — la phrase que la soumission en échec disait déjà le disait pour la même raison.
 */
export const TROP_DE_BILANS =
  'Ton bilan n’a pas été enregistré : tu as déjà commencé de nombreux bilans aujourd’hui. Tes réponses sont conservées. Réessaie demain.';
