import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import {
  CAR_ENGINE_OPTIONS,
  TRANSPORT_MODE_LABELS,
  TWO_WHEELER_TYPE_OPTIONS,
  type TransportModeId,
} from '@/constants/transport-modes';
import { useTheme } from '@/hooks/use-theme';
import type { BilanAnswers } from '@/types/bilan';

const CARPOOL_SIZES: { value: number; label: string }[] = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6+' },
];

// B1.5 / B1.6 / B1.7 — combinés sur un seul écran : taille du covoiturage (si mode =
// voiture covoiturage), second mode Oui/Non, puis "Lequel ?" imbriqué si Oui.
export function CommuteExtraStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  const secondModeChoices = (Object.keys(TRANSPORT_MODE_LABELS) as TransportModeId[]).filter(
    (id) => id !== answers.commute_mode
  );

  return (
    <View style={styles.container}>
      {answers.commute_is_carpool && (
        <>
          <View style={styles.block}>
            <ThemedText type="screenTitle">
              Vous êtes combien à partager ce trajet ?
            </ThemedText>
            <View style={styles.row}>
              {CARPOOL_SIZES.map((size) => (
                <Chip
                  key={size.value}
                  label={size.label}
                  selected={answers.commute_carpool_size === size.value}
                  onPress={() => update({ commute_carpool_size: size.value })}
                  flex
                  radius={14}
                />
              ))}
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        </>
      )}

      <View style={styles.block}>
        <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
          Utilises-tu un second mode en complément ?
        </ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Par exemple vélo puis train.
        </ThemedText>
        <View style={styles.row}>
          <Chip
            label="Oui"
            selected={answers.commute_second_mode_used === true}
            onPress={() => update({ commute_second_mode_used: true })}
            flex
            radius={16}
            selectedStyle="outline"
          />
          <Chip
            label="Non"
            selected={answers.commute_second_mode_used === false}
            onPress={() => update({ commute_second_mode_used: false, commute_second_mode: null })}
            flex
            radius={16}
            selectedStyle="outline"
          />
        </View>

        {answers.commute_second_mode_used && (
          <ThemedView type="backgroundElement" style={styles.nestedBox}>
            <ThemedText type="small" themeColor="textTertiary">
              Lequel ?
            </ThemedText>
            <View style={styles.nestedList}>
              {secondModeChoices.map((modeId) => (
                <View key={modeId}>
                <ModeListItem
                  label={TRANSPORT_MODE_LABELS[modeId]}
                  selected={answers.commute_second_mode === modeId}
                  // La motorisation et le type de deux-roues sont partagés par les deux
                  // jambes (cf. types/bilan.ts) : ce qu'un changement de second mode rend
                  // orphelin est effacé par `normaliserReponses`, pas ici.
                  onPress={() => update({ commute_second_mode: modeId })}
                  nestedBackground
                />

                {/* La précision sous l'élément choisi, jamais après la liste (cf.
                    `precision-mode.tsx`). */}
                {answers.commute_second_mode === modeId && modeId === 'voiture' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quelle motorisation ?"
                      options={CAR_ENGINE_OPTIONS}
                      valeur={answers.commute_car_engine}
                      onChange={(value) => update({ commute_car_engine: value })}
                    />
                  </View>
                )}

                {answers.commute_second_mode === modeId && modeId === 'deux_roues_motorise' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quel type de deux-roues ?"
                      options={TWO_WHEELER_TYPE_OPTIONS}
                      valeur={answers.commute_two_wheeler_type}
                      onChange={(value) => update({ commute_two_wheeler_type: value })}
                    />
                  </View>
                )}
                </View>
              ))}
            </View>

          </ThemedView>
        )}
      </View>
      <MissingModeLink context="B1.7 second mode domicile-travail" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  row: { flexDirection: 'row', gap: Spacing.two },
  separator: { height: 1 },
  nestedBox: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two },
  nestedList: { gap: Spacing.two },
  precision: { marginTop: Spacing.two },
});
