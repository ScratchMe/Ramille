import React from 'react';
// Source : src/components/themed-view.tsx — une surface dont le fond est un jeton du thème, choisi par `type`
// (`background` par défaut). Le kit n'a pas de thème à lire : le jeton devient la variable CSS du même nom,
// qui change d'elle-même sous `[data-theme="dark"]`.
const enKebab = (jeton) => jeton.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
export function ThemedView({ type = 'background', style, children, ...rest }) {
  return (
    <div {...rest} style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-' + enKebab(type) + ')', ...style }}>
      {children}
    </div>
  );
}
