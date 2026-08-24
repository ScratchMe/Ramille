import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Placeholder — le questionnaire (9 étapes) n'est pas encore implémenté : la maquette
// ne détaille que 2 des 9 écrans, en attente d'une mise à jour de Claude Design pour
// le reste de la séquence. Cf. discussion increment 5.
export default function BilanPlaceholder() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" weight={600} style={styles.title}>
          Bientôt disponible
        </ThemedText>
        <ThemedText weight={400} themeColor="textSecondary">
          Le questionnaire du bilan est en cours de construction.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 36 },
});
