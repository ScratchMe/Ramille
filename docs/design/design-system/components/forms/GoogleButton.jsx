import React from 'react';
// Source : src/components/auth/google-button.tsx — blanc bordé 54/27, libellé fixe ; sous le doigt, la teinte
// appuyée de la surface neutre (le logo et le libellé, eux, ne bougent pas : ce sont ceux de la marque).
const LIBELLE = 'Se connecter avec Google';
export function GoogleButton({ onPress, loading }) {
  return (
    <button type="button" onClick={onPress} disabled={loading} aria-busy={!!loading} data-appui="fond"
      style={{ '--teinte-appuyee': 'var(--color-background-pressed)', width: '100%', height: 54, borderRadius: 27, border: '1px solid var(--color-border)', background: 'var(--color-background)', boxShadow: 'var(--shadow-tier)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>
      <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-background-element)' }} />
      {loading ? 'Connexion…' : LIBELLE}
    </button>
  );
}
