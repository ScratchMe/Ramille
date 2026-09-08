// Le jeton d'appareil et la permission de notifier — tout ce que `expo-notifications`
// impose, isolé ici pour que les écrans n'en sachent rien.
// Réf. docs/architecture/v1-12-rappels.md §5.3.
//
// **Le jeton suit la personne connectée sur l'appareil.** `enregistrerLeJeton()` est donc
// appelée à chaque ouverture *et* après un rattachement réussi : le RPC reprend le jeton à
// son propriétaire précédent, ce qu'une policy RLS ne pourrait pas faire au moment où une
// session anonyme devient un compte.
//
// Rien ici ne parle à l'utilisateur. Un enregistrement qui échoue est silencieux : c'est une
// plomberie, et l'écran de réglage dit déjà, lui, si les notifications sont coupées.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Permission } from '@/types/rappels';

/** Un seul canal Android : le produit n'envoie qu'une sorte de message. */
const CANAL_ANDROID = 'rappels';

export const estNatif = Platform.OS !== 'web';

/**
 * Reçu app ouverte, un push disparaîtrait sans laisser de trace — or c'est précisément le
 * moment où la personne peut y répondre en un geste.
 */
export function afficherLesNotificationsAuPremierPlan(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function preparerLeCanalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Points de suivi',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  }).catch(() => undefined);
}

/**
 * L'état de la permission, ramené aux trois cas qui changent quelque chose à l'écran.
 *
 * `canAskAgain` est le seul moyen de distinguer « pas encore demandé » de « refusé deux fois,
 * le dialogue ne s'ouvrira plus jamais » — et c'est cette distinction qui décide du libellé
 * du bouton de la feuille (v1-12 §6.1).
 */
export async function lirePermission(): Promise<Permission> {
  if (!estNatif) return 'fermee';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'accordee';
  return canAskAgain ? 'demandable' : 'fermee';
}

/** Ouvre le dialogue système. À n'appeler que depuis la feuille, jamais au lancement. */
export async function demanderLaPermission(): Promise<Permission> {
  if (!estNatif) return 'fermee';
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') return 'accordee';
  return canAskAgain ? 'demandable' : 'fermee';
}

/**
 * Enregistre le jeton de cet appareil, ou le désactive si la permission n'est plus là.
 *
 * Le second cas compte autant que le premier : quelqu'un qui coupe les notifications dans les
 * réglages de son téléphone doit voir le serveur retomber sur l'email au prochain point,
 * plutôt que d'envoyer dans le vide. Sa **préférence**, elle, n'est jamais réécrite — rouvrir
 * les notifications suffit alors à faire repartir la notification (§3).
 */
export async function enregistrerLeJeton(): Promise<void> {
  if (!estNatif || !Device.isDevice) return;

  const permission = await lirePermission().catch(() => 'fermee' as Permission);

  if (permission !== 'accordee') {
    const connu = await jetonDeCetAppareil();
    if (connu) await supabase.rpc('unregister_push_token', { p_token: connu });
    return;
  }

  // `projectId` est posé par le chantier F dans `app.json` ; sans lui, Expo ne sait pas pour
  // quelle app émettre le jeton et lève.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    // Pas d'identifiants FCM, pas de réseau, simulateur : rien à dire à l'utilisateur, le
    // rappel partira par email si c'est possible.
  }
}

/**
 * Le jeton que ce téléphone a déjà enregistré, s'il y en a un. Lu depuis la base plutôt que
 * demandé à Expo : sans permission, `getExpoPushTokenAsync` lève, et c'est justement le cas
 * où l'on veut désactiver la ligne.
 */
async function jetonDeCetAppareil(): Promise<string | null> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .is('disabled_at', null)
    .limit(1)
    .maybeSingle();
  return data?.token ?? null;
}
