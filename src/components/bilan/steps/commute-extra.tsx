import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import {
  CAR_ENGINE_OPTIONS,
  TRAIN_TYPE_OPTIONS,
  TRANSPORT_MODE_LABELS,
  TWO_WHEELER_TYPE_OPTIONS,
  VELO_TYPE_OPTIONS,
  type TransportModeId,
} from '@/constants/transport-modes';
import { PARTS_DU_SECOND_MODE, type BilanAnswers } from '@/types/bilan';

/** Écrite une fois : le titre de l'étape et le nom du « Oui / Non » (`GroupeDeChoix`). */
const QUESTION_SECOND_MODE = 'Utilises-tu un second mode en complément ?';

// B1.6 / B1.7 — second mode Oui/Non, puis « Lequel ? » imbriqué si Oui.
//
// **B1.5 est parti sur l'écran précédent** (recette du 14/09/2026, `v1-16` §3) : la taille du
// covoiturage se demande sous l'option « Voiture (covoiturage) » de B1.4, comme ses deux jumelles
// des sorties et des longs trajets. Cet écran n'a donc plus qu'une question — et elle porte enfin
// son titre. Le `screenTitle` vivait sur le bloc du covoiturage, qui était **conditionnel** : qui
// ne covoiturait pas arrivait ici sur un écran sans titre. Le chantier ne crée pas ce défaut, il
// le referme.
export function CommuteExtraStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const secondModeChoices = (Object.keys(TRANSPORT_MODE_LABELS) as TransportModeId[]).filter(
    (id) => id !== answers.commute_mode
  );

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="screenTitle">{QUESTION_SECOND_MODE}</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Par exemple vélo puis train.
        </ThemedText>
        <GroupeDeChoix question={QUESTION_SECOND_MODE} style={styles.row}>
          <Chip
            label="Oui"
            role="radio"
            selected={answers.commute_second_mode_used === true}
            onPress={() => update({ commute_second_mode_used: true })}
            flex
            radius={16}
            selectedStyle="outline"
          />
          <Chip
            label="Non"
            role="radio"
            selected={answers.commute_second_mode_used === false}
            onPress={() => update({ commute_second_mode_used: false, commute_second_mode: null })}
            flex
            radius={16}
            selectedStyle="outline"
          />
        </GroupeDeChoix>

        {answers.commute_second_mode_used === true && (
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

                {/* C4.4 — un seul champ pour les deux jambes, comme la motorisation juste
                    au-dessus : B1.7 exclut le mode déjà choisi en B1.4, donc au plus une jambe
                    porte le train (ou le vélo) à un instant donné. */}
                {answers.commute_second_mode === modeId && modeId === 'train' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quel type de train ?"
                      options={TRAIN_TYPE_OPTIONS}
                      valeur={answers.commute_train_type}
                      onChange={(value) => update({ commute_train_type: value })}
                    />
                  </View>
                )}

                {answers.commute_second_mode === modeId && modeId === 'velo' && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quel type de vélo ?"
                      options={VELO_TYPE_OPTIONS}
                      valeur={answers.commute_velo_type}
                      onChange={(value) => update({ commute_velo_type: value })}
                    />
                  </View>
                )}

                {/* C3.4 — sous le mode choisi, jamais après la liste : c'est la question que
                    le calcul se posait tout seul. Il attribuait exactement la moitié des
                    kilomètres à chaque jambe, ce qui sous-estime de 44 % un vélo + train (on
                    fait rarement la moitié du trajet à vélo) et surestime de 51 % un
                    parc-relais (on ne conduit pas jusqu'à mi-chemin) — sur le poste qui décide
                    du poste dominant, donc du plan. */}
                {answers.commute_second_mode === modeId && (
                  <View style={styles.precision}>
                    <PrecisionMode
                      question="Quelle part du trajet fais-tu ainsi ?"
                      options={PARTS_DU_SECOND_MODE}
                      valeur={answers.commute_second_mode_share}
                      onChange={(value) => update({ commute_second_mode_share: value })}
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
  row: { flexDirection: 'row', gap: Spacing.two },
  nestedBox: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two },
  nestedList: { gap: Spacing.two },
  precision: { marginTop: Spacing.two },
});
