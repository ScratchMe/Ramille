// Mesure d'usage (issue #30) — table `usage_events`.
// Réf. migration `supabase/migrations/20260905170000_usage_events.sql`.
//
// ## Trois règles de ce module
//
// 1. **`track()` ne lève jamais et ne bloque jamais.** Une mesure qui casse l'écran qu'elle
//    observe est pire que pas de mesure du tout. Tout est avalé : session absente, réseau
//    coupé, garde-fou de volume atteint — et seule une panne (`app_error`) est gardée pour plus
//    tard, dans la file d'attente des erreurs (plus bas). En développement, l'échec est
//    journalisé — silencieux en production, où il n'y a personne pour le lire.
// 2. **On n'attend jamais le résultat.** Aucun appelant ne doit mettre un `await` devant :
//    la fonction rend `void` exprès, pour que ce soit impossible sans le remarquer.
// 3. **On n'envoie que des valeurs venues du code.** Jamais une saisie utilisateur, jamais un
//    identifiant, jamais de texte libre — cf. l'en-tête de `src/types/analytics.ts`.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  sanitizeEventProps,
  type UsageEventName,
  type UsageEventProps,
  type UsageEventPropsByName,
} from '@/types/analytics';
import {
  CLE_DE_LA_FILE,
  enfiler,
  lireLaFile,
  memeErreur,
  propsDifferees,
  suiteDeLEnvoi,
  type ErreurEnAttente,
} from '@/types/erreurs-en-attente';

// `platform` est contraint côté base ; tout ce qui n'est ni iOS ni Android est du web (Expo
// rend aussi sur d'autres cibles à terme, et un insert refusé perdrait l'événement).
function currentPlatform(): 'web' | 'ios' | 'android' {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

type PropsArg<N extends UsageEventName> = UsageEventPropsByName[N] extends never
  ? []
  : [props: UsageEventPropsByName[N]];

export function track<N extends UsageEventName>(name: N, ...args: PropsArg<N>): void {
  void send(name, args[0] as UsageEventProps | undefined);
}

async function send(name: UsageEventName, props: UsageEventProps | undefined): Promise<void> {
  try {
    // `getSession()` lit le cache local, contrairement à `getUser()` qui fait un aller-retour
    // réseau : on ne paie pas une requête supplémentaire par événement.
    //
    // **Sans session, on laisse tomber — sauf une panne.** Ce renoncement n'est pas neutre : il
    // ne frappe pas au hasard mais exactement les premiers lancements, ceux où `ensureSession()`
    // fait encore son aller-retour de création de compte. C'est ce qui avait vidé `app_open`,
    // dénominateur de tous les entonnoirs : **une seule ligne en base pour six vues d'étape
    // d'onboarding** (v1-13, préambule ; la contre-vérification d'A1-3 du 09/09 comptait zéro).
    // Le layout racine l'émet désormais dans le `.then(ensureSession)`. La règle qui en découle,
    // et qui est la responsabilité de l'appelant : **un événement qui peut partir avant la
    // première session s'émet après elle**, jamais au montage.
    //
    // **La panne est la seule exception, et elle a sa file** (02/10/2026,
    // `src/types/erreurs-en-attente.ts`) : elle ne choisit pas son moment, et c'est l'événement
    // que le test fermé sur Play veut le plus. Sans session, ou sans réponse du serveur, ou sur
    // une panne passagère de celui-ci, `app_error` se garde sur l'appareil et part plus tard
    // (`envoyerLesErreursEnAttente`).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      if (name === 'app_error') await garderLErreur(props);
      return;
    }

    const { error, status } = await supabase.from('usage_events').insert({
      user_id: session.user.id,
      name,
      props: sanitizeEventProps(props),
      platform: currentPlatform(),
    });

    if (error && name === 'app_error' && suiteDeLEnvoi(status, error) === 'garder') {
      await garderLErreur(props);
    }
    if (error && __DEV__) {
      console.warn(`[analytics] ${name} non enregistré :`, error.message);
    }
  } catch (err) {
    if (__DEV__) console.warn(`[analytics] ${name} a échoué :`, err);
  }
}

