import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { jetonDuCaptcha } from '@/lib/captcha';
import type { Database } from '@/lib/database.types';
import { noterUnCompteRattache, oublierLeCompteRattache, porteUnCompteRattache } from '@/lib/marque-de-compte';
import { concilierLesMarques } from '@/lib/marques-locales';
import { decrireProbleme, lireConfigurationSupabase } from '@/types/configuration';
import { fetchAvecSecondeChance } from '@/types/postgrest';
import {
  doitOuvrirUneSessionAnonyme,
  etatDeSession,
  type EtatDeSession,
} from '@/types/session';
import { uneSeuleFois } from '@/types/une-seule-fois';

/**
 * **Ces deux `const` ne sont pas du confort, et il ne faut pas les replier dans l'appel
 * ci-dessous.** `babel-preset-expo` remplace `process.env.EXPO_PUBLIC_X` par sa valeur
 * littérale — sauf quand l'accès est écrit directement comme valeur d'une propriété d'objet
 * dont la clé porte ce même nom, où il rend `void 0`. Vérifié en A/B le 07/09/2026, `.env`
 * inchangé entre les deux exports :
 *
 *   { EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL }
 *     → bundle : EXPO_PUBLIC_SUPABASE_URL:void 0
 *   const urlBrute = process.env.EXPO_PUBLIC_SUPABASE_URL; { EXPO_PUBLIC_SUPABASE_URL: urlBrute }
 *     → bundle : EXPO_PUBLIC_SUPABASE_URL:"https://…"
 *
 * Le typecheck passe, les tests passent, l'export réussit — et l'app affiche
 * « Configuration manquante » à tout le monde, `.env` parfaitement rempli compris.
 * `scripts/verifier-configuration-export.mjs` garde ce point en CI.
 *
 * Et l'accès reste écrit en toutes lettres : une lecture dynamique (`env[nom]`) n'est jamais
 * remplacée du tout.
 */
const urlBrute = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cleBrute = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const configurationSupabase = lireConfigurationSupabase({
  EXPO_PUBLIC_SUPABASE_URL: urlBrute,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: cleBrute,
});

/**
 * **Ce module ne lève plus au chargement, il lève à la première utilisation.** Le contrat ne
 * change pas d'un pouce — aucun écran ne fonctionne sans configuration, aucune requête ne
 * part vers un client à moitié construit — mais l'exception ne se déclenche plus avant le
 * premier rendu. C'est ce qui permet au layout racine d'afficher `ConfigurationManquante` au
 * lieu de laisser l'app s'ouvrir et se refermer sans un mot (issue #65).
 *
 * Le mandataire lève sur **n'importe quel** accès, y compris une simple lecture de
 * propriété : il n'existe aucun usage inoffensif d'un client qu'on ne peut pas construire.
 */
function clientAbsent(): SupabaseClient<Database> {
  const cause =
    configurationSupabase.complete === false
      ? configurationSupabase.problemes.map(decrireProbleme).join(' ')
      : '';
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(`Configuration Supabase incomplète — ${cause} (voir .env.example).`);
    },
  });
}

