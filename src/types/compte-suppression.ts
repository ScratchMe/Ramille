/**
 * Dérivation de l'état du compte pour la page web de suppression (`/compte/suppression`).
 *
 * Pure et testée à part parce que la seule erreur qui compte ici est **silencieuse** :
 * confirmer une suppression qui n'a rien supprimé. Le cas se présente vraiment — quelqu'un
 * qui ouvre la page dans un navigateur neuf reçoit une session anonyme toute fraîche
 * (`ensureSession`, cf. supabase.ts), et supprimer *ça* effacerait un compte vide en
 * annonçant à la personne que ses données sont parties.
 *
 * D'où le troisième champ, `aDesDonnees` : une session anonyme ne vaut d'être supprimée que
 * si elle porte quelque chose.
 */
export type SessionCompte = {
  /** `auth.users.is_anonymous` — vrai tant que l'identité n'est pas **confirmée**. */
  isAnonymous: boolean;
  email: string | null;
  /** Au moins un bilan visible sous la RLS de cette session. */
  aDesDonnees: boolean;
};

export type EtatSuppression =
  /** Compte permanent : on sait à qui il appartient, on peut le nommer et le supprimer. */
  | { kind: 'rattache'; email: string | null }
  /** Session anonyme portant un bilan : c'est bien la personne, mais liée à ce navigateur. */
  | { kind: 'anonyme-avec-donnees' }
  /** Rien d'identifiable ici — il faut passer par un lien envoyé à l'adresse du compte. */
  | { kind: 'inconnu' };

export function etatDuCompte(session: SessionCompte | null): EtatSuppression {
  if (!session) return { kind: 'inconnu' };

  // `is_anonymous` prime sur la présence d'une adresse, et ce n'est pas un détail : entre
  // `updateUser({ email })` et le clic sur l'email de confirmation, la ligne porte déjà
  // l'adresse alors que le compte n'est pas rattaché. Se fier à `email` afficherait
  // « compte rattaché à … » pour quelqu'un qui n'a jamais confirmé.
  if (!session.isAnonymous) return { kind: 'rattache', email: session.email };

  return session.aDesDonnees ? { kind: 'anonyme-avec-donnees' } : { kind: 'inconnu' };
}
