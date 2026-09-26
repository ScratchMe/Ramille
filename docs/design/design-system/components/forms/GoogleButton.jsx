import React from 'react';
// Source : src/components/auth/google-button.tsx — blanc bordé, 54 de haut au moins, rayon 27, libellé fixe, sans
// ombre. Sous le doigt, la teinte appuyée de la surface neutre ; le logo et le libellé, eux, ne bougent pas : ce
// sont ceux de la marque.
const LIBELLE = 'Se connecter avec Google';

// Le « G » officiel de Google, quatre chemins dans un `viewBox` 0 0 24 24 — il ne se redessine pas, et il ne se
// remplace pas par une pastille en attendant. Aucune couleur du thème : ce sont celles de la marque, qui ne suivent
// ni la palette du produit ni le thème sombre (la seule exception du kit à « jamais une couleur en dur »). Masqué
// au lecteur d'écran : le bouton porte déjà son libellé.
function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function GoogleButton({ onPress, loading }) {
  return (
    // Le libellé annoncé est le texte affiché, y compris pendant l'attente, où il ne s'affiche plus : l'indicateur
    // remplace logo et libellé (`ActivityIndicator` dans le dépôt), et `aria-busy` dit que ça travaille.
    <button type="button" onClick={onPress} disabled={loading} aria-label={LIBELLE} aria-busy={!!loading} data-appui="fond"
      style={{ '--teinte-appuyee': 'var(--color-background-pressed)', width: '100%', minHeight: 54, padding: '15px 0', borderRadius: 27, border: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '24px', fontWeight: 600, color: 'var(--color-text)', cursor: loading ? 'default' : 'pointer' }}>
      {loading ? <span data-attente="" aria-hidden="true" /> : <><LogoGoogle />{LIBELLE}</>}
    </button>
  );
}
