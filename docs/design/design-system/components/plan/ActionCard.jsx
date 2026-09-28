import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { PastilleEngagee } from './PastilleEngagee.jsx';
// Source : src/components/plan/action-card.tsx — rayon 18 padding 20 gap 8 ; engagée = bordure accent 2 + fond tinted +
// étiquette ; estompée = son filet passe de `border` à `backgroundElement`, sans opacité : le texte garde ses contrastes.
// Jumelle de `ligneDuGain` (src/types/plan.ts) : « par an » toujours en tête, collé au chiffre qu'il qualifie.
// Jumelle de `formatKg` (src/lib/format.ts) : les milliers groupés par une espace insécable U+00A0 — « − 1 601 »,
// jamais « − 1601 » (relevé le 28/09/2026 en préparant le canvas v1-30 : le kit écrivait `Math.round` seul).
const formatKg = (kg) => String(Math.round(kg)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const ligneDuGain = (intention, partPercent) =>
  ['par an', intention, partPercent != null ? Math.round(partPercent) + ' % de ton empreinte' : null].filter((m) => m).join(' · ');
export function ActionCard({ titre, gainKg, partPercent, detail, intention, premierPas, engagee, reconduite, estompee, children }) {
  const etiquette = reconduite ? 'TON ENGAGEMENT · RECONDUIT' : 'TON ENGAGEMENT';
  const cadre = engagee ? '2px solid var(--color-accent)' : '1px solid ' + (estompee ? 'var(--color-background-element)' : 'var(--color-border)');
  return (
    <div style={{ borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 8, border: cadre, background: engagee ? 'var(--color-background-tinted)' : 'transparent' }}>
      {engagee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PastilleEngagee />
          <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>{etiquette}</ThemedText>
        </div>
      )}
      <ThemedText type="cardTitle">{titre}</ThemedText>
      {gainKg != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText weight={600} themeColor="accentText" style={{ fontSize: 20, lineHeight: '26px', fontVariantNumeric: 'tabular-nums' }}>− {formatKg(gainKg)} kg CO₂e</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{ligneDuGain(engagee ? intention : null, partPercent)}</ThemedText>
        </div>
      )}
      {detail && <ThemedText type="small" themeColor="textTertiary">{detail}</ThemedText>}
      {/* Le premier pas, seulement une fois l'action engagée — avant le choix, une consigne pratique se lit comme
          une charge de plus — et jamais sur une action reconduite, où il arriverait une saison trop tard. Fond
          `background` dans une carte teintée : un creux, pas un relief. */}
      {engagee && !reconduite && premierPas && (
        <div style={{ background: 'var(--color-background)', borderRadius: 16, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText themeColor="textTertiary" weight={600} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>PREMIER PAS</ThemedText>
          <ThemedText type="small">{premierPas}</ThemedText>
        </div>
      )}
      {children}
    </div>
  );
}
