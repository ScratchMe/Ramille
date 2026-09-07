import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { CAR_ENGINE_OPTIONS } from '@/constants/transport-modes';
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
        <ThemedText type="screenTitle">
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
              onPress={() =>
                update({ car_long_trips_per_year: n, car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null })
              }
              radius={14}
            />
          ))}
        </View>

        {answers.car_long_trips_per_year > 0 && (
          <ThemedView type="backgroundElement" style={styles.nestedBox}>
            <ThemedText type="small" themeColor="textTertiary">
              Quelle motorisation ?
            </ThemedText>
            <View style={styles.engineRow}>
              {CAR_ENGINE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={answers.car_long_trips_engine === option.value}
                  onPress={() => update({ car_long_trips_engine: option.value })}
                  radius={16}
                  selectedStyle="outline"
                />
              ))}
            </View>
          </ThemedView>
        )}
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
  field: { gap: Spacing.two + 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  nestedBox: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.two },
  // Quatre motorisations : équiréparties, « Hybride rechargeable » écraserait les
  // trois autres. Largeur naturelle et retour à la ligne.
  engineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
