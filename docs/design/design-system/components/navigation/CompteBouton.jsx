import React from 'react';
// Source : src/components/compte-bouton.tsx — icône 22 dans une cible 44, trait 1,9 tertiaire.
export function CompteBouton({ onPress }) {
  return (
    <button type="button" onClick={onPress} aria-label="Ton compte" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
      <svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" stroke="var(--color-text-tertiary)" strokeWidth="1.9" fill="none" /><path d="M4.8 19.5c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9" stroke="var(--color-text-tertiary)" strokeWidth="1.9" strokeLinecap="round" fill="none" /></svg>
    </button>
  );
}
