import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-card.tsx — rayon 18 padding 20 gap 8 ; engagée = bordure accent 2 + fond tinted +
// étiquette ; estompée = son filet passe de `border` à `backgroundElement`, sans opacité : le texte garde ses contrastes.
// Jumelle de `ligneDuGain` (src/types/plan.ts) : « par an » toujours en tête, collé au chiffre qu'il qualifie.
const ligneDuGain = (intention, partPercent) =>
  ['par an', intention, partPercent != null ? Math.round(partPercent) + ' % de ton empreinte' : null].filter((m) => m).join(' · ');
export function ActionCard({ titre, gainKg, partPercent, detail, intention, engagee, reconduite, estompee, children }) {
  const etiquette = reconduite ? 'TON ENGAGEMENT · RECONDUIT' : 'TON ENGAGEMENT';
  const cadre = engagee ? '2px solid var(--color-accent)' : '1px solid ' + (estompee ? 'var(--color-background-element)' : 'var(--color-border)');
  return (
    <div style={{ borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 8, border: cadre, background: engagee ? 'var(--color-background-tinted)' : 'transparent' }}>
      {engagee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="var(--color-on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
          <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>{etiquette}</ThemedText>
        </div>
      )}
      <ThemedText type="cardTitle">{titre}</ThemedText>
      {gainKg != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText weight={600} themeColor="accentText" style={{ fontSize: 20, lineHeight: '26px', fontVariantNumeric: 'tabular-nums' }}>− {Math.round(gainKg)} kg CO₂e</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{ligneDuGain(engagee ? intention : null, partPercent)}</ThemedText>
        </div>
      )}
      {detail && <ThemedText type="small" themeColor="textTertiary">{detail}</ThemedText>}
      {children}
    </div>
  );
}
