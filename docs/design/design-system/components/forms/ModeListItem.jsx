import React from 'react';
// Source : src/components/bilan/mode-list-item.tsx — item de liste de modes, rayon `Radius.chip` (14), trait 1,5 ;
// 48 de haut au moins (`ControlHeight.target`), rembourrage 4/16, libellé centré 16/22 : un libellé agrandi fait
// grandir la rangée au lieu de déborder. Sous le doigt, la teinte appuyée, la même sur blanc que sur gris.
export function ModeListItem({ label, selected, onPress, nestedBackground }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onPress} data-appui="fond"
      style={{ '--teinte-appuyee': selected ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)', width: '100%', minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left', padding: '4px 16px', borderRadius: 14, border: '1.5px solid ' + (selected ? 'var(--color-accent)' : 'transparent'), background: selected ? 'var(--color-background-selected)' : nestedBackground ? 'var(--color-background)' : 'var(--color-background-element)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '22px', fontWeight: selected ? 600 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
