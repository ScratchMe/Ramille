/**
 * Logique pure des écrans de connexion par lien (`/connexion/email`, `/connexion/retrouver`)
 * et de la page web de suppression — cf. `docs/architecture/v1-10-connexion-et-rappels.md`
 * §2.D. Les requêtes vivent dans `src/lib/auth.ts` ; ce module ne tire ni React Native ni
 * `@/lib/supabase`, pour rester testable (même découpage que `src/types/bilan.ts`).
 */

import type { SourceConnexion } from '@/types/analytics';

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

// ── La bannière de la restitution ──────────────────────────────────────────────────────

/**
 * Faut-il dire, sur la restitution, que ce bilan ne vit que sur cet appareil ?
 *
 * **Cette dérivation décidait jusqu'au 20/09/2026 d'un écran qui s'interposait**
 * (`etatDeLaProposition`, quatre états dont deux pour distinguer « jamais proposé » de « déjà
 * proposé »). L'arbitrage du produit a retiré l'interstitiel : « Voir ce que je peux faire » mène
 * au plan, toujours, et ce qui reste est une ligne en tête du contenu. La question posée change
 * donc de nature — elle ne dit plus *par où passe le bouton* mais *si une phrase est vraie* —, et
 * la marque locale « proposition vue » disparaît avec la quatrième valeur : une ligne qu'on ne
 * touche pas ne s'use pas, donc rien n'a besoin de compter les passages.
 *
 * **Trois états, et `inconnu` reste le défaut sûr** (A3-20) : tant que la session n'est pas lue,
 * on ne dit rien. Le booléen optimiste d'avant sautait la proposition chez quelqu'un dont le
 * réseau traînait ; ici il ferait afficher « ce bilan ne vit que sur cet appareil » à quelqu'un
 * qui a un compte — c'est-à-dire une phrase fausse, ce que ce produit refuse partout ailleurs.
 *
 * `a_confirmer` compte comme `autre`, et ce n'est pas un détail : la personne a déjà tapé son
 * adresse, « Toi » porte la suite du geste, et lui reproposer le départ du chemin qu'elle a
 * commencé se lirait comme un échec.
 */
export type EtatDeLaBanniere =
  /** La session n'est pas encore lisible : on ne conclut rien et on n'affiche rien. */
  | 'inconnu'
  /** Session anonyme sans adresse en attente : la ligne est vraie, elle se rend. */
  | 'anonyme'
  /** Compte rattaché, adresse à confirmer : rien à dire ici. */
  | 'autre';

export function etatDeLaBanniere(lu: {
  /** `null` quand la session n'a pas pu être lue. */
  estAnonyme: boolean | null;
  /** Vrai entre `updateUser({ email })` et la saisie du code — le geste est commencé. */
  adresseAConfirmer: boolean;
}): EtatDeLaBanniere {
  if (lu.estAnonyme === null) return 'inconnu';
  if (!lu.estAnonyme || lu.adresseAConfirmer) return 'autre';
  return 'anonyme';
}

// ── Le code à usage unique ─────────────────────────────────────────────────────────────

/**
 * **Huit chiffres, et ce nombre est une valeur de sécurité — pas une préférence d'affichage.**
 *
 * Il est lu sur la configuration du projet distant (`mailer_otp_length = 8`, relevé le
 * 20/09/2026), et la session de design avait conclu « six » en lisant la configuration locale,
 * qui portait encore le défaut de GoTrue. Le calcul qui départage : `rate_limit_verify` plafonne
 * à trente vérifications par tranche de cinq minutes et par adresse IP, soit trois cent soixante
 * essais dans la fenêtre de validité d'une heure — une chance sur deux mille huit cents à six
 * chiffres, une sur deux cent soixante-dix-huit mille à huit. Six suffirait contre une adresse
 * IP et pas contre un millier, et le chemin de reconnexion (`shouldCreateUser: false`) fait de
 * cette différence une prise de compte.
 *
 * Toucher à cette constante impose donc de toucher `mailer_otp_length` des deux côtés —
 * `supabase/config.toml` et le projet distant — et rien ici ne peut le vérifier.
 */
export const LONGUEUR_DU_CODE = 8;

