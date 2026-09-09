import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Relit les données quand on **revient** sur un écran déjà monté.
 *
 * Sans ça, un écran de la barre d'onglets ne charge qu'une fois par lancement : react-navigation
 * le garde monté quand on change d'onglet, et l'app entière survit à un passage en arrière-plan.
 * Le plan affichait donc l'état du monde au moment où l'app a démarré.
 *
 * **C'est le rappel qui a rendu ce défaut visible, et c'est lui qu'il empêchait de fonctionner**
 * (09/09/2026) : une notification arrive précisément parce qu'une question vient de s'ouvrir
 * côté serveur : appuyer dessus avec l'app en arrière-plan ramenait sur un plan sans la
 * question, c'est-à-dire sur la promesse rompue — « réponds-moi en un geste » menant à un
 * écran qui ne propose rien.
 *
 * Deux retours, deux déclencheurs, et il faut les deux :
 *   - **le focus de l'écran**, quand on arrive depuis un autre onglet ou un autre écran ;
 *   - **le retour de l'app au premier plan**, que la navigation ne voit pas — l'écran n'a
 *     jamais perdu le focus, c'est l'app qui était derrière.
 *
 * Le premier focus est ignoré : l'écran vient de charger, le refaire doublerait chaque montage.
 * L'écoute d'`AppState` vit dans l'effet de focus, donc seul l'écran visible se rafraîchit.
 *
 * `rafraichir` doit être stable (`useCallback`), sinon l'abonnement se recrée à chaque rendu.
 */
export function useRafraichirAuRetour(rafraichir: () => void): void {
  const premierFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (premierFocus.current) {
        premierFocus.current = false;
      } else {
        rafraichir();
      }

      const abonnement = AppState.addEventListener('change', (etat) => {
        if (etat === 'active') rafraichir();
      });

      return () => abonnement.remove();
    }, [rafraichir])
  );
}
