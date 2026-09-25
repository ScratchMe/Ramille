import React from 'react';
// Source : src/components/bilan/chip.tsx — pilule (padding 18) ou équirépartie (padding 4, flex) ; 48 × 48 au
// moins ; un choix (`radio` ou `checkbox`) dont l'état passe par `aria-checked`.
export function Chip({ label, selected, onPress, role, flex, selectedStyle = 'solid', radius = 22, nestedBackground, accessibilityLabel }) {
  const solid = selected && selectedStyle === 'solid';
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
      style={{ '--teinte-appuyee': appuye, minHeight: 48, minWidth: 48, padding: flex ? '12px 4px' : '12px 18px', border: '1.5px solid ' + border, borderRadius: radius, background: bg, color: solid ? 'var(--color-on-accent)' : 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: '20px', fontWeight: selected ? 600 : 400, flex: flex ? 1 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {label}
    </button>
  );
}
