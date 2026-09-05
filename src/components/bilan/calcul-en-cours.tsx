import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Écran d'attente pendant le calcul du bilan (canvas docs/design/v1-08-mascotte, artboard
// « Calcul »). Ce n'est pas une attente inventée : la soumission enchaîne trois écritures et
// `compute_assessment_results`, qui calcule le bilan puis génère le plan de réduction dans la
// foulée. Jusqu'ici, le seul retour était le libellé du bouton qui passait à « Enregistrement… ».
//
// Deux écarts assumés par rapport à la maquette :
//   - **pas de barre de progression.** L'artboard en montrait une à 62 % ; on ne sait pas où on
//     en est, et une barre qui avance sans rien mesurer est un mensonge d'interface. Le
//     souffle de la mascotte suffit à dire que quelque chose se passe.
//   - **aucun décompte.** L'artboard annonçait « neuf réponses, treize facteurs d'émission » :
//     le référentiel en compte quinze depuis l'ajout des motorisations hybrides, et le nombre
//     d'étapes visibles dépend des réponses. Un chiffre en dur dans une phrase dérive sans que
//     personne ne le voie — même raison que pour les repères de `carbon-reference.ts`.
export function CalculEnCours() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Mascot mood="thinking" size={72} />
          <ThemedText type="subtitle" weight={600} style={styles.title}>
            On calcule ton bilan…
          </ThemedText>
          <ThemedText themeColor="textTertiary" style={styles.body}>
            Tes réponses, croisées avec les facteurs d’émission de l’ADEME. Quelques secondes.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  title: { textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
});
