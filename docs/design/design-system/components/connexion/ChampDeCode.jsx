import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/auth/champ-de-code.tsx — le champ du code à huit chiffres reçu par email : la forme de
// `TextField` (56 de haut, rayon 16, contour `fieldBorder` puis accent dès qu'il y a une saisie), mais le code en 24/30,
// centré, espacé de 6, à chiffres tabulaires. Il ne garde que les chiffres et coupe à huit (`chiffresDuCode`) : un code
// collé avec ses espaces ou son tiret entre tel quel. Clavier numérique et remplissage « code à usage unique ».
const LONGUEUR_DU_CODE = 8;
const chiffresDuCode = (saisie) => saisie.replace(/\D/g, '').slice(0, LONGUEUR_DU_CODE);
export function ChampDeCode({ value = '', onChangeText, label = 'Code reçu par email', helperText = LONGUEUR_DU_CODE + ' chiffres, sans espace. Il est vérifié dès le dernier chiffre.' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ThemedText type="small" themeColor="textTertiary">{label}</ThemedText>
      <div style={{ display: 'flex', justifyContent: 'center', height: 56, borderRadius: 16, border: 'var(--stroke-field) solid ' + (value.length > 0 ? 'var(--color-accent)' : 'var(--color-field-border)'), background: 'var(--color-background-element)', padding: '0 18px', boxSizing: 'border-box' }}>
        <input
          value={value}
          onChange={(e) => onChangeText && onChangeText(chiffresDuCode(e.target.value))}
          aria-label={label + ', ' + LONGUEUR_DU_CODE + ' chiffres'}
          aria-description={helperText}
          inputMode="numeric"
          autoComplete="one-time-code"
          style={{ width: '100%', fontSize: 24, lineHeight: '30px', letterSpacing: 6, textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 400, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }}
        />
      </div>
      <ThemedText type="small" themeColor="textSecondary">{helperText}</ThemedText>
    </div>
  );
}
