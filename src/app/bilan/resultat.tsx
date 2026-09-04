import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { APP_URL } from '@/lib/app-url';
import { formatTonnes } from '@/lib/format';
import { hasSeenConnexionProposal } from '@/lib/connexion-prefs';
import type { Database } from '@/lib/database.types';

type AssessmentResults = Database['public']['Tables']['assessment_results']['Row'];

// Placeholders — mêmes valeurs que docs/architecture (et onboarding/contexte.tsx pour la
// moyenne transport), à confirmer sur la Base Carbone ADEME. Pas encore une source
// dédiée par utilisateur (zone, profil) : un seul repère national pour tous en V1.
const FRANCE_AVERAGE_TRANSPORT_T = 2.9;
const TARGET_2050_TRANSPORT_T = 0.5;

// "Tes voyages" seul ne dit pas de quoi il s'agit — on précise toujours le mode réel
// (`dominant_poste_mode`, déjà en base) plutôt que le seul nom du poste. Table tenue à jour
// avec `transport_modes` (cf. seed) ; un mode absent ou inconnu retombe sur le libellé
// backend `dominant_poste_label`, jamais un texte vide.
const MODE_PREPOSITION: Partial<Record<string, string>> = {
  voiture: 'en voiture',
  voiture_thermique: 'en voiture thermique',
  voiture_electrique: 'en voiture électrique',
  train: 'en train',
  // Mode du poste voyages uniquement (B3.3, trajets > 300 km) — jamais sélectionnable dans
  // les listes du questionnaire, cf. migration 20260904140000.
  train_longue_distance: 'en TGV',
  bus: 'en bus',
  metro_tram: 'en métro ou tram',
  velo: 'à vélo',
  marche: 'à pied',
  trottinette: 'en trottinette',
  deux_roues_motorise: 'en deux-roues motorisé',
  avion_court_moyen_courrier: 'en avion (court/moyen-courrier)',
  avion_long_courrier: 'en avion long-courrier',
};

// "Trajets loisirs"/"Voyages" seuls ne distinguent pas les deux postes (retour
// utilisateur du 03/09/2026) : ce sont deux postes bien distincts du bilan (B2 "Week-ends
// et loisirs" vs B3 "Voyages sur l'année", cf. onboarding/transition.tsx) — même wording
// que les libellés persistés côté serveur, cf. migration 20260903120000_precise_poste_labels.sql.
const POSTE_SUBJECT: Record<string, string> = {
  commute: 'Ton trajet domicile-travail',
  leisure: 'Tes loisirs du week-end',
  travel: 'Tes voyages longue distance',
};

const POSTE_BREAKDOWN: {
  key: 'commute' | 'leisure' | 'travel';
  label: string;
  co2Key: 'commute_co2_kg_year' | 'leisure_co2_kg_year' | 'travel_co2_kg_year';
}[] = [
  { key: 'commute', label: 'Trajet domicile-travail', co2Key: 'commute_co2_kg_year' },
  { key: 'leisure', label: 'Loisirs du week-end', co2Key: 'leisure_co2_kg_year' },
  { key: 'travel', label: 'Voyages longue distance', co2Key: 'travel_co2_kg_year' },
];

function dominantHeadline(results: AssessmentResults): string {
  const subject = POSTE_SUBJECT[results.dominant_poste] ?? results.dominant_poste_label;
  const preposition = results.dominant_poste_mode ? MODE_PREPOSITION[results.dominant_poste_mode] : undefined;
  return preposition ? `${subject} ${preposition}` : subject;
}

// Variante neutre de dominantHeadline (sans "Tes"/"Ton") pour la carte de partage : lue par
// les destinataires du lien, pas adressée à l'utilisateur qui partage — cf. shareResult
// ci-dessous. dominant_poste_label seul (ex. "Voyages longue distance (Avion long-courrier)")
// ne dit pas qu'il s'agit du poste dominant ; combiné à dominantPercent sur la carte, le
// pourcentage lui donne un sens (retour utilisateur du 04/09/2026).
function dominantShareLabel(results: AssessmentResults): string {
  const posteLabel = POSTE_BREAKDOWN.find((p) => p.key === results.dominant_poste)?.label ?? results.dominant_poste_label;
  const preposition = results.dominant_poste_mode ? MODE_PREPOSITION[results.dominant_poste_mode] : undefined;
  return preposition ? `${posteLabel} ${preposition}` : posteLabel;
}

// « Tu es à 150 % de la moyenne française » était un jugement déguisé en fait : un score, avec
// un bon et un mauvais côté, servi à quelqu'un qui n'a parfois aucune alternative (rural, pas
// de transports en commun). La spec demande de contextualiser « sans ton culpabilisant » (§5)
// et de ne pas traiter ces profils en mauvais élèves (§2). Les barres au-dessus montrent déjà
// l'écart : la phrase se contente de le nommer et d'ouvrir sur la suite. Cf. v1-07 §3.5.
function comparisonNote(totalT: number): string {
  if (totalT <= TARGET_2050_TRANSPORT_T) {
    return 'Tu es déjà sous la part transport compatible avec 2050.';
  }
  if (totalT <= FRANCE_AVERAGE_TRANSPORT_T) {
    return 'Tu es en dessous de la moyenne française. Il reste du chemin jusqu’à 2050, comme pour tout le monde.';
  }
  return `La moyenne française est de ${FRANCE_AVERAGE_TRANSPORT_T.toFixed(1).replace('.', ',')} t. L’essentiel se joue sur un seul poste, celui du haut.`;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; results: AssessmentResults };

