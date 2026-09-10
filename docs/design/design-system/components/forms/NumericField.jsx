import React from 'react';
// Source : src/components/bilan/numeric-field.tsx — 64 de haut, bordure accent permanente, 28/600.
export function NumericField({ value, onChange, unit, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 64, borderRadius: 16, border: '1.5px solid var(--color-accent)', background: 'var(--color-background-element)', padding: '0 20px', boxSizing: 'border-box' }}>
      <input inputMode="numeric" aria-label={label + ', en ' + unit} placeholder="0" value={value == null ? '' : value}
        onChange={(e) => { const c = e.target.value.replace(/[^0-9]/g, ''); onChange && onChange(c === '' ? null : Number(c)); }}
        style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }} />
      <span style={{ fontSize: 17, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>{unit}</span>
    </div>
  );
}
