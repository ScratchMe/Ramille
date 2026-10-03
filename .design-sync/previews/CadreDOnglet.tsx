import React from 'react';
import { CadreDOnglet, LigneDAttente } from 'ramille-design-system';

const Fenetre = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', height: 220, display: 'flex' }}>
    {children}
  </div>
);

/**
 * Le cadre d'une pile d'onglet, autour d'un écran en chargement : la bande est déjà là, parce que c'est
 * la pile qui la pose, et non l'écran (R-9).
 */
export const AutourDUnChargement = () => (
  <Fenetre>
    <CadreDOnglet>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LigneDAttente>Chargement de ton plan…</LigneDAttente>
      </div>
    </CadreDOnglet>
  </Fenetre>
);
