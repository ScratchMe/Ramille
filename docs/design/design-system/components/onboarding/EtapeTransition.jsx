import React from 'react';
import { Button } from '../core/Button.jsx';
import { OnboardingDots } from '../core/OnboardingDots.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/onboarding/etape-transition.tsx — le dernier écran avant le questionnaire : le temps estimé,
// les quatre sections, et une ligne sur ce qui vient APRÈS le bilan — une action à son rythme, un point de temps en
// temps. Une ligne et non un cinquième écran, et sans rythme chiffré : « de temps en temps » est vrai pour les deux
// boucles. Le lien vers ce qu'on enregistre revient ici, juste avant la première écriture.
// Les libellés de `BILAN_SECTION_LABEL` (src/types/bilan.ts), recopiés faute de pouvoir importer `src/` : le dépôt
// les lit à la source, et ce sont ceux de l'en-tête du questionnaire (01/10/2026, `v1-33`, Q-15) — « Domicile-travail »
// et « Contexte de mobilité », non plus « Trajet domicile-travail » et « Ton contexte de mobilité ».
const SECTIONS = ['1 — Domicile-travail', '2 — Loisirs du week-end', '3 — Voyages longue distance', '4 — Contexte de mobilité'];
export function EtapeTransition({ onCommencer, onPrecedent, onConfidentialite, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24, background: 'var(--color-background)', minHeight: 760, boxSizing: 'border-box', ...style }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
        <ThemedText type="display">On passe à ton bilan</ThemedText>
        <ThemedText weight={400} themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>Quelques questions sur tes déplacements habituels. Tu peux t’arrêter et reprendre plus tard, tes réponses sont conservées.</ThemedText>
        <div style={{ background: 'var(--color-background-element)', borderRadius: 'var(--radius-card)', padding: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText type="small" themeColor="textTertiary">Temps estimé</ThemedText>
          <ThemedText weight={600} style={{ fontSize: 24, lineHeight: '30px' }}>environ 5 minutes</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTIONS.map((s) => <ThemedText key={s} type="body" weight={400} themeColor="textSecondary">{s}</ThemedText>)}
        </div>
        <ThemedText type="small" themeColor="textTertiary" style={{ lineHeight: '20px' }}>Ensuite : une action à ton rythme, et un point de temps en temps pour voir ce qui a changé.</ThemedText>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Button title="Retour" variant="secondary" onPress={onPrecedent} style={{ width: 'auto' }} />
          <Button title="Commencer" onPress={onCommencer} flex />
        </div>
        <OnboardingDots total={4} activeIndex={3} />
        <TextLink label="Ce qu’on enregistre, et pourquoi" apparence="discret" onPress={onConfidentialite} role="link" style={{ textAlign: 'center' }} containerStyle={{ marginTop: -24, alignItems: 'center' }} />
      </div>
    </div>
  );
}
