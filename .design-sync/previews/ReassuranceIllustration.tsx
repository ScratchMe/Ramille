import React from 'react';
import { ReassuranceIllustration } from 'ramille-design-system';

/** Sur le fond teinté de l'étape « Pas de jugement », 180 de haut. */
export const SurFondTeinte = () => (
  <div style={{ background: 'var(--color-background-tinted)', padding: 24 }}>
    <ReassuranceIllustration style={{ height: 180 }} />
  </div>
);
