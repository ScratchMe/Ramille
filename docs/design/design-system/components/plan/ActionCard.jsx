import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-card.tsx — rayon 18 padding 20 gap 8 ; engagée = bordure accent 2 + fond tinted + étiquette ; estompée = opacité 0,72.
export function ActionCard({ titre, gainKg, partPercent, detail, intention, engagee, estompee, etiquette = 'TON ENGAGEMENT', children }) {
  return (
    <div style={{ borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 8, border: (engagee ? '2px solid var(--color-accent)' : '1px solid var(--color-border)'), background: engagee ? 'var(--color-background-tinted)' : 'transparent', opacity: estompee ? 0.72 : 1 }}>
      {engagee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
          <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>{etiquette}</ThemedText>
        </div>
      )}
      <ThemedText type="cardTitle">{titre}</ThemedText>
      {gainKg != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText weight={600} themeColor="accentText" style={{ fontSize: 20, lineHeight: '26px' }}>− {Math.round(gainKg)} kg CO₂e</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{intention ? intention.charAt(0).toUpperCase() + intention.slice(1) + ' · par an' : 'par an'}{partPercent != null ? ' · ' + Math.round(partPercent) + ' % de ton empreinte' : ''}</ThemedText>
        </div>
      )}
      {detail && <ThemedText type="small" themeColor="textTertiary">{detail}</ThemedText>}
      {children}
    </div>
  );
}
