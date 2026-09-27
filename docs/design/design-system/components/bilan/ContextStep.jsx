import React from 'react';
import { ChampsDeContexte } from './ChampsDeContexte.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/context.tsx — la dernière étape du questionnaire, le contexte de mobilité.
// Les quatre questions sont celles de `ChampsDeContexte`, partagées avec l'écran `/contexte` : l'étape ne garde que
// son introduction. Celle-ci dit la règle — le plan ne propose que ce qui tient avec ces réponses — puis ce que
// ces réponses font au chiffre du bilan, et cette seconde phrase se dérive de la fréquence des sorties : écrite en
// dur, elle serait fausse pour qui sort rarement, dont le nombre de véhicules du foyer change le total.

// `phraseDuCalculDuContexte` (src/types/contexte.ts), recopiée.
const phraseDuCalculDuContexte = (leisureFrequency) =>
  leisureFrequency === 'rarely'
    ? 'Une seule entre dans le calcul de ton bilan : le nombre de véhicules du foyer, qui sert à estimer tes sorties occasionnelles.'
    : 'Elles n’entrent pas dans le calcul de ton bilan.';

export function ContextStep({ answers, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ThemedText type="screenTitle">Quel est ton contexte de mobilité ?</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Ton plan ne propose que ce qui tient avec ces réponses. {phraseDuCalculDuContexte(answers.leisure_frequency)}
        </ThemedText>
      </div>
      <ChampsDeContexte choix={answers} trajet={answers} update={update} />
    </div>
  );
}
