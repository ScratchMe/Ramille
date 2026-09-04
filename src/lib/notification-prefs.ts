// Préférence de rappel par email — `profiles.email_reminders_enabled`.
// Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.1.
//
// Le rappel est en opt-out : il n'est pas une promotion, c'est le mécanisme même de la
// brique 4, et quelqu'un qui rattache son compte demande précisément à ce que son suivi lui
// survive. Il doit rester désactivable en un geste — d'où ce réglage sur l'écran de suivi.
import { supabase } from '@/lib/supabase';

export type ReminderPrefs = {
  /** Faux pour une session anonyme : sans compte rattaché, il n'y a pas d'adresse où écrire. */
  canReceive: boolean;
  enabled: boolean;
};

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous || !user.email) {
    return { canReceive: false, enabled: false };
  }

  const { data } = await supabase
    .from('profiles')
    .select('email_reminders_enabled')
    .eq('id', user.id)
    .maybeSingle();

  return { canReceive: true, enabled: data?.email_reminders_enabled ?? true };
}

/** Renvoie `true` si l'écriture a abouti — l'appelant remet l'interrupteur en place sinon. */
export async function setReminderPrefs(enabled: boolean): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update({ email_reminders_enabled: enabled })
    .eq('id', user.id);

  return !error;
}
