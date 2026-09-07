import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { CompteBouton } from '@/components/compte-bouton';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';
import { formatTonnes } from '@/lib/format';
import { useTrackFocus } from '@/hooks/use-track-focus';
import { ActionCard } from '@/components/plan/action-card';
import { ActionCommitment } from '@/components/plan/action-commitment';
import { formatIntention } from '@/types/plan';
import { daysSince, REBILAN_SUGGESTION_DAYS } from '@/types/suivi';
import { supabase } from '@/lib/supabase';

type PlanAction = {
  id: string;
  saving_kg_year: number | null;
  saving_share_percent: number | null;
  detail_text: string | null;
  rank: number | null;
  committed_at: string | null;
  intention_days: number[] | null;
  intention_timing: string | null;
  action_templates: { action_text: string; poste: string | null } | null;
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
  | {
      status: 'ok';
      cycle: PlanCycle;
      assessmentId: string;
      /** Date du dernier bilan complété — sert la proposition de re-bilan. */
      assessmentDate: string | null;
      checkins: EngagementCheckin[];
    };

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
  // **Émis au focus et non au montage** : dans une barre d'onglets, react-navigation garde
  // l'écran monté quand on passe à l'autre. Avec `useTrackView`, l'événement ne partirait
  // qu'à la première ouverture de la session — et le taux de retour, qui est la question
  // même que la navigation pose, deviendrait invisible (v1-11 §2, piège relevé au plan).
  useTrackFocus('plan_view');

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Recharge après un engagement : le RPC libère aussi l'action précédente, donc l'état à
  // jour ne se déduit pas de l'action qu'on vient de toucher — il faut relire le cycle.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Le lien "Revenir à mon bilan" pointe vers la restitution du dernier bilan
      // complété (elle-même donne accès à "Modifier mes réponses") — il faut donc son
      // id systématiquement, pas seulement dans le cas filet ci-dessous.
      const { data: assessment } = await supabase
        .from('assessments')
        .select('id, submitted_at')
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
          'id, period_label, trip_label, baseline_co2_kg_year, target_reduction_pct, plan_actions(id, saving_kg_year, saving_share_percent, detail_text, rank, committed_at, intention_days, intention_timing, action_templates(action_text, poste))'
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
        assessmentDate: assessment.submitted_at,
        checkins: keepLatestPerLoop((checkins as PendingCheckin[] | null) ?? []),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
          <ThemedText type="screenTitle">
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

  const { cycle, assessmentId, assessmentDate, checkins } = state;
  const actionsCount = cycle.plan_actions.length;
  const committedActionId = cycle.plan_actions.find((a) => a.committed_at !== null)?.id ?? null;
  // Copie avant tri : `sort` mute, et `cycle` vient du state.
  const actionsOrdonnees = [...cycle.plan_actions].sort(
    (a, b) => Number(b.committed_at !== null) - Number(a.committed_at !== null)
  );
  const baselineKg = cycle.baseline_co2_kg_year;
  // Le cap est une part de la baseline du poste dominant, pas du total : c'est sur ce poste
  // que le plan porte, et annoncer -20 % de l'empreinte entière serait une promesse fausse.
  // Même seuil et même lien que sur le suivi : une seule règle, deux endroits où la
  // rencontrer. Le plan est celui où l'on revient le plus souvent — c'est donc là qu'une
  // proposition de re-bilan a le plus de chances d'être vue, alors qu'elle n'existait que
  // sur le suivi.
  const bilanAncien = assessmentDate !== null && daysSince(assessmentDate) >= REBILAN_SUGGESTION_DAYS;

  const capKg =
    baselineKg !== null && baselineKg > 0
      ? Math.round((baselineKg * cycle.target_reduction_pct) / 100)
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <CompteBouton />
          <View style={styles.intro}>
            <ThemedText type="screenTitle">
              Ton plan
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
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

          {/* **Le point de la semaine passe en tête** (v1-11 flux 4) : répondre à un rappel est
              la raison de revenir la plus fréquente, et la question vivait sous les actions,
              après le cap — il fallait faire défiler pour la trouver. Une question qu'on ne
              voit pas est une question à laquelle on ne répond pas. */}
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

          {/* Période calme (v1-11 flux 6) : rien à faire n'est pas un échec, et le silence à
              cet endroit se lit comme un manque. Le mot de Ramille prend la place de la
              question — ses répliques vivent dans `mascotte.ts`, on n'en écrit pas ici.

              Elle est posée **au-dessus** du cap et non à côté : la règle « jamais la mascotte
              près d'un chiffre lourd » vise l'empreinte, mais un cap en kilos juste sous son
              visage donnerait l'impression qu'elle le commente. */}
          {checkins.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.calmeCard}>
              <View style={styles.calmeRow}>
                <Mascot mood="resting" size={40} />
                <View style={styles.calmeTexte}>
                  <ThemedText weight={600}>{RAMILLE.periodeCalme}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {RAMILLE.periodeCalmeDetail}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          )}

          {/* Le cap de la saison (T10). Affiché en kg parce que c'est l'unité des actions
              juste en dessous : la personne doit pouvoir voir d'un coup d'œil qu'en cumulant
              deux actions elle l'atteint — ou ne l'atteint pas, ce qui est une information
              tout aussi utile et jamais présentée comme un échec. */}
          {capKg !== null && (
            <ThemedView type="backgroundSelected" style={styles.capCard}>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Ton cap pour cette période
              </ThemedText>
              <ThemedText type="salient">
                − {capKg} kg
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                soit − {Math.round(cycle.target_reduction_pct)} % de {cycle.trip_label.toLowerCase()}
                {baselineKg !== null ? ` (${formatTonnes(baselineKg)} aujourd’hui)` : ''}
              </ThemedText>
            </ThemedView>
          )}

          {/* L'action engagée passe en tête : c'est la réponse à « qu'est-ce que je fais en ce
              moment ? », elle n'a pas à être cherchée. Le reste garde l'ordre du serveur, qui
              trie déjà par gain décroissant (`estimate_action_savings`). */}
          <View style={styles.actions}>
            {actionsOrdonnees.map((action) => (
              <ActionCard
                key={action.id}
                titre={action.action_templates?.action_text ?? 'Action à préciser.'}
                gainKg={action.saving_kg_year}
                partPercent={action.saving_share_percent}
                detail={action.detail_text}
                intention={formatIntention(action.intention_days, action.intention_timing)}
                engagee={action.committed_at !== null}
                estompee={committedActionId !== null && committedActionId !== action.id}
              >
                {/* Étape 6b : choisir une action et y attacher une intention. Une seule à la
                    fois par cycle — s'engager sur les deux revient à ne s'engager sur aucune,
                    et la base le garantit par un index unique partiel. */}
                <ActionCommitment
                  actionId={action.id}
                  poste={action.action_templates?.poste ?? null}
                  committed={action.committed_at !== null}
                  intentionDays={action.intention_days}
                  intentionTiming={action.intention_timing}
                  otherActionCommitted={
                    committedActionId !== null && committedActionId !== action.id
                  }
                  onChanged={() => setRefreshKey((key) => key + 1)}
                />
              </ActionCard>
            ))}
          </View>

          {/* Profil qui n'a plus rien à céder sur son poste dominant. Le pire accueil
              possible serait une liste vide : c'est la personne qui fait déjà le plus
              d'efforts. Même principe que le T8 de l'audit sur la restitution. */}
          {actionsCount === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyActionsCard}>
              <View style={styles.praiseRow}>
                <Mascot mood="happy" size={36} />
                <ThemedText type="cardTitle" style={styles.praiseText}>
                  Tu fais déjà l’essentiel sur ce poste.
                </ThemedText>
              </View>
              <ThemedText type="body" themeColor="textSecondary">
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

          {/* La proposition de re-bilan ferme l'écran (v1-11 flux 2). Elle apparaît au plus
              deux fois par an : la faire passer devant la question de la semaine ou devant
              l'action engagée inverserait l'urgence. « Une proposition, jamais un rappel
              insistant » — même règle que sur le suivi, même seuil, même lien. */}
          {bilanAncien && (
            <ThemedView type="backgroundSelected" style={styles.rebilanCard}>
              <ThemedText type="small" weight={600}>
                Une nouvelle saison a commencé
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ton bilan date d’un moment. Le refaire prend moins de temps que la première
                fois : tes réponses sont préremplies.
              </ThemedText>
              <TextLink
                label="Refaire mon bilan"
                onPress={() => router.push('/bilan')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
            </ThemedView>
          )}

        </ScrollView>

        {/* « Voir mon suivi » a disparu : la barre le porte, et un lien qui double un onglet
            apprend à ne pas se servir de la barre. Le renvoi vers le bilan reste — ce n'est
            pas une destination de la barre, c'est le détail d'une entrée du suivi. */}
        <View style={styles.footer}>
          <TextLink
            label="Revenir à mon bilan"
            onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: assessmentId } })}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.footerLink}
          />
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
  cadenceChip: { alignSelf: 'flex-start', borderRadius: Radius.chip, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  capCard: { borderRadius: Radius.card, padding: 20, gap: 6 },
  actions: { gap: Spacing.two + 2 },
  emptyActionsCard: { borderRadius: Radius.card, padding: 20, gap: 8 },
  praiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  praiseText: { flex: 1, minWidth: 0 },
  disclaimer: { lineHeight: 18 },
  checkins: { gap: Spacing.two + 2 },
  calmeCard: { borderRadius: Radius.card, padding: 20 },
  rebilanCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  calmeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  calmeTexte: { flex: 1, minWidth: 0, gap: 2 },
  footer: { padding: Spacing.four, gap: Spacing.three },
  footerLink: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
