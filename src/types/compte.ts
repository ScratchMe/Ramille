/**
 * État du rattachement du compte, tel qu'il s'affiche — module **pur**, sans import de
 * `@/lib/supabase` (règle du CLAUDE.md).
 *
 * Distinct de `etatDuCompte` (`compte-suppression.ts`), et il faut que les deux le restent.
 * Celui-là répond « puis-je supprimer ce compte, et sous quelle forme ? », et il a raison de
 * confondre une adresse écrite non confirmée avec une session anonyme : dans les deux cas la
 * suppression est la même. Celui-ci répond « qu'est-ce que la personne doit lire à l'écran ? »,
 * et là cette confusion est précisément le défaut à corriger (issue #62) : entre
 * `updateUser({ email })` et le clic de confirmation, l'écran « Toi » proposait de rattacher
 * un compte, comme si la demande n'avait jamais eu lieu. La boucle ouverte par
 * « Vérifie tes emails » ne se refermait nulle part.
 */

import type { SessionCompte } from '@/types/compte-suppression';

export type EtatRattachement =
  /** Identité confirmée : le bilan suit la personne d'un appareil à l'autre. */
  | { kind: 'rattache'; email: string | null }
  /** Adresse écrite, confirmation pas encore cliquée. Un fait, jamais une relance. */
  | { kind: 'a_confirmer'; email: string }
  /** Aucune adresse : tout vit sur cet appareil. */
  | { kind: 'local' }
  /** La lecture n'a pas abouti : on ne sait pas, et on ne l'invente pas. */
  | { kind: 'indisponible' };

/**
 * **Le quatrième état existe parce que `local` est le plus affirmatif des trois autres**
 * (A6-8). `lireEtatDuRattachement` passe par `getUser()`, qui est un aller-retour réseau —
 * choix assumé, c'est le seul moyen de voir la bascule de `is_anonymous` après la
 * confirmation d'une adresse. Hors ligne, cet appel **ne lève pas** : il rend
 * `{ user: null, error }`, que l'ancienne signature ramenait à `null`, donc à « tout vit sur
 * cet appareil » plus un bouton « Rattacher un compte ». Quelqu'un qui a un compte depuis des
 * mois lisait qu'il n'en a pas, au seul écran du produit qui parle de son compte.
 *
 * D'où deux informations et non une : la session **et** le fait que la lecture ait abouti.
 * Sans session et sans échec, `local` reste juste (session anonyme sans adresse). Sans session
 * mais avec un échec, il n'y a rien à affirmer — et surtout rien à proposer.
 *
 * Le repli par `getSession()` (cache local) a été écarté : la session en cache peut encore
 * porter `is_anonymous: true` juste après la confirmation de l'adresse, donc elle peut servir à
 * affirmer `rattache`, jamais à affirmer `local`. Ne rien affirmer est plus simple et plus sûr.
 */
export function etatDuRattachement(lu: {
  /** `null` quand aucune session n'a pu être lue — ce qui ne dit pas encore pourquoi. */
  session: Pick<SessionCompte, 'isAnonymous' | 'email'> | null;
  /** `true` quand l'appel a rendu une erreur : hors ligne, Supabase indisponible, jeton refusé. */
  lectureEnEchec: boolean;
}): EtatRattachement {
  const { session } = lu;

  // Une session lue prime sur l'échec : si les deux arrivent, c'est qu'on sait déjà.
  if (!session) return lu.lectureEnEchec ? { kind: 'indisponible' } : { kind: 'local' };

  // `is_anonymous` prime, même règle que pour la suppression : une adresse présente ne
  // signifie pas que le compte est rattaché.
  if (!session.isAnonymous) return { kind: 'rattache', email: session.email };

  const email = session.email?.trim();
  return email ? { kind: 'a_confirmer', email } : { kind: 'local' };
}
