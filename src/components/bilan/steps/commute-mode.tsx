import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CAR_ENGINE_OPTIONS, COMMUTE_MODE_CHOICES } from '@/constants/transport-modes';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';

// B1.4. Le moteur (B1.4bis, hors spec d'origine — cf. migration
// 20260904*_car_engine.sql) n'ajoute jamais d'entrée à la liste ci-dessus : question de
// suivi affichée uniquement quand "voiture" est choisi, sur ce même écran plutôt qu'un
// pas séparé, même logique que le "Lequel ?" imbriqué de commute-extra.tsx.
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
                  commute_car_engine: choice.modeId === 'voiture' ? answers.commute_car_engine : null,
                })
              }
            />
          );
        })}
      </View>

      {answers.commute_mode === 'voiture' && (
        <ThemedView type="backgroundElement" style={styles.nestedBox}>
          <ThemedText type="small" themeColor="textTertiary">
            Thermique ou électrique ?
          </ThemedText>
          <View style={styles.row}>
            {CAR_ENGINE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={answers.commute_car_engine === option.value}
                onPress={() => update({ commute_car_engine: option.value })}
                flex
                radius={16}
                selectedStyle="outline"
              />
            ))}
          </View>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  list: { gap: Spacing.two },
  nestedBox: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
});
