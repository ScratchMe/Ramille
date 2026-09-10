import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/text-link.tsx — texte cliquable dont la cible fait 44 px sans déplacer le texte.
export function TextLink({ label, onPress, disabled, type = 'default', themeColor, weight, underline, align, style }) {
  return (
    <button type="button" onClick={onPress} disabled={disabled}
      style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', background: 'none', border: 0, padding: 0, cursor: disabled ? 'default' : 'pointer', font: 'inherit', textAlign: align || 'left', width: align === 'center' ? '100%' : undefined, ...style }}>
      <ThemedText type={type} themeColor={themeColor} weight={weight} style={{ textDecoration: underline ? 'underline' : 'none' }}>{label}</ThemedText>
    </button>
  );
}
