import React from 'react';
import { OngletIcone } from 'ramille-design-system';

const Cellule = ({ legende, children }: { legende: string; children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    {children}
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{legende}</span>
  </div>
);

/**
 * Les deux seules icônes d'onglet, dessinées dans le dépôt — il n'y a pas de bibliothèque
 * d'icônes. Grille 24, trait 1,9. La pastille 56×30 marque l'onglet actif.
 */
export const LesDeuxEtats = () => (
  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', padding: 8 }}>
    <Cellule legende="plan · actif"><OngletIcone nom="plan" focused /></Cellule>
    <Cellule legende="plan"><OngletIcone nom="plan" focused={false} /></Cellule>
    <Cellule legende="suivi · actif"><OngletIcone nom="suivi" focused /></Cellule>
    <Cellule legende="suivi"><OngletIcone nom="suivi" focused={false} /></Cellule>
  </div>
);