export const supabase = configurationSupabase.complete
  ? createClient<Database>(configurationSupabase.url, configurationSupabase.anonKey, {
      auth: {
        // AsyncStorage n'a pas de sens sur web (session gérée par le navigateur) ; le SDK
        // Supabase gère déjà le fallback web via localStorage quand storage est omis.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        // **PKCE, et le défaut d'`auth-js` est `implicit`** (20/09/2026, revue de sécurité).
        //
        // En implicite, tout lien de connexion livre `access_token` **et** `refresh_token` en
        // clair dans le fragment de l'adresse d'arrivée : la liste des Redirect URLs Supabase
        // est alors le **seul** contrôle qui existe sur un compte, et la moindre entrée trop
        // large — un domaine de preview, un joker sur un espace de noms partagé, une entrée
        // ajoutée un soir pour débloquer un test — devient une prise de contrôle. C'est ce
        // qu'on a trouvé en production le 20/09 : quatre entrées `*.vercel.app` dont le motif
        // s'obtenait en créant un projet du bon nom.
        //
        // En PKCE, le lien ne porte plus qu'un `code`, et ce code ne vaut **rien** sans le
        // vérifieur resté dans le stockage du client qui a demandé le lien. La même erreur de
        // liste ne remet plus de session à personne. Et `auth-js` refuse explicitement un
        // fragment implicite quand le client est en PKCE, ce qui ferme du même geste
        // l'injection de session par lien profond (`ramille://x#access_token=…`) : le scheme
        // est BROWSABLE, donc n'importe quelle page web du téléphone pouvait l'ouvrir.
        //
        // **Ce que ça coûte, et c'est un arbitrage produit pris le 20/09** : le lien ne
        // s'ouvre plus que sur l'appareil qui l'a demandé. L'écran le disait déjà
        // (« Ouvre-le depuis cet appareil »), c'est maintenant vrai. Le cas où il ne l'est pas
        // ne doit jamais être muet — `_isPKCECallback` d'`auth-js` rend **faux** quand le
        // vérifieur manque, donc rien ne lève : voir la branche `code` de
        // `src/app/_layout.tsx`, qui est ce qui rattrape ce silence.
        flowType: 'pkce',
      },
      // **Un jeton refusé parce qu'il est trop neuf n'est pas un refus, c'est une attente** —
      // incident du 13/09/2026, raisonnement et règle en tête de `src/types/postgrest.ts`. Le
      // refus (`401 PGRST303`) frappe la **première requête d'une session**, quelle qu'elle soit :
      // la racine de l'app, l'événement `app_open` juste à côté, un onglet au retour — d'où le
      // transport et non un écran, qui ne l'aurait corrigé que pour lui-même.
      //
      // `fetch` est rappelé dans une lambda plutôt que passé par référence : en React Native il
      // peut être installé par un polyfill après le chargement de ce module, et une référence
      // capturée ici figerait celui d'avant.
      global: { fetch: fetchAvecSecondeChance((entree, options) => fetch(entree, options)) },
      db: {
        // **Pas de rejeu des lectures : un échec réseau se dit tout de suite** (01/10/2026, `v1-33`, R-5
        // et P-3). `@supabase/postgrest-js` rejoue **par défaut** tout GET dont le `fetch` rejette, trois
        // fois, après 1 s, 2 s puis 4 s — et de même ses réponses 503 et 520. Relevé sur le client réel :
        // quatre appels à 0,1, 1,1, 3,1 et 7,1 s, et l’erreur n’arrive qu’à la septième seconde. Hors
        // ligne, le plan disait donc « Chargement… » sept secondes avant son écran d'erreur — sur le chemin
        // nominal du rappel ouvert dans le métro —, et chaque « Réessayer » en recoûtait sept. Rien dans le
        // dépôt ne réglait ni ne documentait ce rejeu.
        //
        // La règle du produit est l'inverse : « Chargement… » après 300 ms, l'échec tout de suite
        // (`FRONT.md` §1.2, `v1-30` §5.8). Et les écrans portent déjà leur reprise : l'écran d'erreur son
        // « Réessayer », la relecture en échec sa ligne et son « Réessayer ». Un rejeu invisible par-dessus
        // ne rattrapait que le raté d'une seconde, au prix de sept secondes muettes quand la panne dure.
        //
        // **Ce que ça coûte, et c'est su** : un raté réseau d'une seconde, que le rejeu absorbait, allume
        // désormais la ligne de relecture — qui porte son « Réessayer ». **Sauf deux lectures qui n'en
        // ont pas**, à l'entrée d'un re-bilan (contre-lecture de la PR #314) : le préremplissage et
        // l'engagement en cours. Un raté là donnait un questionnaire vide, sans bandeau ni feuille « Ton
        // plan va être recalculé » ; depuis le 02/10/2026, l'écran les reprend lui-même, en arrière-plan,
        // puisque rien n'attend après elles (`relireEnArrierePlan`, `v1-33` §9). Et les 503 et 520 ne sont plus
        // rejoués non plus (un 503 est le cache de schéma de PostgREST pas encore chargé, un 520 un raté de
        // Cloudflare : deux états passagers qui se voient maintenant comme un échec). Ne touche ni
        // `fetchAvecSecondeChance`, qui ne vise que le `401 PGRST303` d'un jeton trop neuf et est une
        // couche au-dessous, ni les écritures, que PostgREST ne rejouait déjà jamais (seuls GET, HEAD et
        // OPTIONS sont concernés), ni `auth-js`, qui a son propre régime (`AuthRetryableFetchError`).
        // `src/lib/supabase.test.ts` garde le réglage **et** sa transmission par `supabase-js`.
        retry: false,
      },
    })
  : clientAbsent();

