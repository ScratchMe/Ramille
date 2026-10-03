import React from 'react';
import { Button } from '../core/Button.jsx';
import { OnboardingDots } from '../core/OnboardingDots.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { OnboardingHeroIllustration } from '../illustrations/OnboardingHeroIllustration.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
// Source : src/components/onboarding/etape-accroche.tsx — le premier écran : l'illustration (30 % de la hauteur au plus),
// Ramille qui se présente, penchée (48, − 7 : une feuille penchée regarde), la promesse, puis « Découvrir mon impact ».
// « Pas de compte à créer pour commencer. » se pose AU-DESSUS de « J’ai déjà un compte » : c'est elle qui répond à la
// question que le lien fait naître — « déjà un compte » laisse entendre qu'il en faudrait un.
export function EtapeAccroche({ onSuivant, onDejaUnCompte, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 24, gap: 24, background: 'var(--color-background)', minHeight: 760, boxSizing: 'border-box', ...style }}>
      <OnboardingHeroIllustration style={{ flex: 1, minHeight: 160, maxHeight: 240 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Mascot mood="calm" size={48} tilt={-7} />
        <ThemedText type="small" themeColor="textTertiary" style={{ marginTop: -4 }}>Moi, c’est Ramille. Je serai là à chaque saison, à ton rythme.</ThemedText>
        <ThemedText type="title" weight={600} style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.68px' }}>Comprendre tes trajets, sans te juger.</ThemedText>
        <ThemedText weight={400} themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>En quelques minutes, tu vois quel déplacement pèse le plus dans ton empreinte — et ce que tu peux faire de concret.</ThemedText>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <Button title="Découvrir mon impact" onPress={onSuivant} />
        <OnboardingDots total={4} activeIndex={0} />
        <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center', marginTop: -16 }}>Pas de compte à créer pour commencer.</ThemedText>
        <TextLink label="J’ai déjà un compte" apparence="action" onPress={onDejaUnCompte} role="link" style={{ textAlign: 'center' }} containerStyle={{ marginTop: -32, alignItems: 'center' }} />
      </div>
    </div>
  );
}
