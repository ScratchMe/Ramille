import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import { loadAnsweredCheckins, loadAssessmentHistory } from '@/lib/bilan-history';
import {
  daysSince,
  REBILAN_SUGGESTION_DAYS,
  variationNote,
  type AssessmentSnapshot,
  type CheckinRecord,
} from '@/types/suivi';
import { formatTonnes } from '@/lib/format';
import { loadReminderPrefs, setReminderPrefs, type ReminderPrefs } from '@/lib/notification-prefs';

// Écran « Mon suivi » — la brique qui manquait pour que le produit accompagne réellement
// dans la durée (v1-07 §3.2). Jusqu'ici on répondait à un check-in, la carte disparaissait,
// et il ne restait rien : aucun écran ne montrait l'historique des bilans, alors que
// `assessments` en supporte plusieurs depuis l'increment 6 et que `engagement_checkins`
// conserve chaque réponse.
//
// Deux règles de fond, qui ne sont pas négociables ici :
//
//  1. **Soi vs soi, jamais vs les autres.** Le non-goal de la spec §2 sur la comparaison
//     entre utilisateurs reste ferme (risque de honte comparative pour les profils captifs
//     de la voiture). Rien sur cet écran ne mentionne un autre utilisateur.
//  2. **Aucune mécanique d'échec.** Pas de streak, pas de série cassée, pas de score. Une
//     période sans réponse n'apparaît pas comme un manquement — elle n'apparaît pas du tout
//     (les check-ins non répondus sont clos en `expired` côté serveur et jamais lus ici).
//     Ce qui est compté, ce sont les fois où la personne a répondu, pas celles où elle a
//     laissé passer. La révision du 04/09/2026 (v1-06 §1) rouvre les mécaniques de
//     progression **non comparatives** ; elle ne rouvre pas les mécaniques punitives.

const POSTE_LABEL: Record<string, string> = {
  commute: 'Trajet domicile-travail',
  leisure: 'Loisirs du week-end',
  travel: 'Voyages longue distance',
};

