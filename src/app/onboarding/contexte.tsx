import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingDots } from '@/components/onboarding-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Onboarding 2/4 — Contexte chiffré. Les 10t/2t viennent de la spec fonctionnelle.
// La répartition par poste (2,9/2,4/2,2/2,5 t) reste un placeholder à confirmer sur la
// Base Carbone ADEME, cf. handoff design §Fidélité — pas encore de source pour ces
// 3 postes hors-transport (contrairement aux facteurs transport, déjà réels).
export default function OnboardingContexte() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.textBlock}>
            <ThemedText type="title" weight={600} style={styles.title}>
              10 tonnes aujourd&apos;hui, 2 tonnes visées en 2050
            </ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              C&apos;est l&apos;empreinte annuelle moyenne d&apos;une personne en France, et la
              cible pour 2050.
            </ThemedText>
          </View>

          <View style={styles.barsBlock}>
            <ComparisonRow label="Aujourd'hui" value="≈ 10 t CO₂e" percent={100} height={22} bold />
            <ComparisonRow label="Cible 2050" value="2 t CO₂e" percent={20} height={22} bold />
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.postesBlock}>
            <ThemedText weight={600} style={styles.postesTitle}>
              Dans cette empreinte, le transport est le premier poste.
            </ThemedText>
            <View style={styles.postesRows}>
              <PosteRow label="Transport" value="2,9 t" percent={100} accent />
              <PosteRow label="Logement" value="2,4 t" percent={83} />
              <PosteRow label="Alimentation" value="2,2 t" percent={76} />
              <PosteRow label="Biens et services" value="2,5 t" percent={86} />
            </View>
            <ThemedText type="code" themeColor="textTertiary">
              source ADEME · valeurs à confirmer
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
