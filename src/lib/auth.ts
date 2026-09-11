// Rattachement d'identité à la session anonyme — cf. docs/architecture/v1-04-authentification.md.
// Toute la logique ici *lie* une identité à la session anonyme déjà active (même
// `user_id`, cf. doc §1) plutôt que de créer une nouvelle session : c'est ce qui permet
// au bilan déjà en base de rester attaché sans code de migration applicatif.
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';
import { issueDuNavigateurDAuth, lireRetourDeLien } from '@/types/connexion';

// Requis uniquement sur web (referme l'onglet/popup d'auth quand le redirect revient) —
// no-op inoffensif sur natif, cf. doc Supabase "Native Mobile Deep Linking".
WebBrowser.maybeCompleteAuthSession();

export type AuthResult = { error: Error | null };

/**
 * Ce que le rattachement Google a donné — **quatre issues, et surtout pas deux.**
 *
 * L'annulation était rendue comme une réussite (`{ error: null }`, « pas une vraie erreur à
 * afficher ») : l'écran n'avait alors aucun moyen de la distinguer, et fêtait un rattachement
 * qui n'avait pas eu lieu (A6-1). Et sur web, `linkIdentity` rend la main **avant** la
 * redirection plein écran, donc « pas d'erreur » n'y veut pas dire « rattaché » mais « la page
 * s'en va » — tout ce qui suit l'appel court contre le déchargement du document (A6-20).
 *
 * `session` dit que les jetons de retour ont ouvert une session, rien de plus : le constat du
 * rattachement lui-même se lit sur `lireEtatDuRattachement()`, côté écran, avant de compter
 * quoi que ce soit.
 */
export type IssueGoogle =
  | { issue: 'session' }
  | { issue: 'redirection' }
  | { issue: 'annulation' }
  | { issue: 'echec'; error: Error };

// Lie l'identité Google à la session anonyme courante. Web : redirect plein écran
// classique (detectSessionInUrl déjà activé côté client sur web, cf. supabase.ts — la
// session se met à jour automatiquement au retour) ; redirectTo explicite vers /plan
// plutôt que de dépendre du Site URL par défaut du dashboard Supabase (qui ramènerait
// sur l'origine nue, cf. l'ancien cul-de-sac de `/` avant sa réécriture en redirection
// onboarding/plan) — nécessite que cette origine soit dans la liste des Redirect URLs
// autorisées côté dashboard (fait le 25/08/2026). Natif : flow "skipBrowserRedirect" +
// WebBrowser + extraction manuelle des tokens depuis l'URL de retour, pattern
// recommandé par la doc Supabase pour Expo (pas de config OAuth native type
// google_sign_in — un seul chemin à maintenir, web et natif).
export async function linkGoogleIdentity(): Promise<IssueGoogle> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/plan` },
    });
    // Pas d'erreur ici ne veut pas dire rattaché : la page part vers Google. Ce qui doit
    // survivre à la redirection est posé **avant** l'appel, par l'appelant.
    return error ? { issue: 'echec', error } : { issue: 'redirection' };
  }

  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { issue: 'echec', error };
  if (!data?.url) {
    return { issue: 'echec', error: new Error('Supabase n’a pas renvoyé d’URL de connexion Google.') };
  }

  const resultat = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  const issue = issueDuNavigateurDAuth(resultat);
  if (issue === 'annulation') return { issue: 'annulation' };
  // Le `in` est là pour le typage — `issue === 'jetons'` garantit déjà l'URL, mais seul lui
  // distingue les deux formes du résultat aux yeux du compilateur.
  if (issue === 'jetons' && 'url' in resultat && resultat.url) {
    // **Un consentement refusé revient par la porte du succès.** Google renvoie
    // `ramille://?error=access_denied`, que `openAuthSessionAsync` rend avec `type: 'success'`
    // puisque la redirection a bien eu lieu : sans ce test, l'URL partait dans
    // `createSessionFromUrl`, qui n'y voit qu'un retour de lien mort et rend « Ce lien de
    // connexion n'est plus valable. » — un texte qui parle d'un lien reçu par email à
    // quelqu'un qui vient de refuser un écran Google. Un refus **est** une annulation : même
    // issue que la fenêtre refermée, donc le même mot neutre à l'écran.
    if (lireRetourDeLien(resultat.url) === 'erreur') return { issue: 'annulation' };
    const { error: erreurDeSession } = await createSessionFromUrl(resultat.url);
    return erreurDeSession ? { issue: 'echec', error: erreurDeSession } : { issue: 'session' };
  }

  // Le type brut du résultat reste au journal, pas à l'écran : l'affichage le recopiait à la
  // suite de « La connexion avec Google n'a pas abouti. », si bien que la personne lisait deux
  // fois la même chose avec « (locked) » ou « (opened) » en anglais au bout. La phrase qui reste
  // ajoute le peu qu'on sait — la fenêtre s'est bien ouverte, rien n'en est revenu.
  console.error('La fenêtre d’authentification Google n’a pas abouti :', resultat.type);
  return {
    issue: 'echec',
    error: new Error('La fenêtre s’est refermée sans réponse de Google.'),
  };
}

