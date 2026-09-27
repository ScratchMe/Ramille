import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
// Source : src/components/session-refusee.tsx — quand le serveur refuse le jeton d'une session qui portait un compte :
// on ne recrée pas une session vide en silence (ce serait donner un compte vide à quelqu'un qui en a un), on le dit. Le
// bilan est rattaché au compte, pas à l'appareil. Deux chemins : retrouver son compte (plein), ou repartir d'un bilan
// neuf ici — un écran qui ne laisserait que la reconnexion serait une impasse.
export function SessionRefusee({ onRetrouver, onCommencer }) {
  return (
    <div style={{ minHeight: 560, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 24px', gap: 16, background: 'var(--color-background)' }}>
      <Mascot mood="calm" size={72} tilt={-6} />
      <ThemedText type="screenTitle" style={{ textAlign: 'center' }}>Reconnecte-toi pour retrouver ton bilan</ThemedText>
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>Ton bilan, ton plan et tes points sont rattachés à ton compte, pas à cet appareil.</ThemedText>
      <Button title="J’ai déjà un compte" onPress={onRetrouver} style={{ alignSelf: 'stretch' }} />
      <TextLink label="Commencer un bilan sur cet appareil" onPress={onCommencer} />
    </div>
  );
}
