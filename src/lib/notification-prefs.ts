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

  const [profil, jetonActif] = await Promise.all([
    supabase.from('profiles').select('reminder_channel').eq('id', user.id).maybeSingle(),
    leJetonDeCetAppareilEstActif(),
  ]);

  return {
    prefere: (profil.data?.reminder_channel as CanalPrefere) ?? 'email',
    jetonActif,
    emailPossible,
    email: emailPossible ? (user.email ?? null) : null,
  };
}

/**
 * **Le jeton de cet appareil, pas un jeton de cette personne.** `push_tokens` en porte
 * plusieurs par compte (unicité sur le jeton, jamais sur l'utilisateur) et la RLS ne borne
 * qu'à la personne : une requête qui se contentait de `disabled_at is null` rendait vrai dès
 * qu'un *autre* téléphone était inscrit, et l'écran affirmait alors « sur ce téléphone » à qui
 * n'avait rien autorisé ici (A9-19).
 *
 * Sans jeton mémorisé, la réponse est « non » : l'appareil n'a rien enregistré, ou l'a fait
 * avant que cette marque n'existe — et le prochain lancement la posera.
 */
async function leJetonDeCetAppareilEstActif(): Promise<boolean> {
  const jeton = await lireLeJetonDeCetAppareil();
  if (!jeton) return false;

  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('token', jeton)
    .is('disabled_at', null)
    .maybeSingle();

  return !!data;
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

// Le jeton que **cet** appareil a enregistré, retenu ici parce que rien en base ne permet de
// le reconnaître : `push_tokens` est owner-scoped, donc une lecture rend les jetons de tous
// les appareils de la personne sans dire lequel est celui-ci. C'est la seule chose qui rende
// vraies deux phrases du produit — « sur ce téléphone » dans le réglage, et « ne désactive que
// le sien » dans `enregistrerLeJeton()`.
//
// Même préfixe historique `traceverte.` que les autres clés locales (CLAUDE.md dit pourquoi il
// ne se renomme pas), donc elle part avec la suppression de compte, qui balaie par préfixe.
// Le préfixe est compté nulle part exprès : une phrase qui dénombre les clés devient fausse à
// la prochaine, en silence — c'est déjà arrivé deux fois.
const JETON_KEY = 'traceverte.jeton_appareil.v1';

export async function lireLeJetonDeCetAppareil(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(JETON_KEY);
  } catch {
    return null;
  }
}

/** `null` efface la marque : l'appareil n'a plus de jeton à lui. */
export async function memoriserLeJetonDeCetAppareil(jeton: string | null): Promise<void> {
  try {
    if (jeton === null) await AsyncStorage.removeItem(JETON_KEY);
    else await AsyncStorage.setItem(JETON_KEY, jeton);
  } catch {
    // best-effort : au pire l'appareil se croira sans jeton jusqu'au prochain enregistrement.
  }
}