/**
 * Les deux flux qui demandent un code, et ils ne se croisent pas : un code de rattachement
 * présenté au flux de connexion est refusé, et l'inverse aussi (mesuré le 20/09/2026, `403
 * otp_expired` dans les deux sens). C'est ce qui rend la bascule de `/connexion/email` sûre.
 */
export type ContexteDuCode = 'rattachement' | 'connexion';

/**
 * Ce que la frappe laisse passer : les chiffres, et rien d'autre.
 *
 * **Une espace collée avec le code est retirée, pas refusée** — les messageries en insèrent, et
 * refuser un collé qui contient le bon code ferait chercher une faute qui n'existe pas. La
 * troncature à la longueur attendue est ici et non dans le composant, pour que le collé d'un
 * code suivi de texte garde les chiffres utiles.
 */
export function chiffresDuCode(saisie: string): string {
  return saisie.replace(/\D/g, '').slice(0, LONGUEUR_DU_CODE);
}

export function codeSemblePlausible(saisie: string): boolean {
  return chiffresDuCode(saisie).length === LONGUEUR_DU_CODE;
}

/**
 * Ce que la demande de code a donné, ramené aux trois suites qui changent l'écran.
 *
 * `bascule` n'existe qu'en contexte `rattachement` : c'est le `422 email_exists` d'`updateUser`,
 * l'adresse qui appartient déjà à un compte. **En contexte `connexion` il ne peut pas arriver** —
 * `signInWithOtp` ne rattache rien — et le lui faire produire une bascule serait une boucle.
 *
 * **Tout le reste mène à l'écran de code, `otp_disabled` compris.** C'est la règle de
 * non-divulgation, et elle est la raison d'être de cette dérivation : une adresse sans compte
 * rend un `422 otp_disabled` qui doit mener au **même** écran qu'un envoi accepté, sinon l'écran
 * dit qui utilise Ramille. Seuls deux échecs se disent, parce qu'aucun des deux ne parle de
 * l'adresse : la limite d'envoi et la panne de transport.
 */
export type SuiteDeLaDemande = 'code' | 'bascule' | 'message';

export function suiteDeLaDemandeDeCode(
  contexte: ContexteDuCode,
  error: ErreurAuth
): SuiteDeLaDemande {
  if (!error) return 'code';
  if (contexte === 'rattachement' && adresseDejaRattachee(error)) return 'bascule';
  if (estLimiteDEnvoi(error) || estPanneDeTransport(error)) return 'message';
  return 'code';
}

/**
 * Le message d'un envoi qui ne s'est pas fait — deux cas, et jamais un mot de l'adresse.
 *
 * **Le troisième renvoi (`echec`) n'est atteignable que par un appelant qui n'a pas trié son
 * erreur**, et ce commentaire affirmait l'inverse : il disait que la branche « n'existe que pour
 * l'écran de suppression, qui connaît déjà le compte et n'a donc rien à taire ». C'était faux
 * deux fois — l'écran de suppression trie désormais par `suiteDeLaDemandeDeCode` comme les autres,
 * et le seul appelant qui passait une erreur brute était le **renvoi** de l'écran de code, où ce
 * message-ci révélait qu'une adresse n'a pas de compte (relevé en revue le 21/09/2026). La règle
 * est donc simple et sans exception : **cette fonction ne se lit qu'après un tri**, `suiteDeLaDemande…`
 * ou `suiteDuRenvoi`, et jamais sur l'erreur nue.
 */
export function messageDeLaDemande(error: ErreurAuth): string {
  if (estLimiteDEnvoi(error)) {
    return 'Trop de demandes coup sur coup. Réessaie dans quelques minutes.';
  }
  if (estPanneDeTransport(error)) {
    return 'Ta demande n’a pas abouti. Vérifie ta connexion et réessaie.';
  }
  return 'L’envoi n’a pas abouti. Vérifie l’adresse et réessaie.';
}

/**
 * Ce que la vérification d'un code a donné.
 *
 * **`refuse` recouvre le code faux ET le code expiré, et c'est l'API qui l'impose** : les deux
 * rendent `403 otp_expired` (mesuré le 20/09/2026, « Token has expired or is invalid »). Les
 * distinguer serait donc inventer une information qu'on n'a pas — d'où un seul message, qui
 * nomme les deux causes et donne le même geste.
 *
 * `trop_dessais` est le plafond de vérification, reconnu au code comme la limite d'envoi l'est,
 * jamais au message. C'est le seul cas où réessayer tout de suite ne sert à rien.
 */
