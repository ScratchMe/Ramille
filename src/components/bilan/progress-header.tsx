import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// En-tête commun à tous les écrans du questionnaire (B1.1→B4) : libellé de section,
// "Étape N sur M", barre 6px — cf. maquette, largeur recalculée dynamiquement selon les
// pas réellement visibles (branchements), pas un pourcentage fixe par écran.
export function ProgressHeader({ section, step, total }: { section: string; step: number; total: number }) {
  const theme = useTheme();
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textTertiary">
          {section}
        </ThemedText>
        <ThemedText type="small" themeColor="textTertiary">
          Étape {step} sur {total}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, paddingBottom: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
