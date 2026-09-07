import { StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { BilanAnswers, LeisureFrequency } from '@/types/bilan';

const OPTIONS: { value: LeisureFrequency; label: string }[] = [
  { value: 'rarely', label: 'Rarement — une fois par mois ou moins' },
  { value: 'weekly', label: 'Une fois par semaine' },
  { value: 'multiple_weekly', label: 'Plusieurs fois par semaine' },
];

// B2.1 — variante "Progression adaptative" quand la section 1 a été sautée (B1.1 =
// Non) : le paragraphe d'exemples est remplacé par un rappel du nombre d'étapes total,
// cf. maquette "Progression adaptative — section sautée".
export function LeisureFrequencyStep({
  answers,
  update,
  total,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
  total: number;
}) {
  const commuteSkipped = answers.commute_has_regular_trip === false;

  return (
    <View style={styles.container}>
      <ThemedText type="screenTitle">
        À quelle fréquence fais-tu des trajets loisirs le weekend ?
      </ThemedText>
      {!commuteSkipped && (
        <ThemedText type="small" themeColor="textTertiary">
          Sport, sorties, visites à la famille.
        </ThemedText>
      )}
      <View style={styles.choices}>
        {OPTIONS.map((option) => (
          <ChoiceRow
            key={option.value}
            label={option.label}
            selected={answers.leisure_frequency === option.value}
            onPress={() =>
              update({
                leisure_frequency: option.value,
                ...(option.value === 'rarely' ? { leisure_mode: null, leisure_distance_bracket: null } : {}),
              })
            }
          />
        ))}
      </View>
      {commuteSkipped && (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText type="small" style={styles.noticeText}>
            Sans trajet domicile-travail, ton bilan compte {total} étapes.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  choices: { gap: Spacing.two + 2 },
  notice: { borderRadius: Radius.field, padding: Spacing.three },
  noticeText: { lineHeight: 21 },
});
