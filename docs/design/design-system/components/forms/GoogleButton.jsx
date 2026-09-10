import React from 'react';
// Source : src/components/auth/google-button.tsx — blanc bordé 54/27 ; à remplacer par le bouton officiel non personnalisé.
export function GoogleButton({ onPress, loading, label = 'Se connecter avec Google' }) {
  return (
    <button type="button" onClick={onPress} disabled={loading} aria-busy={!!loading}
      style={{ width: '100%', height: 54, borderRadius: 27, border: '1px solid var(--color-border)', background: 'var(--color-background)', boxShadow: 'var(--shadow-tier)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>
      <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-background-element)' }} />
      {loading ? 'Connexion…' : label}
    </button>
  );
}
