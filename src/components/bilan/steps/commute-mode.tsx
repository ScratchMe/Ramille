import { StyleSheet, View } from 'react-native';

import { ModeListItem } from '@/components/bilan/mode-list-item';
import { ThemedText } from '@/components/themed-text';
import { COMMUTE_MODE_CHOICES } from '@/constants/transport-modes';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';

// B1.4
export function CommuteModeStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <ThemedText type="title" weight={600} style={styles.title}>
        Quel est ton mode de transport principal pour ce trajet ?
      </ThemedText>
      <View style={styles.list}>
        {COMMUTE_MODE_CHOICES.map((choice) => {
          const selected = answers.commute_mode === choice.modeId && answers.commute_is_carpool === choice.carpool;
          return (
            <ModeListItem
              key={choice.key}
              label={choice.label}
              selected={selected}
              onPress={() =>
                update({
                  commute_mode: choice.modeId,
                  commute_is_carpool: choice.carpool,
                  commute_carpool_size: choice.carpool ? answers.commute_carpool_size : null,
                })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  list: { gap: Spacing.two },
});
