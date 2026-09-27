import React from 'react';
import { Button } from '../core/Button.jsx';
import { OnboardingDots } from '../core/OnboardingDots.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/onboarding/etape-contexte.tsx — les repères avant le bilan : la moyenne française et la cible
// 2050 en barres pleines, puis les cinq postes de l'empreinte, le transport en tête et seul en accent. La source des
// chiffres en chasse fixe — c'est la règle, pas une exception : la chasse fixe est réservée aux sources et aux codes.
//
// Valeurs de `src/constants/carbon-reference.ts`, recopiées : SDES 2017, total 9,5 t calculé comme la somme des postes,
// cible 2050 de 2 t (ADEME). Formatées comme `formatTonnesTexte` (« 9,5 tonnes », « 2 tonnes ») et `formatTonnesShort`
// (« 9,5 t », « 2,0 t »).
const POSTES = [
  { key: 'transport', label: 'Transport', t: 2.8 },
  { key: 'logement', label: 'Logement', t: 2.2 },
  { key: 'alimentation', label: 'Alimentation', t: 2.1 },
  { key: 'services', label: 'Services', t: 1.5 },
  { key: 'equipements', label: 'Équipements', t: 0.9 },
];
const MOYENNE = Math.round(POSTES.reduce((s, p) => s + p.t, 0) * 10) / 10;
const CIBLE = 2;
const court = (t) => t.toFixed(1).replace('.', ',') + ' t';
const texte = (t) => court(Math.round(t * 10) / 10).replace(' t', '').replace(/,0$/, '') + (Math.abs(t) < 2 ? ' tonne' : ' tonnes');
const Comparaison = ({ label, valeur, percent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <ThemedText weight={600} style={{ fontSize: 14, lineHeight: '20px' }}>{label}</ThemedText>
      <ThemedText weight={600} style={{ fontSize: 14, lineHeight: '20px' }}>{valeur}</ThemedText>
    </div>
    <div style={{ height: 22, borderRadius: 11, overflow: 'hidden', background: 'var(--color-border)' }}>
      <div style={{ width: percent + '%', height: '100%', borderRadius: 11, background: 'var(--color-accent)' }} />
    </div>
  </div>
);
export function EtapeContexte({ onSuivant, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 24, background: 'var(--color-background)', minHeight: 760, boxSizing: 'border-box', ...style }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemedText type="title" weight={600} style={{ fontSize: 30, lineHeight: '36px', letterSpacing: '-0.6px' }}>{texte(MOYENNE)} en moyenne, {texte(CIBLE)} visées en 2050</ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>C’est l’empreinte annuelle moyenne d’une personne en France, et la cible pour 2050.</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Comparaison label="Moyenne française" valeur={court(MOYENNE) + ' CO₂e'} percent={100} />
          <Comparaison label="Cible 2050" valeur={court(CIBLE) + ' CO₂e'} percent={Math.round((CIBLE / MOYENNE) * 100)} />
        </div>
        <div style={{ height: 1, background: 'var(--color-border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemedText weight={600} style={{ fontSize: 16, lineHeight: '24px' }}>Dans cette empreinte, le transport est le premier poste.</ThemedText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {POSTES.map((p) => {
              const accent = p.key === 'transport';
              return (
                <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <ThemedText weight={accent ? 600 : 400} style={{ fontSize: 14, lineHeight: '20px' }}>{p.label}</ThemedText>
                    <ThemedText weight={400} themeColor="textTertiary" style={{ fontSize: 14, lineHeight: '20px' }}>{court(p.t)}</ThemedText>
                  </div>
                  <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--color-border)' }}>
                    <div style={{ width: Math.round((p.t / POSTES[0].t) * 100) + '%', height: '100%', background: accent ? 'var(--color-accent)' : 'var(--color-accent-muted)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <ThemedText type="code" themeColor="textTertiary">SDES, données 2017 · cible 2050 : ADEME</ThemedText>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        <Button title="Continuer" onPress={onSuivant} />
        <OnboardingDots total={4} activeIndex={1} />
      </div>
    </div>
  );
}
