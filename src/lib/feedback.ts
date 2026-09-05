// Canal de retour utilisateur — table `feedback` (issue #29).
// Réf. migration `supabase/migrations/20260905150000_feedback.sql`.
//
// À sens unique et assumé comme tel : rien dans le produit ne promet de réponse, parce qu'il
// n'existe aucun canal pour en donner une. Ce que ce formulaire garantit, c'est que le retour
// arrive quelque part — ce qui n'était pas le cas jusqu'ici.
import { supabase } from '@/lib/supabase';

export const FEEDBACK_KINDS = [
  { value: 'mode_manquant', label: 'Un mode de transport manque' },
  { value: 'chiffre', label: 'Un chiffre me semble faux' },
  { value: 'bug', label: 'Quelque chose ne marche pas' },
  { value: 'idee', label: 'Une idée' },
  { value: 'autre', label: 'Autre chose' },
] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['value'];

export const FEEDBACK_MAX_LENGTH = 2000;

export type SendFeedbackResult = { ok: true } | { ok: false; message: string };

export async function sendFeedback(
  kind: FeedbackKind,
  message: string,
  context?: string
): Promise<SendFeedbackResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Ta session n’est pas prête. Réessaie dans un instant.' };
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    kind,
    message: message.trim(),
    context: context ?? null,
  });

  if (error) {
    // Le garde-fou de volume lève un message rédigé pour être montré tel quel — il s'adresse
    // à la personne, pas au développeur. Tout le reste est une panne, et on ne fait pas
    // porter à l'utilisateur un vocabulaire technique qu'il n'a pas demandé.
    const isRateLimit = error.message.includes('plusieurs retours');
    return {
      ok: false,
      message: isRateLimit
        ? error.message
        : 'Ton retour n’est pas parti. Vérifie ta connexion et réessaie.',
    };
  }

  return { ok: true };
}
