import { Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

// Texte cliquable — le motif le plus répandu du produit (retours, liens de pied d'écran,
// « Je ne sais pas », « Voir les autres modes »…), présent une vingtaine de fois.
//
// Il existe pour une raison d'accessibilité, pas de mise en forme : un `Pressable` nu ne dit
// rien à un lecteur d'écran, et l'audit T11 avait relevé **zéro attribut d'accessibilité dans
// tout `src/`**. Les ajouter à la main vingt fois aurait marché une fois, puis dérivé — un
// libellé accessible recopié à côté du texte visible finit toujours par ne plus lui
// correspondre. Ici il n'y a rien à recopier : **le libellé accessible EST le texte affiché.**
//
// La cible tactile est portée à 44 px de haut (recommandation WCAG 2.5.8 / Material) sans
// changer la position du texte : le padding est vertical et le composant reste aligné comme
// avant dans les colonnes où il vit.
export function TextLink({
  label,
  onPress,
  disabled,
  role = 'button',
  hint,
  containerStyle,
  style,
  ...textProps
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `link` pour une navigation, `button` pour une action dans l'écran courant. */
  role?: 'button' | 'link';
  /** Précision annoncée après le libellé, quand l'intitulé seul est ambigu hors contexte. */
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
} & Omit<ThemedTextProps, 'children' | 'style' | 'onPress'>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.cible, containerStyle]}
    >
      <ThemedText {...textProps} style={style}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cible: { minHeight: 44, justifyContent: 'center' },
});
