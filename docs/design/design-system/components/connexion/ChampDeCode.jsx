import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/auth/champ-de-code.tsx — le champ du code à huit chiffres reçu par email : la forme de
// `TextField` (56 de haut, rayon 16, contour `fieldBorder` puis accent dès qu'il y a une saisie), mais le code en 24/30,
// centré, espacé de 6, à chiffres tabulaires. Il ne garde que le code (`chiffresDuCode`) : un code collé avec ses espaces
// ou son tiret entre tel quel, et un collé qui porte d'autres chiffres garde la suite de huit — la dernière, d'un seul
// tenant d'abord —, pas les huit premiers chiffres (01/10/2026). Clavier numérique et remplissage « code à usage unique ».
const LONGUEUR_DU_CODE = 8;
const chiffresDuCode = (saisie) => {
  for (const motif of [/\d+/g, /\d(?:[\s-]?\d)*/g]) {
    const codes = (saisie.match(motif) || []).map((s) => s.replace(/\D/g, '')).filter((c) => c.length === LONGUEUR_DU_CODE);
    if (codes.length > 0) return codes[codes.length - 1];
  }
  return saisie.replace(/\D/g, '').slice(0, LONGUEUR_DU_CODE);
};
export function ChampDeCode({ value = '', onChangeText, label = 'Code reçu par email', helperText = LONGUEUR_DU_CODE + ' chiffres, sans espace. Il est vérifié dès le dernier chiffre.' }) {
  // Au focus, la bordure passe à l'accent et l'anneau du navigateur suit le cadre (`cadreDuChamp`, 01/10/2026).
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ThemedText type="small" themeColor="textTertiary">{label}</ThemedText>
      <div style={{ display: 'flex', justifyContent: 'center', height: 56, borderRadius: 16, border: 'var(--stroke-field) solid ' + (value.length > 0 || focus ? 'var(--color-accent)' : 'var(--color-field-border)'), outline: focus ? 'auto' : 'none', background: 'var(--color-background-element)', padding: '0 18px', boxSizing: 'border-box' }}>
        <input
          value={value}
          onChange={(e) => onChangeText && onChangeText(chiffresDuCode(e.target.value))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
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
