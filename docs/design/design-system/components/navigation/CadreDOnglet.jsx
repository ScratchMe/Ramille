import React from 'react';
import { BandeHaute } from './BandeHaute.jsx';
// Source : src/components/cadre-d-onglet.tsx — le cadre de chaque pile d'onglet : la bande haute, puis l'écran. Posé
// une fois par le layout de la pile, autour de tous ses écrans et de tous leurs états : un écran ne rend plus la bande.
export function CadreDOnglet({ children, onCompte }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--color-background)' }}>
      <BandeHaute onCompte={onCompte} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}
