import React from 'react';
// Source : src/components/bilan/choice-row.tsx — rangée radio pleine largeur, 16/24 padding, rayon 16 ;
// sous le doigt, la teinte appuyée de sa surface.
export function ChoiceRow({ label, selected, onPress }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onPress} data-appui="fond"
      style={{ '--teinte-appuyee': selected ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)', width: '100%', textAlign: 'left', padding: '16px 24px', borderRadius: 16, border: '1.5px solid ' + (selected ? 'var(--color-accent)' : 'transparent'), background: selected ? 'var(--color-background-selected)' : 'var(--color-background-element)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '22px', fontWeight: selected ? 600 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
