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

/**
 * Le SQLSTATE du garde-fou de volume — dix retours par 24 h et par personne.
 *
 * Exporté pour que le test puisse l'utiliser sans le recopier : un code recopié dans une assertion
 * est exactement aussi faux qu'un code recopié dans le code.
 */
export const CODE_TROP_DE_RETOURS = 'RM002';

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
    // **Reconnu au code, jamais au message** (C3.10, point 4). Le garde-fou de volume levait avec
    // `check_violation` — le 23514 que porte aussi `feedback_message_check`, la borne de longueur
    // de la même table —, donc la seule façon de le distinguer était de chercher « plusieurs
    // retours » dans le texte. C'est la faute que ce dépôt nomme partout ailleurs : reformuler la
    // phrase aurait fait retomber le refus dans la branche « panne », et quelqu'un dont le retour
    // est simplement le onzième du jour aurait lu « Vérifie ta connexion » — alors que sa
    // connexion va bien, et sans que rien ne le signale, le test de la base éprouvant le message.
    //
    // `RM002` (migration `20260914120453`), dans la classe réservée aux conditions applicatives du
    // produit — `RM001` y est déjà le refus de remplacement d'une action engagée. Le message, lui,
    // ne change pas : il est rédigé pour être montré tel quel, il s'adresse à la personne et pas au
    // développeur. Tout le reste est une panne, et on ne fait pas porter à l'utilisateur un
    // vocabulaire technique qu'il n'a pas demandé.
    const tropDeRetours = error.code === CODE_TROP_DE_RETOURS;
    return {
      ok: false,
      message: tropDeRetours
        ? error.message
        : 'Ton retour n’est pas parti. Vérifie ta connexion et réessaie.',
    };
  }

  return { ok: true };
}