/**
 * **Sur natif, le renouvellement de la session s'arrête en arrière-plan et repart au premier plan**
 * (02/10/2026, `v1-27` §12.4) — le motif que Supabase documente pour React Native.
 *
 * Le relevé du 20/09/2026 disait que ce n'était pas fait et que `getSession()` rafraîchissait à la
 * demande ; la seconde moitié est vraie, la première ne disait pas tout. **Lue dans la version installée
 * d'`auth-js` (2.116, `_handleVisibilityChange`)** : hors navigateur, le minuteur du renouvellement tourne
 * **toujours** — démarré à l'initialisation, un passage toutes les trente secondes —, y compris quand
 * l'app est en arrière-plan et que le système la laisse tourner. Ce qu'on y gagne :
 *
 *   - plus de renouvellement tenté pendant que l'app dort, où le réseau manque souvent et où un échec
 *     de transport n'a personne à qui se dire ;
 *   - au retour, `startAutoRefresh` relance **aussitôt** un passage, donc un jeton expiré pendant la
 *     nuit se renouvelle avant que les écrans ne relisent (`useRafraichirAuRetour`), au lieu d'attendre
 *     le passage suivant du minuteur ou la première requête.
 *
 * Sur web, rien : `auth-js` suit déjà la visibilité de l'onglet. Et iOS traverse `inactive` à l'aller
 * comme au retour (`suivreLEtatDeLApp`) : arrêter dessus est sans conséquence, `active` relance.
 */
