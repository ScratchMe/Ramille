import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressHeader } from '@/components/bilan/progress-header';
import { Button } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Coquille commune à tous les écrans du questionnaire : en-tête de progression, contenu
// scrollable, footer Retour/Suivant. `onBack` absent = premier pas du questionnaire (pas
// de bouton Retour, cf. B1.1 qui sort du flow plutôt que d'y revenir).
export function StepShell({
  section,
  step,
  total,
  children,
  onBack,
  onNext,
  nextLabel = 'Suivant',
  nextDisabled,
}: {
  section: string;
  step: number;
  total: number;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBlock}>
          <ProgressHeader section={section} step={step} total={total} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={styles.footer}>
          {onBack && <Button title="Retour" variant="secondary" onPress={onBack} />}
          <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} flex />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  scrollContent: { padding: Spacing.four, gap: Spacing.five, flexGrow: 1 },
  footer: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', padding: Spacing.four },
});
