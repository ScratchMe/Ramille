// Rattachement d'identité à la session anonyme — cf. docs/architecture/v1-04-authentification.md.
// Toute la logique ici *lie* une identité à la session anonyme déjà active (même
// `user_id`, cf. doc §1) plutôt que de créer une nouvelle session : c'est ce qui permet
// au bilan déjà en base de rester attaché sans code de migration applicatif.
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { ensureSession, supabase } from '@/lib/supabase';
import {
  codeDuRetourDeLien,
  issueDuNavigateurDAuth,
  lireRetourDeLien,
  type ContexteDuCode,
} from '@/types/connexion';

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

// Ouvre la session portée par une URL de retour (`?code=…`). Deux appelants sur natif : le
// retour Google ci-dessus, et le lien de connexion par email, qui arrive hors de l'app (ouvert
// depuis la messagerie) et remonte par `Linking.useURL()` dans `_layout.tsx`. Sur web,
// `detectSessionInUrl` fait ce travail tout seul.
//
// **Depuis le passage en PKCE (20/09/2026), cette fonction échange un code au lieu de poser des
// jetons**, et la différence n'est pas une histoire de format : `setSession` acceptait
// n'importe quelle paire de jetons venue de n'importe où, donc n'importe quelle page web du
// téléphone pouvait ouvrir `ramille://x#access_token=<les siens>` et faire basculer l'app sur
// le compte de quelqu'un d'autre — le scheme est BROWSABLE. Un `code`, lui, ne s'échange
// qu'avec le vérifieur resté dans le stockage de cette installation.
//
// La forme `jetons` est donc **refusée nommément** plutôt que laissée à échouer : c'est
// exactement la forme qu'un lien injecté porte, et un refus muet se lirait comme une panne.
export async function createSessionFromUrl(url: string): Promise<AuthResult> {
  // **L'échec du lien arrive dans le même bloc que le code**, sous une autre forme
  // (`error=access_denied&error_code=otp_expired`). Le test d'avant portait sur le champ
  // `errorCode` de `getQueryParams` (`expo-auth-session`), qui ne lit que ce nom-là — en camel,
  // jamais envoyé par Supabase : il valait donc toujours `null`, et un lien expiré ressortait
  // d'ici avec « Jetons de session manquants ». La lecture vit maintenant dans
  // `src/types/connexion.ts`, testée, et c'est la même que celle du layout racine — ce module
  // n'est d'ailleurs plus importé du tout ici.
  const retour = lireRetourDeLien(url);
  if (retour === 'erreur') {
    return { error: new Error('Ce lien de connexion n’est plus valable.') };
  }
  if (retour === 'jetons') {
    return { error: new Error('Ce lien porte une session qui n’a pas été demandée depuis cet appareil.') };
  }

  const code = codeDuRetourDeLien(url);
  if (!code) {
    return { error: new Error('Code de session manquant dans la redirection.') };
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error };
}

// ── Le code à usage unique ─────────────────────────────────────────────────────────────
//
// **Les deux e-mails du produit ne portent plus de lien depuis le 20/09/2026**, et ce n'est pas
// une simplification : dans l'e-mail de rattachement, le lien ÉTAIT la faille. Mesuré la veille —
// un `GET /auth/v1/verify` confirme l'adresse côté serveur avant toute redirection, donc n'importe
// qui recevant cet e-mail rattachait son adresse au compte d'un inconnu d'un seul clic, et le
// passage en PKCE n'y changeait rien (il protège la session, pas la confirmation).
//
// Ce que le code change, mesuré lui aussi (20/09/2026, stack locale fidèle à la production) :
//   - le code seul confirme le rattachement — `403 otp_expired` s'il est rejoué ;
//   - il n'est lié NI à la session NI au client qui l'a demandé : c'est un porteur, pas un jumeau
//     du vérifieur PKCE. Il ne referme donc pas la porte, il en relève le prix — un clic devient
//     huit chiffres recopiés dans une app qu'il faut trouver. La dette est en `v1-27` §12.12 ;
//   - **les deux flux ne se croisent pas** : un code de rattachement présenté au flux de connexion
//     est refusé, et l'inverse aussi. C'est ce qui rend la bascule de `/connexion/email` sûre.
//
// `emailRedirectTo` a disparu des deux appels, et son absence est le signe du chantier : il ne
// remplissait que `{{ .ConfirmationURL }}`, que plus aucun gabarit n'emprunte. Le garder ferait
// croire qu'un lien voyage encore, et obligerait à tenir une entrée de Redirect URL pour rien.
// Les Redirect URLs ne servent plus qu'à Google (`docs/exploitation/redirect-urls.md`).

