import React from 'react';
// Source : src/components/button.tsx — 54 de haut au moins, rayon 27, primary accent / secondary élément ;
// `onPanel` sur une surface teintée ; sous le doigt, la teinte appuyée, sans animation.
export function Button({ title, onPress, variant = 'primary', disabled, flex, onPanel, accessibilityHint, style, ...rest }) {
  // Posé sur un panneau gris ou teinté, un secondaire prend le fond de l'écran et un filet : gris sur
  // gris, sa forme disparaît. Sans effet sur le principal, dont l'accent se voit partout.
  const surPanneau = onPanel && variant === 'secondary';
  const bg = disabled ? 'var(--color-background-element)' : variant === 'primary' ? 'var(--color-accent)' : surPanneau ? 'var(--color-background)' : 'var(--color-background-element)';
  const color = disabled ? 'var(--color-text-tertiary)' : variant === 'primary' ? 'var(--color-on-accent)' : 'var(--color-text)';
  // `accessibilityHint` n'a pas d'équivalent sur web (react-native-web l'ignore) : il n'est pas rendu.
  return (
    <button type="button" onClick={onPress} disabled={disabled} aria-label={title} data-appui="fond" {...rest}
      style={{ '--teinte-appuyee': variant === 'primary' ? 'var(--color-accent-pressed)' : 'var(--color-background-pressed)', minHeight: 54, padding: '15px 24px', borderRadius: 27, border: surPanneau ? '1px solid var(--color-border)' : 0, background: bg, color, fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '24px', fontWeight: variant === 'secondary' ? 500 : 600, cursor: disabled ? 'default' : 'pointer', flex: flex ? 1 : undefined, width: flex ? undefined : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {title}
    </button>
  );
}
