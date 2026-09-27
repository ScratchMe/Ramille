import React from 'react';
import { ChoiceRow } from '../forms/ChoiceRow.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/commute-has-trip.tsx — B1.1, la première étape du questionnaire : le titre de
// l'étape (`screenTitle`, le `TitreDEtape` du dépôt), le « Oui / Non » en deux rangées dans un groupe nommé par la
// même question, puis la ligne d'aide qui dit la limite du produit. Gap 32 entre les trois, 10 entre les rangées.
//
// L'étape ne rend pas `StepShell` : c'est l'écran du questionnaire qui la pose dedans. « Non » n'écrit qu'une
// réponse — c'est l'écran qui efface ensuite toute la section domicile-travail (`normaliserReponses`), seul
// endroit où cette liste vit.

// Écrite une fois : le titre de l'étape et le nom du « Oui / Non ».
const QUESTION_TRAJET = 'As-tu un trajet régulier pour le travail ou les études ?';

export function CommuteHasTripStep({ answers, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ThemedText type="screenTitle">{QUESTION_TRAJET}</ThemedText>
      <GroupeDeChoix question={QUESTION_TRAJET} style={{ gap: 10 }}>
        <ChoiceRow
          label="Oui"
          selected={answers.commute_has_regular_trip === true}
          onPress={() => update({ commute_has_regular_trip: true })}
        />
        <ChoiceRow
          label="Non"
          selected={answers.commute_has_regular_trip === false}
          onPress={() => update({ commute_has_regular_trip: false })}
        />
      </GroupeDeChoix>
      <ThemedText type="small" themeColor="textTertiary" style={{ lineHeight: '21px' }}>
        Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe directement à la suite. On
        ne compte pas ici les déplacements faits pendant ton travail.
      </ThemedText>
    </div>
  );
}