const LOOP_LABEL: Record<CheckinRecord['loopType'], string> = {
  commute: 'Domicile-travail',
  extras: 'Loisirs et voyages',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ok'; history: AssessmentSnapshot[]; checkins: CheckinRecord[] };

export default function Suivi() {
  useTrackView('suivi_view');

  const theme = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reminders, setReminders] = useState<ReminderPrefs>({ canReceive: false, enabled: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [history, checkins, prefs] = await Promise.all([
        loadAssessmentHistory(),
        loadAnsweredCheckins(),
        loadReminderPrefs(),
      ]);
      if (cancelled) return;
      setReminders(prefs);
      setState(history.length === 0 ? { status: 'empty' } : { status: 'ok', history, checkins });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Optimiste, avec retour arrière si l'écriture échoue : un interrupteur qui ne bouge pas
  // au doigt donne l'impression d'être cassé.
  const toggleReminders = async (enabled: boolean) => {
    setReminders((prev) => ({ ...prev, enabled }));
    const ok = await setReminderPrefs(enabled);
    if (!ok) setReminders((prev) => ({ ...prev, enabled: !enabled }));
  };

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Chargement de ton suivi…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'empty') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.emptySafeArea}>
          <EmptyStateIllustration style={styles.emptyIllustration} />
          <ThemedText type="title" weight={600} style={styles.emptyTitle}>
            Ton suivi commence au premier bilan
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            C’est lui qui donne le point de départ. Ensuite, tu verras ton empreinte évoluer
            dans le temps. Environ 5 minutes.
          </ThemedText>
          <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { history, checkins } = state;
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const first = history[0];

  // Échelle commune à toutes les barres : la comparaison n'a de sens que si les bilans
  // partagent le même repère.
  const maxKg = Math.max(...history.map((snapshot) => snapshot.totalKg), 1);
  const answeredYes = checkins.filter((checkin) => checkin.response).length;
  const daysSinceLatest = daysSince(latest.submittedAt);
  const suggestRebilan = daysSinceLatest >= REBILAN_SUGGESTION_DAYS;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Ton suivi
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {history.length === 1
                ? 'Ton point de départ. Refais ton bilan quand tes habitudes changent : tu verras l’écart ici.'
                : `${history.length} bilans depuis le ${formatDate(first.submittedAt)}.`}
            </ThemedText>
          </View>

          {/* Évolution de l'empreinte — le cœur de l'écran. Chaque bilan est un point de
              l'histoire de la personne, jamais un classement. */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText weight={600} type="small">
              Ton empreinte transport, bilan après bilan
            </ThemedText>
            <View style={styles.bars}>
              {history.map((snapshot, index) => (
                <View key={snapshot.assessmentId} style={styles.historyRow}>
                  <View style={styles.historyHeader}>
                    <ThemedText
                      type="small"
                      weight={index === history.length - 1 ? 600 : 400}
                      themeColor={index === history.length - 1 ? 'text' : 'textSecondary'}
                    >
                      {formatDate(snapshot.submittedAt)}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      weight={index === history.length - 1 ? 600 : 400}
                      themeColor={index === history.length - 1 ? 'text' : 'textSecondary'}
                    >
                      {formatTonnes(snapshot.totalKg)}
                    </ThemedText>
                  </View>
                  <View style={[styles.barRail, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max((snapshot.totalKg / maxKg) * 100, 3)}%`,
                          backgroundColor: index === history.length - 1 ? theme.accent : theme.accentMuted,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textTertiary">
                    Poste principal : {POSTE_LABEL[snapshot.dominantPoste] ?? snapshot.dominantLabel}
                  </ThemedText>
                </View>
              ))}
            </View>
            {previous && (
              <ThemedText type="small" themeColor="textSecondary">
                {variationNote(previous.totalKg, latest.totalKg)}
              </ThemedText>
            )}
          </ThemedView>

          {/* Ce que la personne a fait, jamais ce qu'elle a manqué. */}
          {checkins.length > 0 && (
            <ThemedView type="backgroundSelected" style={styles.card}>
              <View style={styles.checkinsHeader}>
                <Mascot mood="happy" size={40} />
                <View style={styles.checkinsHeaderText}>
                  <ThemedText weight={600}>
                    {answeredYes === 0
                      ? `${checkins.length} point${checkins.length > 1 ? 's' : ''} de suivi`
                      : `${answeredYes} fois où tu as changé quelque chose`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {answeredYes === 0
                      ? 'Tu réponds régulièrement : c’est déjà ça qui compte.'
                      : 'Chaque fois compte, même isolée.'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.checkinList}>
                {checkins.slice(0, 8).map((checkin) => (
                  <View key={checkin.id} style={styles.checkinRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.checkinPeriod}>
                      {LOOP_LABEL[checkin.loopType]} · {checkin.periodLabel}
                    </ThemedText>
                    <ThemedText type="small" weight={600} themeColor={checkin.response ? 'accentText' : 'textTertiary'}>
                      {checkin.response ? 'Oui' : 'Non'}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          )}

          {/* Le rappel par email n'existe que pour un compte rattaché : une session anonyme
              n'a aucune adresse où écrire. Afficher l'interrupteur à quelqu'un qui ne peut
              pas en bénéficier ne ferait que soulever une question sans réponse. */}
          {reminders.canReceive && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.reminderRow}>
                <View style={styles.reminderText}>
                  <ThemedText weight={600} type="small">
                    Recevoir un rappel par email
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Une question par semaine pour ton trajet domicile-travail, une par mois pour
                    tes loisirs et voyages. Rien d’autre.
                  </ThemedText>
                </View>
                <Switch
                  value={reminders.enabled}
                  onValueChange={toggleReminders}
                  trackColor={{ false: theme.paginationInactive, true: theme.accent }}
                  thumbColor={theme.background}
                />
              </View>
            </ThemedView>
          )}

          {suggestRebilan && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText weight={600} type="small">
                Ton dernier bilan a {Math.floor(daysSinceLatest / 30)} mois
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Le refaire prend moins de temps que la première fois : tes réponses sont
                pré-remplies, tu ne modifies que ce qui a changé.
              </ThemedText>
              <Button title="Refaire mon bilan" onPress={() => router.push('/bilan')} />
            </ThemedView>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {!suggestRebilan && (
            <Pressable onPress={() => router.push('/bilan')}>
              <ThemedText type="small" weight={600} themeColor="accentText" style={styles.footerLink}>
                Refaire mon bilan
              </ThemedText>
            </Pressable>
          )}
          {/* Point d'entrée général du canal de retour (issue #29). Il vit ici plutôt que
              dans un réglage caché : /suivi est l'écran où l'on revient, donc celui où l'on
              a quelque chose à dire. */}
          <Pressable onPress={() => router.push('/feedback')}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.footerLink}>
              Un retour à nous faire ?
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/plan')}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.footerLink}>
              Revenir à mon plan
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
  card: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: Spacing.three },
  historyRow: { gap: 6 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRail: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reminderText: { flex: 1, gap: 4 },
  checkinsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkinsHeaderText: { flex: 1, gap: 2 },
  checkinList: { gap: Spacing.two },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  checkinPeriod: { flex: 1 },
  footer: { gap: Spacing.three, padding: Spacing.four },
  footerLink: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyTitle: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
