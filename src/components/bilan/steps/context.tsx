import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers, HouseholdVehicles, TcAccess, ZoneType } from '@/types/bilan';

const ZONE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: 'urbain_dense', label: 'Urbain dense' },
  { value: 'periurbain', label: 'Périurbain' },
  { value: 'rural', label: 'Rural' },
];

const TC_OPTIONS: { value: TcAccess; label: string }[] = [
  { value: 'bon', label: 'Bon' },
  { value: 'limite', label: 'Limité' },
  { value: 'inexistant', label: 'Inexistant' },
];

const VEHICLE_OPTIONS: { value: HouseholdVehicles; label: string }[] = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2_plus', label: '2 ou plus' },
];

// B4 — n'entre pas dans le calcul (cf. v1-05 §3), sert au plan de réduction.
export function ContextStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <ThemedText type="screenTitle">
          Quel est ton contexte de mobilité ?
        </ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Ça nous sert à te proposer des actions réalistes. Ces réponses n’entrent pas dans
          le calcul de ton bilan.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Type de zone
        </ThemedText>
        <View style={styles.row}>
          {ZONE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.zone_type === option.value}
              onPress={() => update({ zone_type: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Accès aux transports en commun
        </ThemedText>
        <View style={styles.row}>
          {TC_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.tc_access === option.value}
              onPress={() => update({ tc_access: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Véhicules motorisés dans le foyer
        </ThemedText>
        <View style={styles.row}>
          {VEHICLE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.household_vehicles === option.value}
              onPress={() => update({ household_vehicles: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  intro: { gap: Spacing.two },
  field: { gap: Spacing.two + 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
