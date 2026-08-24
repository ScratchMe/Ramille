import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';

const COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6];

// B3.3 / B3.4 — "6+" stocke 6, même simplification que flights.tsx.
export function LongTripsStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="title" weight={600} style={styles.title}>
          Et les trajets de plus de 300 km ?
        </ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Sur une année type, hors avion.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En train
        </ThemedText>
        <View style={styles.chipsWrap}>
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === 6 ? '6+' : String(n)}
              selected={answers.train_long_trips_per_year === n}
              onPress={() => update({ train_long_trips_per_year: n })}
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En voiture
        </ThemedText>
        <View style={styles.chipsWrap}>
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === 6 ? '6+' : String(n)}
              selected={answers.car_long_trips_per_year === n}
              onPress={() => update({ car_long_trips_per_year: n })}
              radius={14}
            />
          ))}
        </View>
      </View>

      <ThemedText type="code" themeColor="textTertiary">
        distances moyennes par défaut · 800 km train, 700 km voiture
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.two },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  field: { gap: Spacing.two + 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
