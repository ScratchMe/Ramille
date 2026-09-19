import { StyleSheet, View } from 'react-native';

import { ChampsDeContexte } from '@/components/bilan/champs-de-contexte';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';
import { phraseDuCalculDuContexte } from '@/types/contexte';

/**
 * B4 — le contexte de mobilité, dernière étape du questionnaire.
 *
 * **Les quatre questions ne sont plus écrites ici** (C6.4) : elles vivent dans `ChampsDeContexte`,
 * partagé avec l'écran autonome `/contexte`, qui les repose sans resoumettre de bilan. Ce qui reste
 * propre à l'étape est son introduction — celle-ci annonce une étape du questionnaire, celle de
 * l'écran autonome annonce une correction.
 */
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
        <ThemedText type="screenTitle">Quel est ton contexte de mobilité ?</ThemedText>
        {/* Écart 12 (C5.4) — l'intro dit la **règle**, pas l'usage. « Ça nous sert à te proposer
            des actions réalistes » décrivait une intention ; « ne propose que ce qui tient »
            dit ce qui se passe, et c'est ce qui rend l'encart du plan lisible plus tard comme
            une prémisse et non comme une surprise.

            **La seconde phrase se dérive depuis C6.4, et ce n'est pas un raffinement** : écrite en
            dur, elle était fausse pour qui sort rarement — `household_vehicles` décide alors du
            mode du résiduel de sorties, donc du total. `phraseDuCalculDuContexte` dit pourquoi, et
            ce que ça vaut. */}
        <ThemedText type="small" themeColor="textTertiary">
          Ton plan ne propose que ce qui tient avec ces réponses.{' '}
          {phraseDuCalculDuContexte(answers.leisure_frequency)}
        </ThemedText>
      </View>

      <ChampsDeContexte choix={answers} trajet={answers} update={update} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  intro: { gap: Spacing.two },
});