export type IssueDeLaVerification = 'ouverte' | 'refuse' | 'trop_dessais' | 'transport' | 'echec';

export function issueDeLaVerification(error: ErreurAuth): IssueDeLaVerification {
  if (!error) return 'ouverte';
  // **L'ordre de ces trois tests n'est PAS porteur, et le commentaire d'avant disait le
  // contraire** — relevé le 20/09/2026 en mutant l'ordre : aucune assertion n'est tombée. La
  // raison est dans `auth-js`, qui ne nomme `AuthRetryableFetchError` que sur les 5xx : un 403
  // n'est donc jamais une panne de transport, et les deux branches ne peuvent pas se disputer
  // une même erreur. Ce qui EST porteur, c'est l'existence de la branche de transport — la
  // retirer fait lire une panne de serveur comme un échec anonyme, et c'est la mutation qui
  // tombe. On garde le transport en tête par symétrie avec `estPanneDeTransport`, pas par
  // nécessité, et on ne prétend pas l'inverse.
  if (estPanneDeTransport(error)) return 'transport';
  if (error.code === 'over_request_rate_limit' || error.status === 429) return 'trop_dessais';
  if (error.code === 'otp_expired' || error.status === 403) return 'refuse';
  return 'echec';
}

export function messageDeLaVerification(issue: IssueDeLaVerification): string | null {
  switch (issue) {
    case 'ouverte':
      return null;
    case 'refuse':
      return 'Ce code ne marche pas : il a expiré, ou ce n’est pas le plus récent. Demande-en un nouveau.';
    case 'trop_dessais':
      return 'Trop d’essais coup sur coup. Réessaie dans quelques minutes.';
    case 'transport':
      return 'Ta demande n’a pas abouti. Vérifie ta connexion et réessaie.';
    case 'echec':
      return 'La vérification n’a pas abouti. Réessaie dans un instant.';
  }
}

/**
 * Ce qui s'affiche quand **le code a été accepté et que la suite n'a pas abouti** — l'écran
 * d'après, la relecture du compte, le balayage des marques locales.
 *
 * **Ce cas ne doit surtout pas emprunter un message de `messageDeLaVerification`**, et c'est le
 * correctif : le rejet de `onOuverte` retombait sur `'echec'`, donc « La vérification n'a pas
 * abouti », alors que la vérification a parfaitement abouti — le code est **consommé**, et le
 * réessayer ne peut plus rendre qu'un refus. La phrase disait donc le contraire de ce qui venait
 * de se passer, et invitait au seul geste qui ne peut plus marcher.
 *
 * **Aucun des trois hôtes ne produit ce rejet aujourd'hui** (`/connexion/email` navigue et rien de
 * plus, `/connexion/retrouver` appelle un balayage qui avale ses propres erreurs, et
 * `/compte/suppression` attrape la sienne), et c'est justement pourquoi la phrase valait d'être
 * corrigée : une phrase fausse que rien n'exerce attend le quatrième hôte qui la rendra atteignable
 * — le raisonnement du repli de `{jours}` en C2.3. La branche, elle, est porteuse : le verrou reste
 * pris pendant `onOuverte`, donc sans elle un rejet laisserait l'écran figé sur « Vérification… ».
 *
 * Elle ne propose pas de retaper le code : l'appelant vide le champ, et « Renvoyer un code » reste
 * la sortie — un code neuf rejoue la suite entière.
 */
export const MESSAGE_DE_LA_SUITE_MANQUEE =
  'Ta session est ouverte, mais l’écran suivant n’a pas suivi. Demande un nouveau code, ou reviens dans un instant.';

