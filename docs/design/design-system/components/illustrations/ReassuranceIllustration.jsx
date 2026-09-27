import React from 'react';
// Source : src/components/illustrations/reassurance-illustration.tsx — le paysage calme de l'étape « Pas de jugement » :
// un soleil levant dans son halo, deux oiseaux, deux collines du fond vers le premier plan. Décorative, masquée au
// lecteur d'écran. Cadre 360 × 200 en `slice`, coins de 24.
export function ReassuranceIllustration({ style }) {
  return (
    <div aria-hidden="true" style={{ borderRadius: 24, overflow: 'hidden', ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <path d="M0 0H360V200H0Z" fill="var(--color-background-element-2)" />
        <circle cx="180" cy="70" r="70" fill="var(--color-background-selected)" opacity={0.6} />
        <circle cx="180" cy="70" r="34" fill="var(--color-background)" />
        <path d="M64 44 q8 -8 16 0 q8 -8 16 0" stroke="var(--color-text-tertiary)" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M258 30 q6 -6 12 0 q6 -6 12 0" stroke="var(--color-text-tertiary)" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M0 132 Q90 96 190 126 T360 108 V200 H0 Z" fill="var(--color-accent-muted)" opacity={0.5} />
        <path d="M0 172 Q100 138 210 168 T360 150 V200 H0 Z" fill="var(--color-accent)" opacity={0.85} />
      </svg>
    </div>
  );
}
