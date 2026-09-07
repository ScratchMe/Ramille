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
  | { kind: 'local' };

export function etatDuRattachement(
  session: Pick<SessionCompte, 'isAnonymous' | 'email'> | null
): EtatRattachement {
  if (!session) return { kind: 'local' };

  // `is_anonymous` prime, même règle que pour la suppression : une adresse présente ne
  // signifie pas que le compte est rattaché.
  if (!session.isAnonymous) return { kind: 'rattache', email: session.email };

  const email = session.email?.trim();
  return email ? { kind: 'a_confirmer', email } : { kind: 'local' };
}
