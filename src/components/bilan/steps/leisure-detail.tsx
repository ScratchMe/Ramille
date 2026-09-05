import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  CAR_ENGINE_OPTIONS,
  LEISURE_MODE_CHOICES_MORE,
  LEISURE_MODE_CHOICES_PRIMARY,
  TWO_WHEELER_TYPE_OPTIONS,
} from '@/constants/transport-modes';
import { useTheme } from '@/hooks/use-theme';
import type { BilanAnswers, LeisureDistanceBracket } from '@/types/bilan';

const BRACKETS: { value: LeisureDistanceBracket; label: string }[] = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_plus', label: 'Plus de 30 km' },
];

// B2.2 / B2.3 — le choix voiture seul/covoiturage n'a pas d'équivalent en base côté
// loisirs (pas de `leisure_carpool_size`, cf. v1-05 §2) : les deux options écrivent le
// même `leisure_mode: 'voiture'`, la clé locale ne sert qu'à l'affichage sélectionné.
// Conséquence acceptée : revenir en arrière oublie laquelle des deux était cochée
// (retombe sur "seul" par défaut) — sans effet sur le calcul.
export function LeisureDetailStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  const [showMore, setShowMore] = useState(false);
  // Voiture seul/covoiturage partagent le même `leisure_mode` ('voiture') : la clé
  // choisie, pas la valeur, distingue laquelle des deux rangées est cochée à l'écran.
  const [selectedKey, setSelectedKey] = useState<string | null>(
    answers.leisure_mode === 'voiture' ? 'voiture_solo' : (answers.leisure_mode ?? null)
  );
  const modeChoices = showMore
    ? [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE]
    : LEISURE_MODE_CHOICES_PRIMARY;

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="title" weight={600} style={styles.title}>
          Avec quel mode, principalement ?
        </ThemedText>
        <View style={styles.list}>
          {modeChoices.map((choice) => (
            <ModeListItem
              key={choice.key}
              label={choice.label}
              selected={selectedKey === choice.key}
              onPress={() => {
                setSelectedKey(choice.key);
                update({
                  leisure_mode: choice.modeId,
                  leisure_car_engine: choice.modeId === 'voiture' ? answers.leisure_car_engine : null,
                  leisure_two_wheeler_type:
                    choice.modeId === 'deux_roues_motorise' ? answers.leisure_two_wheeler_type : null,
                });
              }}
            />
          ))}
          {!showMore && (
            <TextLink
              label="Voir les autres modes"
              onPress={() => setShowMore(true)}
              type="linkPrimary"
            />
          )}
        </View>

        {answers.leisure_mode === 'voiture' && (
          <ThemedView type="backgroundElement" style={styles.nestedBox}>
            <ThemedText type="small" themeColor="textTertiary">
              Quelle motorisation ?
            </ThemedText>
            <View style={styles.engineRow}>
              {CAR_ENGINE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={answers.leisure_car_engine === option.value}
                  onPress={() => update({ leisure_car_engine: option.value })}
                  radius={16}
                  selectedStyle="outline"
                />
              ))}
            </View>
          </ThemedView>
        )}

        {answers.leisure_mode === 'deux_roues_motorise' && (
          <ThemedView type="backgroundElement" style={styles.nestedBox}>
            <ThemedText type="small" themeColor="textTertiary">
              Quel type de deux-roues ?
            </ThemedText>
            <View style={styles.engineRow}>
              {TWO_WHEELER_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={answers.leisure_two_wheeler_type === option.value}
                  onPress={() => update({ leisure_two_wheeler_type: option.value })}
                  radius={16}
                  selectedStyle="outline"
                />
              ))}
            </View>
          </ThemedView>
        )}
      </View>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      <View style={styles.block}>
        <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
          Quelle distance aller, en général ?
        </ThemedText>
        <View style={styles.chipsWrap}>
          {BRACKETS.map((bracket) => (
            <Chip
              key={bracket.value}
              label={bracket.label}
              selected={answers.leisure_distance_bracket === bracket.value}
              onPress={() => update({ leisure_distance_bracket: bracket.value })}
            />
          ))}
        </View>
      </View>
      <MissingModeLink context="B2.2 mode loisirs" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  list: { gap: Spacing.two },
  separator: { height: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  nestedBox: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two, marginTop: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  // Quatre motorisations : équiréparties, « Hybride rechargeable » écraserait les
  // trois autres. Largeur naturelle et retour à la ligne.
  engineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
