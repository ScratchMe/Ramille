import React from 'react';
import { BarreContour } from 'ramille-design-system';

/** Le bilan précédent, en contour, au-dessus du bilan courant plein — l'usage de l'écart par poste. */
export const SousLaBarrePleine = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <BarreContour percent={82} hauteur={10} />
    <div style={{ height: 10, width: '62%', borderRadius: 5, background: 'var(--color-accent)' }} />
  </div>
);

/** À 14 px, la hauteur de la restitution d'un re-bilan. */
export const Restitution = () => <BarreContour percent={72} hauteur={14} />;
