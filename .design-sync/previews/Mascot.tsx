import React from 'react';
import { Mascot } from 'ramille-design-system';

const Cellule = ({ legende, children }: { legende: string; children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    {children}
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{legende}</span>
  </div>
);

/**
 * Les cinq expressions, et aucune n'est négative — il ne faut pas en ajouter. `thinking`
 * est la seule asymétrie assumée : le regard est décalé d'une unité.
 */
export const Expressions = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
    {(['calm', 'happy', 'encouraging', 'thinking', 'resting'] as const).map((m) => (
      <Cellule key={m} legende={m}><Mascot mood={m} size={96} /></Cellule>
    ))}
  </div>
);

/**
 * La géométrie est calculée, pas redimensionnée : les traits s'épaississent à mesure que la
 * taille baisse, et sous 28 px c'est la feuille seule qui est rendue plutôt qu'un visage
 * illisible.
 */
export const CompensationOptique = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
    {[42, 40, 36, 28, 24].map((s) => (
      <Cellule key={s} legende={String(s)}><Mascot mood="calm" size={s} /></Cellule>
    ))}
  </div>
);

/** L'inclinaison est le second registre : penchée elle regarde, droite elle accompagne. */
export const Inclinaison = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
    <Cellule legende="−12°"><Mascot mood="happy" size={80} tilt={-12} /></Cellule>
    <Cellule legende="−6°"><Mascot mood="calm" size={80} tilt={-6} /></Cellule>
    <Cellule legende="0°"><Mascot mood="calm" size={80} /></Cellule>
    <Cellule legende="+12°"><Mascot mood="encouraging" size={80} tilt={12} /></Cellule>
  </div>
);

/** Sur le thème sombre, l'encre du visage ne change pas. */
export const ThemeSombre = () => (
  <div data-theme="dark" style={{ background: 'var(--color-background)', padding: 24, borderRadius: 18, display: 'flex', gap: 24 }}>
    <Mascot mood="calm" size={80} />
    <Mascot mood="resting" size={80} />
  </div>
);
