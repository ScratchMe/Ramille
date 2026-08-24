import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type AssessmentResults = Database['public']['Tables']['assessment_results']['Row'];

// Placeholders — mêmes valeurs que docs/architecture (et onboarding/contexte.tsx pour la
// moyenne transport), à confirmer sur la Base Carbone ADEME. Pas encore une source
// dédiée par utilisateur (zone, profil) : un seul repère national pour tous en V1.
const FRANCE_AVERAGE_TRANSPORT_T = 2.9;
const TARGET_2050_TRANSPORT_T = 0.5;

const DOMINANT_HEADLINE: Record<string, string> = {
  commute: 'Ton trajet domicile-travail',
  leisure: 'Tes trajets loisirs',
  travel: 'Tes voyages',
};

function formatTonnes(kg: number): string {
  const tonnes = (kg / 1000).toFixed(1).replace('.', ',');
  return `${tonnes} t CO₂e`;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; results: AssessmentResults };

export default function BilanResultat() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>(
    id ? { status: 'loading' } : { status: 'error', message: 'Bilan introuvable.' }
  );

  useEffect(() => {
    if (!id) return;
    supabase
      .from('assessment_results')
      .select('*')
      .eq('assessment_id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setState({ status: 'error', message: error?.message ?? 'Bilan introuvable.' });
          return;
        }
        setState({ status: 'ok', results: data });
      });
  }, [id]);

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Calcul de ton bilan…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">{state.message}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { results } = state;
  const totalT = results.total_co2_kg_year / 1000;
  const dominantPercent = Math.round((results.dominant_poste_co2_kg_year / results.total_co2_kg_year) * 100);
  const vsAveragePercent = Math.round((totalT / FRANCE_AVERAGE_TRANSPORT_T) * 100);

  const domain = Math.max(totalT, FRANCE_AVERAGE_TRANSPORT_T, TARGET_2050_TRANSPORT_T) / 0.85;
  const barPercent = (value: number) => Math.max((value / domain) * 100, 3);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textTertiary">
            Ton bilan transport
          </ThemedText>

          <ThemedView type="backgroundSelected" style={styles.dominantCard}>
            <ThemedText weight={600} themeColor="accentText" style={styles.dominantLabel}>
              Le déplacement qui pèse le plus
            </ThemedText>
            <ThemedText type="subtitle" weight={600} style={styles.dominantHeadline}>
              {DOMINANT_HEADLINE[results.dominant_poste] ?? results.dominant_poste_label}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.dominantBody}>
              {formatTonnes(results.dominant_poste_co2_kg_year)} par an, soit {dominantPercent} % de ton empreinte
              transport.
            </ThemedText>
          </ThemedView>

          <View style={styles.totalBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Estimation annuelle, tous déplacements
            </ThemedText>
            <ThemedText weight={600} style={styles.totalValue}>
              {formatTonnes(results.total_co2_kg_year)}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Où tu te situes
            </ThemedText>
            <View style={styles.bars}>
              <CompareRow label="Toi" value={`${totalT.toFixed(1).replace('.', ',')} t`} percent={barPercent(totalT)} bold accentColor={theme.accent} />
              <CompareRow
                label="Moyenne en France"
                value={`${FRANCE_AVERAGE_TRANSPORT_T.toFixed(1).replace('.', ',')} t`}
                percent={barPercent(FRANCE_AVERAGE_TRANSPORT_T)}
                accentColor={theme.accentMuted}
              />
              <CompareRow
                label="Part transport compatible 2050"
                value={`${TARGET_2050_TRANSPORT_T.toFixed(1).replace('.', ',')} t`}
                percent={barPercent(TARGET_2050_TRANSPORT_T)}
                accentColor={theme.accentMuted}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Tu es à {vsAveragePercent} % de la moyenne française.
            </ThemedText>
          </ThemedView>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Voir ce que je peux faire" onPress={() => router.push('/plan')} />
          <Pressable onPress={() => router.push('/bilan')}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.editLink}>
              Modifier mes réponses
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function CompareRow({
  label,
  value,
  percent,
  bold,
  accentColor,
}: {
  label: string;
  value: string;
  percent: number;
  bold?: boolean;
  accentColor: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareHeader}>
        <ThemedText weight={bold ? 600 : 400} type="small" themeColor={bold ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
        <ThemedText weight={bold ? 600 : 400} type="small" themeColor={bold ? 'text' : 'textSecondary'}>
          {value}
        </ThemedText>
      </View>
      <View style={[styles.barRail, { backgroundColor: theme.border }]}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
  dominantCard: { borderRadius: 24, padding: 22, gap: 10 },
  dominantLabel: { fontSize: 14, lineHeight: 20 },
  dominantHeadline: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  dominantBody: { fontSize: 16, lineHeight: 24 },
  totalBlock: { gap: 4 },
  totalValue: { fontSize: 26, lineHeight: 32 },
  compareCard: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: 8 },
  compareRow: { gap: 8 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRail: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  footer: { gap: Spacing.three, padding: Spacing.four },
  editLink: { textAlign: 'center' },
});
