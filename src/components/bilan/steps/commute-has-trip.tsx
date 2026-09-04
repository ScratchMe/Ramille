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
      <ThemedText type="title" weight={600} style={styles.title}>
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
          onPress={() =>
            update({
              commute_has_regular_trip: false,
              commute_days_per_week: null,
              commute_distance_km: null,
              commute_distance_bracket: null,
              commute_mode: null,
              commute_is_carpool: false,
              commute_carpool_size: null,
              commute_second_mode_used: false,
              commute_second_mode: null,
              commute_car_engine: null,
            })
          }
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
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  choices: { gap: Spacing.two + 2 },
  helper: { lineHeight: 21 },
});
