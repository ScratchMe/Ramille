/**
 * Logique pure des écrans de connexion par lien (`/connexion/email`, `/connexion/retrouver`)
 * et de la page web de suppression — cf. `docs/architecture/v1-10-connexion-et-rappels.md`
 * §2.D. Les requêtes vivent dans `src/lib/auth.ts` ; ce module ne tire ni React Native ni
 * `@/lib/supabase`, pour rester testable (même découpage que `src/types/bilan.ts`).
 */

/**
 * Forme minimale d'une erreur Supabase Auth telle qu'elle arrive dans les écrans. Le type
 * `AuthError` du SDK n'est pas importé pour ne pas tirer `@supabase/supabase-js` dans un
 * module testé ; seuls `name`, `code` et `status` sont lus.
 */
export type ErreurAuth = { name?: string; code?: string; status?: number; message?: string } | null;

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
 * La demande n'a pas abouti côté transport — le seul échec qu'un écran d'envoi de lien peut
 * nommer sans rien divulguer (A6-12).
 *
 * **C'est une liste blanche, et le fourre-tout serait une faille.** Les deux écrans qui
 * envoient un lien répondent exprès la même chose que l'adresse ait un compte ou non : une
 * adresse inconnue rend un `422 otp_disabled` (`shouldCreateUser: false` a fait son travail) et
 * mène au **même** écran d'attente qu'un envoi accepté. Tout prédicat qui attraperait large
 * finirait par afficher « réessaie » sur ce 422, et la page deviendrait un moyen de savoir qui
 * utilise Ramille — la non-divulgation est un garde-fou non négociable du produit.
 *
 * D'où trois signatures reconnues, et rien d'autre :
 *   - `AuthRetryableFetchError`, le nom que le SDK pose lui-même sur ce qu'il déclare retryable ;
 *   - un statut 5xx ;
 *   - l'absence de statut HTTP, c'est-à-dire aucune réponse revenue — le SDK écrit `status: 0`
 *     dans ce cas, et un code d'API disqualifie puisqu'il prouve que le serveur a répondu.
 *
 * **Le 5xx est dans la liste, et les deux premières lignes sont en fait le même cas.**
 * `auth-js` ne réserve pas `AuthRetryableFetchError` à l'échec de `fetch` :
 * `node_modules/@supabase/auth-js/dist/main/lib/fetch.js` porte
 * `NETWORK_ERROR_CODES = [500, 501, 502, 503, 504, 520…530]`, et `handleError` lève ce même nom
 * pour chacun d'eux, en jetant au passage le `code` du corps. Un 500 arrive donc ici avec
 * `name: 'AuthRetryableFetchError'` et `status: 500` : il est une panne de transport au sens de
 * ce prédicat, quel que soit l'ordre des tests. Le statut est quand même testé à part, pour que
 * la règle tienne d'elle-même si un jour le SDK cesse de nommer ces réponses ainsi.
 *
 * **L'écart avec la non-divulgation est assumé, et c'est la contre-vérification d'A6-12 qui le
 * tranche** (« panne de transport = erreur retryable du SDK ou `status >= 500` ») : un 500 a
 * beaucoup de causes qui ne disent rien de l'adresse — Auth indisponible, passerelle, Cloudflare
 * — alors que le coût de l'autre choix est certain, puisqu'il tombe sur le seul chemin du
 * produit vers un compte existant : on lit « regarde tes emails » et on attend un message qui
 * ne partira jamais. Ce qui reste fermé, c'est la seule distinction qui porte vraiment
 * l'information : le 422 `otp_disabled` d'une adresse inconnue, qui mène à l'écran d'attente
 * comme un envoi accepté.
 *
 * Une version de ce commentaire a affirmé l'inverse de ce que le code fait (« le 5xx est
 * volontairement hors de la liste »), et le test censé l'épingler fabriquait un 500 **sans
 * `name`**, forme que le SDK ne produit jamais : il ne vérifiait rien. Le cas de test porte
 * maintenant la vraie forme.
 */
