import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Mascot, type MascotMood } from '@/components/mascot';
import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Ramille et ce qu'elle dit, côte à côte.
 *
 * Le visage est masqué au lecteur d'écran (le composant `Mascot` le fait déjà) : c'est le
 * texte qui est annoncé, et il dit tout. La ligne vient toujours de `RAMILLE`
 * (src/constants/mascotte.ts) — ne jamais lui faire dire une phrase écrite dans un écran, et
 * jamais un chiffre : le test de ce fichier de constantes le refuse, et c'est ce qui garantit
 * qu'elle ne commente jamais une empreinte.
 */
export function RamilleDit({
  ligne,
  mood = 'calm',
  size = 40,
  tilt = 0,
  themeColor = 'textSecondary',
  style,
}: {
  ligne: string;
  mood?: MascotMood;
  size?: number;
  tilt?: number;
  themeColor?: ThemedTextProps['themeColor'];
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      <Mascot mood={mood} size={size} tilt={tilt} />
      <ThemedText type="body" themeColor={themeColor} style={styles.text}>
        {ligne}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, minWidth: 0 },
});
