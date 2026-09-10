import React from 'react';
// Source : src/components/onglet-icone.tsx — grille 24, trait 1,9, pastille 56×30 rayon 15 sur l'actif.
export function OngletIcone({ nom, focused, color }) {
  const c = color || (focused ? 'var(--color-accent)' : 'var(--color-text-tertiary)');
  return (
    <span style={{ width: 56, height: 30, borderRadius: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: focused ? 'var(--color-background-selected)' : 'transparent' }}>
      <svg width="22" height="22" viewBox="0 0 24 24">
        {nom === 'plan'
          ? <><path d="M5 12l4.5 4.5L19 7" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M4 20h16" stroke={c} strokeWidth="1.9" strokeLinecap="round" fill="none" /></>
          : <><path d="M4 15.5l5-5 3.5 3.5L20 7" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /><circle cx="20" cy="7" r="1.6" fill={c} /></>}
      </svg>
    </span>
  );
}