export function estPanneDeTransport(error: ErreurAuth): boolean {
  if (!error) return false;
  if (error.name === 'AuthRetryableFetchError') return true;
  // Testé avant le code, comme le nom l'est : sur un 5xx, `auth-js` jette le code du corps,
  // donc un statut serveur qui en porterait un quand même reste une panne de transport.
  if (error.status !== undefined && error.status >= 500) return true;
  if (error.code) return false;
  return error.status === undefined || error.status === 0;
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
 * L'identité Google appartient déjà à un autre compte — le pendant exact de
 * `adresseDejaRattachee`, pour le chemin Google : quelqu'un qui a un compte Ramille, change
 * d'appareil, refait un bilan sans passer par « J'ai déjà un compte », puis tape
 * « Continuer avec Google ». `linkIdentity` ne peut pas rattacher une identité déjà prise.
 *
 * Reconnue au **code**, jamais au message, et le code est vérifié contre la liste officielle
 * de l'API Auth (07/09/2026) : `identity_already_exists` — « The identity to which the API
 * relates is already linked to a user. » Même règle que pour `email_exists` et
 * `over_email_send_rate_limit`, et pour la même raison : un message change sans prévenir, et
 * une détection qui s'appuie dessus cesse de fonctionner en silence.
 */
export function identiteDejaRattachee(error: ErreurAuth): boolean {
  return error?.code === 'identity_already_exists';
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

// ── Retour de la fenêtre d'authentification Google ─────────────────────────────────────

/**
 * Ce que la fenêtre d'authentification a rendu, ramené aux trois cas qui changent quelque
 * chose à l'écran.
 *
 * **L'annulation était comptée comme une réussite** (A6-1) : `linkGoogleIdentity` rendait
 * `{ error: null }` quand la fenêtre se refermait sans rien — « pas une vraie erreur à
 * afficher » — et l'écran, qui ne testait que `error`, émettait `connexion_success`, posait la
 * marque « proposition vue » et déposait la personne sur le plan, sans compte et sans un mot.
 * Trois dégâts : l'entonnoir qui décide de la suite du produit comptait les abandons comme des
 * succès, le seul moment fort de l'argumentaire « garde ce résultat » était consommé pour rien,
 * et la spec demande justement ici un message neutre sans blocage.
 *
 * `opened` et `locked` ne sont **pas** des annulations : personne n'a refermé quoi que ce soit,
 * la fenêtre n'a pas abouti. Les ranger du côté de l'annulation rendrait l'écran muet sur une
 * panne réelle.
 */
export type IssueDuNavigateur = 'jetons' | 'annulation' | 'echec';

export function issueDuNavigateurDAuth(resultat: {
  type: string;
  url?: string | null;
}): IssueDuNavigateur {
  // Une réussite sans URL n'en est pas une : c'est de là que les jetons sortent.
  if (resultat.type === 'success') return resultat.url ? 'jetons' : 'echec';
  return resultat.type === 'cancel' || resultat.type === 'dismiss' ? 'annulation' : 'echec';
}

// ── Retour d'un lien reçu par email ────────────────────────────────────────────────────

/**
 * Ce que porte une URL entrante : des jetons de session, l'échec du lien, ou rien qui regarde
 * l'authentification.
 *
 * **Le cas `erreur` ne produisait rien du tout sur natif** (A1-6, A6-6). Le layout racine ne
 * réagissait qu'aux URL contenant littéralement `access_token=`, alors que Supabase renvoie les
 * échecs de lien dans le même fragment sous une autre forme —
 * `#error=access_denied&error_code=otp_expired&error_description=…`. Le lien était donc filtré
 * avant tout traitement : la personne qui clique un quart d'heure trop tard voyait son
 * téléphone ouvrir l'app, l'écran de lancement, puis l'onboarding, sans un mot — alors que le
 * lien est le **seul** chemin du produit vers un compte existant.
 *
 * Piège à connaître : `QueryParams.getQueryParams` d'expo-auth-session ne lit que `errorCode`
 * (en camel), que Supabase n'envoie jamais. Son champ `errorCode` vaut donc toujours `null`
 * ici, et l'échec retombait sur « Jetons de session manquants », message technique que
 * personne ne voit.
 */
export type RetourDeLien = 'code' | 'jetons' | 'erreur' | 'aucun';

/**
 * **`code` est la forme du produit depuis le passage en PKCE** (20/09/2026), et `jetons` reste
 * lue pour une raison précise : c'est elle qu'un lien **injecté** porte. Un attaquant qui veut
 * poser sa propre session dans l'app de quelqu'un n'a que ses jetons à lui — il ne peut pas
 * fabriquer un `code` échangeable, puisque l'échange exige le vérifieur resté sur l'appareil qui
 * a demandé le lien. Distinguer les deux formes est donc ce qui permet de **refuser** la
 * première par son nom, plutôt que de la laisser échouer plus loin sur un message technique.
 *
 * L'ordre de lecture n'est pas décoratif : l'échec se teste d'abord (un lien peut porter les
 * deux blocs), puis `code`, et `jetons` en dernier — la forme qu'on n'accepte plus.
 */
export function lireRetourDeLien(url: string): RetourDeLien {
  const params = parametresDeLUrl(url);
  // L'échec se teste d'abord : si les deux formes cohabitaient, c'est lui qui compte.
  if (params.error || params.error_code || params.error_description) return 'erreur';
  if (params.code) return 'code';
  if (params.access_token) return 'jetons';
  return 'aucun';
}

/**
 * Le `code` d'une URL de retour PKCE, ou `null`.
 *
 * Séparé de `lireRetourDeLien` parce que ce sont deux questions : « de quelle forme est ce
 * retour ? » et « que vaut-il ? ». L'appelant natif a besoin des deux, le layout web seulement
 * de la première.
 */
export function codeDuRetourDeLien(url: string): string | null {
  return parametresDeLUrl(url).code || null;
}

/**
 * Le vérifieur PKCE manque-t-il — c'est-à-dire : ce lien a-t-il été ouvert ailleurs ?
 *
 * **Reconnu au code et jamais au message**, comme `over_email_send_rate_limit` et `RM001` : le
 * texte d'`auth-js` est anglais, long, et parle de Next.js. Le code, lui, est stable
 * (`pkce_code_verifier_not_found`, classe `AuthPKCECodeVerifierMissingError`).
 *
 * C'est le seul échec **attendu** du nouveau flux, et il a besoin de son propre message : dire
 * « ce lien a expiré » à quelqu'un dont le lien est parfaitement valide mais ouvert dans un
 * autre navigateur le ferait en redemander un, à l'infini, sans jamais comprendre.
 */
export function estVerifieurManquant(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; name?: unknown };
  return e.code === 'pkce_code_verifier_not_found' || e.name === 'AuthPKCECodeVerifierMissingError';
}

/**
 * Les paramètres d'une URL, **requête et fragment confondus** — Supabase range les jetons
 * comme les erreurs dans le fragment, et une URL de retour peut porter les deux blocs.
 *
 * Écrit à la main plutôt qu'avec `URL`/`URLSearchParams` : ce module reste pur et sans
 * dépendance, et son implémentation ne doit rien supposer du polyfill d'URL embarqué par la
 * plateforme.
 */
function parametresDeLUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const bloc of url.split(/[?#]/).slice(1)) {
    for (const paire of bloc.split('&')) {
      if (!paire) continue;
      const separateur = paire.indexOf('=');
      const cle = separateur === -1 ? paire : paire.slice(0, separateur);
      const valeur = separateur === -1 ? '' : paire.slice(separateur + 1);
      if (cle) params[decoderMorceau(cle)] = decoderMorceau(valeur);
    }
  }
  return params;
}

function decoderMorceau(valeur: string): string {
  try {
    return decodeURIComponent(valeur.replace(/\+/g, ' '));
  } catch {
    // Une séquence de pourcentage invalide ne doit pas faire échouer la lecture entière :
    // ce qu'on cherche ici, c'est la présence d'une clé.
    return valeur;
  }
}

/**
 * Pourquoi l'écran de demande de lien s'ouvre de lui-même. Passé en paramètre d'URL par le
 * layout racine, donc relu par ce garde et jamais cru sur parole.
 *
 * Deux valeurs, parce que les deux échecs n'appellent pas le même geste : un lien périmé se
 * remplace, une session qui n'a pas pu s'ouvrir se retente. **Aucun des deux textes ne dit si
 * l'adresse a un compte** — c'est la règle de non-divulgation de cet écran, et elle vaut aussi
 * pour un message d'échec.
 *
 * **Et aucun des deux ne promet un envoi**, pour la même raison : `/connexion/retrouver`
 * n'affirme jamais qu'un lien est parti (« *si* un compte existe avec cette adresse… »).
 * « Demande-en un nouveau, il part tout de suite » disait donc ici l'inverse de ce que l'écran
 * suivant refuse de dire, et le test de non-divulgation ne l'attrapait pas : il ne cherchait
 * que le mot « compte ». Il cherche maintenant la promesse aussi.
 */
export const MOTIFS_RETOUR_LIEN = [
  'lien_expire',
  'session_non_ouverte',
  'lien_ouvert_ailleurs',
] as const;

export type MotifRetourLien = (typeof MOTIFS_RETOUR_LIEN)[number];

export function motifRetourLien(valeur: string | undefined): MotifRetourLien | null {
  return MOTIFS_RETOUR_LIEN.find((motif) => motif === valeur) ?? null;
}

export function messageDuRetourDeLien(motif: MotifRetourLien): string {
  switch (motif) {
    case 'lien_expire':
      return 'Ce lien ne marche plus : il a expiré, ou il a déjà servi. Demande-en un nouveau depuis cet écran.';
    case 'lien_ouvert_ailleurs':
      // **Le seul des trois qui décrit un lien encore VALABLE**, et c'est pourquoi il ne dit
      // pas « demande-en un nouveau » en premier : le geste utile est de rouvrir le lien reçu
      // au bon endroit. Depuis le passage en PKCE, un lien ne vaut que dans le navigateur ou
      // l'app qui l'a demandé — c'est ce qui empêche qu'il serve à quelqu'un d'autre.
      return 'Ce lien doit s’ouvrir là où tu l’as demandé. Rouvre-le depuis cet appareil et ce navigateur, ou redemande-en un ici.';
    case 'session_non_ouverte':
      return 'Ce lien n’a pas réussi à ouvrir ta session. Vérifie ta connexion, puis redemande un lien.';
  }
}

// ── Proposition de compte sur la restitution ───────────────────────────────────────────

/**
 * Faut-il proposer un compte à cette personne, et sous quelle forme ?
 *
 * **Le booléen optimiste d'avant sautait la proposition** (A3-20) : `proposalSeen` démarrait à
 * `true` et n'était corrigé qu'après un aller-retour réseau suivi d'une lecture AsyncStorage.
 * Quelqu'un qui appuie vite sur « Voir ce que je peux faire », ou dont le réseau traîne, ne
 * voyait ni l'interstitiel **ni** la bannière de repli — c'est-à-dire plus aucune occasion de
 * garder son bilan, au seul endroit où le produit la propose. Le défaut sûr est d'attendre,
 * pas de sauter.
 *
 * Quatre états et non trois : la quatrième valeur est la bannière discrète, qui se lisait
 * jusqu'ici sur la même variable que le routage et aurait disparu en réduisant la liste.
 */
export type EtatProposition =
  /** La session n'est pas encore lisible : on ne conclut rien, et on n'ouvre pas le chemin. */
  | 'inconnu'
  /** Jamais proposé : le bouton passe par l'interstitiel plein écran. */
  | 'anonyme-jamais-proposee'
  /** Déjà proposé une fois : bannière discrète, le bouton va droit au plan. */
  | 'anonyme-deja-proposee'
  /** Compte rattaché, ou relecture d'un ancien bilan : rien à proposer. */
  | 'autre';

export function etatDeLaProposition(lu: {
  /** `null` quand la session n'a pas pu être lue. */
  estAnonyme: boolean | null;
  dejaProposee: boolean;
}): EtatProposition {
  if (lu.estAnonyme === null) return 'inconnu';
  if (!lu.estAnonyme) return 'autre';
  return lu.dejaProposee ? 'anonyme-deja-proposee' : 'anonyme-jamais-proposee';
}
