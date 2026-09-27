import React from 'react';
// Source : src/components/plan/trait-de-temps.tsx — le temps écoulé dans la période, sous la carte du cap, sur le rail
// des barres du produit (6 px, rayon 3). Il mesure la SAISON, pas la personne : il se remplit en `accentMuted`, jamais
// en `accent` — rien de ce que la personne fait ne le fait avancer, et le lire comme une jauge vers le cap ferait de
// chaque semaine écoulée un retard. Masqué au lecteur d'écran : la carte dit déjà « jusqu'au 30 novembre ».
export function TraitDeTemps({ progression = 0 }) {
  const part = Math.max(0, Math.min(1, progression));
  return (
    <div aria-hidden="true" style={{ height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6, background: 'var(--color-border)' }}>
      <div style={{ height: '100%', borderRadius: 3, width: part * 100 + '%', background: 'var(--color-accent-muted)' }} />
    </div>
  );
}
