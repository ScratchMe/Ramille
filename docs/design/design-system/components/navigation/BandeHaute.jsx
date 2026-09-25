import React from 'react';
import { CompteBouton } from './CompteBouton.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bande-haute.tsx — 52 de haut, trois créneaux de 48, le nom au centre. Le nom, pas le visage ;
// un repère, pas un titre : il n'est pas annoncé en en-tête, le titre de l'écran reste le premier.
export function BandeHaute({ onCompte }) {
  // 24 − (48 − 22) / 2 = 11 : le bord visible de l'icône du compte tombe sur la marge du contenu (24).
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 11px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
      <div style={{ width: 48 }} />
      <ThemedText weight={600} style={{ flex: 1, textAlign: 'center', fontSize: 17, lineHeight: '24px', letterSpacing: '-0.1px' }}>Ramille</ThemedText>
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><CompteBouton onPress={onCompte} /></div>
    </div>
  );
}
