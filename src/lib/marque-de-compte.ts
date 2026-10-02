// Marque locale « cet appareil porte un compte rattaché » — `v1-27` §12.27, 02/10/2026.
//
// **C'est elle qui distingue un refus d'une première ouverture.** Quand `auth-js` retire une session
// dont le jeton est refusé, il ne reste rien à lire : ni session, ni erreur. Sans autre indice, un
// compte réel qu'on vient de perdre et un visiteur qui n'a jamais rien eu se ressemblent trait pour
// trait. Et l'événement `SIGNED_OUT` ne suffit pas à les séparer : une session **anonyme** purgée
// au bout de 90 jours (`purge_stale_anonymous_accounts`), ou révoquée, est refusée exactement de la
// même façon — et lui dire « Reconnecte-toi pour retrouver ton bilan », « J'ai déjà un compte »,
// c'est parler d'un compte qu'elle n'a jamais eu (contre-lecture de la PR #315). La marque dit ce
// que la session retirée était, puisque `auth-js` ne le dit plus.
//
// **Et elle survit à la session**, ce qui rend le refus durable : un rechargement de page ou une app
// tuée par le système pendant qu'on va chercher son code ne repartent plus d'une « première
// ouverture », donc d'une session anonyme vide.
//
// Trois propriétés, décidées ailleurs qu'ici :
//
//   * **elle se pose quand une session non anonyme est vue** — à chaque lancement d'un compte
//     rattaché, et à la connexion (`src/lib/supabase.ts`) ; les comptes rattachés d'avant le
//     02/10/2026 la reçoivent donc à leur premier lancement suivant, et seul un refus survenu
//     **avant** ce lancement retombe encore sur une session anonyme ;
//   * **elle ne survit à aucun départ voulu** : « Me déconnecter » et la suppression du compte
//     balaient les marques par le préfixe historique `traceverte.` (`effacerLesMarquesLocales`),
//     d'où le nom de la clé, qui n'est pas négociable ;
//   * **« Commencer un bilan sur cet appareil » l'efface aussi** : c'est un départ choisi depuis
//     l'écran de reconnexion (`repartirSurCetAppareil`).
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Le préfixe est historique et se conserve : c'est par lui que les départs voulus balaient. */
const MARQUE_KEY = 'traceverte.compte_rattache.v1';

/**
 * Cet appareil porte-t-il un compte rattaché ?
 *
 * Un stockage indisponible rend `false` : on retombe sur une première ouverture, le comportement
 * d'avant cette marque — jamais sur un écran de reconnexion qu'on ne pourrait pas justifier.
 */
export async function porteUnCompteRattache(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MARQUE_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Pose la marque. Best-effort : un stockage en échec ne fait échouer ni un démarrage ni une connexion. */
export async function noterUnCompteRattache(): Promise<void> {
  try {
    await AsyncStorage.setItem(MARQUE_KEY, '1');
  } catch {
    // best-effort, cf. ci-dessus.
  }
}

/** Efface la marque — seule, quand la personne choisit de repartir sur cet appareil. */
export async function oublierLeCompteRattache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MARQUE_KEY);
  } catch {
    // best-effort : au pire, l'écran de reconnexion reviendra au prochain lancement.
  }
}
