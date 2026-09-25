import React from 'react';
import { Mascot } from './Mascot.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/calcul-en-cours.tsx — pas de barre, pas de décompte.
export function CalculEnCours({ style }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24, minHeight: 320, ...style }}>
      <Mascot mood="thinking" size={72} animated />
      <ThemedText type="subtitle" headingLevel={1} style={{ textAlign: 'center' }}>Je calcule ton bilan…</ThemedText>
      <ThemedText type="body" themeColor="textTertiary" style={{ textAlign: 'center', maxWidth: 280 }}>Tes réponses, croisées avec les facteurs d’émission de l’ADEME. Quelques secondes.</ThemedText>
    </div>
  );
}
