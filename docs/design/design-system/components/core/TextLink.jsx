import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/text-link.tsx — texte cliquable dont la cible fait 48 px de haut sans déplacer le
// texte ; sous le doigt, il se souligne. `style` va au texte, `containerStyle` à la cible, comme dans le dépôt.
export function TextLink({ label, onPress, disabled, role = 'button', hint, expanded, type = 'default', themeColor, weight, align, containerStyle, style }) {
  // `hint` n'a pas d'équivalent sur web (react-native-web ignore `accessibilityHint`) : il n'est pas rendu.
  // `align` n'existe pas dans le dépôt, qui centre par `style={{ textAlign: 'center' }}` : il reste
  // lisible parce que `ui_kits/ramille/` s'en sert.
  const texte = align === 'center' ? { textAlign: 'center', ...style } : style;
  return (
    <button type="button" onClick={onPress} disabled={disabled} role={role === 'link' ? 'link' : undefined} aria-expanded={expanded} data-appui="lien"
      style={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'none', border: 0, padding: 0, cursor: disabled ? 'default' : 'pointer', font: 'inherit', textAlign: 'left', ...containerStyle }}>
      <ThemedText type={type} themeColor={themeColor} weight={weight} style={texte}>{label}</ThemedText>
    </button>
  );
}
