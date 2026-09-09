import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

/**
 * Appuyer sur un rappel ramène au plan.
 *
 * **Ce composant existe pour une seule raison : isoler un hook qui n'existe pas sur web.**
 * `useLastNotificationResponse` appelle `ExpoNotifications.getLastNotificationResponse`, absent
 * du module web ; appelé pendant le rendu, il lève, et une exception au rendu du layout racine
 * emporte **tout** l'arbre React — page blanche sur toutes les routes, y compris les pages
 * légales. C'est arrivé en production le 08/09/2026 (v1-12, PR 2).
 *
 * Un hook ne peut pas être appelé conditionnellement ; un composant, si. Le montage est donc
 * gardé par l'appelant (`estNatif`), une constante de plateforme, donc stable pour toute la vie
 * de l'app — jamais une condition qui change entre deux rendus.
 *
 * Dans le cas courant il n'y a d'ailleurs rien à faire : la racine route déjà vers le plan dès
 * qu'un bilan existe, point en tête (v1-11 flux 4). Ce composant ne sert qu'au cas où l'app
 * était déjà ouverte ailleurs — sur « Toi », dans le questionnaire — où personne ne ramènerait
 * au plan sans lui. `useLastNotificationResponse` plutôt qu'un écouteur parce qu'il couvre
 * aussi le démarrage à froid, où l'événement est déjà passé quand l'écouteur s'installerait.
 */
export function RetourDeNotification() {
  const reponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!reponse) return;
    const cible = reponse.notification.request.content.data?.url;
    if (cible === '/plan') router.navigate('/plan');
  }, [reponse]);

  return null;
}
