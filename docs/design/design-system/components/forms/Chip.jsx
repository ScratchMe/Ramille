import React from 'react';
// Source : src/components/bilan/chip.tsx — pilule (padding 18) ou équirépartie (padding 4, flex).
export function Chip({ label, selected, onPress, flex, selectedStyle = 'solid', radius = 22, ariaLabel }) {
  const solid = selected && selectedStyle === 'solid';
  const bg = selected ? (solid ? 'var(--color-accent)' : 'var(--color-background-selected)') : 'var(--color-background-element)';
  const border = selected && selectedStyle === 'outline' ? 'var(--color-accent)' : 'transparent';
  return (
    <button type="button" onClick={onPress} aria-pressed={!!selected} aria-label={ariaLabel || label}
      style={{ padding: flex ? '12px 4px' : '12px 18px', border: '1.5px solid ' + border, borderRadius: radius, background: bg, color: solid ? 'var(--color-on-accent)' : 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: '20px', fontWeight: selected ? 600 : 400, flex: flex ? 1 : undefined, minWidth: 0, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
