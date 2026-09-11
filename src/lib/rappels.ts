// Le jeton d'appareil et la permission de notifier — tout ce que `expo-notifications`
// impose, isolé ici pour que les écrans n'en sachent rien.
// Réf. docs/architecture/v1-12-rappels.md §5.3.
//
// **Le jeton suit la personne connectée sur l'appareil.** `enregistrerLeJeton()` est donc
// appelée à chaque ouverture *et* après un rattachement réussi : le RPC reprend le jeton à
// son propriétaire précédent, ce qu'une policy RLS ne pourrait pas faire au moment où une
// session anonyme devient un compte.
//
// Rien ici ne parle à l'utilisateur, mais **tout se dit à l'appelant** : `enregistrerLeJeton()`
// rend un booléen, et c'est ce qui empêche la feuille d'annoncer une notification qui ne
// partira pas (A4-8). L'écran de réglage, lui, dit ce que la permission raconte.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  lireLeJetonDeCetAppareil,
  memoriserLeJetonDeCetAppareil,
} from '@/lib/notification-prefs';
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
 * **Rend `true` seulement si un jeton est bel et bien inscrit côté serveur.**
 *
 * Le second cas compte autant que le premier : quelqu'un qui coupe les notifications dans les
 * réglages de son téléphone doit voir le serveur retomber sur l'email au prochain point,
 * plutôt que d'envoyer dans le vide. Sa **préférence**, elle, n'est jamais réécrite — rouvrir
 * les notifications suffit alors à faire repartir la notification (§3).
 *
 * **Le booléen n'est pas du confort.** Quatre chemins échouent sans lever : pas d'identifiants
 * FCM, pas de réseau, `projectId` absent, simulateur. La feuille posait `jetonActif = true` sur
 * la seule permission accordée, et le plan promettait alors une notification que
 * `reminder_channel_for()` ne verrait jamais partir — la « petite trahison » que le libellé du
 * bouton s'efforce d'éviter deux écrans plus haut (A4-8).
 *
 * **Ce que le booléen ne dit pas**, et qu'il faudra lui faire dire le jour où on reprend A4-7 :
 * `false` recouvre « permission non accordée » (légitime) et « RPC en erreur / pas de réseau »
 * (un échec). Le garde d'`_layout.tsx` ne rend le jeton à son propriétaire précédent que sur
 * une exception, donc sa phrase « seul un échec le rend à son propriétaire précédent » ne
 * couvre aujourd'hui que celles-là. Un `'inscrit' | 'sans_permission' | 'echec'` fermerait
 * l'écart ; le booléen suffit à ce que la feuille a besoin de savoir.
 */
export async function enregistrerLeJeton(): Promise<boolean> {
  if (!estNatif || !Device.isDevice) return false;

  const permission = await lirePermission().catch(() => 'fermee' as Permission);

  if (permission !== 'accordee') {
    // **On ne désactive que le jeton qu'on a soi-même enregistré.** La lecture d'avant ne
    // filtrait que `disabled_at is null` : la RLS bornant à la personne et non à l'appareil,
    // une tablette où les notifications sont refusées coupait le push du téléphone, en
    // silence, à chaque ouverture (A4-6).
    //
    // **Le compromis, écrit ici parce qu'il ne se voit pas dans le code :** sans marque
    // locale, on ne désactive rien — le jeton de cet appareil n'est pas identifiable. Cas de
    // transition seulement (aucune ligne dans `push_tokens` au 11/09/2026, cf. l'en-tête de
    // `20260911130000_jetons_push.sql`, et la V1 n'est pas publiée) : un appareil qui aurait
    // enregistré un jeton avant cette version puis coupé ses notifications garderait un jeton
    // actif que rien ne couperait — Android n'émet pas `DeviceNotRegistered` sur une
    // permission retirée, donc `collect_push_receipts` ne le verrait pas non plus, et le repli
    // email ne partirait jamais. La marque se pose au premier enregistrement réussi, donc la
    // fenêtre se referme au premier lancement de cette version avec la permission accordée.
    const connu = await lireLeJetonDeCetAppareil();
    if (connu) {
      const { error } = await supabase.rpc('unregister_push_token', { p_token: connu });
      if (!error) await memoriserLeJetonDeCetAppareil(null);
    }
    return false;
  }

  // `projectId` est posé par le chantier F dans `app.json` ; sans lui, Expo ne sait pas pour
  // quelle app émettre le jeton et lève.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    if (error) return false;

    // Mémorisé **après** l'écriture seulement : une marque posée sur un enregistrement qui a
    // échoué ferait croire à cet appareil qu'il a un jeton actif.
    await memoriserLeJetonDeCetAppareil(token);
    return true;
  } catch {
    // Pas d'identifiants FCM, pas de réseau, simulateur : rien à dire à l'utilisateur, le
    // rappel partira par email si c'est possible — et l'appelant, lui, l'apprend.
    return false;
  }
}
