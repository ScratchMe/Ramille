// Le jeton d'appareil et la permission de notifier — tout ce que `expo-notifications`
// impose, isolé ici pour que les écrans n'en sachent rien.
// Réf. docs/architecture/v1-12-rappels.md §5.3.
//
// **Le jeton suit la personne connectée sur l'appareil.** `reglerLeJetonDeCetAppareil()` est donc
// appelée à chaque ouverture, à chaque changement d'utilisateur, et au retour au premier plan
// tant qu'elle n'a rien réglé : le RPC reprend le jeton à son propriétaire précédent, ce
// qu'une policy RLS ne pourrait pas faire au moment où une session anonyme devient un compte.
// **Et seulement pour qui a choisi la notification** (22/10/2026) : sans elle, le jeton de cet
// appareil est désactivé, et rien ne part chez Expo.
//
// Rien ici ne parle à l'utilisateur, mais **tout se dit à l'appelant** : `enregistrerLeJeton()`
// rend un booléen, et c'est ce qui empêche la feuille d'annoncer une notification qui ne
// partira pas (A4-8). L'écran de réglage, lui, dit ce que la permission raconte.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  desinscrireLeJetonDeCetAppareil,
  lireLeCanalPrefere,
  lireLeJetonDeCetAppareil,
  memoriserLeJetonDeCetAppareil,
  suivreLEnregistrementDuJeton,
} from '@/lib/notification-prefs';
import { supabase } from '@/lib/supabase';
import { CANAUX_ANDROID, leJetonAuDemarrage, type Permission } from '@/types/rappels';

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

/**
 * Les canaux Android, créés à chaque lancement — l'appel est idempotent, et c'est ce qui les fait
 * exister sur l'appareil avant qu'un message ne les nomme.
 *
 * **Deux canaux depuis C4.2, un par genre de message** (arbitrage du 27/09/2026) : « Points de suivi »
 * garde la question du point, « Mot de la veille » porte le mot du soir, pour que chacun se coupe à
 * part dans les réglages du téléphone. Les identifiants viennent de `CANAUX_ANDROID`, jumelle de
 * `public.canal_android` qui les nomme dans le message envoyé. Un message qui nomme un canal absent
 * ne s'affiche pas là où il faut — d'où la création ici, au lancement, et non au moment où la
 * personne dit oui. Le seul appareil qui recevrait le mot sans son canal est un second téléphone du
 * même compte resté sur une version d'avant C4.2 : le oui se donne dans l'app, donc sur un appareil
 * déjà lancé avec cette version.
 */
export async function preparerLesCanauxAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    Object.values(CANAUX_ANDROID).map((canal) =>
      Notifications.setNotificationChannelAsync(canal.id, {
        name: canal.nom,
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
      }).catch(() => undefined)
    )
  );
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
 * **Ce que le booléen ne distingue pas, et pourquoi il suffit** : `false` recouvre « permission non
 * accordée » et « RPC en erreur / pas de réseau ». La garde du layout racine (`gardeDuJeton`,
 * `src/types/session.ts`) les traite pareil, et c'est juste : dans les deux cas l'appareil n'est pas
 * inscrit au nom de la personne, et le retour au premier plan suivant retente — la permission rouverte
 * dans les réglages comme le réseau revenu. Une exception y est lue comme un `false`.
 */
export function enregistrerLeJeton(): Promise<boolean> {
  // Suivi, pour qu'une lecture du jeton partie au même moment le lise après lui
  // (`suivreLEnregistrementDuJeton`, `src/lib/notification-prefs.ts`).
  const enregistrement = enregistrerLeJetonMaintenant();
  suivreLEnregistrementDuJeton(enregistrement);
  return enregistrement;
}

async function enregistrerLeJetonMaintenant(): Promise<boolean> {
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
    await desactiverLeJetonDeCetAppareil();
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

/**
 * Le jeton au démarrage, au changement d'utilisateur et au retour au premier plan (`gardeDuJeton`,
 * `src/app/_layout.tsx`) : **inscrit seulement si la personne a choisi la notification**
 * (`leJetonAuDemarrage`, `src/types/rappels.ts`, qui dit pourquoi), désactivé sinon.
 *
 * **Rend `true` seulement quand un jeton est inscrit**, comme `enregistrerLeJeton` : tout autre cas se
 * réévalue au retour au premier plan suivant. Le cas qui l'exige (contre-lecture du 22/10/2026) : au
 * lancement, la préférence est l'e-mail ; la personne choisit ensuite la notification dans la feuille,
 * refuse l'invite, puis la rouvre dans les réglages du téléphone. Un `true` rendu au lancement aurait
 * fermé la garde, et le retour des réglages n'aurait rien réinscrit. Sans jeton connu, la réévaluation
 * ne coûte qu'une lecture du profil.
 *
 * **Suivi dès le départ** (`suivreLEnregistrementDuJeton`) et pas seulement par `enregistrerLeJeton` :
 * la lecture de la préférence est un aller-retour, pendant lequel une lecture du jeton aurait trouvé la
 * marque d'avant (`v1-33` T-12).
 */
export function reglerLeJetonDeCetAppareil(): Promise<boolean> {
  const reglage = reglerLeJetonMaintenant();
  suivreLEnregistrementDuJeton(reglage);
  return reglage;
}

async function reglerLeJetonMaintenant(): Promise<boolean> {
  if (!estNatif || !Device.isDevice) return false;

  switch (leJetonAuDemarrage(await lireLeCanalPrefere())) {
    case 'attendre':
      return false;
    case 'desinscrire':
      await desactiverLeJetonDeCetAppareil();
      return false;
    case 'inscrire':
      return enregistrerLeJeton();
  }
}

/**
 * Désactive le jeton de cet appareil **au nom de la session présente**. `unregister_push_token` ne touche
 * que les lignes de `auth.uid()` : après un changement de compte — `/connexion/retrouver`, ou un code
 * demandé pour une adresse déjà prise —, la ligne appartient encore au compte quitté, la désactivation
 * ne la trouvait pas, la marque locale s'effaçait quand même, et le téléphone recevait les rappels de
 * celui qu'on venait de quitter (A4-7, revenu par ce chemin, contre-lecture du 22/10/2026). D'où la
 * reprise d'abord (`register_push_token`, qui rattache le jeton à la session ; le jeton est la marque
 * locale, donc rien ne part chez Expo), puis la désactivation. Une reprise refusée laisse tout en
 * place, marque comprise : le retour suivant retente.
 */
async function desactiverLeJetonDeCetAppareil(): Promise<void> {
  const connu = await lireLeJetonDeCetAppareil();
  if (!connu) return;
  const { error } = await supabase.rpc('register_push_token', {
    p_token: connu,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) return;
  await desinscrireLeJetonDeCetAppareil();
}
