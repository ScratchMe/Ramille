import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { Chip } from '@/components/bilan/chip';
import { NumericField } from '@/components/bilan/numeric-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BilanAnswers, DistanceBracket } from '@/types/bilan';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

const BRACKETS: { value: DistanceBracket; label: string }[] = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_50', label: '30 à 50 km' },
  { value: '50_plus', label: 'Plus de 50 km' },
];

// B1.2 / B1.3 — jours par semaine + distance (exacte ou par tranche si "Je ne sais
// pas"). Le sélecteur de jours est un choix de puces plutôt que le slider de la
// maquette : pas de composant slider dans les dépendances du projet, et sur une plage
// 1-7 les puces offrent la même précision sans ajouter de dépendance native.
export function CommuteDaysDistanceStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  // Mode d'affichage local (pas dans `answers`) : "Je ne sais pas" doit basculer vers la
  // liste de tranches avant même qu'une tranche soit choisie, donc ne peut pas se
  // déduire seulement de `commute_distance_bracket !== null`.
  const [unknown, setUnknown] = useState(answers.commute_distance_bracket !== null);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="title" weight={600} style={styles.title}>
          Ce trajet, tu le fais combien de jours par semaine ?
        </ThemedText>
        <View style={styles.daysRow}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              label={String(day)}
              selected={answers.commute_days_per_week === day}
              onPress={() => update({ commute_days_per_week: day })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {unknown ? (
        <View style={styles.block}>
          <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
            Environ, ça représente quelle distance ?
          </ThemedText>
          <ThemedText type="small" themeColor="textTertiary">
            Une estimation suffit. On ajustera la précision plus tard si tu le souhaites.
          </ThemedText>
          <View style={styles.bracketList}>
            {BRACKETS.map((bracket) => (
              <ChoiceRow
                key={bracket.value}
                label={bracket.label}
                selected={answers.commute_distance_bracket === bracket.value}
                onPress={() => update({ commute_distance_bracket: bracket.value })}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.block}>
          <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
            Quelle distance pour un aller ?
          </ThemedText>
          <NumericField
            value={answers.commute_distance_km}
            onChange={(value) => update({ commute_distance_km: value })}
            unit="km"
          />
          <Pressable
            onPress={() => {
              setUnknown(true);
              update({ commute_distance_km: null });
            }}
          >
            <ThemedText type="linkPrimary">Je ne sais pas</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  daysRow: { flexDirection: 'row', gap: Spacing.two },
  separator: { height: 1 },
  bracketList: { gap: Spacing.two + 2 },
});
