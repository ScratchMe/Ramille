import React from 'react';
import { FeuilleNouveauBilan } from 'ramille-design-system';

/** Avec un moment choisi : l'action et son moment restent engagés si le nouveau plan la propose encore. */
export const AvecIntention = () => (
  <FeuilleNouveauBilan engagement={{ action: 'Faire un trajet sur cinq à vélo', intention: 'le mardi et le jeudi' }} />
);

/** Une ligne sans intention : la phrase ne parle que de l'action. */
export const SansIntention = () => (
  <FeuilleNouveauBilan engagement={{ action: 'Remplacer un aller-retour en avion par le train', intention: null }} />
);
