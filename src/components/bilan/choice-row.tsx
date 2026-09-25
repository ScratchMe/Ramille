import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';
import { fondDuChoix } from '@/types/fond-du-choix';

// Rangée de choix pleine largeur — B1.1, B1.3 (tranches), B2.1 (fréquence).
export function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // Espace coche la rangée sur web, ce que react-native-web ne fait que pour un bouton
      // (`src/lib/barre-d-espace.ts`).
      {...activableALaBarreDEspace(onPress)}
      accessibilityRole="radio"
      accessibilityLabel={label}
      // `aria-checked` et non `accessibilityState`, que react-native-web ignore (cf. `chip.tsx`).
      aria-checked={selected}
      // Sous le doigt, la surface prend sa teinte appuyée, sans animation (décision n° 6, `v1-29`) ;
      // le fond, au repos comme appuyé, est celui de tous les choix (`fondDuChoix`).
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme[fondDuChoix({ choisi: selected, appuye: pressed })],
          borderColor: selected ? theme.accent : 'transparent',
        },
      ]}
    >
      <ThemedText weight={selected ? 600 : 400} style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
  },
  label: { fontSize: 16, lineHeight: 22 },
});
