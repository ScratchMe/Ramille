import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { HYPOTHESES } from '@/constants/methodologie';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BilanAnswers } from '@/types/bilan';

// "N+" stocke N — simplification assumée (pas de borne haute en base pour ces champs,
// cf. v1-05), cohérente avec le traitement déjà appliqué à la taille de covoiturage.
const TOTAL_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// B3.1 / B3.2
export function FlightsStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  const total = answers.flights_total_per_year;
  const shortChoices = Array.from({ length: total + 1 }, (_, i) => i);
  const longCount = Math.max(total - (answers.flights_short_per_year ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        {/* **« Combien de fois » laissait le facteur 2 au hasard** (C3.3, constat A7-7). Un
            aller-retour compte-t-il un ou deux ? Chacun répond à sa façon, sur le poste le plus
            lourd de la plupart des bilans — un vol long-courrier vaut à lui seul plus d'une année
            de trajet domicile-travail en voiture pour beaucoup de profils.

            Levé par la copie et non en doublant les distances : doubler `dist_flight_short` et
            `dist_flight_long` invaliderait la quinzaine d'assertions chiffrées de la suite pgTAP
            **et** obligerait à relever à nouveau les facteurs avion, dont la valeur dépend du `km`
            demandé à l'API Impact CO2. Le calcul ne bouge pas ; c'est la question qui devient
            sans ambiguïté. */}
        <ThemedText type="screenTitle">Combien de vols prends-tu dans une année type ?</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Un aller-retour compte pour deux vols.
        </ThemedText>
        <View style={styles.chipsWrap}>
          {TOTAL_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === 10 ? '10+' : String(n)}
              selected={total === n}
              onPress={() =>
                update({
                  flights_total_per_year: n,
                  flights_short_per_year:
                    answers.flights_short_per_year !== null
                      ? Math.min(answers.flights_short_per_year, n)
                      : n > 0
                        ? null
                        : 0,
                })
              }
            />
          ))}
        </View>
      </View>

      {total > 0 && (
        <>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.block}>
            <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
              Sur ces {total}, combien sont courts ?
            </ThemedText>
            <ThemedText type="small" themeColor="textTertiary">
              Europe, moins de 3 h. Le reste est compté comme long-courrier.
            </ThemedText>
            <View style={styles.row}>
              {shortChoices.map((n) => (
                <Chip
                  key={n}
                  label={String(n)}
                  selected={answers.flights_short_per_year === n}
                  onPress={() => update({ flights_short_per_year: n })}
                  radius={14}
                />
              ))}
            </View>
            {answers.flights_short_per_year !== null && (
              <ThemedText type="small">
                {longCount} vol{longCount > 1 ? 's' : ''} long-courrier {longCount > 1 ? 'seront' : 'sera'} compté
                {longCount > 1 ? 's' : ''}.
              </ThemedText>
            )}
          </View>
        </>
      )}

      {/* **Les hypothèses s'affichent ici comme sur l'écran des longs trajets** (C3.3). Elles y
          étaient depuis le début (« 800 km train, 700 km voiture ») et nulle part pour les vols,
          alors que ce sont les deux plus grandes distances du bilan. Interpolées depuis
          `HYPOTHESES` plutôt que réécrites : un script de CI compare cette table aux constantes de
          `recompute_assessment_results`, donc ce qui s'affiche ici suit le calcul. */}
      <ThemedText type="code" themeColor="textTertiary">
        distances moyennes par défaut · {formatKm(HYPOTHESES.volCourtKm)} court et moyen-courrier,{' '}
        {formatKm(HYPOTHESES.volLongKm)} long-courrier
      </ThemedText>
    </View>
  );
}

// Séparateur de milliers écrit à la main, comme dans `methodologie.ts` : `toLocaleString('fr-FR')`
// rend « 1,500 » sur un Hermes construit sans ICU complet, soit une virgule décimale au milieu
// d'une distance.
function formatKm(km: number): string {
  return `${String(km).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} km`;
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  separator: { height: 1 },
});
