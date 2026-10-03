import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/sortie-du-detour.tsx — la sortie d'un écran qui se consulte : en haut à gauche, au-dessus
// du titre, un chevron de 18 (grille 24, trait 1,9, tertiaire) et son libellé en `small` 500 tertiaire. La cible fait 48 de haut,
// épouse son libellé, et recule de 6 px pour que le trait du chevron tombe sur la marge du contenu. Sous le doigt,
// le libellé se souligne, comme celui d'un lien discret — sa couleur ne change pas.
export function SortieDuDetour({ label, onPress }) {
  return (
    <button type="button" onClick={onPress} role="link" aria-label={label} data-appui="lien"
      style={{ minHeight: 48, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: -6, padding: '0 8px 0 0', background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="var(--color-text-tertiary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
      <ThemedText type="small" themeColor="textTertiary" weight={500}>{label}</ThemedText>
    </button>
  );
}
