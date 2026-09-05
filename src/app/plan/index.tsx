import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatTonnes } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import { supabase } from '@/lib/supabase';

type PlanAction = {
  id: string;
  saving_kg_year: number | null;
  saving_share_percent: number | null;
  detail_text: string | null;
  rank: number | null;
  action_templates: { action_text: string } | null;
};

type PlanCycle = {
  id: string;
  period_label: string;
  trip_label: string;
  baseline_co2_kg_year: number | null;
  target_reduction_pct: number;
  plan_actions: PlanAction[];
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

// B "Plan de réduction". Depuis l'étape 6a (v1-07 §3.3), chaque action porte son gain estimé,
// figé à la génération du cycle : `plan_actions.saving_kg_year` et `.saving_share_percent`.
// L'écran ne calcule donc rien — il affiche ce que `estimate_action_savings` a arrêté au
// moment du bilan, pour qu'un chiffre montré ne bouge pas sous les yeux de la personne au gré
// d'une mise à jour ADEME.
//
// Le cap de la saison (`target_reduction_pct`, -20 %) était stocké depuis l'increment 3 et
// lu par aucun écran (T10 de l'audit). Il est affiché ici, avec l'objectif qu'il implique.
//
// Deux formulations à ne pas durcir : le gain est une **estimation** déclarative fondée sur
// des moyennes ADEME, jamais une mesure ; et un plan sans action n'est pas un échec mais le
// signe que la personne fait déjà l'essentiel — l'état correspondant la félicite au lieu de
// lui présenter une liste vide.
export default function Plan() {
  useTrackView('plan_view');

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
        .select(
          // Chaîne littérale d'un seul tenant, volontairement longue : supabase-js infère le
          // type du résultat en analysant ce littéral au niveau des types. Une concaténation
          // lui rend un `string` opaque et le typage du retour est perdu.
          'id, period_label, trip_label, baseline_co2_kg_year, target_reduction_pct, plan_actions(id, saving_kg_year, saving_share_percent, detail_text, rank, action_templates(action_text))'
        )
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
  const actionsCount = cycle.plan_actions.length;
  const baselineKg = cycle.baseline_co2_kg_year;
  // Le cap est une part de la baseline du poste dominant, pas du total : c'est sur ce poste
  // que le plan porte, et annoncer -20 % de l'empreinte entière serait une promesse fausse.
  const capKg =
    baselineKg !== null && baselineKg > 0
      ? Math.round((baselineKg * cycle.target_reduction_pct) / 100)
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Ton plan
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {actionsCount === 0
                ? `Rien à alléger sur ${cycle.trip_label}.`
                : `${actionsCount > 1 ? 'Deux actions liées' : 'Une action liée'} à ${cycle.trip_label}.`}
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.cadenceChip}>
              <ThemedText type="small" weight={600}>
                Cadence : {cycle.period_label}
              </ThemedText>
            </ThemedView>
          </View>

          {/* Le cap de la saison (T10). Affiché en kg parce que c'est l'unité des actions
              juste en dessous : la personne doit pouvoir voir d'un coup d'œil qu'en cumulant
              deux actions elle l'atteint — ou ne l'atteint pas, ce qui est une information
              tout aussi utile et jamais présentée comme un échec. */}
          {capKg !== null && (
            <ThemedView type="backgroundSelected" style={styles.capCard}>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Ton cap pour cette période
              </ThemedText>
              <ThemedText weight={600} style={styles.capValue}>
                − {capKg} kg
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                soit − {Math.round(cycle.target_reduction_pct)} % de {cycle.trip_label.toLowerCase()}
                {baselineKg !== null ? ` (${formatTonnes(baselineKg)} aujourd’hui)` : ''}
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.actions}>
            {cycle.plan_actions.map((action) => (
              <View key={action.id} style={[styles.actionCard, { borderColor: theme.border }]}>
                <ThemedText weight={600} style={styles.actionText}>
                  {action.action_templates?.action_text ?? 'Action à préciser.'}
                </ThemedText>
                {action.saving_kg_year !== null && (
                  <View style={styles.savingRow}>
                    <ThemedText weight={600} themeColor="accentText" style={styles.savingValue}>
                      − {Math.round(action.saving_kg_year)} kg CO₂e
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      par an
                      {action.saving_share_percent !== null
                        ? ` · ${Math.round(action.saving_share_percent)} % de ton empreinte`
                        : ''}
                    </ThemedText>
                  </View>
                )}
                {action.detail_text && (
                  <ThemedText type="small" themeColor="textTertiary">
                    {action.detail_text}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>

          {/* Profil qui n'a plus rien à céder sur son poste dominant. Le pire accueil
              possible serait une liste vide : c'est la personne qui fait déjà le plus
              d'efforts. Même principe que le T8 de l'audit sur la restitution. */}
          {actionsCount === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyActionsCard}>
              <View style={styles.praiseRow}>
                <Mascot mood="happy" size={36} />
                <ThemedText weight={600} style={styles.praiseText}>
                  Tu fais déjà l’essentiel sur ce poste.
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
                Aucun changement de mode ne te ferait gagner assez pour valoir la peine d’être
                proposé. Le check-in reste là si tu veux garder un œil dessus.
              </ThemedText>
            </ThemedView>
          )}

          {/* La provenance du chiffre, à l'endroit où il engage le plus. Le produit vise un
              registre institutionnel : une estimation présentée comme une mesure serait le
              premier endroit où la crédibilité se casse. */}
          {actionsCount > 0 && (
            <ThemedText type="code" themeColor="textTertiary" style={styles.disclaimer}>
              Estimations sur la base des facteurs ADEME et de tes réponses. Un ordre de
              grandeur pour choisir, pas une mesure.
            </ThemedText>
          )}

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
          <Pressable onPress={() => router.push('/suivi')}>
            <ThemedText type="small" weight={600} themeColor="accentText" style={styles.footerLink}>
              Voir mon suivi
            </ThemedText>
          </Pressable>
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
  capCard: { borderRadius: 18, padding: 20, gap: 6 },
  capValue: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  actions: { gap: Spacing.two + 2 },
  actionCard: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 8 },
  savingRow: { gap: 2 },
  savingValue: { fontSize: 20, lineHeight: 26 },
  emptyActionsCard: { borderRadius: 18, padding: 20, gap: 8 },
  praiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  praiseText: { fontSize: 17, lineHeight: 24, flex: 1, minWidth: 0 },
  disclaimer: { lineHeight: 18 },
  actionText: { fontSize: 17, lineHeight: 24 },
  checkins: { gap: Spacing.two + 2 },
  footer: { padding: Spacing.four, gap: Spacing.three },
  footerLink: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyTitle: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
