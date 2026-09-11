import React from 'react';
import { OnboardingDots } from 'ramille-design-system';

/** Les quatre écrans de l'onboarding, du premier au dernier. */
export const Progression = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
    {[0, 1, 2, 3].map((i) => <OnboardingDots key={i} total={4} activeIndex={i} />)}
  </div>
);

/** Sur le fond teinté du troisième écran, les points inactifs changent de neutre. */
export const SurTeinte = () => (
  <div style={{ background: 'var(--color-background-tinted)', padding: 20, borderRadius: 18 }}>
    <OnboardingDots total={4} activeIndex={2} onTint />
  </div>
);
