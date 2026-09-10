import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { TextLink } from '../core/TextLink.jsx';
// Source : src/components/auth/text-field.tsx — 56 de haut, rayon 16, bordure accent si contenu ou action.
export function TextField({ label, value = '', onChangeText, type = 'text', rightActionLabel, onRightAction, placeholder, helperText }) {
  const accented = (value && value.length > 0) || !!rightActionLabel;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ThemedText type="small" themeColor="textTertiary">{label}</ThemedText>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderRadius: 16, border: '1.5px solid ' + (accented ? 'var(--color-accent)' : 'transparent'), background: 'var(--color-background-element)', padding: '0 18px', boxSizing: 'border-box' }}>
        <input type={type} value={value} placeholder={placeholder} aria-label={label} onChange={(e) => onChangeText && onChangeText(e.target.value)}
          style={{ flex: 1, minWidth: 0, fontSize: 16, fontFamily: 'var(--font-sans)', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }} />
        {rightActionLabel && <TextLink label={rightActionLabel} onPress={onRightAction} type="small" weight={600} themeColor="accentText" />}
      </div>
      {helperText && <ThemedText type="small" themeColor="textSecondary">{helperText}</ThemedText>}
    </div>
  );
}
