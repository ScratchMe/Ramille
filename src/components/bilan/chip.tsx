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
  /** Quand le libellé visible est une abréviation ambiguë — deux jours de la semaine portent
   *  l'initiale « M » — le lecteur d'écran doit entendre le mot entier. */
  accessibilityLabel?: string;
};

// Chip générique — couvre les pickers numériques/tranches (B1.3, B2.2, B3.*) et les
// choix binaires équirépartis (B1.5/B1.6) de la maquette, qui ne partagent que la forme
// pilule/carré-arrondi, pas le même traitement de sélection.
export function Chip({
  label,
  selected,
  onPress,
  flex,
  selectedStyle = 'solid',
  radius = 22,
  accessibilityLabel,
}: ChipProps) {
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[
        styles.base,
        flex ? styles.baseFlex : styles.basePilule,
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Une puce à largeur naturelle tire sa forme de pilule de son padding : c'est lui qui fait
  // la largeur.
  basePilule: { paddingHorizontal: 18 },
  // Une puce équirépartie tire sa largeur du `flex`, et le padding ne fait que **retirer**
  // de la place au texte. À 18 de chaque côté, les sept puces de « jours par semaine » ne
  // laissaient que 3 dp au chiffre sur un écran de 390 dp, pour ~9 nécessaires : Android
  // rognait le glyphe au lieu de le laisser déborder, et les chiffres apparaissaient coupés.
  // Même famille que le `minWidth: 0` des champs de saisie (cf. CLAUDE.md) : un enfant flex
  // qui ne peut pas contenir son contenu ne le signale pas, il le tronque.
  baseFlex: { paddingHorizontal: 4 },
  label: { fontSize: 15, lineHeight: 20 },
});
