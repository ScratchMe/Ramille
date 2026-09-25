import React from 'react';
import { ModeListItem } from './ModeListItem.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/precision-mode.tsx — question attachée sous le mode qui la déclenche, retrait gauche 16 ;
// les réponses dans un `radiogroup` nommé par la question (`GroupeDeChoix` dans le dépôt).
export function PrecisionMode({ question, options, valeur, onChange }) {
  return (
    <div style={{ background: 'var(--color-background-element)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 16 }}>
      <ThemedText type="small" themeColor="textSecondary">{question}</ThemedText>
      <div role="radiogroup" aria-label={question} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o) => <ModeListItem key={o.value} label={o.label} selected={valeur === o.value} onPress={() => onChange && onChange(o.value)} nestedBackground />)}
      </div>
    </div>
  );
}
