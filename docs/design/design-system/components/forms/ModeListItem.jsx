import React from 'react';
// Source : src/components/bilan/mode-list-item.tsx — item de liste de modes, rayon `Radius.chip` (14),
// padding 14/16 ; sous le doigt, la teinte appuyée, la même sur blanc que sur gris.
export function ModeListItem({ label, selected, onPress, nestedBackground }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onPress} data-appui="fond"
      style={{ '--teinte-appuyee': selected ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)', width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1.5px solid ' + (selected ? 'var(--color-accent)' : 'transparent'), background: selected ? 'var(--color-background-selected)' : nestedBackground ? 'var(--color-background)' : 'var(--color-background-element)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '22px', fontWeight: selected ? 600 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
