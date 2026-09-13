// Les refus de PostgREST que l'app doit distinguer — incident du 13/09/2026.
//
// Module **pur** : aucune importation de `@/lib/supabase`, pour la raison donnée en tête de
// `src/types/session.ts` (ce module tire AsyncStorage, `react-native` et un polyfill d'URL, qui
// n'ont rien à faire dans une suite de logique pure).
//
// ## L'incident, et pourquoi il ne se corrige pas là où on le croit
//
// Le 13/09/2026, `ramille.fr` a refusé de démarrer sur un `401` :
//
//     { code: "PGRST303", message: "JWT issued at future" }
//
// PostgREST refuse un jeton dont le `iat` — l'instant d'émission — est **postérieur à sa propre
// horloge**. Trois faits, relevés ce jour-là, disent où est la faute et où elle n'est pas :
//
//   * **le jeton n'est jamais fabriqué par l'appareil.** Il est émis par Supabase Auth, qui pose
//     `iat` à son horloge à lui ; l'horloge du navigateur n'entre nulle part dans ce contrôle.
//     Une pendule fausse côté utilisateur ne peut pas produire cette erreur, et la chercher là
//     coûterait la journée ;
//   * **les deux horloges mesurées sont justes.** La base et les deux façades (auth et rest) du
//     projet distant étaient à la seconde près, et un jeton émis puis présenté dans la foulée a
//     été accepté — l'écart est donc **intermittent**, du côté de Supabase, entre le service qui
//     émet et celui qui vérifie ;
//   * **il se referme tout seul.** Dans les journaux du jour, le même client reçoit `401` puis
//     `200` sur la même requête douze secondes plus tard, et PostgREST a redémarré quatre fois
//     dans la journée.
//
// Autrement dit : **ce jeton n'est pas refusé, il est refusé _pour l'instant_.** C'est le seul
// refus de jeton qui se répare en ne faisant rien — d'où une seconde tentative, et d'où ce module
// qui la nomme plutôt que de laisser un code à quatre lettres dans une condition.
//
// ## Le réflexe à ne pas avoir
//
// Un `401` appelle naturellement « rafraîchis le jeton ». **Ici c'est exactement le mauvais
// geste** : un jeton rafraîchi porte un `iat` encore **plus récent**, donc encore plus loin
// devant l'horloge qui le refuse. Ce qui répare, c'est le temps qui passe, et rien d'autre.
//
// ## Ce qui n'est pas couvert, et pourquoi
//
// Les autres refus de jeton — expiré, signature invalide, rôle absent — ne se réparent pas en
// attendant : les réessayer masquerait un vrai problème derrière une latence. Un seul code est
// donc reconnu, et c'est celui-là.

/**
 * « JWT issued at future » — le jeton est en avance sur l'horloge qui le vérifie.
 *
 * Reconnu par son **code** et jamais par son message, comme `over_email_send_rate_limit`
 * (`src/types/connexion.ts`) et `RM001` (`src/lib/plan-engagement.ts`) : un message est du texte
 * qu'une version de PostgREST peut reformuler sans prévenir.
 */
export const CODE_JETON_TROP_NEUF = 'PGRST303';

/**
 * Ce qu'on laisse passer avant de redemander : **deux attentes, donc trois tentatives au plus**.
 *
 * L'écart n'est pas connu, et c'est ce qui fixe la forme. Ce que les journaux du 13/09/2026
 * disent : une requête acceptée et une refusée à **deux millisecondes d'écart**, la première
 * portant le jeton d'avant un rafraîchissement et la seconde celui d'après — donc l'horloge qui
 * vérifie était en retard d'au moins une seconde sur celle qui émet. Ce qu'ils ne disent pas :
 * jusqu'où. Le même client repasse en `200` douze secondes plus tard, et rien entre les deux.
 *
 * D'où deux attentes plutôt qu'une : la première (1 200 ms) couvre le cas mesuré et se glisse
 * **dans une animation que la personne regarde déjà** — l'écran d'ouverture tient l'affichage
 * 1 450 ms (`DUREE_ANIMATION_LANCEMENT`), et le démarrage est le seul moment où ce refus frappe en
 * pratique, puisque c'est là que la session s'ouvre. La seconde (2 500 ms) est là pour un écart un
 * peu plus large, et elle se paie en attente visible — c'est le bon compromis dans ce sens-là :
 * quelques secondes de patience valent mieux qu'un écran d'échec technique pour une condition qui
 * se répare toute seule.
 *
 * **Ce qui ne doit pas arriver, c'est une troisième attente**, ni une attente longue : au-delà, ce
 * n'est plus un écart d'horloge passager mais une panne, et une panne doit s'afficher.
 */