// Ouvre la session portée par une URL de retour (`#access_token=…&refresh_token=…`). Deux
// appelants sur natif : le retour Google ci-dessus, et le lien de connexion par email, qui
// arrive hors de l'app (ouvert depuis la messagerie) et remonte par `Linking.useURL()` dans
// `_layout.tsx`. Sur web, `detectSessionInUrl` fait ce travail tout seul.
export async function createSessionFromUrl(url: string): Promise<AuthResult> {
  // **L'échec du lien arrive dans le même fragment que les jetons**, sous une autre forme
  // (`#error=access_denied&error_code=otp_expired`). Le test d'avant portait sur le champ
  // `errorCode` de `getQueryParams`, qui ne lit que ce nom-là — en camel, jamais envoyé par
  // Supabase : il valait donc toujours `null`, et un lien expiré ressortait d'ici avec
  // « Jetons de session manquants ». La lecture vit maintenant dans `src/types/connexion.ts`,
  // testée, et c'est la même que celle du layout racine.
  if (lireRetourDeLien(url) === 'erreur') {
    return { error: new Error('Ce lien de connexion n’est plus valable.') };
  }

  const { params } = QueryParams.getQueryParams(url);
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    return { error: new Error('Jetons de session manquants dans la redirection.') };
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { error };
}

// Lie une adresse email à la session anonyme courante (conversion en compte permanent, cf.
// doc §1 — pas signUp ni signInWithOtp, qui créeraient un utilisateur séparé et perdraient
// le bilan). **Sans mot de passe** depuis v1-10 §2.D : il n'a jamais servi — aucun
// `signInWithPassword` dans le produit, zéro compte sur 223 n'en portait. Supabase envoie un
// email de confirmation, et `is_anonymous` ne bascule à `false` qu'une fois le lien cliqué.
// Retrouver le compte plus tard se fait par lien (`sendAccountAccessLink`), jamais par
// secret.
//
// Une adresse déjà rattachée à un autre compte renvoie `422 email_exists` — ce n'est pas une
// erreur à afficher, c'est le signe que la personne cherchait l'écran « retrouver »
// (cf. `adresseDejaRattachee` dans `src/types/connexion.ts`).
//
// **`redirectTo` n'est pas optionnel, et son absence coûtait la fin du parcours.** Sans lui, le
// lien de confirmation retombe sur la Site URL du tableau de bord : sur natif il s'ouvre donc
// dans le navigateur et pas dans l'app, la personne revient à Ramille à la main, sans aucune URL
// entrante — il n'y a alors strictement rien pour lui annoncer que son compte est rattaché
// (contre-vérification d'A6-5). Avec lui, le retour passe par le scheme `ramille://`, que
// `_layout.tsx` traite, et l'annonce du plan se referme. L'adresse doit figurer dans les
// Redirect URLs du tableau de bord, sinon elle est ignorée en silence (`v1-10` §8.4).
export async function linkEmail(email: string, redirectTo: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: redirectTo }
  );
  return { error };
}

/**
 * Envoie un lien d'accès à usage unique à l'adresse d'un compte **déjà existant**.
 *
 * C'est le seul endroit du produit qui *connecte* à un compte au lieu d'en rattacher un :
 * tout le reste de ce fichier lie une identité à la session anonyme courante. Né pour la page
 * web de suppression, c'est depuis v1-10 §2.D **le** chemin de reconnexion du produit
 * (`/connexion/retrouver`) — quelqu'un qui arrive sur un nouvel appareil y reçoit une session
 * anonyme vide qui n'est pas son compte, et ni `linkIdentity` ni `updateUser` ne peuvent
 * l'aider : la première échoue si l'identité appartient déjà à quelqu'un, la seconde
 * modifierait la session vide. Le lien vaut pour un compte Google comme pour un compte
 * email : les deux portent une adresse sur `auth.users`.
 *
 * **`shouldCreateUser: false` est la garantie centrale** : sans lui, saisir n'importe quelle
 * adresse créerait un compte — et une page de suppression qui fabrique des comptes serait
 * exactement le contraire de ce qu'on affiche.
 *
 * Le retour ne distingue jamais « adresse inconnue » de « lien envoyé » — répondre
 * différemment transformerait l'écran en outil pour savoir qui utilise Ramille.
 *
 * `redirectTo` doit figurer dans la liste des Redirect URLs du tableau de bord Supabase,
 * sinon il est ignoré en silence et le lien retombe sur la Site URL (`v1-10` §8.4).
 */
export async function sendAccountAccessLink(email: string, redirectTo: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  return { error };
}
