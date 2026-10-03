import React from 'react';
// Source : src/components/bilan/chip.tsx — pilule (padding 18) ou équirépartie (padding 4, flex) ; 48 × 48 au
// moins ; un choix (`radio` ou `checkbox`) dont l'état passe par `aria-checked`. Le libellé est centré sur
// toutes ses lignes, pas seulement sa boîte (30/09/2026, `v1-27` §12.19) — un `<button>` le fait déjà par
// défaut, la déclaration le rend explicite.
// **Une graisse, cochée ou non, et une case pour ce qui se cumule** (03/10/2026, canvas de l'étape du contexte,
// option B) : le 600 de la puce cochée élargissait son libellé et faisait sauter une voisine à la ligne ; une
// puce `checkbox` porte une case de 18 (vide, ou blanche à coche accent), toujours là, donc la puce garde sa
// largeur. La coche est le tracé de `PastilleEngagee`.
export function Chip({ label, selected, onPress, role, flex, selectedStyle = 'solid', radius = 22, nestedBackground, accessibilityLabel }) {
  const solid = selected && selectedStyle === 'solid';
  const aCocher = role === 'checkbox';
  // Posée dans un encart teinté, la puce non choisie prend le fond de la page : sur le même gris que
  // l'encart, elle n'a plus de bord et se lit comme du texte.
  const bg = selected ? (solid ? 'var(--color-accent)' : 'var(--color-background-selected)') : nestedBackground ? 'var(--color-background)' : 'var(--color-background-element)';
  // Sous le doigt, chaque surface a sa teinte, pour que le texte garde son contraste.
  const appuye = selected ? (solid ? 'var(--color-accent-pressed)' : 'var(--color-background-selected-pressed)') : 'var(--color-background-pressed)';
  const border = selected && selectedStyle === 'outline' ? 'var(--color-accent)' : 'transparent';
  // Le rôle est obligatoire dans le dépôt. Sans lui — le sélecteur d'écrans de `ui_kits/`, qui n'est pas
  // une puce du produit —, la puce reste un bouton à bascule.
  const etat = role ? { role, 'aria-checked': !!selected } : { 'aria-pressed': !!selected };
  return (
    <button type="button" onClick={onPress} {...etat} aria-label={accessibilityLabel || label} data-appui="fond"
      style={{ '--teinte-appuyee': appuye, minHeight: 48, minWidth: 48, padding: flex ? '12px 4px' : aCocher ? '12px 16px 12px 12px' : '12px 18px', gap: aCocher ? (flex ? 6 : 8) : undefined, border: '1.5px solid ' + border, borderRadius: radius, background: bg, color: solid ? 'var(--color-on-accent)' : 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: '20px', fontWeight: 500, textAlign: 'center', flex: flex ? 1 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {aCocher && (
        <span aria-hidden="true" style={{ width: 18, height: 18, boxSizing: 'border-box', borderRadius: 5, border: '1.5px solid ' + (selected ? 'var(--color-on-accent)' : 'var(--color-field-border)'), background: selected ? 'var(--color-on-accent)' : 'var(--color-background)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        </span>
      )}
      {label}
    </button>
  );
}
