import { StyleSheet, View } from 'react-native';

import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { ThemedText } from '@/components/themed-text';
import {
  CAR_ENGINE_OPTIONS,
  COMMUTE_MODE_CHOICES,
  TWO_WHEELER_TYPE_OPTIONS,
} from '@/constants/transport-modes';
import { Spacing } from '@/constants/theme';
import { TAILLES_DE_COVOITURAGE, type BilanAnswers } from '@/types/bilan';

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
      <ThemedText type="screenTitle">
        Quel est ton mode de transport principal pour ce trajet ?
      </ThemedText>
      <View style={styles.list}>
        {COMMUTE_MODE_CHOICES.map((choice) => {
          const selected = answers.commute_mode === choice.modeId && answers.commute_is_carpool === choice.carpool;
          return (
            <View key={choice.key}>
              <ModeListItem
                label={choice.label}
                selected={selected}
                // Cet écran ne dit que ce que la personne vient de choisir. Ce que ce choix
                // rend impossible — taille du covoiturage, second mode devenu identique,
                // motorisation ou type de deux-roues rattachés à une jambe qui n'existe
                // plus — est effacé par `normaliserReponses`, appliquée après chaque
                // `update`. Trois écrans tenaient ces listes à la main, et elles
                // divergeaient déjà (audit A2-17).
                onPress={() => update({ commute_mode: choice.modeId, commute_is_carpool: choice.carpool })}
              />

              {/* La précision s'ouvre sous l'élément qui la déclenche — cf. `precision-mode.tsx`
                  pour la raison, qui n'est pas cosmétique. */}
              {selected && choice.modeId === 'voiture' && (
                <View style={styles.precision}>
                  <PrecisionMode
                    question="Quelle motorisation ?"
                    options={CAR_ENGINE_OPTIONS}
                    valeur={answers.commute_car_engine}
                    onChange={(value) => update({ commute_car_engine: value })}
                  />
                </View>
              )}

              {selected && choice.modeId === 'deux_roues_motorise' && (
                <View style={styles.precision}>
                  <PrecisionMode
                    question="Quel type de deux-roues ?"
                    options={TWO_WHEELER_TYPE_OPTIONS}
                    valeur={answers.commute_two_wheeler_type}
                    onChange={(value) => update({ commute_two_wheeler_type: value })}
                  />
                </View>
              )}

              {/* **Elle vient de l'écran suivant** (recette du 14/09/2026, `v1-16` §3). Le produit
                  pose trois fois combien de personnes partagent la voiture, et le présentait de
                  deux façons : sous l'option choisie pour les sorties et les longs trajets depuis
                  C3.5, en tête de l'écran suivant pour celui-ci. La question décrit la voiture
                  qu'on vient de choisir, exactement comme la motorisation juste au-dessus — la
                  séparer du choix demandait de se souvenir d'un écran à l'autre de quelle voiture
                  on parle.

                  Après la motorisation et sous la même option, comme `leisure-detail.tsx` : les
                  deux précisions décrivent la même voiture. */}
              {selected && choice.carpool && (
                <View style={styles.precision}>
                  <PrecisionChiffres
                    question="Vous êtes combien à partager ce trajet ?"
                    options={TAILLES_DE_COVOITURAGE}
                    valeur={answers.commute_carpool_size}
                    onChange={(value) => update({ commute_carpool_size: value })}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <MissingModeLink context="B1.4 mode domicile-travail" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  list: { gap: Spacing.two },
  precision: { marginTop: Spacing.two },
});
