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

// Bouton pleine largeur, rayon 27px — cf. design tokens du handoff.
// `flex` sert au cas "Retour" (largeur auto) + "Suivant" (flex:1) côte à côte.
//
// **La hauteur est un minimum, pas une mesure** (A10-21) : le texte suit l'agrandissement des
// polices du système — c'est le bon défaut, et rien dans le produit ne le plafonne — mais une
// boîte figée à 54 px ne grandissait pas avec lui. À 150 ou 200 %, le libellé débordait de son
// bouton. `minHeight` + `paddingVertical` donnent exactement la même allure à taille normale
// (24 px d'interligne + 2 × 15 = 54) et laissent le bouton grandir au lieu de déborder.
//
// **Il répond au toucher depuis le 24/09/2026** (décision n° 6 du challenge du design system,
// `v1-29`) : aucun contrôle du produit ne changeait sous le doigt, ce qui se lit « l'app n'a pas pris
// mon geste ». La surface prend sa teinte appuyée — `accentPressed` pour le principal,
// `backgroundPressed` pour le secondaire — **instantanément et sans animation**, par le `style`
// fonction de `Pressable`. Ni ondulation Android ni opacité : la première ne se voit pas sur web, la
// seconde ferait baisser le contraste du libellé au moment même où on le touche.
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
  const backgroundAppuye = variant === 'primary' ? theme.accentPressed : theme.backgroundPressed;
  const textColor = disabled ? theme.textTertiary : variant === 'primary' ? theme.onAccent : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      // Pas d'`accessibilityState` : `disabled` suffit, et il est le seul à atteindre le web.
      // `Pressable` de react-native-web en tire `aria-disabled` (et l'attribut `disabled` du
      // `<button>` qu'il rend), React Native le range dans l'état que TalkBack annonce.
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed && !disabled ? backgroundAppuye : backgroundColor, flex: flex ? 1 : undefined },
        style,
      ]}
    >
      <ThemedText weight={variant === 'secondary' ? 500 : 600} style={{ color: textColor, fontSize: 16 }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ControlHeight.button,
    paddingVertical: 15,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
