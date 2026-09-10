import React from 'react';
// Source : src/components/themed-text.tsx — un type porte taille, interligne et poids par défaut.
const SIZES = {
  default: { fontSize: 16, lineHeight: '24px', fontWeight: 500 },
  small: { fontSize: 14, lineHeight: '20px', fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: '20px', fontWeight: 700 },
  title: { fontSize: 48, lineHeight: '52px', fontWeight: 600 },
  subtitle: { fontSize: 32, lineHeight: '44px', fontWeight: 600 },
  link: { fontSize: 14, lineHeight: '30px', fontWeight: 500 },
  linkPrimary: { fontSize: 14, lineHeight: '30px', fontWeight: 600, color: 'var(--color-accent-text)' },
  code: { fontSize: 12, lineHeight: '18px', fontWeight: 500, fontFamily: 'var(--font-mono)' },
  screenTitle: { fontSize: 26, lineHeight: '32px', letterSpacing: '-0.26px', fontWeight: 600 },
  salient: { fontSize: 30, lineHeight: '36px', letterSpacing: '-0.6px', fontWeight: 600 },
  cardTitle: { fontSize: 17, lineHeight: '24px', fontWeight: 600 },
  body: { fontSize: 15, lineHeight: '22px', fontWeight: 500 },
};
const COLORS = {
  text: 'var(--color-text)', textSecondary: 'var(--color-text-secondary)', textTertiary: 'var(--color-text-tertiary)',
  accent: 'var(--color-accent)', accentText: 'var(--color-accent-text)',
};
export function ThemedText({ type = 'default', themeColor, weight, as, style, children, ...rest }) {
  const base = SIZES[type] || SIZES.default;
  const isHeader = type === 'title' || type === 'subtitle' || type === 'screenTitle';
  const Tag = as || (isHeader ? 'h2' : 'span');
  return React.createElement(Tag, {
    ...rest,
    style: { margin: 0, fontFamily: base.fontFamily || 'var(--font-sans)', color: COLORS[themeColor] || base.color || 'var(--color-text)', textWrap: 'pretty', display: 'block', ...base, ...(weight ? { fontWeight: weight } : {}), ...style },
  }, children);
}
