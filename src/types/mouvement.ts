/**
 * Ce qui décide d'une animation, sorti des écrans pour être éprouvé (27/09/2026, `v1-30` §4.3).
 *
 * Logique pure : ce module ne lit ni la préférence du système ni les jetons de `theme.ts` — on les
 * lui passe. Les écrans lisent `useReducedMotion()` de reanimated, que la bibliothèque ne consulte
 * qu'au démarrage de l'app (`v1-29` §6.4).
 */

/** Le côté d'où une étape arrive : de la droite en avançant, de la gauche en reculant. */
export type Sens = 'avant' | 'arriere';

/**
 * Le sens d'un passage d'une étape à une autre, lu dans l'ordre des étapes — et non dans le bouton
 * qui l'a provoqué, pour qu'un saut (la reprise d'un bilan à une étape donnée, un retour au début)
 * dise aussi d'où il vient.
 *
 * `null` quand il n'y a pas de passage à montrer : au montage (aucune étape d'où l'on vient), sur
 * place, ou quand l'une des deux étapes n'est pas dans l'ordre — une étape qu'on ne sait pas placer
 * n'a pas de côté, et la faire entrer d'un côté au hasard dirait un sens faux.
 */
export function sensDuPassage<T>(de: T | null, vers: T, ordre: readonly T[]): Sens | null {
  if (de === null || de === vers) return null;
  const depart = ordre.indexOf(de);
  const arrivee = ordre.indexOf(vers);
  if (depart === -1 || arrivee === -1) return null;
  return arrivee > depart ? 'avant' : 'arriere';
}

/**
 * D'où part le contenu qui entre, en pixels sur l'axe horizontal : à droite en avançant, pour
 * glisser vers la gauche comme la page qu'on tourne, et à gauche en reculant. Zéro sans sens.
 */
export function decalageDEntree(sens: Sens | null, distance: number): number {
  if (sens === null) return 0;
  return sens === 'avant' ? distance : -distance;
}

/**
 * La barre d'onglets **arrive** : elle passe de masquée à visible sous les yeux de la personne.
 *
 * Seulement ce passage-là. Au démarrage, l'état d'avant est inconnu (`null`) : une barre déjà due
 * s'affiche posée, sans quoi elle glisserait à chaque ouverture de l'app — l'effet le plus
 * sûrement agaçant de tout le chantier. Et une barre qui disparaît ne s'anime pas.
 */
export function barreArrive(avant: boolean | null, apres: boolean): boolean {
  return avant === false && apres;
}

/**
 * Le passage d'un onglet à l'autre : le fondu de la barre embarquée par expo-router (150 ms), ou
 * rien sous « réduire les animations » — la barre ne lit pas la préférence elle-même.
 */
export function animationDesOnglets(reduit: boolean): 'fade' | 'none' {
  return reduit ? 'none' : 'fade';
}

/**
 * La durée d'une animation que sa bibliothèque ne coupe pas d'elle-même sous « réduire les
 * animations » : `Animated` de React Native, les CSS transitions de reanimated. Zéro pose tout de
 * suite l'état final — c'est ce que `ReduceMotion.System` fait pour `withTiming`.
 */
export function dureeSelonLaPreference(duree: number, reduit: boolean): number {
  return reduit ? 0 : duree;
}
