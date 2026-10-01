import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Le retour matériel d'Android recule d'une phase quand l'écran en a une derrière lui, et quitte
 * l'écran sinon (`v1-33`, Q-4 et T-8 — loi de Jakob : sur Android, le retour rend « l'état d'avant
 * tel que je l'ai vu »).
 *
 * Écrit une fois pour les écrans dont l'état change **sans changer de route** : les étapes du
 * questionnaire, l'adresse puis le code d'un écran de connexion, une confirmation ouverte sur
 * « Toi ». Sans lui, le retour quittait la route depuis n'importe quelle phase — et l'app, au premier
 * parcours, puisque la pile du questionnaire est vide. L'onboarding le faisait déjà pour lui seul ;
 * c'est sa forme qui est reprise ici.
 *
 * `precedente` est **l'action déjà présente à l'écran** qui ramène à la phase d'avant (« Retour »,
 * « Utiliser une autre adresse », « Annuler »), jamais une action nouvelle — ou `null` quand il n'y
 * a rien derrière, et le retour passe alors à la navigation. Elle est lue au moment de l'appui, par
 * une référence : l'abonnement ne se refait pas à chaque rendu, et l'appui voit toujours la phase
 * courante.
 *
 * Ne fait rien hors d'Android : sur web, le retour du navigateur est une navigation, et iOS n'a pas de
 * retour matériel.
 */
export function useRetourVersLaPhasePrecedente(precedente: (() => void) | null): void {
  const action = useRef(precedente);
  // Après le rendu et non pendant (règle des références de React) : l'appui arrive toujours après
  // l'effet du rendu qui a changé de phase.
  useEffect(() => {
    action.current = precedente;
  }, [precedente]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      const reculer = action.current;
      if (!reculer) return false;
      reculer();
      return true;
    });
    return () => abonnement.remove();
  }, []);
}
