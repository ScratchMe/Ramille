// Mesure d'usage (issue #30) — table `usage_events`.
// Réf. migration `supabase/migrations/20260905170000_usage_events.sql`.
//
// ## Trois règles de ce module
//
// 1. **`track()` ne lève jamais et ne bloque jamais.** Une mesure qui casse l'écran qu'elle
//    observe est pire que pas de mesure du tout. Tout est avalé : session absente, réseau
//    coupé, garde-fou de volume atteint. En développement, l'échec est journalisé — silencieux
//    en production, où il n'y a personne pour le lire.
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
    // **Sans session, on laisse tomber — et ce renoncement est la responsabilité de
    // l'appelant, pas la nôtre.** Il n'est pas neutre : il ne frappe pas au hasard mais
    // exactement les premiers lancements, ceux où `ensureSession()` fait encore son
    // aller-retour de création de compte. C'est ce qui avait vidé `app_open`, dénominateur de
    // tous les entonnoirs : **une seule ligne en base pour six vues d'étape d'onboarding**
    // (v1-13, préambule ; la contre-vérification d'A1-3 du 09/09 comptait zéro). Le layout
    // racine l'émet désormais dans le `.then(ensureSession)`. La règle qui en découle : **un
    // événement qui peut partir avant la première session s'émet après elle**, jamais au
    // montage. Une file d'attente ici coûterait une persistance et un vidage à gérer pour
    // rattraper un seul cas, `app_error` au démarrage, qui est un filet assumé comme partiel
    // (cf. docs/exploitation/remontee-erreurs.md §3).
    //
    // **Ce cas-là a sa file depuis le 02/10/2026** (`src/types/erreurs-en-attente.ts`) : une panne est
    // l'événement qu'on veut le plus, et la phase de test fermé sur Play en a besoin. Une erreur sans
    // session ou sans réponse se garde, et part au prochain démarrage (`envoyerLesErreursEnAttente`).
    // Les autres événements gardent la règle d'avant : ils s'émettent après la session.
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

/** Sous le préfixe commun : un départ voulu, ou l'arrivée d'un autre compte, la balaie avec le reste. */
const FILE_KEY = 'traceverte.erreurs_en_attente.v1';

async function lireLaFileStockee(): Promise<ErreurEnAttente[]> {
  try {
    return lireLaFile(await AsyncStorage.getItem(FILE_KEY), Date.now());
  } catch {
    return [];
  }
}

async function ecrireLaFile(file: ErreurEnAttente[]): Promise<void> {
  try {
    if (file.length === 0) await AsyncStorage.removeItem(FILE_KEY);
    else await AsyncStorage.setItem(FILE_KEY, JSON.stringify(file));
  } catch {
    // Best-effort, comme toute la mesure : une file perdue est une panne non tracée, rien de plus.
  }
}

/**
 * **Les écritures de la file passent une par une** : deux pannes au même instant — l'écran d'erreur et
 * une promesse rejetée à côté — lisaient toutes deux la file vide, et la seconde écrasait la première
 * (le test l'a trouvé à la première exécution). Le vidage passe par la même file, pour la même raison.
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
 * Envoie les erreurs gardées sur l'appareil — au démarrage, une fois la session là, et au retour au
 * premier plan (`src/app/_layout.tsx`). Comme `track()`, **ne lève jamais**, et ne s'attend pas.
 *
 * Elles partent en **un seul insert** : un lot qui passe ou ne passe pas, donc une file qui ne se vide
 * jamais à moitié. Ne sont retirées de la file que celles qui viennent de partir — une panne survenue
 * pendant l'envoi reste pour le suivant.
 */
export async function envoyerLesErreursEnAttente(): Promise<void> {
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

