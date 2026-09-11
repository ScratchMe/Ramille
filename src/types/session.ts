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
// La distinction est possible parce qu'`auth-js` remonte l'erreur : `getSession()` appelle
// `_callRefreshToken` quand la session stockée est expirée, et rend `{ session: null, error }`
// quand le rafraîchissement échoue pour de bon (relevé dans `GoTrueClient.__loadSession`, version
// installée). Les quatre états sont donc atteignables — aucun n'est décoratif.

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
 * Ce que rend `supabase.auth.getSession()`, traduit en décision.
 *
 * `aUneSession` plutôt que la session elle-même : ce module ne doit rien savoir du type `Session`
 * d'`auth-js`, et la seule chose qui compte ici est qu'il y en ait une.
 */
export function etatDeSession(aUneSession: boolean, error: ErreurAuth): EtatDeSession {
  if (aUneSession) return 'presente';
  if (!error) return 'absente';
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
