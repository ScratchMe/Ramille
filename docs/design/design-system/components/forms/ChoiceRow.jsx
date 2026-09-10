import React from 'react';
// Source : src/components/bilan/choice-row.tsx — rangée radio pleine largeur, 16/24 padding, rayon 16.
export function ChoiceRow({ label, detail, selected, onPress, disabled }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onPress} disabled={disabled}
      style={{ width: '100%', textAlign: 'left', padding: '16px 24px', borderRadius: 16, border: '1.5px solid ' + (selected ? 'var(--color-accent)' : 'transparent'), background: selected ? 'var(--color-background-selected)' : 'var(--color-background-element)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '22px', fontWeight: selected ? 600 : 400, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span>{label}</span>
      {detail && <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{detail}</span>}
    </button>
  );
}
