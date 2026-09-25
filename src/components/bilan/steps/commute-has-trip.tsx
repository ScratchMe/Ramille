import { StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BilanAnswers } from '@/types/bilan';

/** Écrite une fois : le titre de l'étape et le nom du « Oui / Non » (`GroupeDeChoix`). */
const QUESTION_TRAJET = 'As-tu un trajet régulier pour le travail ou les études ?';

// B1.1
export function CommuteHasTripStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <TitreDEtape>{QUESTION_TRAJET}</TitreDEtape>
      <GroupeDeChoix question={QUESTION_TRAJET} style={styles.choices}>
        <ChoiceRow
          label="Oui"
          selected={answers.commute_has_regular_trip === true}
          onPress={() => update({ commute_has_regular_trip: true })}
        />
        <ChoiceRow
          label="Non"
          selected={answers.commute_has_regular_trip === false}
          // Une seule réponse à poser : `normaliserReponses` efface toute la section 1, et c'est
          // le seul endroit où cette liste vit. Celle qui était écrite ici énumérait dix champs
          // et en oubliait un — `commute_two_wheeler_type`, le symptôme même du constat A2-17.
          // C'était la dernière des quatre listes tenues à la main.
          onPress={() => update({ commute_has_regular_trip: false })}
        />
      </GroupeDeChoix>
      {/* **La seconde phrase est la limite du produit, et elle a mis neuf jours à arriver** (D7,
          décidé le 10/09/2026, livré le 19/09 par la contre-lecture qui a constaté son absence en
          écrivant `v1-24`). Elle est explicitement « une ligne, sans arbitrage » — ce qui l'a fait
          vivre dans une case du tableau des arbitrages, et une case n'est pas une tâche.

          Ce qu'elle dit et ce qu'elle ne dit pas : le bilan couvre le trajet **vers** le travail et
          non les kilomètres faits **pendant**. Pour un commercial, une infirmière en visites ou un
          livreur, c'est l'essentiel de leur route — et le produit leur répondait que leur empreinte
          était celle de leur trajet du matin, sans jamais dire pourquoi. Elle n'ouvre rien : ni
          question, ni promesse, ni « bientôt ». Le poste lui-même est un increment à part
          (`v1-24`). */}
      <ThemedText type="small" themeColor="textTertiary" style={styles.helper}>
        Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe
        directement à la suite. On ne compte pas ici les déplacements faits pendant ton travail.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  choices: { gap: Spacing.two + 2 },
  helper: { lineHeight: 21 },
});
