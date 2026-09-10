import React from 'react';
// Source : src/components/button.tsx — 54 de haut, rayon 27, primary accent / secondary élément.
export function Button({ title, onPress, variant = 'primary', disabled, flex, style, ...rest }) {
  const bg = disabled ? 'var(--color-background-element)' : variant === 'primary' ? 'var(--color-accent)' : 'var(--color-background-element)';
  const color = disabled ? 'var(--color-text-tertiary)' : variant === 'primary' ? 'var(--color-on-accent)' : 'var(--color-text)';
  return (
    <button type="button" onClick={onPress} disabled={disabled} aria-label={title} {...rest}
      style={{ height: 54, borderRadius: 27, border: 0, padding: '0 24px', background: bg, color, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: variant === 'secondary' ? 500 : 600, cursor: disabled ? 'default' : 'pointer', flex: flex ? 1 : undefined, width: flex ? undefined : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {title}
    </button>
  );
}
