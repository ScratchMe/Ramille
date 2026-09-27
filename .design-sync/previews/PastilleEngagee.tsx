import React from 'react';
import { PastilleEngagee, ThemedText } from 'ramille-design-system';

/** La coche d'une action engagée, toujours à côté du texte qui dit la même chose. */
export const AvecEtiquette = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <PastilleEngagee />
    <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>
      TON ENGAGEMENT
    </ThemedText>
  </div>
);
