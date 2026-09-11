/**
 * Ce qu'on sait d'une soumission de bilan qui a échoué — module pur, sans import de
 * `@/lib/supabase` (règle du CLAUDE.md), donc testable.
 *
 * ## Pourquoi une catégorie, et pas le message
 *
 * `usage_events` ne porte jamais de texte libre : son en-tête (20260905170000) le dit, et
 * `check_usage_event_props` borne les clés et les longueurs sans pouvoir juger du contenu. Le
 * message d'une erreur Postgres, lui, cite volontiers la valeur qui l'a déclenchée — une
 * violation de `check (commute_distance_km > 0)` ou de `commute_days_per_week <= 7` remonte la
 * ligne refusée — c'est-à-dire une réponse de la personne. L'émettre reviendrait à recopier une
 * partie du questionnaire dans la table d'usage, qui n'a aucune policy de lecture et sert
 * précisément à ne pas avoir à le faire.
 *
 * Deux dimensions répondent aux deux seules questions utiles : **où** la séquence s'est
 * arrêtée, et **de quelle nature** est la panne. La première est connue du code qui appelle,
 * pas devinée. La seconde se dérive du `code` de l'erreur, c'est-à-dire du SQLSTATE — le même
 * raisonnement que `over_email_send_rate_limit`, reconnu au code et jamais au message
 * (CLAUDE.md).
 */

/**
 * Les cinq pas de la séquence de soumission, dans l'ordre. La valeur est **passée** par
 * l'appelant, qui sait où il en est : la deviner depuis l'erreur serait deviner ce qu'on sait
 * déjà, et se tromper sans le dire le jour où deux pas lèvent la même chose.
 *
 * `creation` et `finalisation` portent tous deux sur `assessments`, et c'est tout l'intérêt de
 * les séparer : un échec à la création ne laisse rien derrière lui, un échec à la finalisation
 * laisse un bilan `in_progress` avec ses réponses — celui que la tentative suivante reprend.
 */
export const ETAPES_SOUMISSION = [
  'session',
  'creation',
  'reponses',
  'finalisation',
  'calcul',
] as const;

export type EtapeSoumission = (typeof ETAPES_SOUMISSION)[number];

/**
 * La nature de la panne. Liste fermée : une catégorie ouverte finirait par porter des messages.
 *
 * `reseau` est le cas le plus fréquent et le seul qui se reconnaisse par une **absence** : une
 * requête qui n'a jamais atteint Postgres ne rapporte pas de SQLSTATE. C'est aussi le seul où
 * « réessaie dans un instant » est un conseil vrai.
 */
export const GENRES_ERREUR_SOUMISSION = [
  'reseau',
  'contrainte',
  'permission',
  'introuvable',
  'autre',
] as const;

export type GenreErreurSoumission = (typeof GENRES_ERREUR_SOUMISSION)[number];

/**
 * Le `code` porté par une erreur de `@supabase/supabase-js`, ou `null` s'il n'y en a pas.
 *
 * La bibliothèque rend un objet `{ message, details, hint, code }` pour une erreur venue de la
 * base, et `code` y vaut alors le SQLSTATE. Mais elle range dans la même forme des échecs qui
 * n'ont jamais atteint Postgres, et des refus que PostgREST prononce lui-même sous un code à
 * lui (`PGRST…`) : le `code` est donc lu tel quel, et c'est la dérivation qui décide — un test
 * de forme ici ferait passer un `PGRST116` pour une absence de code, c'est-à-dire pour une
 * coupure réseau.
 */
function codeDeLErreur(erreur: unknown): string | null {
  if (typeof erreur !== 'object' || erreur === null) return null;
  const code = (erreur as { code?: unknown }).code;
  if (typeof code !== 'string' || code === '') return null;
  return code;
}

/**
 * Classe une erreur de soumission sans jamais lire son message.
 *
 * Les classes de SQLSTATE retenues sont celles que cette séquence peut réellement produire :
 *
 *  - **`23`** — violation d'intégrité. C'est la classe entière, pas seulement `23514` : un
 *    doublon de clé (`23505` sur `assessment_answers_pkey`, la reprise d'un bilan dont les
 *    réponses sont déjà écrites), une clé étrangère (`23503`, un mode de transport retiré du
 *    référentiel), un `not null` manquant s'y rangent tous, et les distinguer ici ne changerait
 *    rien à ce qu'on ferait de la mesure.
 *  - **`42501`** — le refus de privilège **et** le refus de RLS, indistinguables par le code
 *    (CLAUDE.md). Les deux disent la même chose du point de vue de cet écran : la session n'a
 *    pas le droit d'écrire, ce qui sur ce chemin ne peut venir que d'une session perdue.
 *  - **`P0002`** (`no_data_found`) — le code que `compute_assessment_results` et les RPC du
 *    produit lèvent pour « introuvable ». Un bilan qui disparaît entre l'insert et le calcul
 *    n'est pas une panne de réseau, et les confondre masquerait un vrai défaut.
 *
 * Tout autre code est `autre` : le ranger ailleurs par ressemblance inventerait une cause. Les
 * codes **de PostgREST** (`PGRST…`) en font partie, et il ne faut pas les verser dans `reseau` —
 * `PGRST116` (« aucune ligne pour un `single()` ») dit au contraire que la requête est arrivée et
 * a reçu une réponse ; c'est un défaut de notre côté, pas une panne de réseau.
 */
export function genreErreurSoumission(erreur: unknown): GenreErreurSoumission {
  const code = codeDeLErreur(erreur);
  if (code === null) return 'reseau';
  if (code.startsWith('23')) return 'contrainte';
  if (code === '42501') return 'permission';
  if (code === 'P0002') return 'introuvable';
  return 'autre';
}
