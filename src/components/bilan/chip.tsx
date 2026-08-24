import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Largeur naturelle (pilule, ex. tranches/nombres) vs équirépartie dans sa rangée
   *  (ex. Oui/Non, taille de covoiturage). */
  flex?: boolean;
  /** 'solid' = fond accent plein + texte blanc (nombres, tranches) ; 'outline' = fond
   *  teinté + bordure accent (Oui/Non, mode sélectionné dans une liste). */
  selectedStyle?: 'solid' | 'outline';
  radius?: number;
};

// Chip générique — couvre les pickers numériques/tranches (B1.3, B2.2, B3.*) et les
// choix binaires équirépartis (B1.5/B1.6) de la maquette, qui ne partagent que la forme
// pilule/carré-arrondi, pas le même traitement de sélection.
export function Chip({ label, selected, onPress, flex, selectedStyle = 'solid', radius = 22 }: ChipProps) {
  const theme = useTheme();

  const backgroundColor = selected
    ? selectedStyle === 'solid'
      ? theme.accent
      : theme.backgroundSelected
    : theme.backgroundElement;
  const borderColor = selected && selectedStyle === 'outline' ? theme.accent : 'transparent';
  const textColor = selected && selectedStyle === 'solid' ? '#FFFFFF' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { borderRadius: radius, backgroundColor, borderColor, flex: flex ? 1 : undefined },
      ]}
    >
      <ThemedText weight={selected ? 600 : 400} style={[styles.label, { color: textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, lineHeight: 20 },
});
