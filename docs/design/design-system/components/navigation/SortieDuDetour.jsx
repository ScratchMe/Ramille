import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/sortie-du-detour.tsx — la sortie d'un écran qui se consulte : en haut à gauche, au-dessus
// du titre, un chevron de 18 (trait 2, tertiaire) et son libellé en `small` 500 tertiaire. La cible fait 48 de haut,
// épouse son libellé, et recule de 6 px pour que le trait du chevron tombe sur la marge du contenu. Sous le doigt,
// la teinte appuyée des surfaces neutres, et le libellé se souligne.
export function SortieDuDetour({ label, onPress }) {
  return (
    <button type="button" onClick={onPress} role="link" aria-label={label} data-appui="fond"
      style={{ '--teinte-appuyee': 'var(--color-background-pressed)', minHeight: 48, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: -6, padding: '0 8px 0 0', borderRadius: 8, background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
      <ThemedText type="small" themeColor="textTertiary" weight={500}>{label}</ThemedText>
    </button>
  );
}
