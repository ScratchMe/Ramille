import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingHeroIllustration } from '@/components/illustrations/onboarding-hero-illustration';
import { Mascot } from '@/components/mascot';
import { OnboardingDots } from '@/components/onboarding-dots';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';

// Étape 1/4 de l'onboarding, rendue par le pager de `src/app/onboarding/index.tsx`.
//
// C'était une route à part entière jusqu'au 07/09/2026 ; les quatre étapes vivent maintenant
// dans un seul écran qui se balaie au doigt (issue #68). Le contenu n'a pas bougé.
//
// Onboarding — Accroche. Aucun chiffre : la spec impose d'ouvrir sur un bénéfice
// concret, pas sur l'écart à combler (docs/design/README.md §1.1).
export function EtapeAccroche({ onSuivant }: { onSuivant: () => void }) {
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
          <Button title="Découvrir mon impact" onPress={() => onSuivant()} />
          <OnboardingDots total={4} activeIndex={0} />
          {/* **Le produit ne disait nulle part qu'on peut commencer sans compte** (C3.9, constat
              A1-8) : le seul mot « compte » de tout l'onboarding était le lien ci-dessous, qui se
              lit exactement à l'envers — « j'ai déjà un compte » laisse entendre qu'il en faut un.
              La phrase se pose **au-dessus** du lien et ne le déplace pas : c'est elle qui doit
              répondre en premier à la question que le lien fait naître. */}
          <ThemedText type="small" themeColor="textTertiary" style={styles.sansCompte}>
            Pas de compte à créer pour commencer.
          </ThemedText>
          {/* La seule mention de compte avant le bilan, et volontairement discrète — jamais un
              bouton — sur un écran dont la promesse est « pas besoin de compte ». Elle est
              pourtant ce qui fait le gros du travail de v1-10 : proposée ici, elle attrape la
              personne qui change d'appareil **avant** qu'elle refasse un bilan, donc elle
              supprime la collision au lieu de la gérer (docs/design/v1-10-retrouver-son-compte). */}
          <TextLink
            label="J’ai déjà un compte"
            onPress={() => router.push({ pathname: '/connexion/retrouver', params: { source: 'onboarding' } })}
            role="link"
            type="small"
            weight={600}
            themeColor="textSecondary"
            style={styles.dejaUnCompte}
            containerStyle={styles.dejaUnCompteCible}
          />
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
  sansCompte: { textAlign: 'center', marginTop: -Spacing.three },
  dejaUnCompte: { textAlign: 'center' },
  dejaUnCompteCible: { marginTop: -Spacing.five },
});
