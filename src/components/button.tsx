import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  flex?: boolean;
  style?: ViewStyle;
  /** Précision annoncée après le titre, quand celui-ci ne suffit pas hors contexte
   *  (« Oui » / « Non » d'un check-in, par exemple). */
  accessibilityHint?: string;
};

// Bouton pleine largeur, hauteur 54px, rayon 27px — cf. design tokens du handoff.
// `flex` sert au cas "Retour" (largeur auto) + "Suivant" (flex:1) côte à côte.
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  flex,
  style,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();

  const backgroundColor = disabled
    ? theme.backgroundElement
    : variant === 'primary'
      ? theme.accent
      : theme.backgroundElement;
  const textColor = disabled ? theme.textTertiary : variant === 'primary' ? '#FFFFFF' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.base, { backgroundColor, flex: flex ? 1 : undefined }, style]}
    >
      <ThemedText weight={variant === 'secondary' ? 500 : 600} style={{ color: textColor, fontSize: 16 }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: ControlHeight.button,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
