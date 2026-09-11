import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
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
  // Ouvert d'emblée si le mode déjà répondu vit dans la seconde liste. Sinon la question
  // paraît vide alors qu'elle est remplie : un re-bilan prérempli (la personne allait en bus
  // le mois dernier) comme un simple aller-retour Retour/Suivant remontaient quatre modes
  // parmi lesquels le bon n'était pas, « Suivant » restait actif, et la personne cochait une
  // voiture pour avancer — son « bus » changeait de valeur sans qu'elle le sache (audit A2-5).
  const [showMore, setShowMore] = useState(() =>
    LEISURE_MODE_CHOICES_MORE.some((choice) => choice.modeId === answers.leisure_mode)
  );
  // Voiture seul/covoiturage partagent le même `leisure_mode` ('voiture') : la clé
  // choisie, pas la valeur, distingue laquelle des deux rangées est cochée à l'écran —
  // et donc sous laquelle des deux la précision s'ouvre.
  const [selectedKey, setSelectedKey] = useState<string | null>(
    answers.leisure_mode === 'voiture' ? 'voiture_solo' : (answers.leisure_mode ?? null)
  );
  const modeChoices = showMore
    ? [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE]
    : LEISURE_MODE_CHOICES_PRIMARY;

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="screenTitle">
          Avec quel mode, principalement ?
        </ThemedText>
        <View style={styles.list}>
          {modeChoices.map((choice) => {
            const selected = selectedKey === choice.key;
            return (
              <View key={choice.key}>
                <ModeListItem
                  label={choice.label}
                  selected={selected}
                  onPress={() => {
                    setSelectedKey(choice.key);
                    // La motorisation et le type de deux-roues rattachés au mode précédent
                    // sont effacés par `normaliserReponses`, pas ici (audit A2-17).
                    update({ leisure_mode: choice.modeId });
                  }}
                />

                {/* La précision s'ouvre sous l'élément qui la déclenche — cf.
                    `precision-mode.tsx` pour la raison, qui n'est pas cosmétique. */}
                {selected && choice.modeId === 'voiture' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quelle motorisation ?"
                      options={CAR_ENGINE_OPTIONS}
                      valeur={answers.leisure_car_engine}
                      onChange={(value) => update({ leisure_car_engine: value })}
                    />
                  </View>
                )}

                {selected && choice.modeId === 'deux_roues_motorise' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quel type de deux-roues ?"
                      options={TWO_WHEELER_TYPE_OPTIONS}
                      valeur={answers.leisure_two_wheeler_type}
                      onChange={(value) => update({ leisure_two_wheeler_type: value })}
                    />
                  </View>
                )}
              </View>
            );
          })}
          {!showMore && (
            <TextLink
              label="Voir les autres modes"
              onPress={() => setShowMore(true)}
              type="linkPrimary"
            />
          )}
        </View>
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
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  list: { gap: Spacing.two },
  precision: { marginTop: Spacing.two },
  separator: { height: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
