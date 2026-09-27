import React from 'react';
// Source : src/components/illustrations/onboarding-hero-illustration.tsx — l'illustration de l'accueil : une silhouette au
// sol, un itinéraire pointillé qui la relie à ses modes (vélo, voiture), deux feuilles. Elle porte « une personne et
// ses trajets du quotidien », que la mascotte seule ne dit pas. Décorative, masquée au lecteur d'écran.
//
// Cadre carré en `slice` avec une marge d'environ 50 sur chaque bord : l'étape lui donne une hauteur plafonnée, donc
// son ratio réel varie, et aucun élément ne doit être rogné par un recadrage plus serré. Coins de 24.
export function OnboardingHeroIllustration({ style }) {
  return (
    <div aria-hidden="true" style={{ borderRadius: 24, overflow: 'hidden', ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 360 360" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <path d="M0 0H360V360H0Z" fill="var(--color-background-selected)" />
        <path d="M0 280 Q90 246 180 270 T360 258 V360 H0 Z" fill="var(--color-accent-muted)" opacity={0.45} />
        <path d="M108 254 C150 220 158 190 178 168 S 236 118 258 104" stroke="var(--color-background)" strokeWidth={4} strokeDasharray="1 14" strokeLinecap="round" fill="none" />
        <circle cx="96" cy="198" r="17" fill="var(--color-accent)" />
        <path d="M74 222 Q96 212 118 222 L122 274 Q96 282 70 274 Z" fill="var(--color-accent)" />
        <path d="M214 96 h44 a8 8 0 0 1 8 8 v14 h-60 v-14 a8 8 0 0 1 8-8 Z" fill="var(--color-accent-text)" opacity={0.9} />
        <path d="M222 96 l8 -16 h20 l8 16 Z" fill="var(--color-accent-text)" opacity={0.9} />
        <circle cx="218" cy="118" r="6" fill="var(--color-background)" />
        <circle cx="258" cy="118" r="6" fill="var(--color-background)" />
        <circle cx="216" cy="258" r="18" stroke="var(--color-accent-text)" strokeWidth={4} fill="none" />
        <circle cx="270" cy="258" r="18" stroke="var(--color-accent-text)" strokeWidth={4} fill="none" />
        <path d="M216 258 L244 216 L270 258 M244 216 L228 216 M244 216 L258 240" stroke="var(--color-accent-text)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M64 132 Q80 120 88 136 Q72 146 64 132 Z" fill="var(--color-accent)" opacity={0.55} />
        <line x1="64" y1="132" x2="82" y2="134" stroke="var(--color-background)" strokeWidth={1.5} opacity={0.7} />
        <path d="M290 176 Q306 164 314 180 Q298 190 290 176 Z" fill="var(--color-accent)" opacity={0.4} />
      </svg>
    </div>
  );
}
