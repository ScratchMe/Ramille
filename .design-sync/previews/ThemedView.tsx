import React from 'react';
import { ThemedView, ThemedText } from 'ramille-design-system';

/**
 * Les surfaces du produit, chacune un jeton : le fond de la page, le panneau neutre, la teinte de
 * la décision dominante et du point de suivi.
 */
export const Surfaces = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <ThemedView type="background" style={{ border: '1px solid var(--color-border)', borderRadius: 18, padding: 20, gap: 4 }}>
      <ThemedText type="cardTitle">Faire ce trajet à vélo</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">background — carte bordée sur la page</ThemedText>
    </ThemedView>
    <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 16, gap: 4 }}>
      <ThemedText type="small" themeColor="textSecondary">Quelle motorisation ?</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">backgroundElement — le panneau neutre</ThemedText>
    </ThemedView>
    <ThemedView type="backgroundSelected" style={{ borderRadius: 18, padding: 18, gap: 4 }}>
      <ThemedText type="small" themeColor="accentText">Point de la semaine · 8 sept.</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">backgroundSelected — le point de suivi</ThemedText>
    </ThemedView>
  </div>
);
