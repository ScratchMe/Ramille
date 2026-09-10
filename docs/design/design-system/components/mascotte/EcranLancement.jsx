import React from 'react';
import { Mascot } from './Mascot.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/ecran-lancement.tsx — fond = splash natif, mascotte 168, nom 30/38 accentText.
export function EcranLancement({ mood = 'happy', style }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--color-background-selected)', minHeight: 320, ...style }}>
      <Mascot mood={mood} size={168} />
      <ThemedText weight={600} themeColor="accentText" style={{ fontSize: 30, lineHeight: '38px', letterSpacing: '-0.6px', textAlign: 'center', alignSelf: 'stretch' }}>Ramille</ThemedText>
    </div>
  );
}
