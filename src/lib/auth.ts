// Rattachement d'identité à la session anonyme — cf. docs/architecture/v1-04-authentification.md.
// Toute la logique ici *lie* une identité à la session anonyme déjà active (même
// `user_id`, cf. doc §1) plutôt que de créer une nouvelle session : c'est ce qui permet
// au bilan déjà en base de rester attaché sans code de migration applicatif.
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Requis uniquement sur web (referme l'onglet/popup d'auth quand le redirect revient) —
// no-op inoffensif sur natif, cf. doc Supabase "Native Mobile Deep Linking".
WebBrowser.maybeCompleteAuthSession();

export type AuthResult = { error: Error | null };

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
export async function linkGoogleIdentity(): Promise<AuthResult> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/plan` },
    });
    return { error };
  }

  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error };
  if (!data?.url) return { error: new Error('Supabase n’a pas renvoyé d’URL de connexion Google.') };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    // 'cancel' / 'dismiss' : l'utilisateur a fermé la fenêtre, pas une vraie erreur à afficher.
    return { error: null };
  }

  return createSessionFromUrl(result.url);
}

// Ouvre la session portée par une URL de retour (`#access_token=…&refresh_token=…`). Deux
// appelants sur natif : le retour Google ci-dessus, et le lien de connexion par email, qui
// arrive hors de l'app (ouvert depuis la messagerie) et remonte par `Linking.useURL()` dans
// `_layout.tsx`. Sur web, `detectSessionInUrl` fait ce travail tout seul.
export async function createSessionFromUrl(url: string): Promise<AuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { error: new Error(errorCode) };

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
export async function linkEmail(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
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