export const DELAIS_JETON_TROP_NEUF_MS = [1200, 2500] as const;

/**
 * Le corps d'une réponse PostgREST dit-il « ce jeton est en avance » ?
 *
 * Prend le corps **déjà analysé**, et se méfie de tout : la fonction est appelée sur la réponse
 * d'un serveur, donc sur une valeur dont on ne sait rien — un `null`, une chaîne, un tableau, un
 * objet sans `code` doivent tous rendre `false` sans lever.
 */
export function estJetonTropNeuf(corps: unknown): boolean {
  if (typeof corps !== 'object' || corps === null) return false;
  const code = (corps as { code?: unknown }).code;
  return code === CODE_JETON_TROP_NEUF;
}

/**
 * La forme de `fetch`, écrite ici pour que l'enveloppe ci-dessous soit typée sans dépendre de
 * `@supabase/supabase-js`.
 */
export type FonctionFetch = (entree: RequestInfo | URL, options?: RequestInit) => Promise<Response>;

const attendreParDefaut = (ms: number) => new Promise<void>((resoudre) => setTimeout(resoudre, ms));

/**
 * `fetch`, avec **au plus deux** tentatives de plus quand PostgREST répond « ce jeton est en
 * avance ».
 *
 * Une fonction d'ordre supérieur plutôt qu'un `fetch` écrit dans `src/lib/supabase.ts` : c'est ce
 * qui rend la règle éprouvable sans client Supabase ni réseau — combien de tentatives, sur quel
 * code, sur quel statut, et ce qui se passe quand la seconde échoue à son tour.
 *
 * Trois choses qui expliquent sa forme :
 *
 *   1. **Une tentative de plus ne peut rien dupliquer.** Le contrôle du jeton est fait avant que
 *      la requête n'atteigne SQL : une réponse `PGRST303` veut dire qu'aucune ligne n'a été lue ni
 *      écrite. C'est ce qui rend le réessai sûr **pour ce code et pour aucun autre** — ne pas
 *      étendre le motif à ce qui ressemblerait à une panne passagère.
 *   2. **Le corps n'est lu que sur un 401, et sur une copie** : l'original doit rester consommable
 *      par l'appelant, qui ne saura jamais qu'on l'a regardé.
 *   3. **Un `Request` n'est pas rejoué.** Il porte son corps sous forme de flux, consommé au
 *      premier envoi. Les trois SDK Supabase passent une URL et un corps en chaîne, donc la
 *      branche n'est pas atteinte en production — elle est là pour que l'invariant soit tenu par
 *      le code plutôt que par une lecture des dépendances.
 *
 * Si la dernière tentative échoue à son tour, sa réponse est rendue telle quelle : l'écran affiche
 * alors son message d'échec, ce qui est le bon résultat pour un écart qui durerait vraiment.
 */
export function fetchAvecSecondeChance(
  fetchBrut: FonctionFetch,
  attendre: (ms: number) => Promise<void> = attendreParDefaut
): FonctionFetch {
  return async (entree, options) => {
    const rejouable = typeof entree === 'string' || entree instanceof URL;
    let reponse = await fetchBrut(entree, options);

    for (const delai of DELAIS_JETON_TROP_NEUF_MS) {
      if (!rejouable || !(await refuseCarJetonTropNeuf(reponse))) return reponse;
      await attendre(delai);
      reponse = await fetchBrut(entree, options);
    }
    return reponse;
  };
}

async function refuseCarJetonTropNeuf(reponse: Response): Promise<boolean> {
  if (reponse.status !== 401) return false;
  try {
    return estJetonTropNeuf(await reponse.clone().json());
  } catch {
    // Un 401 sans corps JSON lisible n'est pas celui-là.
    return false;
  }
}