/**
 * **Ce que l'écran de saisie a le droit d'AFFIRMER, et c'est une notion distincte du flux.**
 *
 * `ContexteDuCode` décide le `type` envoyé à l'API — `email_change` ou `email` — et il **suit la
 * branche** : une adresse libre est rattachée, une adresse prise rouvre son compte. La voix, elle,
 * est une propriété de l'**écran hôte** et ne bouge pas d'une branche à l'autre.
 *
 * **Les confondre rouvrirait par le texte l'oracle qu'on ferme par le mécanisme** (arbitrage du
 * 21/09/2026, `v1-28` §7.1). C'est le piège central de ce chantier : `/connexion/email` envoie
 * désormais un code dans les deux cas, mais si l'écran disait « un code est parti à camille@… »
 * quand l'adresse est libre et « **si** un compte existe… » quand elle est prise, n'importe qui
 * lirait la réponse dans la phrase. Le mécanisme serait juste et la fuite intacte.
 *
 * Deux voix, et leur nom dit ce qu'elles peuvent affirmer :
 *
 * - **`parti`** — on sait qu'un code est parti à cette adresse. C'est le cas de `/connexion/email`,
 *   **dans ses deux branches** : l'adresse libre reçoit un code de rattachement, l'adresse prise un
 *   code de connexion. Rien dans la phrase ne dit laquelle.
 * - **`peut_etre`** — on ne peut pas l'affirmer sans dire si l'adresse a un compte, d'où le « si ».
 *   C'est `/connexion/retrouver` et `/compte/suppression`, où `shouldCreateUser: false` fait qu'une
 *   adresse inconnue ne reçoit rien.
 *
 * Recopier la phrase de `parti` dans `peut_etre` serait la fuite que « retrouver » existe pour
 * éviter ; faire dépendre la voix du contexte serait la même fuite par l'autre bout. Un test garde
 * les deux sens.
 */
export type VoixDeLaSaisie = 'parti' | 'peut_etre';

export function corpsDeLaSaisie(voix: VoixDeLaSaisie, adresse: string, app: string): string {
  const chiffres = `un code à ${LONGUEUR_DU_CODE} chiffres`;
  return voix === 'parti'
    ? `Un code à ${LONGUEUR_DU_CODE} chiffres vient de partir à ${adresse}. Tape-le ici — il vaut une heure.`
    : `Si un compte ${app} existe avec cette adresse, ${chiffres} vient d’y partir. Tape-le ici — il vaut une heure.`;
}

/**
 * **La phrase conditionnelle qui remplace l'écran de collision**, et qui est tout le prix de
 * l'arbitrage.
 *
 * Jusqu'au 21/09/2026, une adresse déjà prise menait à un écran qui le **disait** (« Cette adresse
 * a déjà un compte ») et offrait deux sorties. C'était honnête et c'était un oracle : l'écran
 * répondait « oui » ou « non » sur n'importe quelle adresse, sans plafond — vingt sondes d'affilée
 * depuis une seule session anonyme, mesuré le 21/09/2026.
 *
 * Le canvas proposait de tout taire, donc de faire basculer de compte quelqu'un qui s'est trompé
 * d'adresse, sans un mot et sans retour. Cette phrase est la troisième voie : elle est
 * **conditionnelle**, donc vraie dans les deux branches — sur une adresse libre l'antécédent est
 * faux, sur une adresse prise elle décrit exactement ce qui va se passer —, donc elle se montre
 * dans les deux et ne divulgue rien. Et elle arrive **avant** que le code soit tapé, ce qui laisse
 * la sortie : ne pas le taper.
 *
 * Elle ne se rend qu'en voix `parti` : en `peut_etre` un code n'est peut-être jamais parti, et il
 * n'y a pas de bilan de cet appareil à laisser derrière soi.
 */
export function consequenceDeLaSaisie(voix: VoixDeLaSaisie, app: string): string | null {
  if (voix !== 'parti') return null;
  return `S’il existait déjà un compte ${app} à cette adresse, ce code t’y ramène — et le bilan de cet appareil ne l’y rejoindra pas.`;
}

/**
 * Le corps de `/connexion`, **dérivé de la provenance** — et ce n'est pas du style.
 *
 * L'écran s'atteint désormais depuis trois endroits qui ne posent pas la même question. Depuis la
 * restitution ou « Toi », la question est « et si je change d'appareil ? ». Depuis la feuille des
 * rappels, elle est « comment tu me fais signe ? », et le compte y est littéralement ce qui rend le
 * rappel par e-mail possible : répondre par le texte de l'appareil laisserait sans réponse la seule
 * personne qui vient de poser une question.
 *
 * Le repli va sur la phrase de l'appareil, qui est vraie partout.
 */