/**
 * Demande le code qui rattache une adresse à la session anonyme courante.
 *
 * Toujours `updateUser` et jamais `signUp` ni `signInWithOtp` : c'est ce qui garde le même
 * `user_id`, donc le bilan déjà en base (`v1-04` §1). `is_anonymous` ne bascule qu'à la
 * vérification du code.
 *
 * Une adresse déjà rattachée à un autre compte rend `422 email_exists` — ce n'est pas une erreur
 * à afficher mais le signe que la personne cherchait « retrouver » (`suiteDeLaDemandeDeCode`).
 *
 * **La session d'abord, et ce n'est pas une précaution** (relevé le 25/09/2026, `v1-29` §4). La
 * session anonyme s'ouvre en parallèle du premier affichage ; un « Recevoir un code » touché avant
 * qu'elle existe faisait répondre `updateUser` par `AuthSessionMissingError`, **sans aucune
 * requête** — et comme tout échec non reconnu mène à l'écran du code (la règle de non-divulgation
 * de `suiteDeLaDemandeDeCode`), l'écran annonçait « Un code à 8 chiffres vient de partir » pour un
 * envoi qui n'avait pas eu lieu. Reproduit à coup sûr en retardant la création de session, et
 * deux fois sur cinq sans rien retarder, par `scripts/verifier-code-de-connexion.mjs` sur une stack
 * qui venait de démarrer. `ensureSession()` partage l'appel en vol : si la racine l'a déjà lancé,
 * on attend le même. Et une session qui ne s'ouvre pas se dit comme une **panne** — elle ne parle
 * pas de l'adresse, et réessayer est le bon geste.
 */
export async function demanderLeRattachement(email: string): Promise<AuthResult> {
  try {
    if (!(await ensureSession())) return { error: sessionIntrouvable() };
  } catch (erreur) {
    return { error: sessionIntrouvable(erreur) };
  }
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  return { error };
}

/**
 * L'erreur d'une demande qui n'a pas pu partir faute de session : sans `code` et au statut 0, donc
 * une panne de transport pour `estPanneDeTransport` — le message dit de vérifier sa connexion et de
 * réessayer, jamais qu'un code est parti.
 */
function sessionIntrouvable(cause?: unknown): Error {
  return Object.assign(new Error('La session n’a pas pu s’ouvrir : rien n’a été envoyé.', { cause }), {
    status: 0,
  });
}

/**
 * Demande le code qui rouvre un compte **déjà existant** depuis un appareil neuf.
 *
 * C'est le seul appel du produit qui *connecte* à un compte au lieu d'en rattacher un : tout le
 * reste de ce fichier lie une identité à la session anonyme courante. Né pour la page web de
 * suppression, c'est depuis `v1-10` §2.D **le** chemin de reconnexion — sur un appareil neuf,
 * `ensureSession()` vient de créer une session anonyme vide qui n'est pas le compte de la
 * personne, et ni `linkIdentity` ni `updateUser` ne peuvent l'aider.
 *
 * **`shouldCreateUser: false` est la garantie centrale** : sans lui, saisir n'importe quelle
 * adresse créerait un compte — et une page de suppression qui fabrique des comptes serait
 * exactement le contraire de ce qu'elle affiche. Le retour ne distingue jamais « adresse
 * inconnue » (`422 otp_disabled`) de « code envoyé » : c'est `suiteDeLaDemandeDeCode` qui tient
 * cette règle, et elle est non négociable.
 */
export async function demanderLaConnexion(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  return { error };
}

/**
 * Vérifie un code, et ouvre la session.
 *
 * **Le `type` est ce qui sépare les deux flux, et il n'est pas interchangeable** : `email_change`
 * confirme l'adresse d'un rattachement, `email` rouvre un compte existant. Mesuré le 20/09/2026,
 * dans les deux sens : un code émis pour l'un et présenté à l'autre rend `403 otp_expired`. Le
 * dériver du contexte ici, en un seul endroit, est ce qui empêche un écran de se tromper de flux
 * — et ce qui rend la bascule de `/connexion/email` sûre sans un mot de plus à l'écran.
 *
 * Les chiffres sont normalisés par l'appelant (`chiffresDuCode`) ; ce qui arrive ici est déjà
 * huit chiffres.
 */
export async function verifierLeCode(params: {
  email: string;
  code: string;
  contexte: ContexteDuCode;
}): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({
    email: params.email.trim(),
    token: params.code,
    type: params.contexte === 'rattachement' ? 'email_change' : 'email',
  });
  return { error };
}
