import React from 'react';
import { Button } from '../core/Button.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
// Source : src/components/checkin-card.tsx — carte rayon 18 padding 18 gap 10 ; question 16/23/600 ; Non secondaire + Oui primaire.
export function CheckinCard({ periodLabel, question, emphasize = true, answered = null, reponses, onAnswer, retour }) {
  const opts = reponses || [{ value: false, label: 'Non', variant: 'secondary' }, { value: true, label: 'Oui', variant: 'primary' }];
  return (
    <div style={{ background: emphasize ? 'var(--color-background-selected)' : 'var(--color-background-element)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ThemedText type="small" weight={600} themeColor={emphasize ? 'accentText' : 'textTertiary'}>{periodLabel}</ThemedText>
      {answered === null ? (
        <>
          <ThemedText weight={600} style={{ fontSize: 16, lineHeight: '23px' }}>{question}</ThemedText>
          <div style={{ display: 'flex', gap: 8 }}>
            {opts.map((o) => <Button key={String(o.value)} title={o.label} variant={o.variant || 'secondary'} onPress={() => onAnswer && onAnswer(o.value)} flex />)}
          </div>
        </>
      ) : (
        <RamilleDit mood={retour && retour.mood ? retour.mood : answered === true ? 'happy' : 'encouraging'} ligne={retour && retour.ligne ? retour.ligne : answered === true ? 'Bien joué — chaque changement compte.' : 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.'} />
      )}
    </div>
  );
}