// Anonyme et pas encore proposé un compte : au clic sur le CTA, on passe d'abord par la
// proposition plein écran (cf. maquette "Connexion — proposition après bilan", qui
// apparaît explicitement *après* avoir vu ce résultat). Anonyme et déjà décliné une fois :
// bandeau discret ("Bilan anonyme — relance douce") plutôt que de réinterrompre à chaque
// retour, le CTA va alors directement au plan.
export default function BilanResultat() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>(
    id ? { status: 'loading' } : { status: 'error', message: 'Bilan introuvable.' }
  );
  const [showBanner, setShowBanner] = useState(false);
  const [proposalSeen, setProposalSeen] = useState(true);

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

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.is_anonymous) return;

      const seen = await hasSeenConnexionProposal();
      setProposalSeen(seen);
      setShowBanner(seen);
    })();
  }, []);

  const goToPlan = () => {
    if (!proposalSeen) {
      router.push({ pathname: '/connexion', params: { id } });
      return;
    }
    router.push('/plan');
  };

  // Boucle de croissance (décision produit du 04/09/2026) : un lien vers /api/partage
  // (Vercel Edge Function, hors export statique Expo — cf. son commentaire d'en-tête) plutôt
  // qu'un lien direct vers /bilan/resultat, pour que l'aperçu affiché par les apps de
  // messagerie (WhatsApp, iMessage…) montre une vraie image de résultat, pas une page vide.
  // Chiffres transmis uniquement via l'URL (ce que l'utilisateur voit déjà à l'écran) —
  // aucune nouvelle lecture serveur, aucune exposition de données au-delà de ce qu'il choisit
  // explicitement de partager.
  const shareResult = () => {
    if (state.status !== 'ok') return;
    const { results } = state;
    const totalTonnes = (results.total_co2_kg_year / 1000).toFixed(1);
    const percent = String(Math.round((results.dominant_poste_co2_kg_year / results.total_co2_kg_year) * 100));
    const params = new URLSearchParams({ total: totalTonnes, poste: dominantShareLabel(results), percent });
    const shareUrl = `${APP_URL}/api/partage?${params.toString()}`;
    Share.share({
      message: `Mon empreinte transport : ${formatTonnes(state.results.total_co2_kg_year)} par an. Fais la tienne sur TraceVerte : ${shareUrl}`,
      url: shareUrl,
    }).catch(() => {});
  };

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

  // Un total nul est atteignable — quelqu'un qui n'a que du vélo ou de la marche, sans avion
  // ni trajet longue distance. C'est le profil que le produit devrait féliciter, et il
  // tombait jusqu'ici sur un « NaN % » : toutes les parts se divisent par le total.
  // Cf. v1-07 T8.
  const hasEmissions = results.total_co2_kg_year > 0;
  const shareOfTotal = (kg: number) => (hasEmissions ? (kg / results.total_co2_kg_year) * 100 : 0);
  const dominantPercent = Math.round(shareOfTotal(results.dominant_poste_co2_kg_year));

  const domain = Math.max(totalT, FRANCE_AVERAGE_TRANSPORT_T, TARGET_2050_TRANSPORT_T) / 0.85;
  const barPercent = (value: number) => Math.max((value / domain) * 100, 3);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {showBanner && (
            <Pressable
              onPress={() => router.push({ pathname: '/connexion', params: { id } })}
              style={[styles.banner, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
                Ce bilan n&apos;est enregistré que sur cet appareil.
              </ThemedText>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Le garder
              </ThemedText>
            </Pressable>
          )}

          <ThemedText type="small" themeColor="textTertiary">
            Ton bilan transport
          </ThemedText>

          <ThemedView type="backgroundSelected" style={styles.dominantCard}>
            <ThemedText weight={600} themeColor="accentText" style={styles.dominantLabel}>
              Le déplacement qui pèse le plus
            </ThemedText>
            <ThemedText type="subtitle" weight={600} style={styles.dominantHeadline}>
              {dominantHeadline(results)}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.dominantBody}>
              {hasEmissions
                ? `${formatTonnes(results.dominant_poste_co2_kg_year)} par an, soit ${dominantPercent} % de ton empreinte transport.`
                : 'Tes déplacements n’émettent quasiment rien. C’est rare, et c’est une bonne nouvelle.'}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Répartition par poste
            </ThemedText>
            <View style={styles.bars}>
              {POSTE_BREAKDOWN.map((poste) => (
                <CompareRow
                  key={poste.key}
                  label={poste.label}
                  value={formatTonnes(results[poste.co2Key])}
                  percent={Math.max(shareOfTotal(results[poste.co2Key]), 3)}
                  bold={poste.key === results.dominant_poste}
                  accentColor={poste.key === results.dominant_poste ? theme.accent : theme.accentMuted}
                />
              ))}
            </View>
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
              {comparisonNote(totalT)}
            </ThemedText>
          </ThemedView>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Voir ce que je peux faire" onPress={goToPlan} />
          <Pressable onPress={shareResult}>
            <ThemedText type="small" weight={600} themeColor="accentText" style={styles.editLink}>
              Partager mon bilan
            </ThemedText>
          </Pressable>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  bannerText: { flex: 1 },
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
