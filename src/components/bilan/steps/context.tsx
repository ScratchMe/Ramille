import { StyleSheet, View } from 'react-native';

import { ChampsDeContexte } from '@/components/bilan/champs-de-contexte';
import { TitreDEtape } from '@/components/bilan/step-shell';
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
        <TitreDEtape>Quel est ton contexte de mobilité ?</TitreDEtape>
        {/* **La règle du plan n'est plus redite ici** (01/10/2026, `v1-33` D7). L'intro disait
            « Ton plan ne propose que ce qui tient avec ces réponses. » (écart 12 de C5.4 : la règle,
            pas l'usage), deux cents pixels sous Ramille, qui ouvre la section en disant la même chose
            (« Ce qui est possible là où tu vis change ce que je te proposerai ensuite. »,
            `RAMILLE.entreeDeSection`) : deux voix pour un seul fait, dans le même gris. La règle reste
            dite une fois sur l'étape, par Ramille — et sur `/contexte`, qui n'a pas de Ramille et
            garde la phrase.

            **Ce qui reste se dérive depuis C6.4, et ce n'est pas un raffinement** : écrite en dur, la
            phrase était fausse pour qui sort rarement — `household_vehicles` décide alors du mode du
            résiduel de sorties, donc du total. `phraseDuCalculDuContexte` dit pourquoi, et ce que ça
            vaut. */}
        <ThemedText type="small" themeColor="textTertiary">
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
