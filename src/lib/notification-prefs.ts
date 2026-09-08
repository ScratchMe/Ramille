// Le canal de rappel — `profiles.reminder_channel` et les jetons d'appareil.
// Réf. docs/architecture/v1-12-rappels.md §3 et §6.4.
//
// Ce fichier ne décide rien : il lit l'état et écrit la préférence. **La règle vit dans
// `src/types/rappels.ts`** (module pur, testé), avec son pendant SQL `reminder_channel_for()`.
//
// Le rappel reste en opt-out — il n'est pas une promotion, c'est le mécanisme même de la
// brique 4 — mais il n'est plus réservé aux comptes rattachés : un jeton d'appareil suffit
// pour la notification, donc le réglage s'ouvre aussi aux sessions anonymes.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type { CanalPrefere, EtatDesRappels } from '@/types/rappels';

export type ReminderPrefs = EtatDesRappels & {
  /** L'adresse à afficher sur la ligne « Par email », quand elle est utilisable. */
  email: string | null;
};

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { prefere: 'none', jetonActif: false, emailPossible: false, email: null };

  // Un compte rattaché **et** confirmé : les deux, jamais l'un sans l'autre — on n'écrit
  // jamais à une adresse seulement déclarée (v1-07 §3.1).
  const emailPossible = !user.is_anonymous && !!user.email && !!user.email_confirmed_at;

  const [profil, jetons] = await Promise.all([
    supabase.from('profiles').select('reminder_channel').eq('id', user.id).maybeSingle(),
    supabase.from('push_tokens').select('token').is('disabled_at', null).limit(1),
  ]);

  return {
    prefere: (profil.data?.reminder_channel as CanalPrefere) ?? 'email',
    jetonActif: (jetons.data?.length ?? 0) > 0,
    emailPossible,
    email: emailPossible ? (user.email ?? null) : null,
  };
}

/** Renvoie `true` si l'écriture a abouti — l'appelant remet le réglage en place sinon. */
export async function setReminderChannel(canal: CanalPrefere): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update({ reminder_channel: canal })
    .eq('id', user.id);

  return !error;
}

// La feuille de proposition ne s'ouvre qu'une fois par appareil (v1-12 §6.1). Marque locale,
// même mécanique et même préfixe historique que les autres clés AsyncStorage — les renommer
// effacerait des états existants (CLAUDE.md).
const FEUILLE_KEY = 'traceverte.rappels_proposes.v1';

export async function aDejaVuLaFeuilleDeRappel(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FEUILLE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marquerFeuilleDeRappelVue(): Promise<void> {
  try {
    await AsyncStorage.setItem(FEUILLE_KEY, '1');
  } catch {
    // best-effort : au pire la feuille réapparaît au prochain engagement.
  }
}
