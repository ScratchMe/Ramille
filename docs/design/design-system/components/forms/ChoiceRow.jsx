import React from 'react';
// Source : src/components/bilan/choice-row.tsx — rangée radio pleine largeur, 16/24 padding, rayon 16.
// Avec `detail`, c'est src/components/ligne-de-canal.tsx. Désactivée (25/09/2026) : fond élément,
// titre tertiaire, détail lisible — jamais une opacité, et jamais l'air choisie (readme, « États »).
export function ChoiceRow({ label, detail, selected, onPress, disabled }) {
  const coche = !!selected && !disabled;
  return (
    <button type="button" role="radio" aria-checked={coche} onClick={onPress} disabled={disabled}
      style={{ width: '100%', textAlign: 'left', padding: '16px 24px', borderRadius: 16, border: '1.5px solid ' + (coche ? 'var(--color-accent)' : 'transparent'), background: coche ? 'var(--color-background-selected)' : 'var(--color-background-element)', color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '22px', fontWeight: coche ? 600 : 400, cursor: disabled ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span>{label}</span>
      {detail && <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{detail}</span>}
    </button>
  );
}
