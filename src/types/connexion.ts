/**
 * Logique pure des écrans de connexion par lien (`/connexion/email`, `/connexion/retrouver`)
 * et de la page web de suppression — cf. `docs/architecture/v1-10-connexion-et-rappels.md`
 * §2.D. Les requêtes vivent dans `src/lib/auth.ts` ; ce module ne tire ni React Native ni
 * `@/lib/supabase`, pour rester testable (même découpage que `src/types/bilan.ts`).
 */

/**
 * Forme minimale d'une erreur Supabase Auth telle qu'elle arrive dans les écrans. Le type
 * `AuthError` du SDK n'est pas importé pour ne pas tirer `@supabase/supabase-js` dans un
 * module testé ; seuls `code` et `status` sont lus.
 */
export type ErreurAuth = { code?: string; status?: number; message?: string } | null;

/**
 * La limite d'envoi d'emails, seul cas où réessayer tout de suite ne servirait à rien.
 *
 * Elle se reconnaît au **code**, jamais au message : Supabase répond « For security
 * purposes, you can only request this after N seconds », qui ne contient pas le mot
 * « rate » — une première version cherchait ce mot et ne détectait rien (vérifié contre
 * l'API le 05/09/2026). Le 429 est le repli si le code manque.
 */
export function estLimiteDEnvoi(error: ErreurAuth): boolean {
  if (!error) return false;
  return error.code === 'over_email_send_rate_limit' || error.status === 429;
}

/**
 * L'adresse appartient déjà à un compte permanent — le cas de quelqu'un qui a un compte et
 * tape son adresse dans « créer » au lieu de « retrouver » sur un nouvel appareil.
 * `updateUser({ email })` ne peut pas rattacher une adresse prise (`422 email_exists`) : la
 * bonne réponse n'est pas une erreur, c'est de l'envoyer vers l'écran qui reconnecte.
 */
export function adresseDejaRattachee(error: ErreurAuth): boolean {
  return error?.code === 'email_exists';
}

/**
 * Validation d'adresse volontairement large — le seul but est d'éviter d'appeler l'API pour
 * une saisie manifestement incomplète. Toute règle plus stricte finit par refuser une
 * adresse valide, et c'est l'utilisateur qui paie l'erreur.
 */
export function adresseSemblePlausible(email: string): boolean {
  const valeur = email.trim();
  if (valeur.length < 5 || /\s/.test(valeur)) return false;
  const [locale, domaine, ...reste] = valeur.split('@');
  if (reste.length > 0) return false;
  return Boolean(locale) && Boolean(domaine) && domaine.includes('.') && !domaine.endsWith('.');
}
