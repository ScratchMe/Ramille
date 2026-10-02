import { useIsFocused } from 'expo-router';
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
 * **Seulement au premier plan, et c'est le crochet qui le garde** (contre-lecture du 01/10/2026). Un
 * écran couvert par un autre reste monté et garde son écoute ; or la plus récente parle la première,
 * et celle de l'écran du dessus n'existe souvent pas. Sans cette garde, le retour pris sur `/feedback`,
 * ouvert depuis « Ton mode n'est pas dans la liste ? », reculait d'une étape le questionnaire caché
 * dessous, et `/feedback` restait affiché : un retour qui paraît mort, autant de fois qu'il y a
 * d'étapes. Trois appelants la portaient à la main, deux l'avaient oubliée — elle vit donc ici.
 *
 * Ne fait rien hors d'Android : sur web, le retour du navigateur est une navigation, et iOS n'a pas de
 * retour matériel.
 */
export function useRetourVersLaPhasePrecedente(precedente: (() => void) | null): void {
  const auPremierPlan = useIsFocused();
  const action = useRef(auPremierPlan ? precedente : null);
  // Après le rendu et non pendant (règle des références de React) : l'appui arrive toujours après
  // l'effet du rendu qui a changé de phase — ou de premier plan.
  useEffect(() => {
    action.current = auPremierPlan ? precedente : null;
  }, [auPremierPlan, precedente]);

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
