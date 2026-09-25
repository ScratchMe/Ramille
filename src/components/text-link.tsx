import { Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ControlHeight } from '@/constants/theme';

// Texte cliquable — le motif le plus répandu du produit (retours, liens de pied d'écran,
// « Je ne sais pas », « Voir les autres modes »…), présent une vingtaine de fois.
//
// Il existe pour une raison d'accessibilité, pas de mise en forme : un `Pressable` nu ne dit
// rien à un lecteur d'écran, et l'audit T11 avait relevé **zéro attribut d'accessibilité dans
// tout `src/`**. Les ajouter à la main vingt fois aurait marché une fois, puis dérivé — un
// libellé accessible recopié à côté du texte visible finit toujours par ne plus lui
// correspondre. Ici il n'y a rien à recopier : **le libellé accessible EST le texte affiché.**
//
// La cible tactile est portée à `ControlHeight.target` de haut — 48 depuis le 24/09/2026, la cible
// de Material ; ce commentaire disait 44 et l'attribuait à WCAG 2.5.8, qui ne demande que 24 — sans
// changer la position du texte : la hauteur est un minimum centré, et le composant reste aligné
// comme avant dans les colonnes où il vit.
//
// **Sous le doigt, le texte se souligne** (24/09/2026, décision n° 6, `v1-29`) : c'est le retour au
// toucher d'un lien, instantané et sans animation, qui ne change ni sa couleur — elle porte déjà un
// sens (accent, tertiaire) — ni sa place.
export function TextLink({
  label,
  onPress,
  disabled,
  role = 'button',
  hint,
  expanded,
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
  /**
   * Le lien ouvre et referme un contenu, et voici s'il est ouvert.
   *
   * Sans lui, une bascule ne s'annonce que par son libellé — ce qui oblige à écrire « Replier »
   * à la place du titre, donc à perdre de quoi il s'agit pour qui rouvre l'écran. Avec, le
   * libellé reste stable et le lecteur d'écran dit « développé » / « réduit ». Laisser
   * `undefined` sur un lien qui n'ouvre rien : `expanded: false` annoncerait un contenu
   * repliable là où il n'y en a pas.
   */
  expanded?: boolean;
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
      // `aria-expanded` et non `accessibilityState.expanded`, que react-native-web ignore : sur web,
      // « Comment ce chiffre est calculé » (`BlocMethode`) ne disait ni « développé » ni « réduit ».
      // `undefined` ne rend aucun attribut, ce qui est la règle de la prop. L'inactivité passe par
      // `disabled`, dont `Pressable` tire `aria-disabled` des deux côtés.
      aria-expanded={expanded}
      style={[styles.cible, containerStyle]}
    >
      {({ pressed }) => (
        <ThemedText {...textProps} style={[style, pressed && !disabled && styles.appuye]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cible: { minHeight: ControlHeight.target, justifyContent: 'center' },
  appuye: { textDecorationLine: 'underline' },
});
