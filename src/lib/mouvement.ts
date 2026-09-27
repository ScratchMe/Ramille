import { Easing, FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { Mouvement } from '@/constants/theme';

/**
 * Les deux mouvements de disposition du produit, écrits une fois (27/09/2026, `v1-30` §5.7) : ce
 * qui apparaît en place, et ce qui est dessous et glisse vers sa nouvelle place au lieu de sauter.
 * Un réglage recopié dans huit écrans diverge au premier ajustement — la leçon de `CarteDePiste`.
 *
 * Les deux suivent « réduire les animations » d'eux-mêmes (`ReduceMotion.System`, écrit pour être
 * lu) : sous la préférence, ce qui apparaît est posé et ce qui glisse saute à sa place.
 *
 * **Une apparition ne doit pas jouer au montage d'un écran**, sans quoi tout ce qui est déjà là —
 * une précision ouverte par un brouillon, un point déjà répondu — refait une entrée à chaque
 * affichage. On l'enveloppe donc dans `LayoutAnimationConfig skipEntering`, qui laisse passer ce
 * qui monte ensuite : c'est ce que fait `StepShell` pour chaque étape.
 */

const courbe = Easing.bezier(...Mouvement.courbe);

/** Ce qui apparaît en place : une précision, une réplique, une piste dépliée. */
export const APPARITION = FadeIn.duration(Mouvement.fondu).easing(courbe).reduceMotion(ReduceMotion.System);

/** Ce qui est dessous glisse vers sa nouvelle place au lieu de sauter. */
export const GLISSEMENT = LinearTransition.duration(Mouvement.entree)
  .easing(courbe)
  .reduceMotion(ReduceMotion.System);
