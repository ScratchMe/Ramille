import React from 'react';
// Source : src/components/illustrations/empty-state-illustration.tsx — le fond rayé à 135° des états vides : bandes de 26
// en `backgroundElement2` sur `backgroundElement`, coins de 24. Décoratif, masqué au lecteur d'écran — le texte de
// l'état vide dit tout. C'est la forme du placeholder du readme (« rayé 135° »), rendue dans l'app.
const BANDE = 26;
const ECART = 26;
const COTE = 300;
const NOMBRE = Math.ceil((COTE * 2.5) / (BANDE + ECART));
export function EmptyStateIllustration({ style }) {
  return (
    <div aria-hidden="true" style={{ borderRadius: 24, overflow: 'hidden', ...style }}>
      <svg width="100%" height="100%" viewBox={'0 0 ' + COTE + ' ' + COTE} preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <rect x={0} y={0} width={COTE} height={COTE} fill="var(--color-background-element)" />
        <g transform={'rotate(135 ' + COTE / 2 + ' ' + COTE / 2 + ')'}>
          {Array.from({ length: NOMBRE }, (_, i) => (
            <rect key={i} x={-COTE} y={i * (BANDE + ECART) - COTE} width={COTE * 3} height={BANDE} fill="var(--color-background-element-2)" />
          ))}
        </g>
      </svg>
    </div>
  );
}
