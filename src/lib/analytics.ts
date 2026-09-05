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
    // réseau : on ne paie pas une requête supplémentaire par événement. Sans session, on
    // laisse tomber — la session anonyme arrive dans la seconde et le prochain événement
    // passera. Rattraper ici demanderait une file d'attente pour un gain nul.
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
