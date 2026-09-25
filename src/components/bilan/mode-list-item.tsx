import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';
import { fondDuChoix } from '@/types/fond-du-choix';

// Item de liste des pickers de mode — B1.4 mode principal, B1.7 « Lequel ? » imbriqué, B2.2 mode
// loisirs — et des réponses de `PrecisionMode` (motorisation, type de deux-roues, de train, de
// vélo, part du trajet). Rayon `Radius.chip`, sélection = fond teinté + bordure accent. Chacune de
// ces listes se range dans un `GroupeDeChoix` nommé par sa question (25/09/2026).
export function ModeListItem({
  label,
  selected,
  onPress,
  nestedBackground,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Item affiché dans un encart déjà teinté (B1.7 « Lequel ? », `PrecisionMode`) — le fond
   *  non sélectionné doit rester blanc plutôt que reprendre le gris standard, sinon il se fond
   *  dans l'encart parent. */
  nestedBackground?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // Espace coche l'item sur web, ce que react-native-web ne fait que pour un bouton
      // (`src/lib/barre-d-espace.ts`).
      {...activableALaBarreDEspace(onPress)}
      // `radio` et non `button` : ces items sont des choix exclusifs dans une liste. Un
      // lecteur d'écran annonce alors « sélectionné / non sélectionné », ce que `button`
      // ne dit pas — et c'est justement l'information dont on a besoin ici.
      accessibilityRole="radio"
      accessibilityLabel={label}
      // L'état par `aria-checked`, le seul que le web reçoive (cf. `chip.tsx`).
      aria-checked={selected}
      // Sous le doigt, la surface prend sa teinte appuyée, sans animation (décision n° 6, `v1-29`) —
      // la même pour un item posé sur blanc dans un encart : elle tranche sur les deux fonds. Le
      // fond sort de `fondDuChoix`, comme celui de tous les choix.
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor:
            theme[fondDuChoix({ choisi: selected, appuye: pressed, imbrique: nestedBackground })],
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
