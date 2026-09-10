import React from 'react';
import { Mascot } from '../mascotte/Mascot.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/progress-header.tsx — mascotte 28 statique, section, « Étape N sur M », barre 6/3.
export function ProgressHeader({ section, step, total }) {
  const pct = total > 0 ? Math.round((step / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mascot mood={step >= total ? 'happy' : 'calm'} size={28} />
          <ThemedText type="small" themeColor="textTertiary">{section}</ThemedText>
        </div>
        <ThemedText type="small" themeColor="textTertiary">Étape {step} sur {total}</ThemedText>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', borderRadius: 3, background: 'var(--color-accent)' }} />
      </div>
    </div>
  );
}
