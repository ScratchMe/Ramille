import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Placeholder — le plan de réduction (increment suivant) n'est pas encore construit.
// Même statut que l'était bilan/index.tsx avant increment 7 : la restitution du bilan a
// besoin d'une destination pour son CTA "Voir ce que je peux faire".
export default function PlanPlaceholder() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" weight={600} style={styles.title}>
          Bientôt disponible
        </ThemedText>
        <ThemedText weight={400} themeColor="textSecondary">
          Ton plan de réduction est en cours de construction.
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
