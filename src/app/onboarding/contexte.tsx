import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingDots } from '@/components/onboarding-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CARBON_SOURCE_LABEL,
  CONSUMPTION_POSTES,
  FRANCE_AVERAGE_TOTAL_T,
  TARGET_2050_TOTAL_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Onboarding 2/4 — Contexte chiffré. Tous les chiffres de cet écran viennent désormais de
// `@/constants/carbon-reference`, où chacun porte sa source (ADEME pour la moyenne et la
// cible, SDES pour la décomposition par poste). Ils étaient auparavant codés en dur ici et
// marqués « à confirmer » depuis le handoff design.
//
// La spec fonctionnelle §4 annonçait « ~10 t » : c'était un ordre de grandeur arrondi. On
// affiche le total publié par le SDES, qui est aussi la somme des postes montrés juste en
// dessous — le contenu factuel obligatoire de la spec reste respecté (moyenne, cible 2050,
// transport premier poste). Les données du SDES sont celles de 2017 : d'où « en moyenne »
// et non « aujourd'hui » dans le titre, et l'étiquette de source sous les barres.
export default function OnboardingContexte() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.textBlock}>
            <ThemedText type="title" weight={600} style={styles.title}>
              {formatTonnesShort(FRANCE_AVERAGE_TOTAL_T).replace(' t', ' tonnes')} en moyenne,{' '}
              {TARGET_2050_TOTAL_T} tonnes visées en 2050
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              C&apos;est l&apos;empreinte annuelle moyenne d&apos;une personne en France, et la
              cible pour 2050.
            </ThemedText>
          </View>

          <View style={styles.barsBlock}>
            <ComparisonRow
              label="Moyenne française"
              value={`${formatTonnesShort(FRANCE_AVERAGE_TOTAL_T)} CO₂e`}
              percent={100}
              height={22}
              bold
            />
            <ComparisonRow
              label="Cible 2050"
              value={`${formatTonnesShort(TARGET_2050_TOTAL_T)} CO₂e`}
              percent={Math.round((TARGET_2050_TOTAL_T / FRANCE_AVERAGE_TOTAL_T) * 100)}
              height={22}
              bold
            />
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.postesBlock}>
            <ThemedText weight={600} style={styles.postesTitle}>
              Dans cette empreinte, le transport est le premier poste.
            </ThemedText>
            <View style={styles.postesRows}>
              {CONSUMPTION_POSTES.map((poste) => (
                <PosteRow
                  key={poste.key}
                  label={poste.label}
                  value={formatTonnesShort(poste.valueT)}
                  // Proportionnel au poste le plus lourd : ce que cet écran doit faire voir,
                  // c'est que le transport arrive en tête — pas la part de chacun dans le total.
                  percent={Math.round((poste.valueT / CONSUMPTION_POSTES[0].valueT) * 100)}
                  accent={poste.key === 'transport'}
                />
              ))}
            </View>
            <ThemedText type="code" themeColor="textTertiary">
              {CARBON_SOURCE_LABEL}
            </ThemedText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Continuer" onPress={() => router.push('/onboarding/reassurance')} />
          <OnboardingDots total={4} activeIndex={1} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function ComparisonRow({
  label,
  value,
  percent,
  height,
  bold,
}: {
  label: string;
  value: string;
  percent: number;
  height: number;
  bold?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.comparisonRow}>
      <View style={styles.rowHeader}>
        <ThemedText weight={600} style={styles.rowLabel}>
          {label}
        </ThemedText>
        <ThemedText weight={bold ? 600 : 400} style={styles.rowLabel}>
          {value}
        </ThemedText>
      </View>
      <View style={[styles.barRail, { height, borderRadius: height / 2, backgroundColor: theme.border }]}>
        <View
          style={{ width: `${percent}%`, height: '100%', backgroundColor: theme.accent, borderRadius: height / 2 }}
        />
      </View>
    </View>
  );
}

function PosteRow({ label, value, percent, accent }: { label: string; value: string; percent: number; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.posteRow}>
      <View style={styles.rowHeader}>
        <ThemedText weight={accent ? 600 : 400} style={styles.posteLabel}>
          {label}
        </ThemedText>
        <ThemedText weight={400} themeColor="textTertiary" style={styles.posteLabel}>
          {value}
        </ThemedText>
      </View>
      <View style={[styles.posteRail, { backgroundColor: theme.border }]}>
        <View
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: accent ? theme.accent : theme.accentMuted,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.five, paddingBottom: Spacing.four },
  textBlock: { gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 24 },
  barsBlock: { gap: Spacing.four },
  comparisonRow: { gap: 10 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14, lineHeight: 20 },
  barRail: { overflow: 'hidden' },
  separator: { height: 1 },
  postesBlock: { gap: Spacing.three },
  postesTitle: { fontSize: 16, lineHeight: 24 },
  postesRows: { gap: 10 },
  posteRow: { gap: 6 },
  posteLabel: { fontSize: 14, lineHeight: 20 },
  posteRail: { height: 12, borderRadius: 6, overflow: 'hidden' },
  footer: { gap: Spacing.five, paddingTop: Spacing.three },
});
