import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
            <ThemedText type="title" weight={600} style={styles.title}>
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
                <ModeListItem
                  key={modeId}
                  label={TRANSPORT_MODE_LABELS[modeId]}
                  selected={answers.commute_second_mode === modeId}
                  onPress={() =>
                    update({
                      commute_second_mode: modeId,
                      // Un seul champ moteur pour les deux jambes (cf. types/bilan.ts) :
                      // on ne le réinitialise que si ni le mode principal ni ce second
                      // mode ne valent "voiture" après ce choix.
                      commute_car_engine:
                        modeId === 'voiture' || answers.commute_mode === 'voiture' ? answers.commute_car_engine : null,
                      commute_two_wheeler_type:
                        modeId === 'deux_roues_motorise' || answers.commute_mode === 'deux_roues_motorise'
                          ? answers.commute_two_wheeler_type
                          : null,
                    })
                  }
                  nestedBackground
                />
              ))}
            </View>

            {answers.commute_second_mode === 'voiture' && (
              <View style={styles.nestedEngine}>
                <ThemedText type="small" themeColor="textTertiary">
                  Quelle motorisation ?
                </ThemedText>
                <View style={styles.engineRow}>
              {CAR_ENGINE_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={answers.commute_car_engine === option.value}
                      onPress={() => update({ commute_car_engine: option.value })}
                      radius={16}
                      selectedStyle="outline"
                    />
                  ))}
                </View>
              </View>
            )}

            {answers.commute_second_mode === 'deux_roues_motorise' && (
              <View style={styles.nestedEngine}>
                <ThemedText type="small" themeColor="textTertiary">
                  Quel type de deux-roues ?
                </ThemedText>
                <View style={styles.engineRow}>
                  {TWO_WHEELER_TYPE_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={answers.commute_two_wheeler_type === option.value}
                      onPress={() => update({ commute_two_wheeler_type: option.value })}
                      radius={16}
                      selectedStyle="outline"
                    />
                  ))}
                </View>
              </View>
            )}
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
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  row: { flexDirection: 'row', gap: Spacing.two },
  // Quatre motorisations : équiréparties, « Hybride rechargeable » écraserait les
  // trois autres. Largeur naturelle et retour à la ligne.
  engineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  separator: { height: 1 },
  nestedBox: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  nestedList: { gap: Spacing.two },
  nestedEngine: { gap: Spacing.two, marginTop: Spacing.two },
});