if (configurationSupabase.complete && Platform.OS !== 'web') {
  AppState.addEventListener('change', (etat) => {
    if (etat === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

// Chaque visiteur a besoin d'un `user_id` réel dès l'entrée dans l'app (RLS owner-scoped
// sur tout ce qui touche au bilan) — cf. docs/architecture/v1-04-authentification.md.
// Idempotent : ne crée une session anonyme que si aucune session (anonyme ou non)
// n'existe déjà. Appelée au démarrage (_layout.tsx, en fire-and-forget) et re-vérifiée
// avant toute écriture bilan pour couvrir un démarrage à froid trop rapide ou un
// deep-link direct vers /bilan.
//
// **L'enveloppe `uneSeuleFois` n'est pas du confort, elle empêche un second compte anonyme.**
// Le corps ci-dessous lit puis écrit : deux appels lancés dans le même rendu — celui du layout
// racine et celui de la racine de l'app — lisent tous les deux « pas de session » avant que
// l'un des deux n'ait écrit, et créent chacun leur compte. Six des treize comptes de la base
// étaient dans ce cas le 10/09/2026 (v1-13 C1.2). Le contrat ne change pas : seules les
// promesses en vol sont partagées, donc un appel tardif relit bien l'état courant — voir
// `src/types/une-seule-fois.ts`, qui porte le détail et les tests.
// **« Pas de session » recouvre trois situations, et une seule appelle une création** (C2.11). La
// dérivation vit dans `src/types/session.ts`, avec ses tests et la raison de chaque branche ; ici on
// ne fait que l'appliquer. Le cas qui coûtait le plus cher : un jeton **refusé** faisait créer une
// session anonyme **vide** à quelqu'un qui a un compte, et l'app lui répondait « Ton bilan n'est pas
// encore fait » alors que son bilan, son plan et ses points étaient intacts côté serveur.
//
// Le retour est donc une session **ou `null`**, et jamais une exception pour ces deux cas : un refus
// et une panne ne sont pas des pannes de programme, ce sont des états que l'app doit savoir
// afficher. `etatDeLaSession` dit lequel, pour les écrans qui ont besoin de le distinguer.
let dernierEtatDeSession: EtatDeSession = 'absente';

/**
 * **Un jeton refusé ne se lit plus dans `getSession()` : il se déduit d'une marque** (02/10/2026,
 * `v1-27` §12.27). C2.11 lisait le refus dans l'erreur de `getSession()`, et la version installée
 * d'`auth-js` (2.116) ne la rend pas là au démarrage : sur un jeton d'accès déjà expiré dont le
 * rafraîchissement est refusé, son initialisation retire elle-même la session (`_callRefreshToken`,
 * puis `_removeSession`) avant la première lecture de l'app. `getSession()` voyait ensuite « pas de
 * session, pas d'erreur », et `ensureSession()` ouvrait une session anonyme vide à quelqu'un qui a un
 * compte — le défaut même que C2.11 devait fermer.
 *
 * **Le refus, c'est : plus de session, alors que l'appareil porte un compte rattaché**
 * (`src/lib/marque-de-compte.ts`). La marque se pose **à chaque** session non anonyme vue, et les
 * départs voulus l'effacent — une reconnexion aussi, qui balaie les marques de l'ancien propriétaire
 * (`/connexion/retrouver`, `/connexion/email`) : c'est la session suivante, celle que la racine relit
 * aussitôt, qui la repose. La première version de cette correction déduisait le refus de tout
 * `SIGNED_OUT` non déclaré, et elle se trompait deux fois (contre-lecture de la PR #315) : une session
 * **anonyme** purgée au bout de 90 jours est refusée de la même façon, et se voyait dire « Reconnecte-toi
 * pour retrouver ton bilan » ; et le drapeau, en mémoire, ne survivait ni à un rechargement ni à une app
 * tuée par le système — la session anonyme vide revenait au lancement suivant.
 *
 * `SIGNED_OUT` reste écouté, pour **montrer** un refus en cours de route — le rafraîchissement
 * automatique qui échoue pendant qu'on se sert de l'app. Une déconnexion voulue émet le même
 * événement, et se déclare par `pendantUnDepartVolontaire` : sans quoi l'écran de reconnexion
 * s'ouvrirait le temps que le départ efface la marque.
 *
 * Le refus **tient** tant que la marque est là et qu'aucune session ne revient : une connexion
 * (`SIGNED_IN`, celle de `/connexion/retrouver`) le lève, « Commencer un bilan sur cet appareil »
 * aussi (`repartirSurCetAppareil`, qui efface la marque). Entre-temps, aucun `ensureSession()` n'ouvre
 * de session anonyme.
 */
let departsVolontaires = 0;
const ecouteursDuRefus = new Set<() => void>();

function changerDEtat(etat: EtatDeSession) {
  const changeLeRefus = (etat === 'refusee') !== (dernierEtatDeSession === 'refusee');
  dernierEtatDeSession = etat;
  if (changeLeRefus) for (const ecouteur of ecouteursDuRefus) ecouteur();
}

/**
 * **À chaque session non anonyme vue, sans cache** (contre-lecture de la PR #315) : une première version
 * ne l'écrivait qu'une fois par session, et une reconnexion par code — qui pose la marque au
 * `SIGNED_IN`, puis balaie toutes les marques de l'ancien propriétaire — la laissait effacée jusqu'au
 * lancement suivant, donc le défaut d'origine rouvert. Une écriture par rafraîchissement de jeton, une
 * fois l'heure, ne coûte rien.
 */
function noterLaSession(session: Session | null) {
  if (!session || session.user.is_anonymous) return;
  void noterUnCompteRattache();
}

/**
 * **La session que rend `ensureSession()` fait d'abord le ménage des marques d'un autre compte**, puis
 * pose la sienne ([#319](https://github.com/ScratchMe/Ramille/issues/319), 02/10/2026). Le cas qui
 * l'impose : une session anonyme refusée — purgée au bout de 90 jours, révoquée — laissait ses marques
 * (bilan, premier parcours, brouillon) à la session anonyme neuve, qui les lisait comme les siennes.
 * L'ordre compte : balayée après avoir été posée, la marque du compte rattaché serait perdue jusqu'à la
 * session suivante.
 *
 * **Pas dans l'écoute d'`auth-js`, et c'est voulu.** Les sessions qui changent de compte en cours de
 * route sont des reconnexions par code, qui concilient elles-mêmes (`apresUneReconnexion`,
 * `src/lib/compte.ts`) et balaient quand le propriétaire est inconnu ; une conciliation lancée à leur
 * `SIGNED_IN`, qui note sans balayer dans ce cas, passerait avant elles et le leur ferait manquer. Les
 * autres arrivées — un lancement, une session anonyme créée — passent toutes par `ensureSession()`.
 */
function accueillirLaSession(session: Session): Promise<void> {
  return concilierLesMarques(session.user.id, 'noter').then(() => noterLaSession(session));
}

if (configurationSupabase.complete) {
  // Synchrone, et ne rappelle pas le client : `auth-js` déconseille un rappel asynchrone ici.
  supabase.auth.onAuthStateChange((evenement, session) => {
    if (evenement === 'SIGNED_OUT') {
      if (departsVolontaires > 0) return;
      void porteUnCompteRattache().then((porte) => {
        if (porte) changerDEtat('refusee');
      });
      return;
    }
    noterLaSession(session);
    if (session && dernierEtatDeSession === 'refusee') changerDEtat('presente');
  });
}

/**
 * Une déconnexion **voulue** — « Me déconnecter », la suppression du compte : la session retirée
 * pendant `action` n'est pas un refus.
 */
export async function pendantUnDepartVolontaire<T>(action: () => Promise<T>): Promise<T> {
  departsVolontaires += 1;
  try {
    return await action();
  } finally {
    departsVolontaires -= 1;
  }
}

/**
 * « Commencer un bilan sur cet appareil », sur l'écran de reconnexion : la marque du compte est
 * effacée, et le refus levé — la prochaine écriture ouvrira la session anonyme qu'il lui faut. Les
 * autres marques de l'appareil, celles du compte quitté, sont à l'appelant (`effacerLesMarquesLocales`).
 */
export async function repartirSurCetAppareil(): Promise<void> {
  await oublierLeCompteRattache();
  changerDEtat('absente');
}

/**
 * Être prévenu quand le refus commence ou finit — au démarrage, en cours de route, à la connexion,
 * au choix de repartir. Rend de quoi se désabonner. L'état se lit par `etatDeLaSession()`.
 */
export function ecouterLeRefus(ecouteur: () => void): () => void {
  ecouteursDuRefus.add(ecouteur);
  return () => ecouteursDuRefus.delete(ecouteur);
}

/**
 * Le dernier état connu de la session — par `ensureSession()`, ou par l'écoute de `auth-js` pour un
 * refus en cours de route et une session revenue. Lu par le layout racine pour afficher l'écran de
 * reconnexion sur un refus — et **seulement** dans ce cas : une panne de transport ne se reproche pas
 * à la personne.
 */
export function etatDeLaSession(): EtatDeSession {
  return dernierEtatDeSession;
}

export const ensureSession = uneSeuleFois(async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session) {
    // Attendu, et non lancé : un appelant qui lit une marque juste après — la racine, son repli hors
    // ligne — doit lire celles de cette session-ci.
    await accueillirLaSession(session);
    changerDEtat('presente');
    return session;
  }
  // La marque ne se lit que sans session, et seulement sans erreur : c'est le seul cas où elle décide.
  const porteUnCompte = error ? false : await porteUnCompteRattache();
  changerDEtat(etatDeSession(false, error, porteUnCompte));
  if (!doitOuvrirUneSessionAnonyme(dernierEtatDeSession)) return null;

  // Le jeton du captcha, que Supabase exige une fois la protection activée (`captcha.ts`).
  const captchaToken = await jetonDuCaptcha('session_anonyme');
  const { data, error: erreurCreation } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
  if (erreurCreation) throw erreurCreation;
  if (data.session) await accueillirLaSession(data.session);
  changerDEtat('presente');
  return data.session;
});
