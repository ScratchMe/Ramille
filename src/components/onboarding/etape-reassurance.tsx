import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ReassuranceIllustration } from '@/components/illustrations/reassurance-illustration';
import { OnboardingDots } from '@/components/onboarding-dots';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type TitreFocalisable } from '@/lib/focus';

// Étape 3/4 de l'onboarding, rendue par le pager de `src/app/onboarding/index.tsx`.
//
// C'était une route à part entière jusqu'au 07/09/2026 ; les quatre étapes vivent maintenant
// dans un seul écran qui se balaie au doigt (issue #68). Le contenu n'a pas bougé.
//
// Onboarding — Réassurance. Seul écran à fond teinté de l'onboarding, corps de
// texte plus généreux (17/26 au lieu de 16/24) — le seul écran « chaleureux »,
// cf. handoff design.
export function EtapeReassurance({
  onSuivant,
  titre,
}: {
  onSuivant: () => void;
  /** De quoi recevoir le focus quand le pager arrive sur cette page (`src/lib/focus.ts`). */
  titre?: TitreFocalisable;
}) {
  return (
    <ThemedView type="backgroundTinted" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ReassuranceIllustration style={styles.illustration} />
          <View style={styles.textBlock}>
            <ThemedText type="display" {...titre}>
              Pas de jugement. Un état des lieux honnête.
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              Vivre en zone rurale, travailler loin, avoir besoin de sa voiture : ce sont des
              contraintes, pas des fautes. On en tient compte dans ton bilan.
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              Tes réponses restent privées. Aucun classement, aucune comparaison avec
              d’autres utilisateurs.
            </ThemedText>
            {/* **Rien ne menait aux pages légales avant la première écriture serveur** (C3.9,
                constat A1-9), alors que la session anonyme est ouverte dès le lancement : la
                phrase ci-dessus affirmait quelque chose que personne ne pouvait aller vérifier.
                `TextLink` et non `Link`, et la raison n'est pas celle qui était écrite ici : rien à
                voir avec un `noindex`, `/confidentialite` étant au contraire l'une des pages offertes
                à l'indexation (elle est dans `sitemap.xml`). La règle du lien indexable ne vise que
                les liens **sortants** du pied des pages légales (`EDITOR_CV_URL`) ; ce qui s'applique
                ici est la cible tactile — 44 px au relevé du 14/09/2026, 48 depuis le 24/09
                (`v1-29`) — et le rôle annoncé. */}
            <TextLink
              label="Ce qu’on enregistre, et pourquoi"
              onPress={() => router.push('/confidentialite')}
              role="link"
              type="small"
              weight={600}
              themeColor="textSecondary"
            />
          </View>
        </View>
        <View style={styles.footer}>
          <Button title="Continuer" onPress={() => onSuivant()} />
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
  body: { fontSize: 17, lineHeight: 26 },
  footer: { gap: Spacing.five },
});
