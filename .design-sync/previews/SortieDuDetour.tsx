import React from 'react';
import { SortieDuDetour, ThemedText } from 'ramille-design-system';

/** Sa place : la première chose de l'écran, au-dessus du titre, le trait du chevron sur la marge du contenu. */
export const AuDessusDuTitre = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: 'var(--color-background)' }}>
    <SortieDuDetour label="Retour au plan" />
    <ThemedText type="screenTitle">Toutes les pistes</ThemedText>
  </div>
);

/** Le libellé ne change pas : il dit où l'on va quand ce n'est pas d'où l'on vient. */
export const TroisLibelles = () => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: 24, background: 'var(--color-background)' }}>
    <SortieDuDetour label="Retour" />
    <SortieDuDetour label="Retour au plan" />
    <SortieDuDetour label="Revenir à mon suivi" />
  </div>
);
