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
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  sanitizeEventProps,
  type UsageEventName,
  type UsageEventProps,
  type UsageEventPropsByName,
} from '@/types/analytics';

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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('usage_events').insert({
      user_id: session.user.id,
      name,
      props: sanitizeEventProps(props),
      platform: currentPlatform(),
    });

    if (error && __DEV__) {
      console.warn(`[analytics] ${name} non enregistré :`, error.message);
    }
  } catch (err) {
    if (__DEV__) console.warn(`[analytics] ${name} a échoué :`, err);
  }
}
