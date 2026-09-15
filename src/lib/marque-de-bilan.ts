// Marque locale « cet appareil a vu un bilan complété » — C4.5, `v1-15-hors-ligne.md` §5.
//
// **Ce n'est pas un cache : c'est ce qui autorise une phrase.** Sans elle, la racine ne peut rien
// dire de vrai sur la personne quand la lecture échoue — c'est tout le raisonnement de C1.4, et la
// raison pour laquelle elle préférait lever plutôt que de router vers l'onboarding en disant « tu
// n'as rien ». Avec elle, « ton plan t'attend » devient honnête, et le mur du démarrage hors ligne
// tombe (`v1-13` §12.5).
//
// Deux propriétés la rendent sûre, et elles vivent ailleurs qu'ici :
//
//   * **elle n'est consultée qu'en repli**, jamais quand le serveur a répondu. C'est
//     `destinationDuDemarrage` (`src/types/demarrage.ts`) qui le garantit, et un test l'épingle ;
//   * **elle ne survit ni à une suppression de compte ni à une déconnexion de l'appareil**, parce
//     que `src/lib/compte.ts` balaie par le préfixe historique `traceverte.` depuis ses **deux**
//     sorties — d'où le nom de la clé ci-dessous, qui n'est pas négociable. Une marque qui
//     survivrait promettrait un plan à quelqu'un qui vient de tout effacer.
//
// Ce second point resserre le risque que `v1-15` §9 décrit : les deux gestes qui changent le
// propriétaire de l'appareil effacent la marque, donc il ne reste qu'un appareil **restauré depuis
// une sauvegarde** pour la rendre fausse — `allowBackup` étant absent d'`app.json`, donc vrai par
// défaut. Et son coût y est chiffré : un visiteur réellement neuf, hors ligne, verrait l'écran
// d'erreur du plan au lieu d'un onboarding qu'il pouvait parcourir.
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * **Le préfixe est historique et il se conserve** (cf. CLAUDE.md : le renommer effacerait les
 * brouillons), et c'est surtout par lui que `src/lib/compte.ts` efface les marques locales à la
 * suppression de compte. Une clé écrite sous un autre préfixe échapperait à ce balayage.
 */
const MARQUE_KEY = 'traceverte.a_un_bilan.v1';

/**
 * Cet appareil a-t-il déjà vu un bilan complété ?
 *
 * Un stockage indisponible rend `false`, et c'est le bon défaut : on retombe alors sur le
 * comportement d'un appareil neuf, jamais sur une promesse qu'on ne peut pas tenir.
 */
export async function aDejaVuUnBilan(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MARQUE_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Pose la marque. Appelée quand une lecture **réussie** a trouvé un bilan complété, et à la
 * soumission — donc le premier lancement en ligne de n'importe quel compte existant la pose, et il
 * n'y a pas de rattrapage à écrire.
 *
 * Best-effort : un `AsyncStorage` en échec ne doit pas faire échouer un démarrage qui a par
 * ailleurs réussi. Au pire, la prochaine ouverture hors ligne retombe sur l'onboarding.
 */
export async function marquerQuIlYAUnBilan(): Promise<void> {
  try {
    await AsyncStorage.setItem(MARQUE_KEY, '1');
  } catch {
    // best-effort, cf. ci-dessus.
  }
}
