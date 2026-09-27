import React from 'react';
import { Button } from '../core/Button.jsx';
import { OnboardingDots } from '../core/OnboardingDots.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ReassuranceIllustration } from '../illustrations/ReassuranceIllustration.jsx';
// Source : src/components/onboarding/etape-reassurance.tsx — « Pas de jugement. » sur le fond teinté (`backgroundTinted`) :
// les contraintes ne sont pas des fautes, les réponses restent privées, aucune comparaison. Le lien vers ce qu'on
// enregistre rend vérifiable la phrase qui le précède. Les points de progression passent en `onTint` sur ce fond.
export function EtapeReassurance({ onSuivant, onConfidentialite, style }) {
  const corps = { fontSize: 17, lineHeight: '26px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32, padding: 24, background: 'var(--color-background-tinted)', minHeight: 760, boxSizing: 'border-box', ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <ReassuranceIllustration style={{ height: 180 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ThemedText type="display">Pas de jugement. Un état des lieux honnête.</ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={corps}>Vivre en zone rurale, travailler loin, avoir besoin de sa voiture : ce sont des contraintes, pas des fautes. On en tient compte dans ton bilan.</ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={corps}>Tes réponses restent privées. Aucun classement, aucune comparaison avec d’autres utilisateurs.</ThemedText>
          <TextLink label="Ce qu’on enregistre, et pourquoi" onPress={onConfidentialite} role="link" type="small" weight={600} themeColor="textSecondary" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <Button title="Continuer" onPress={onSuivant} />
        <OnboardingDots total={4} activeIndex={2} onTint />
      </div>
    </div>
  );
}
