import React from 'react';
import { OngletIcone } from './OngletIcone.jsx';
// Composition de src/app/(tabs)/_layout.tsx — 60 de haut (+ encoche), bordure haute, libellé 12/16, 600 si actif.
export function BarreOnglets({ actif = 'plan', onChange, insetBottom = 0 }) {
  const items = [{ nom: 'plan', label: 'Plan' }, { nom: 'suivi', label: 'Suivi' }];
  return (
    <nav style={{ display: 'flex', height: 60 + insetBottom, paddingTop: 8, paddingBottom: insetBottom + 12, boxSizing: 'border-box', borderTop: '1px solid var(--color-border)', background: 'var(--color-background)', flexShrink: 0 }}>
      {items.map((it) => {
        const f = it.nom === actif;
        const c = f ? 'var(--color-accent)' : 'var(--color-text-tertiary)';
        return (
          <button key={it.nom} type="button" onClick={() => onChange && onChange(it.nom)} aria-current={f ? 'page' : undefined}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            <OngletIcone nom={it.nom} focused={f} color={c} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: '16px', fontWeight: f ? 600 : 500, color: c }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
