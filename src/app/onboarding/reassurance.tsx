import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ReassuranceIllustration } from '@/components/illustrations/reassurance-illustration';
import { OnboardingDots } from '@/components/onboarding-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTrackView } from '@/hooks/use-track-view';

// Onboarding 3/4 — Réassurance. Seul écran à fond teinté de l'onboarding, corps de
// texte plus généreux (17/26 au lieu de 16/24) — le seul écran « chaleureux »,
// cf. handoff design.
export default function OnboardingReassurance() {
  useTrackView('onboarding_step_view', { step: 'reassurance' });

  return (
    <ThemedView type="backgroundTinted" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ReassuranceIllustration style={styles.illustration} />
          <View style={styles.textBlock}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Pas de jugement. Un état des lieux honnête.
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              Vivre en zone rurale, travailler loin, avoir besoin de sa voiture : ce sont des
              contraintes, pas des fautes. On en tient compte dans ton bilan.
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              Tes réponses restent privées. Aucun classement, aucune comparaison avec
              d&apos;autres utilisateurs.
            </ThemedText>
          </View>
        </View>
        <View style={styles.footer}>
          <Button title="Continuer" onPress={() => router.push('/onboarding/transition')} />
          <OnboardingDots total={4} activeIndex={2} onTint />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.five },
  content: { gap: Spacing.five },
  illustration: { height: 180 },
  textBlock: { gap: Spacing.four },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  body: { fontSize: 17, lineHeight: 26 },
  footer: { gap: Spacing.five },
});
