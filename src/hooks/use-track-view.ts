import { useEffect, useRef } from 'react';

import { track } from '@/lib/analytics';
import type { UsageEventName, UsageEventPropsByName } from '@/types/analytics';

// Émet un événement d'affichage **une seule fois** par montage d'écran.
//
// Le garde `useRef` n'est pas décoratif : en développement, React StrictMode monte chaque
// composant deux fois, et sans lui tous les entonnoirs seraient doublés — un biais qu'on ne
// verrait pas dans les chiffres, puisqu'il double tout de façon homogène. Les props sont
// lues à la première exécution seulement, par la même occasion : un écran qui rerend parce
// qu'une donnée arrive ne doit pas réémettre son affichage.
export function useTrackView<N extends UsageEventName>(
  name: N,
  ...args: UsageEventPropsByName[N] extends never ? [] : [props: UsageEventPropsByName[N]]
): void {
  const emis = useRef(false);
  // Capturées au premier rendu et jamais réécrites : réaffecter une ref pendant le rendu est
  // interdit par React (react-hooks/refs), et serait de toute façon sans effet ici puisque
  // seul le premier montage émet.
  const props = useRef(args[0]);

  useEffect(() => {
    if (emis.current) return;
    emis.current = true;
    (track as (n: N, p?: unknown) => void)(name, props.current);
  }, [name]);
}
