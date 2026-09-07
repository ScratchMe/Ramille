import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { track } from '@/lib/analytics';
import type { UsageEventName, UsageEventPropsByName } from '@/types/analytics';

/**
 * Émet un événement d'affichage **à chaque fois que l'écran prend le focus**.
 *
 * Le pendant de `useTrackView` pour les écrans d'onglets. La différence n'est pas cosmétique :
 * dans une barre d'onglets, react-navigation **garde l'écran monté** quand on passe à l'autre.
 * Un événement émis au montage ne partirait donc qu'une fois par session, et « combien de fois
 * revient-on sur le suivi ? » — la question même que la navigation pose — n'aurait plus de
 * réponse. Le compteur ne tomberait pas à zéro, ce qui serait visible : il donnerait un chiffre
 * plausible et faux.
 *
 * Sur un écran hors onglets, les deux se valent : `useTrackView` reste le défaut, il est plus
 * simple et son garde contre le double montage de StrictMode est utile là où il n'y a qu'un
 * affichage possible.
 */
export function useTrackFocus<N extends UsageEventName>(
  name: N,
  ...args: UsageEventPropsByName[N] extends never ? [] : [props: UsageEventPropsByName[N]]
): void {
  const props = args[0];
  useFocusEffect(
    useCallback(() => {
      (track as (n: N, p?: unknown) => void)(name, props);
      // Pas de nettoyage : on mesure une arrivée, pas une durée.
    }, [name, props])
  );
}
