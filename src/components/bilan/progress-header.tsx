import { StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MASCOT_MIN_FACE_SIZE } from '@/types/mascot';
import { useTheme } from '@/hooks/use-theme';

// En-tête commun à tous les écrans du questionnaire (B1.1→B4) : mascotte, libellé de section,
// "Étape N sur M", barre 6px — cf. maquette, largeur recalculée dynamiquement selon les
// pas réellement visibles (branchements), pas un pourcentage fixe par écran.
//
// La mascotte est ici pour une raison précise : le questionnaire est le passage le plus long
// et le plus aride du produit (neuf étapes), et c'est là qu'on perd les gens. Elle y est
// **statique** — une animation dans un élément d'interface permanent devient du bruit au
// deuxième écran — et ne passe en `happy` qu'à la dernière étape. Ce n'est pas une
// récompense au sens des non-goals (aucun point, aucun badge, rien à perdre) : juste un
// visage qui accompagne, et qui sourit quand on arrive au bout.
//
// La taille est calée sur MASCOT_MIN_FACE_SIZE et pas en dessous : à 22px, la taille
// initiale, le trait de la bouche mesurait 0,70px et le visage se réduisait à une tache —
// l'en-tête portait donc le coût d'une mascotte sans en tirer le bénéfice.
export function ProgressHeader({ section, step, total }: { section: string; step: number; total: number }) {
  const theme = useTheme();
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.sectionRow}>
          <Mascot mood={step >= total ? 'happy' : 'calm'} size={MASCOT_MIN_FACE_SIZE} animated={false} />
          <ThemedText type="small" themeColor="textTertiary">
            {section}
          </ThemedText>
        </View>
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
