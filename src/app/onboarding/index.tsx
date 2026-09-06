import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingHeroIllustration } from '@/components/illustrations/onboarding-hero-illustration';
import { Mascot } from '@/components/mascot';
import { OnboardingDots } from '@/components/onboarding-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTrackView } from '@/hooks/use-track-view';
import { RAMILLE } from '@/constants/mascotte';

// Onboarding 1/4 — Accroche. Aucun chiffre : la spec impose d'ouvrir sur un bénéfice
// concret, pas sur l'écart à combler (docs/design/README.md §1.1).
export default function OnboardingAccroche() {
  useTrackView('onboarding_step_view', { step: 'accroche' });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <OnboardingHeroIllustration style={styles.illustration} />
        <View style={styles.textBlock}>
          {/* Première apparition de la mascotte dans le parcours : elle salue avant que le
              questionnaire ne la reprenne, plus petite et droite, dans son en-tête.
              L'inclinaison fait tout le travail — une feuille penchée regarde, une feuille
              droite accompagne (cf. canvas docs/design/v1-08-mascotte).

              L'artboard remplaçait l'illustration d'accueil par la mascotte seule. On la garde :
              elle porte « une personne et ses trajets du quotidien », spécifié par le handoff
              design §1.1, que la mascotte ne rend pas. */}
          <Mascot mood="calm" size={48} tilt={-7} />
          {/* Elle se présente une fois, ici : la promesse d'accompagnement dans la durée, dite
              par celle qui la tient. Son nom est aussi celui du produit. */}
          <ThemedText type="small" themeColor="textTertiary" style={styles.presentation}>
            {RAMILLE.presentation}
          </ThemedText>
          <ThemedText type="title" weight={600} style={styles.title}>
            Comprendre tes trajets, sans te juger.
          </ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
            En quelques minutes, tu vois quel déplacement pèse le plus dans ton empreinte — et
            ce que tu peux faire de concret.
          </ThemedText>
        </View>
        <View style={styles.footer}>
          <Button title="Découvrir mon impact" onPress={() => router.push('/onboarding/contexte')} />
          <OnboardingDots total={4} activeIndex={0} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.four },
  illustration: { flex: 1 },
  textBlock: { gap: Spacing.three },
  presentation: { marginTop: -Spacing.one },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -0.68 },
  body: { fontSize: 16, lineHeight: 24 },
  footer: { gap: Spacing.five },
});
