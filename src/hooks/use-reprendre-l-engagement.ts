import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/**
 * Reprendre, au focus du plan, l'engagement déposé par l'écran des pistes (C5.2, `v1-17` §7.3) — et
 * **ne le consommer qu'une fois que la feuille des rappels peut être décidée**.
 *
 * `pret` dit que les préférences de rappel sont lues : sans elles, `ouvertureDeFeuille` ne peut rien
 * trancher. Sur le chemin nominal le plan est déjà monté sous les pistes, les préférences sont là, et
 * l'engagement est repris **au premier focus, sans attendre le rechargement** — c'est ce que la
 * cérémonie exige, une coupure au retour ne devant pas la coûter. Mais sur une pile neuve (les pistes
 * rechargées ou ouvertes par leur adresse, puis `revenirOu('/plan')` qui monte le plan à neuf), le
 * premier focus arrive **avant** la première lecture. Le plan reprenait alors le drapeau, trouvait
 * les préférences absentes et sortait : l'engagement était consommé, la feuille jamais proposée — et
 * elle ne s'ouvre qu'une fois par appareil (contre-lecture du 28/09/2026). Tant que `pret` est faux,
 * le drapeau reste donc dans la pile, et le focus se rejoue quand `pret` change.
 *
 * **Ce qui ne change pas** : le drapeau se consomme une fois, au passage — `useRafraichirAuRetour`
 * écoute aussi le retour de l'app au premier plan, donc un drapeau qui resterait posé rouvrirait la
 * feuille à chaque aller-retour.
 *
 * `reprendre` et `proposer` doivent être stables (`useMemo`, `useCallback`) : ce sont des dépendances
 * de l'effet, et une fonction recréée à chaque rendu le rejouerait à chaque rendu.
 */
export function useReprendreLEngagement(
  reprendre: () => { poste: string | null } | null,
  pret: boolean,
  proposer: (poste: string | null) => unknown
): void {
  useFocusEffect(
    useCallback(() => {
      if (!pret) return;
      const engagement = reprendre();
      if (engagement !== null) void proposer(engagement.poste);
    }, [reprendre, pret, proposer])
  );
}
