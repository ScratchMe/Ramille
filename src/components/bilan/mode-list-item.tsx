import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Item de liste des pickers de mode (B1.4 mode principal, B2.2 mode loisirs, B1.6
// "Lequel ?" imbriqué) — rayon `Radius.chip`, sélection = fond teinté + bordure accent.
export function ModeListItem({
  label,
  selected,
  onPress,
  nestedBackground,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Item affiché dans un encart déjà teinté (B1.6 "Lequel ?") — le fond non-sélectionné
   *  doit rester blanc plutôt que reprendre le gris standard, sinon il se fond dans
   *  l'encart parent. */
  nestedBackground?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // `radio` et non `button` : ces items sont des choix exclusifs dans une liste. Un
      // lecteur d'écran annonce alors « sélectionné / non sélectionné », ce que `button`
      // ne dit pas — et c'est justement l'information dont on a besoin ici.
      accessibilityRole="radio"
      accessibilityLabel={label}
      // L'état par `aria-checked`, le seul que le web reçoive (cf. `chip.tsx`).
      aria-checked={selected}
      style={[
        styles.item,
        {
          backgroundColor: selected
            ? theme.backgroundSelected
            : nestedBackground
              ? theme.background
              : theme.backgroundElement,
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
  item: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    borderWidth: Stroke.selected,
  },
  label: { fontSize: 16, lineHeight: 22 },
});
