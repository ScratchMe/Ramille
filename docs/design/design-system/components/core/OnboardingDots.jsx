import React from 'react';
// Source : src/components/onboarding-dots.tsx — progression par points, jamais un pourcentage.
export function OnboardingDots({ total = 4, activeIndex = 0, onTint }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === activeIndex ? 'var(--color-accent)' : onTint ? 'var(--color-pagination-inactive)' : 'var(--color-border)' }} />
      ))}
    </div>
  );
}
