import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type PlanCycle = {
  id: string;
  period_label: string;
  trip_label: string;
  plan_actions: { id: string; action_templates: { action_text: string } | null }[];
};

type PendingCheckin = EngagementCheckin & { period_start: string };

// Une seule question vivante par boucle, la plus récente. La requête est déjà triée par
// `period_start` décroissant, donc le premier vu de chaque `loop_type` est le bon.
function keepLatestPerLoop(checkins: PendingCheckin[]): EngagementCheckin[] {
  const seen = new Set<EngagementCheckin['loop_type']>();
  return checkins.filter((checkin) => {
    if (seen.has(checkin.loop_type)) return false;
    seen.add(checkin.loop_type);
    return true;
  });
}

type LoadState =
  | { status: 'loading' }
  // Aucun bilan complété — écran "État vide" de la maquette.
  | { status: 'no_assessment' }
  // Bilan complété mais plan_cycles pas encore généré — ne devrait plus arriver en
  // pratique (compute_assessment_results le génère désormais immédiatement, cf.
  // migration 20260824190000), gardé comme filet pour les bilans complétés avant elle
  // et pas encore repris par le cron quotidien.
  | { status: 'pending'; assessmentId: string }
  | { status: 'ok'; cycle: PlanCycle; assessmentId: string; checkins: EngagementCheckin[] };

// B "Plan de réduction" — le mockup n'a qu'une seule carte teintée par cap/action
// (copy fixe : "240 kg CO₂e", "30 % du trajet en train"...) : `action_templates` ne
// porte que du texte générique par catégorie de mode (cf. v1-03 §3, "copy volontairement
// minimale") — pas de chiffrage individualisé par action en base pour cette V1. Chaque
// carte affiche donc uniquement `action_text`, sans les phrases chiffrées de la maquette.
export default function Plan() {
  const theme = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Le lien "Revenir à mon bilan" pointe vers la restitution du dernier bilan
      // complété (elle-même donne accès à "Modifier mes réponses") — il faut donc son
      // id systématiquement, pas seulement dans le cas filet ci-dessous.
      const { data: assessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('status', 'completed')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!assessment) {
        setState({ status: 'no_assessment' });
        return;
      }

      const { data: cycle, error: cycleError } = await supabase
        .from('plan_cycles')
        .select('id, period_label, trip_label, plan_actions(id, action_templates(action_text))')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (cycleError || !cycle) {
        setState({ status: 'pending', assessmentId: assessment.id });
        return;
      }

      // Check-ins en attente (boucle hebdo domicile-travail + boucle mensuelle extras,
      // cf. generate_commute_checkins/generate_extras_checkins). Les périodes révolues sont
      // clôturées côté serveur en `expired` (migration 20260904180000) : sans ça, un
      // utilisateur absent huit semaines retrouvait huit cartes identiques.
      //
      // Le `keepLatestPerLoop` ci-dessous est une ceinture en plus de cette bretelle : si un
      // passage de cron était manqué, la table pourrait de nouveau porter deux périodes en
      // attente pour une même boucle. On n'affiche jamais qu'une question vivante par boucle,
      // la plus récente — une pile de rappels est le contraire de ce que cette boucle promet.
      const { data: checkins } = await supabase
        .from('engagement_checkins')
        .select('id, loop_type, period_label, trip_label, period_start')
        .eq('status', 'pending')
        .order('period_start', { ascending: false });

      if (cancelled) return;

      setState({
        status: 'ok',
        cycle: cycle as PlanCycle,
        assessmentId: assessment.id,
        checkins: keepLatestPerLoop((checkins as PendingCheckin[] | null) ?? []),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Chargement de ton plan…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'no_assessment') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.emptySafeArea}>
          <EmptyStateIllustration style={styles.emptyIllustration} />
          <ThemedText type="title" weight={600} style={styles.emptyTitle}>
            Ton bilan n&apos;est pas encore fait
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            Sans bilan, on ne peut pas savoir quel déplacement compte le plus pour toi. Environ 5
            minutes.
          </ThemedText>
          <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'pending') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Ton plan est en cours de préparation, reviens dans un instant.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { cycle, assessmentId, checkins } = state;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Ton plan
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {cycle.plan_actions.length > 1 ? 'Deux actions' : 'Une action'} liée
              {cycle.plan_actions.length > 1 ? 's' : ''} à {cycle.trip_label}.
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.cadenceChip}>
              <ThemedText type="small" weight={600}>
                Cadence : {cycle.period_label}
              </ThemedText>
            </ThemedView>
          </View>

          <View style={styles.actions}>
            {cycle.plan_actions.map((action) => (
              <View key={action.id} style={[styles.actionCard, { borderColor: theme.border }]}>
                <ThemedText weight={600} style={styles.actionText}>
                  {action.action_templates?.action_text ?? 'Action à préciser.'}
                </ThemedText>
              </View>
            ))}
          </View>

          {checkins.length > 0 && (
            <View style={styles.checkins}>
              {checkins.map((checkin) => (
                <CheckinCard
                  key={checkin.id}
                  checkin={checkin}
                  emphasize={checkin.trip_label === cycle.trip_label}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={() => router.push({ pathname: '/bilan/resultat', params: { id: assessmentId } })}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.footerLink}>
              Revenir à mon bilan
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
  intro: { gap: Spacing.two },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  body: { fontSize: 15, lineHeight: 22 },
  cadenceChip: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  actions: { gap: Spacing.two + 2 },
  actionCard: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 8 },
  actionText: { fontSize: 17, lineHeight: 24 },
  checkins: { gap: Spacing.two + 2 },
  footer: { padding: Spacing.four },
  footerLink: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyTitle: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
