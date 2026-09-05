import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingDots } from '@/components/onboarding-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTrackView } from '@/hooks/use-track-view';
import { track } from '@/lib/analytics';

const SECTIONS = [
  '1 — Trajets domicile-travail',
  '2 — Week-ends et loisirs',
  '3 — Voyages sur l’année',
  '4 — Ton contexte de mobilité',
];

// Onboarding 4/4 — Transition bilan. La durée est annoncée avant l'entrée dans le
// bilan : la friction est assumée, pas dissimulée (handoff design).
export default function OnboardingTransition() {
  useTrackView('onboarding_step_view', { step: 'transition' });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title" weight={600} style={styles.title}>
            On passe à ton bilan
          </ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
            Quelques questions sur tes déplacements habituels. Tu peux t&apos;arrêter et
            reprendre plus tard, tes réponses sont conservées.
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.durationBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Temps estimé
            </ThemedText>
            <ThemedText weight={600} style={styles.duration}>
              environ 5 minutes
            </ThemedText>
          </ThemedView>
          <View style={styles.sections}>
            {SECTIONS.map((section) => (
              <ThemedText key={section} weight={400} themeColor="textSecondary" style={styles.sectionItem}>
                {section}
              </ThemedText>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Button
            title="Commencer mon bilan"
            onPress={() => {
              // Fin de l'onboarding : `profiles.onboarding_completed_at` existe dans le
              // schéma mais n'est écrit par aucun code du produit, donc c'est ici — et
              // seulement ici — que le franchissement se lit.
              track('onboarding_complete');
              router.push('/bilan');
            }}
          />
          <OnboardingDots total={4} activeIndex={3} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  body: { fontSize: 16, lineHeight: 24 },
  durationBlock: { borderRadius: 20, padding: Spacing.four, gap: 2 },
  duration: { fontSize: 24, lineHeight: 30 },
  sections: { gap: 10 },
  sectionItem: { fontSize: 15, lineHeight: 22 },
  footer: { gap: Spacing.five },
});
