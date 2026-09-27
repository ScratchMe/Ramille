import React from 'react';
// Source : src/components/plan/pastille-engagee.tsx — la coche qui marque une action engagée : 20 px, fond `accent`,
// trait `onAccent` de 3. Une seule implémentation pour ses deux surfaces — l'en-tête d'une carte d'action, et la
// ligne engagée de « Toutes les pistes » : le dépôt n'a pas d'icônes, donc ce tracé EST le vocabulaire.
// Purement décorative : ce qu'elle signifie est porté par le texte à côté d'elle.
export function PastilleEngagee() {
  return (
    <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="var(--color-on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
    </span>
  );
}
