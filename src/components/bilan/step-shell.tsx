import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressHeader } from '@/components/bilan/progress-header';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
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
  notice,
  message,
  manque,
}: {
  section: string;
  step: number;
  total: number;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Bandeau discret sous l'en-tête (ex. « réponses pré-remplies » lors d'un re-bilan). */
  notice?: string;
  /** Échec de la dernière tentative, affiché juste au-dessus des boutons — là où l'action a
   *  été déclenchée, et dans la zone collante, donc sans avoir à faire défiler. */
  message?: string | null;
  /** Ce qu'il reste à renseigner sur l'étape, quand « Suivant » est inactif. Texte calme et
   *  non annoncé comme une alerte : ce n'est pas un échec, juste ce qui manque. */
  manque?: string | null;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBlock}>
          <ProgressHeader section={section} step={step} total={total} />
          {notice && (
            <ThemedView type="backgroundSelected" style={styles.notice}>
              <ThemedText type="small" themeColor="accentText">
                {notice}
              </ThemedText>
            </ThemedView>
          )}
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={styles.footerBlock}>
          <MessageInline message={message ?? null} />
          {/* **Un bouton grisé ne dit pas pourquoi.** Sur l'étape loisirs, la précision du
              mode se déplie au-dessus de la tranche de distance et la pousse hors champ : on
              voit une étape qu'on croit finie et un « Suivant » inactif, sans rien qui
              indique qu'il reste un champ plus bas (retour d'appareil du 07/09/2026). Le
              manque se dit donc là où se prend la décision d'avancer, dans la zone collante.
              Pas de `role="alert"` : ce n'est pas un échec, et l'annoncer à chaque frappe
              rendrait le lecteur d'écran inutilisable. */}
          {manque && (
            <ThemedText type="small" themeColor="textTertiary">
              Il manque encore {manque}.
            </ThemedText>
          )}
          <View style={styles.footer}>
            {onBack && <Button title="Retour" variant="secondary" onPress={onBack} />}
            <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} flex />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.three },
  notice: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: Spacing.three },
  scrollContent: { padding: Spacing.four, gap: Spacing.five, flexGrow: 1 },
  // Le padding vit sur le bloc, pas sur la rangée : le message doit être aligné sur les
  // boutons et non collé au bord.
  footerBlock: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, gap: Spacing.two },
  footer: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
});
