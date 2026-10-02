// Ce que l'absence de session veut dire — C2.11, constats C-2, A6-15, A6-16.
//
// Module **pur** : aucune importation de `@/lib/supabase`, pour la raison donnée en tête de
// `src/types/bilan.ts` (ce module tire AsyncStorage, `react-native` et un polyfill d'URL, qui
// n'ont rien à faire dans une suite de logique pure).
//
// ## Pourquoi cette dérivation existe
//
// `ensureSession()` faisait un raisonnement à deux branches : une session, ou pas de session —
// et dans le second cas elle en créait une anonyme. Or « pas de session » recouvre **trois**
// situations qui n'appellent pas la même réponse, et les confondre a deux coûts distincts :
//
//   * **personne n'est encore passé** (`absente`) — c'est le cas nominal d'une première ouverture,
//     et créer une session anonyme est exactement ce qu'il faut faire ;
//   * **le jeton stocké a été refusé** (`refusee`) — la session d'un compte réel vient d'être
//     rejetée. Créer une session anonyme ici donne un compte **vide** à quelqu'un qui en a un, et
//     rend le sien inatteignable autrement que par `/connexion/retrouver` : son bilan, son plan et
//     ses points sont toujours là, mais l'app affiche « Ton bilan n'est pas encore fait ». C'est la
//     moitié serveur du défaut que C2.11 ferme côté écran ;
//   * **le rafraîchissement n'a pas abouti** (`indisponible`) — une panne de transport, pas un
//     refus. Créer une session anonyme sur un réseau coupé produirait le même compte orphelin, pour
//     une cause qui disparaîtra d'elle-même ; et dire « reconnecte-toi » reprocherait à la personne
//     ce que le réseau a fait. On ne fait donc **rien**, et le prochain lancement réessaie.
//
// **Le refus a deux formes, et la première version n'en lisait qu'une** (02/10/2026, `v1-27` §12.27).
// `getSession()` peut rendre l'erreur d'un rafraîchissement refusé (`GoTrueClient.__loadSession`) ;
// mais au démarrage, sur un jeton d'accès déjà expiré, c'est l'initialisation d'`auth-js` qui le
// rafraîchit, essuie le refus et **retire la session elle-même**, avant toute lecture : `getSession()`
// ne voit plus ni session ni erreur, exactement comme à une première ouverture. Ce qui les sépare,
// c'est que l'appareil **portait un compte rattaché** — une marque locale que seuls les départs voulus
// effacent (`src/lib/marque-de-compte.ts`) : c'est `porteUnCompte`. Une session **anonyme** refusée
// (purgée au bout de 90 jours, révoquée) ne la porte pas, et reste une première ouverture : elle n'a
// aucun compte à retrouver — **dans la forme du démarrage**. Quand c'est `getSession()` qui rend
// l'erreur (un processus resté vivant, rare : une lecture passe d'ordinaire avant lui), le refus se
// dit sans consulter la marque, anonyme compris. Mesuré sur l'export, puis reproduit sur le client réel par
// `src/lib/session-refusee.test.ts`. Les quatre états sont donc atteignables — aucun n'est décoratif.

import { estPanneDeTransport, type ErreurAuth } from '@/types/connexion';

export type EtatDeSession =
  /** Une session est là, anonyme ou rattachée. Rien à faire. */
  | 'presente'
  /** Aucune session, et aucune raison : première ouverture. C'est le moment d'en créer une. */
  | 'absente'
  /** Le jeton stocké a été refusé. **Ne pas créer de session anonyme** : on couvrirait un compte. */
  | 'refusee'
  /** Le rafraîchissement n'a pas abouti. Ni création, ni reproche — le prochain lancement réessaie. */
  | 'indisponible';

/**
 * Ce que rend `supabase.auth.getSession()`, et ce que l'appareil sait du compte qu'il portait, traduit en décision.
 *
 * `porteUnCompte` : l'appareil portait un compte rattaché, et aucun départ voulu ne l'a quitté (voir
 * l'en-tête). Sans session, c'est un refus, même sans erreur — le seul argument qui ne vient pas de
 * `getSession()`.
 *
 * `aUneSession` plutôt que la session elle-même : ce module ne doit rien savoir du type `Session`
 * d'`auth-js`, et la seule chose qui compte ici est qu'il y en ait une.
 */
export function etatDeSession(aUneSession: boolean, error: ErreurAuth, porteUnCompte: boolean): EtatDeSession {
  if (aUneSession) return 'presente';
  if (!error) return porteUnCompte ? 'refusee' : 'absente';
  return estPanneDeTransport(error) ? 'indisponible' : 'refusee';
}

/**
 * Faut-il ouvrir une session anonyme ?
 *
 * Écrit comme une fonction et non lu en `=== 'absente'` sur les quatre appels : c'est **la** règle
 * que ce module existe pour tenir, et une comparaison recopiée ailleurs la perdrait. La réponse est
 * non dans les trois autres cas, et pour trois raisons différentes.
 */
export function doitOuvrirUneSessionAnonyme(etat: EtatDeSession): boolean {
  return etat === 'absente';
}

/**
 * Les routes où l'écran de reconnexion **ne se pose pas**, même pendant un refus (02/10/2026,
 * contre-lecture de la PR #315).
 *
 *   * **`/connexion/…`** : c'est là que la personne va se reconnecter. L'écran s'efface quand elle y
 *     part, et revient si elle en ressort sans session — sans quoi un « Retour » vers le plan la
 *     laissait devant un plan illisible, sans rien pour le dire ;
 *   * **les surfaces publiques et de service** — `/compte/suppression` (exigée par Google Play),
 *     `/rappels/stop` (le lien de désinscription d'un e-mail), `/confidentialite`, `/conditions`,
 *     `/status` : elles ne demandent pas de compte, et la surcouche cachait la confirmation d'une
 *     désinscription déjà partie. **`/feedback` n'en est pas** : il écrit un retour rattaché à la
 *     session (`sendFeedback`), et sans elle « Envoyer » répondrait sans fin « Ta session n'est pas
 *     prête » — l'écran de reconnexion y dit mieux ce qui manque.
 *
 * Écrit comme une liste, et non comme « les routes qui ont besoin du compte » : une route neuve se
 * couvre par défaut, et c'est le cas sûr — l'écran dit vrai partout où un compte manque.
 */
const CHEMINS_SANS_ECRAN_DE_RECONNEXION = [
  '/compte/suppression',
  '/rappels/stop',
  '/confidentialite',
  '/conditions',
  '/status',
] as const;

export function lEcranDeReconnexionSePose(chemin: string): boolean {
  if (chemin === '/connexion' || chemin.startsWith('/connexion/')) return false;
  return !(CHEMINS_SANS_ECRAN_DE_RECONNEXION as readonly string[]).includes(chemin);
}