export function introDeLaConnexion(source: SourceConnexion): string {
  if (source === 'rappels') {
    return 'Le rappel par email a besoin d’une adresse. Avec un compte rattaché, il t’arrive — et ton bilan te suit d’un appareil à l’autre, tes points et ton plan aussi.';
  }
  return 'Il est enregistré ici, sur cet appareil. Avec un compte rattaché, tu le retrouves sur un autre téléphone ou un ordinateur — tes points et ton plan aussi —, et le mot de chaque point peut t’arriver par email.';
}

/**
 * Ce qu'un **renvoi** de code a donné, et c'est une dérivation à part parce que la
 * non-divulgation y était trouée.
 *
 * `surRenvoi` passait l'erreur brute à `messageDeLaDemande` : un `422 otp_disabled` — une adresse
 * **sans compte** — n'étant ni une limite d'envoi ni une panne de transport, il retombait sur
 * « L'envoi n'a pas abouti. Vérifie l'adresse et réessaie. », là où une adresse connue lisait
 * « Si un compte existe avec cette adresse, un nouveau code vient d'y partir. » **Deux réponses
 * différentes, donc un oracle** : n'importe qui pouvait savoir si une adresse utilise Ramille, sur
 * la page de suppression que Google Play exige d'ailleurs de garder publique. Relevé en revue le
 * 21/09/2026, et le premier envoi ne l'avait pas parce qu'il passe, lui, par
 * `suiteDeLaDemandeDeCode`.
 *
 * Trois cas, dans cet ordre :
 *   - la **limite d'envoi** et la **panne de transport** se disent, comme partout : ni l'une ni
 *     l'autre ne parle de l'adresse ;
 *   - l'**adresse déjà prise** ne peut arriver qu'en rattachement (`signInWithOtp` ne rattache
 *     rien), et depuis l'arbitrage du 21/09/2026 elle ne peut plus arriver qu'en **course** : le
 *     premier envoi détourne une adresse prise vers le flux de connexion, donc atteindre ce
 *     renvoi-ci demande qu'elle ait été libre au premier envoi et prise au second. Qui l'a prise
 *     dans l'intervalle le sait déjà, et le message ne nomme rien (`messageDeLaDemande` rend
 *     « L'envoi n'a pas abouti », jamais l'état de l'adresse). Ce que la branche achète est
 *     l'absence de cul-de-sac : annoncer un code parti quand `updateUser` vient de refuser ferait
 *     attendre un code qui ne viendra jamais — le défaut même que la troisième voie a écarté.
 *     **Ce commentaire a dit jusqu'au 21/09/2026 « il n'y a rien à taire, le produit le dit déjà au
 *     premier envoi »**, et c'était devenu faux le jour même : le produit ne le dit plus nulle
 *     part, et laisser cette phrase aurait invité le prochain passage à faire nommer l'adresse par
 *     le message, c'est-à-dire à rouvrir l'oracle par le renvoi ;
 *   - **tout le reste se lit comme un renvoi réussi**, `otp_disabled` en tête. C'est la règle de
 *     non-divulgation, et elle ne connaît pas d'exception selon qu'on en est au premier envoi ou
 *     au troisième.
 */
export type SuiteDuRenvoi = 'renvoye' | 'message';

export function suiteDuRenvoi(contexte: ContexteDuCode, error: ErreurAuth): SuiteDuRenvoi {
  if (!error) return 'renvoye';
  if (estLimiteDEnvoi(error) || estPanneDeTransport(error)) return 'message';
  if (contexte === 'rattachement' && adresseDejaRattachee(error)) return 'message';
  return 'renvoye';
}

/**
 * **Le renvoi suit la VOIX, pas le contexte** — sinon l'oracle se rouvre au second envoi, ce qui
 * serait le même défaut que celui relevé en revue le 21/09/2026 par une autre porte. Depuis
 * `/connexion/email`, les deux branches renvoient un code pour de vrai : la phrase peut l'affirmer.
 */
export function messageDuRenvoi(voix: VoixDeLaSaisie): string {
  return voix === 'parti'
    ? 'Un nouveau code vient de partir.'
    : 'Si un compte existe avec cette adresse, un nouveau code vient d’y partir.';
}
