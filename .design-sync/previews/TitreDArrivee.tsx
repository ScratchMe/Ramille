import React from 'react';
import { TitreDArrivee, ThemedText, Button } from 'ramille-design-system';

/**
 * L'écran qui remplace le formulaire de retour après « Envoyer » : son titre prend le focus en
 * arrivant, pour que le lecteur d'écran dise l'envoi réussi.
 */
export const RetourEnvoye = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <TitreDArrivee>
      <ThemedText type="screenTitle">C’est envoyé, merci.</ThemedText>
    </TitreDArrivee>
    <ThemedText type="body" themeColor="textSecondary">
      Ton retour est lu à la main. Il n’y aura pas de réponse automatique.
    </ThemedText>
    <Button title="Revenir" variant="secondary" />
  </div>
);
