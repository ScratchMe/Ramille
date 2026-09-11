import { StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';

// B1.1
export function CommuteHasTripStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <ThemedText type="screenTitle">
        As-tu un trajet régulier pour le travail ou les études ?
      </ThemedText>
      <View style={styles.choices}>
        <ChoiceRow
          label="Oui"
          selected={answers.commute_has_regular_trip === true}
          onPress={() => update({ commute_has_regular_trip: true })}
        />
        <ChoiceRow
          label="Non"
          selected={answers.commute_has_regular_trip === false}
          // Une seule réponse à poser : `normaliserReponses` efface toute la section 1, et c'est
          // le seul endroit où cette liste vit. Celle qui était écrite ici énumérait dix champs
          // et en oubliait un — `commute_two_wheeler_type`, le symptôme même du constat A2-17.
          // C'était la dernière des quatre listes tenues à la main.
          onPress={() => update({ commute_has_regular_trip: false })}
        />
      </View>
      <ThemedText type="small" themeColor="textTertiary" style={styles.helper}>
        Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe
        directement à la suite.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  choices: { gap: Spacing.two + 2 },
  helper: { lineHeight: 21 },
});
