import React from 'react';
import { CompteBouton } from 'ramille-design-system';

/**
 * L'accès au compte : une icône de 22 dans une cible de 44 — la cible minimale du produit.
 * Le trait discontinu la matérialise ici, il n'existe pas à l'écran.
 */
export const DansSaCible = () => (
  <div style={{ display: 'inline-flex', padding: 8, background: 'var(--color-background)' }}>
    <div style={{ outline: '1px dashed var(--color-accent-muted)', outlineOffset: 0, display: 'inline-flex' }}>
      <CompteBouton />
    </div>
  </div>
);

/**
 * Sa place réelle : au bout d'une bande haute de 52, le nom restant centré. **Le nom, pas le
 * visage** — la mascotte n'est pas un logo d'en-tête.
 */
export const AuBoutDeLaBande = () => (
  <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 4px 0 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
    <div style={{ flex: 1, textAlign: 'center', fontSize: 17, lineHeight: '24px', fontWeight: 600, paddingLeft: 40 }}>Ramille</div>
    <CompteBouton />
  </div>
);

/** Une icône, pas un onglet : le compte est un détour du produit, pas un de ses deux lieux. */
export const PasUnOnglet = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: 'var(--color-background)' }}>
    <CompteBouton />
    <span style={{ fontSize: 14, lineHeight: '20px', color: 'var(--color-text-tertiary)' }}>
      Toi — export, suppression, canal de rappel
    </span>
  </div>
);
