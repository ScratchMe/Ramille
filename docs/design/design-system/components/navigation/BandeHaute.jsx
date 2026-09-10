import React from 'react';
import { CompteBouton } from './CompteBouton.jsx';
// Source : src/components/bande-haute.tsx — 52 de haut, trois créneaux, le nom au centre. Le nom, pas le visage.
export function BandeHaute({ onCompte, nom = 'Ramille' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 13px', borderBottom: '1px solid var(--color-border)', boxSizing: 'border-box', flexShrink: 0 }}>
      <div style={{ width: 44 }} />
      <h1 style={{ flex: 1, textAlign: 'center', margin: 0, fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: '24px', letterSpacing: '-0.1px', fontWeight: 600, color: 'var(--color-text)' }}>{nom}</h1>
      <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}><CompteBouton onPress={onCompte} /></div>
    </div>
  );
}
