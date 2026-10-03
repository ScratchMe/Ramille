import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/text-link.tsx — texte cliquable dont la cible fait 48 px de haut sans déplacer le
// texte ; sous le doigt, il se souligne. Trois apparences nommées, et pas une de plus (`v1-33` T-5) : le corps
// est `small` partout, l'encre et la graisse viennent de `apparence`, et `style` ne règle que l'alignement.
const ENCRE = { action: 'accentText', discret: 'textTertiary', souligne: 'textTertiary' };
// Pas de valeur par défaut, comme dans le dépôt où la prop est obligatoire : un aperçu qui l'oublie se rend sans
// encre, au lieu de prendre l'accent sans que personne le voie.
export function TextLink({ label, apparence, onPress, disabled, role = 'button', hint, expanded, align, containerStyle, style }) {
  // `hint` n'a pas d'équivalent sur web (react-native-web ignore `accessibilityHint`) : il n'est pas rendu.
  // `align` n'existe pas dans le dépôt, qui centre par `style={{ textAlign: 'center' }}` : il reste
  // lisible parce que `ui_kits/ramille/` s'en sert.
  const alignement = align === 'center' ? { textAlign: 'center', ...style } : style;
  const texte = { ...alignement, textDecoration: apparence === 'souligne' ? 'underline' : undefined };
  return (
    <button type="button" onClick={onPress} disabled={disabled} role={role === 'link' ? 'link' : undefined} aria-expanded={expanded} data-appui={apparence === 'souligne' ? 'lien-souligne' : 'lien'}
      style={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'none', border: 0, padding: 0, cursor: disabled ? 'default' : 'pointer', font: 'inherit', textAlign: 'left', ...containerStyle }}>
      <ThemedText type="small" themeColor={disabled ? 'textTertiary' : ENCRE[apparence]} weight={apparence === 'action' ? 600 : 500} style={texte}>{label}</ThemedText>
    </button>
  );
}