// ── La file d'attente des erreurs ──────────────────────────────────────────────────────────────

async function lireLaFileStockee(): Promise<ErreurEnAttente[]> {
  try {
    return lireLaFile(await AsyncStorage.getItem(CLE_DE_LA_FILE), Date.now());
  } catch {
    return [];
  }
}

async function ecrireLaFile(file: ErreurEnAttente[]): Promise<void> {
  try {
    if (file.length === 0) await AsyncStorage.removeItem(CLE_DE_LA_FILE);
    else await AsyncStorage.setItem(CLE_DE_LA_FILE, JSON.stringify(file));
  } catch {
    // Best-effort, comme toute la mesure : une file perdue est une panne non tracée, rien de plus.
  }
}

/**
 * **Les écritures de la file passent une par une** : deux écritures rapprochées — l'écran d'erreur qui
 * retombe juste après « Réessayer », ou une panne pendant le vidage — lisaient toutes deux la même file,
 * et la seconde écrasait la première (le test l'a trouvé à la première exécution, avec deux pannes
 * émises coup sur coup). Le vidage passe par la même série, pour la même raison.
 */
let enCours: Promise<void> = Promise.resolve();
function enSerie(travail: () => Promise<void>): Promise<void> {
  const tour = enCours.then(travail);
  enCours = tour.catch(() => undefined);
  return enCours;
}

function garderLErreur(props: UsageEventProps | undefined): Promise<void> {
  const category = props?.category;
  const route = props?.route;
  if (typeof category !== 'string' || typeof route !== 'string') return Promise.resolve();
  const erreur = { category, route, noteeLe: Date.now() } as ErreurEnAttente;
  return enSerie(async () => ecrireLaFile(enfiler(await lireLaFileStockee(), erreur)));
}

/**
 * Envoie les erreurs gardées sur l'appareil — au démarrage, une fois la session là, et, sur natif, au
 * retour au premier plan compté comme une ouverture (`src/app/_layout.tsx`). Comme `track()`, **ne lève
 * jamais**, et ne s'attend pas.
 *
 * Elles partent en **un seul insert** : un lot qui passe ou ne passe pas, donc une file qui ne se vide
 * jamais à moitié. Ne sont retirées de la file que celles qui viennent de partir — une panne survenue
 * pendant l'envoi reste pour le suivant.
 *
 * **Un seul envoi à la fois** : le client Supabase ne pose aucun délai à ses requêtes, donc un envoi du
 * démarrage resté suspendu pouvait croiser celui d'un retour au premier plan, qui relisait la même file
 * et insérait le même lot une seconde fois. Un appel pendant un envoi rend celui qui est en cours. Le
 * prix : un envoi qui ne revient jamais retient la file jusqu'au lancement suivant.
 */
let envoiEnCours: Promise<void> | null = null;

export function envoyerLesErreursEnAttente(): Promise<void> {
  if (!envoiEnCours) {
    envoiEnCours = envoyerLaFile().finally(() => {
      envoiEnCours = null;
    });
  }
  return envoiEnCours;
}

async function envoyerLaFile(): Promise<void> {
  try {
    const file = await lireLaFileStockee();
    if (file.length === 0) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const maintenant = Date.now();
    const { error, status } = await supabase.from('usage_events').insert(
      file.map((erreur) => ({
        user_id: session.user.id,
        name: 'app_error',
        props: sanitizeEventProps(propsDifferees(erreur, maintenant)),
        platform: currentPlatform(),
      }))
    );
    if (suiteDeLEnvoi(status, error) === 'garder') return;

    await enSerie(async () =>
      ecrireLaFile((await lireLaFileStockee()).filter((e) => !file.some((partie) => memeErreur(e, partie))))
    );
    if (error && __DEV__) console.warn('[analytics] erreurs en attente refusées :', error.message);
  } catch (err) {
    if (__DEV__) console.warn('[analytics] erreurs en attente non envoyées :', err);
  }
}

