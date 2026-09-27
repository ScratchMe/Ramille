import React from 'react';
// Source : src/components/suivi/barre-contour.tsx — le bilan PRÉCÉDENT, sur les mêmes axes que le courant : une barre
// en contour `accentMuted` de 1,5 px, sans rail. Le contour superpose deux valeurs sans que la plus ancienne pèse
// autant que l'actuelle ; une seconde barre pleine, même atténuée, se lirait comme un second résultat. 1,5 et pas 1
// (qui disparaît à l'antialiasing) ni 2 (qui pèse autant qu'une barre pleine). Le rayon suit la hauteur.
export function BarreContour({ percent = 0, hauteur = 10 }) {
  const part = Math.max(0, Math.min(100, percent));
  return (
    <div aria-hidden="true" style={{ width: '100%', height: hauteur }}>
      <div style={{ height: '100%', width: part + '%', borderRadius: hauteur / 2, border: '1.5px solid var(--color-accent-muted)', boxSizing: 'border-box' }} />
    </div>
  );
}
