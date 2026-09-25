import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { TextLink } from '../core/TextLink.jsx';
// Source : src/components/auth/text-field.tsx — 56 de haut, rayon 16, contour `fieldBorder` au repos et accent si
// contenu ou action (`Stroke.field`) ; le texte saisi en Spline Sans.
export function TextField({ label, value = '', onChangeText, keyboardType = 'default', autoComplete, rightActionLabel, onRightAction, placeholder, helperText }) {
  const accented = (value && value.length > 0) || !!rightActionLabel;
  // Le clavier dit déjà que c'est une adresse : le remplissage s'en déduit quand rien d'autre n'est dit.
  const adresse = keyboardType === 'email-address';
  const remplissage = autoComplete || (adresse ? 'email' : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ThemedText type="small" themeColor="textTertiary">{label}</ThemedText>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderRadius: 16, border: 'var(--stroke-field) solid ' + (accented ? 'var(--color-accent)' : 'var(--color-field-border)'), background: 'var(--color-background-element)', padding: '0 18px' }}>
        <input type={adresse ? 'email' : 'text'} autoComplete={remplissage} autoCapitalize="none" value={value} placeholder={placeholder} aria-label={label} onChange={(e) => onChangeText && onChangeText(e.target.value)}
          style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 400, fontFamily: 'var(--font-sans)', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }} />
        {rightActionLabel && <TextLink label={rightActionLabel} onPress={onRightAction} type="small" weight={600} themeColor="accentText" />}
      </div>
      {helperText && <ThemedText type="small" themeColor="textSecondary">{helperText}</ThemedText>}
    </div>
  );
}
