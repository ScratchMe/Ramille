import React from 'react';
// Source : src/components/onboarding-dots.tsx — progression par points, jamais un pourcentage. Les points sont
// muets un à un ; la rangée est une `progressbar` qui dit l'étape en mots (« Étape 2 sur 4 »), sans quoi un lecteur
// d'écran traversait quatre formes sans rien annoncer.
export function OnboardingDots({ total = 4, activeIndex = 0, onTint }) {
  const etape = Math.min(total, activeIndex + 1);
  return (
    <div role="progressbar" aria-label={'Étape ' + etape + ' sur ' + total} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === activeIndex ? 'var(--color-accent)' : onTint ? 'var(--color-pagination-inactive)' : 'var(--color-border)' }} />
      ))}
    </div>
  );
}
