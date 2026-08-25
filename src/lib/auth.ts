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

async function createSessionFromUrl(url: string): Promise<AuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { error: new Error(errorCode) };

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    return { error: new Error('Jetons de session manquants dans la redirection.') };
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { error };
}

// Lie email + mot de passe à la session anonyme courante (conversion en compte permanent,
// cf. doc §1 — pas signUp, qui créerait un utilisateur séparé). Envoie un email de
// confirmation si le garde-fou "confirmation obligatoire" est actif côté dashboard
// (cf. doc §2) ; `is_anonymous` ne bascule à `false` qu'une fois confirmé.
export async function linkEmailPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ email, password });
  return { error };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const redirectTo = Platform.OS === 'web' ? undefined : makeRedirectUri();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}
