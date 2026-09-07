import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BilanAnswers } from '@/types/bilan';

// "N+" stocke N — simplification assumée (pas de borne haute en base pour ces champs,
// cf. v1-05), cohérente avec le traitement déjà appliqué à la taille de covoiturage.
const TOTAL_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// B3.1 / B3.2
export function FlightsStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  const total = answers.flights_total_per_year;
  const shortChoices = Array.from({ length: total + 1 }, (_, i) => i);
  const longCount = Math.max(total - (answers.flights_short_per_year ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="screenTitle">
          Combien de fois prends-tu l’avion dans une année type ?
        </ThemedText>
        <View style={styles.chipsWrap}>
          {TOTAL_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === 10 ? '10+' : String(n)}
              selected={total === n}
              onPress={() =>
                update({
                  flights_total_per_year: n,
                  flights_short_per_year:
                    answers.flights_short_per_year !== null
                      ? Math.min(answers.flights_short_per_year, n)
                      : n > 0
                        ? null
                        : 0,
                })
              }
            />
          ))}
        </View>
      </View>

      {total > 0 && (
        <>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.block}>
            <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
              Sur ces {total}, combien sont courts ?
            </ThemedText>
            <ThemedText type="small" themeColor="textTertiary">
              Europe, moins de 3 h. Le reste est compté comme long-courrier.
            </ThemedText>
            <View style={styles.row}>
              {shortChoices.map((n) => (
                <Chip
                  key={n}
                  label={String(n)}
                  selected={answers.flights_short_per_year === n}
                  onPress={() => update({ flights_short_per_year: n })}
                  radius={14}
                />
              ))}
            </View>
            {answers.flights_short_per_year !== null && (
              <ThemedText type="small">
                {longCount} vol{longCount > 1 ? 's' : ''} long-courrier {longCount > 1 ? 'seront' : 'sera'} compté
                {longCount > 1 ? 's' : ''}.
              </ThemedText>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  separator: { height: 1 },
});
