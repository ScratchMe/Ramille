// Marque locale « l'ouverture de cette saison a été vue » (C2.8, `v1-14` §4.5).
//
// La carte d'ouverture du plan se ferme sur un geste, et la marque est **locale à l'appareil**,
// comme la feuille des rappels : elle ne vit que deux semaines, et un second appareil peut la
// revoir — c'est une nouvelle à annoncer, pas un état du compte à synchroniser.
//
// Même rationale que `src/lib/connexion-prefs.ts` et `src/lib/bilan-draft.ts` ; le préfixe
// historique `traceverte.` est conservé (le renommer effacerait les brouillons) et c'est par ce
// préfixe que `src/lib/compte.ts` balaie les marques à la suppression de compte.
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * **Une seule clé, qui porte l'identifiant du cycle** — et non une clé par cycle.
 *
 * `v1-14` §4.5 décrit `traceverte.saison-ouverture-vue:<plan_cycle_id>`, donc une entrée par
 * saison, conservée à jamais et jamais relue : quatre par an, sur un stockage dont rien ne fait le
 * ménage. Or un seul cycle peut être en ouverture à un instant donné, donc « la carte du cycle X a
 * été vue » se dit exactement par « la dernière ouverture vue est X ». C'est le motif déjà employé
 * par la marque de l'engagement orphelin (C2.2), pour la même raison : une nouvelle à dire une
 * fois, portant l'identifiant de ce qu'elle annonce, pour que la suivante puisse être dite à son
 * tour. Écart consigné en `v1-14` §10.
 */
const OUVERTURE_KEY = 'traceverte.saison_ouverture_vue.v1';

export async function aVuLouvertureDeSaison(planCycleId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OUVERTURE_KEY)) === planCycleId;
  } catch {
    return false;
  }
}

export async function marquerLouvertureDeSaisonVue(planCycleId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(OUVERTURE_KEY, planCycleId);
  } catch {
    // best-effort : au pire la carte réapparaît, et la fenêtre de deux semaines la referme.
  }
}
