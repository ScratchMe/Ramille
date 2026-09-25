import React from 'react';
// Source : src/components/themed-text.tsx — un type porte taille, interligne et poids par défaut ; les
// titres sont des en-têtes, avec leur niveau ; les espaces insécables sont posées au rendu.
const SIZES = {
  default: { fontSize: 16, lineHeight: '24px', fontWeight: 500 },
  small: { fontSize: 14, lineHeight: '20px', fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: '20px', fontWeight: 700 },
  title: { fontSize: 48, lineHeight: '52px', fontWeight: 600 },
  subtitle: { fontSize: 32, lineHeight: '44px', fontWeight: 600 },
  link: { fontSize: 14, lineHeight: '30px', fontWeight: 500 },
  linkPrimary: { fontSize: 14, lineHeight: '30px', fontWeight: 600, color: 'var(--color-accent-text)' },
  // La chasse fixe : sources et codes techniques seulement, jamais une phrase adressée à la personne.
  code: { fontSize: 12, lineHeight: '18px', fontWeight: 500, fontFamily: 'var(--font-mono)' },
  screenTitle: { fontSize: 26, lineHeight: '32px', letterSpacing: '-0.26px', fontWeight: 600 },
  salient: { fontSize: 30, lineHeight: '36px', letterSpacing: '-0.6px', fontWeight: 600 },
  cardTitle: { fontSize: 17, lineHeight: '24px', fontWeight: 600 },
  body: { fontSize: 15, lineHeight: '22px', fontWeight: 500 },
  display: { fontSize: 32, lineHeight: '38px', letterSpacing: '-0.64px', fontWeight: 600 },
};
const COLORS = {
  text: 'var(--color-text)', textSecondary: 'var(--color-text-secondary)', textTertiary: 'var(--color-text-tertiary)',
  accent: 'var(--color-accent)', accentText: 'var(--color-accent-text)',
};
// Les types qui portent le titre d'un écran : en-têtes de niveau 1. Tout autre en-tête — `subtitle`,
// ou un texte déclaré `accessibilityRole="header"` — est une section, donc de niveau 2.
const TITRES_DECRAN = ['title', 'screenTitle', 'display'];
const EN_TETES = ['title', 'subtitle', 'screenTitle', 'display'];

// Jumelle de `espacesInsecables` (src/types/typographie.ts) : U+00A0 à la place de l'espace ordinaire
// avant `?`, `!`, `:`, `;` et `»`, et après `«`. Elle n'ajoute aucune espace, ne touche pas une espace
// déjà insécable, et ne s'applique qu'aux chaînes : un texte l'écrit avec une espace ordinaire.
// L'insécable s'écrit par son point de code, jamais collée : collée, elle ne se distingue pas d'une
// espace ordinaire à la relecture (`FRONT.md` §1).
const INSECABLE = '\u00A0';
const espacesInsecables = (enfant) =>
  typeof enfant === 'string' ? enfant.replace(/ (?=[?!:;»])/g, INSECABLE).replace(/« /g, '«' + INSECABLE) : enfant;

export function ThemedText({ type = 'default', themeColor, weight, headingLevel, accessibilityRole, as, style, children, ...rest }) {
  const base = SIZES[type] || SIZES.default;
  const enTete = (accessibilityRole || (EN_TETES.includes(type) ? 'header' : undefined)) === 'header';
  const niveau = headingLevel || (TITRES_DECRAN.includes(type) ? 1 : 2);
  // `as` n'existe pas dans le dépôt : il reste lisible parce que `ui_kits/ramille/` s'en sert.
  const Tag = as || (enTete ? 'h' + niveau : 'span');
  const enfants = Array.isArray(children) ? children.map(espacesInsecables) : [espacesInsecables(children)];
  return React.createElement(Tag, {
    ...rest,
    style: { margin: 0, fontFamily: base.fontFamily || 'var(--font-sans)', color: COLORS[themeColor] || base.color || 'var(--color-text)', textWrap: 'pretty', display: 'block', ...base, ...(weight ? { fontWeight: weight } : {}), ...style },
  }, ...enfants);
}
