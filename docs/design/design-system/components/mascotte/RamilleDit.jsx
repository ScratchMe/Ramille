import React from 'react';
import { Mascot } from './Mascot.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/ramille-dit.tsx — la mascotte et sa ligne, gap 8. La ligne vient de RAMILLE, jamais un nombre.
export function RamilleDit({ ligne, mood = 'calm', size = 40, tilt = 0, themeColor = 'textSecondary', accessory, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <Mascot mood={mood} size={size} tilt={tilt} accessory={accessory} />
      <ThemedText type="body" themeColor={themeColor} style={{ flex: 1, minWidth: 0 }}>{ligne}</ThemedText>
    </div>
  );
}
