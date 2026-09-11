import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CAR_ENGINE_OPTIONS } from '@/constants/transport-modes';
import type { BilanAnswers } from '@/types/bilan';

// Même plage que les vols (`flights.tsx`, `TOTAL_CHOICES`) : l'écart à la spec §5 était que
// celle-ci s'arrêtait à 6, ce qui plafonnait les trajets longue distance d'un grand rouleur ou
// d'un habitué du train à un chiffre inférieur à la réalité — et dans le sens qui allège
// l'empreinte. Un re-bilan prérempli à « 6 » continue d'afficher 6 : rien ne se perd.
const COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Dernière puce de la série, qui vaut « ce nombre ou plus » — dérivée de `COUNT_CHOICES` et
 * non écrite en dur, à deux endroits qui auraient divergé : le libellé visible (« 6+ ») et le
 * libellé accessible (« 10 trajets ou plus »). C'est ce qui a permis de porter la plage de 6 à
 * 10 sans rien retoucher ailleurs : une valeur recopiée aurait fait annoncer « 6 trajets ou
 * plus » sur une puce qui n'est plus le plafond.
 */
const MAX_TRAJETS = COUNT_CHOICES[COUNT_CHOICES.length - 1];

/**
 * Ce qu'un lecteur d'écran entend sur la puce de plafond, là où l'œil lit « 6+ » (A2-9).
 *
 * Les autres puces gardent leur chiffre pour libellé : c'est le `radiogroup` nommé qui dit de
 * quelle série il s'agit, une fois, au lieu de le répéter quatorze fois.
 */
const LIBELLE_PLAFOND = `${MAX_TRAJETS} trajets ou plus`;

// B3.3 / B3.4 — la dernière puce stocke sa valeur nominale, même simplification que flights.tsx.
export function LongTripsStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="screenTitle">
          Et les trajets de plus de 300 km ?
        </ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Sur une année type, hors avion.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En train
        </ThemedText>
        {/* `radiogroup` ferme la série, et **c'est son libellé qui la distingue, pas son rôle**
            (A2-9) : les deux séries de l'étape sont rigoureusement identiques — sept puces « 0 »
            à « 6+ », deux fois — et l'intitulé qui les qualifie est un frère dans l'arbre, pas
            un libellé rattaché. En lecture séquentielle il précède bien le groupe, mais en
            navigation de contrôle en contrôle ou en exploration tactile plus rien ne disait dans
            lequel on se trouve. Nommer le groupe le dit une fois ; le répéter sur chaque puce le
            dirait quatorze. Même motif que `ChoixDeRappel`. */}
        <View
          style={styles.chipsWrap}
          accessibilityRole="radiogroup"
          accessibilityLabel="Trajets longue distance en train"
        >
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
              accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
              role="radio"
              selected={answers.train_long_trips_per_year === n}
              onPress={() => update({ train_long_trips_per_year: n })}
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En voiture
        </ThemedText>
        <View
          style={styles.chipsWrap}
          accessibilityRole="radiogroup"
          accessibilityLabel="Trajets longue distance en voiture"
        >
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
              accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
              role="radio"
              selected={answers.car_long_trips_per_year === n}
              onPress={() =>
                update({ car_long_trips_per_year: n, car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null })
              }
              radius={14}
            />
          ))}
        </View>

        {/* La précision s'ouvre sous les puces qui la déclenchent — cf.
            `precision-mode.tsx`. */}
        {answers.car_long_trips_per_year > 0 && (
          <View style={styles.precision}>
            <PrecisionMode
              question="Quelle motorisation ?"
              options={CAR_ENGINE_OPTIONS}
              valeur={answers.car_long_trips_engine}
              onChange={(value) => update({ car_long_trips_engine: value })}
            />
          </View>
        )}
      </View>

      <ThemedText type="code" themeColor="textTertiary">
        distances moyennes par défaut · 800 km train, 700 km voiture
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.two },
  field: { gap: Spacing.two + 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  precision: { marginTop: 4 },
});
