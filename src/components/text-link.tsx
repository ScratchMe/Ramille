import type { Ref } from 'react';
import { Pressable, StyleSheet, type StyleProp, type TextStyle, type View, type ViewStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ControlHeight, Radius, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Texte cliquable — le motif le plus répandu du produit (retours, liens de pied d'écran,
// « Je ne sais pas », « Voir les autres modes »…), présent soixante-dix fois.
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
//
// **Un lien déjà souligné au repos prend la teinte appuyée à la place** (contre-lecture du
// 25/09/2026) : « Supprimer mon compte », « Changer d'avis » et leurs deux « Annuler » portent leur
// soulignement en permanence, donc le souligner sous le doigt ne changeait rien — exactement le
// « l'app n'a pas pris mon geste » que la décision n° 6 ferme. La cible prend `backgroundPressed`,
// la teinte des surfaces neutres sous le doigt ; le texte ne bouge pas.
//
// **Trois apparences, et pas une de plus** (`v1-33` T-5, 03/10/2026). Le composant prenait le corps,
// l'encre et la graisse de chaque appelant : le relevé en a compté sept là où le kit en documentait
// quatre, et « J'ai déjà un compte » en cinq formes pour un même geste. L'apparence se nomme donc, et
// le composant seul sait ce qu'elle veut dire — `small` partout, puis :
//
//   * `action` — l'encre d'accent, en 600 : le lien qui fait avancer, ou l'autre chemin posé sous un
//     bouton principal (« Voir toutes les pistes », « J'ai déjà un compte », « Il manque encore … ») ;
//   * `discret` — l'encre tertiaire : ce qui se propose sans pousser (les pages légales, « Renvoyer un
//     code », « Un chiffre me semble faux ») ;
//   * `souligne` — la même encre, soulignée au repos : un lien discret **qu'une phrase de la même encre
//     touche**, ou posé dans une carte. Gris contre gris, au même corps, il se lisait comme la suite de
//     la phrase (« Pas de trajet la semaine dernière », P-7 ; le « Retour » collé à « Reviens en
//     arrière », T-5). Et un « Annuler » posé à côté d'un bouton de confirmation l'est partout.
//
// **Désactivé, un lien prend l'encre tertiaire** (le kit, puce « États ») : un lien d'action en attente
// d'une relecture se lit ainsi indisponible sans opacité. `style` ne règle que l'alignement du texte ; ce
// qui fait l'apparence passe après lui, donc ne peut pas être repeint par un appelant.
export type ApparenceDuLien = 'action' | 'discret' | 'souligne';

const ENCRE: Record<ApparenceDuLien, ThemeColor> = {
  action: 'accentText',
  discret: 'textTertiary',
  souligne: 'textTertiary',
};

export function TextLink({
  ref,
  label,
  apparence,
  onPress,
  disabled,
  role = 'button',
  hint,
  expanded,
  containerStyle,
  style,
  ...textProps
}: {
  /** Pour y rendre le focus après un geste qui l'avait fait disparaître (« Modifier les jours », D15). */
  ref?: Ref<View>;
  label: string;
  /** Ce que le lien est dans l'écran — l'accent, le discret, le discret souligné. Voir l'en-tête. */
  apparence: ApparenceDuLien;
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
  /** L'alignement du texte, et rien d'autre : l'encre, le corps et le soulignement sont ceux de `apparence`. */
  style?: StyleProp<Pick<TextStyle, 'textAlign'>>;
} & Omit<ThemedTextProps, 'children' | 'style' | 'onPress' | 'type' | 'themeColor' | 'weight'>) {
  const theme = useTheme();
  const dejaSouligne = apparence === 'souligne';
  const encre = disabled ? 'textTertiary' : ENCRE[apparence];

  return (
    <Pressable
      ref={ref}
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
      style={({ pressed }) => [
        styles.cible,
        containerStyle,
        pressed && !disabled && dejaSouligne && [styles.cibleAppuyee, { backgroundColor: theme.backgroundPressed }],
      ]}
    >
      {({ pressed }) => (
        <ThemedText
          {...textProps}
          type="small"
          weight={apparence === 'action' ? 600 : 500}
          themeColor={encre}
          style={[
            style,
            { color: theme[encre] },
            dejaSouligne ? styles.souligne : styles.nu,
            pressed && !disabled && !dejaSouligne && styles.souligne,
          ]}
        >
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cible: { minHeight: ControlHeight.target, justifyContent: 'center' },
  souligne: { textDecorationLine: 'underline' },
  nu: { textDecorationLine: 'none' },
  // Le rayon de l'encadré, pour que la teinte ne soit pas un rectangle à angles vifs autour d'un mot.
  cibleAppuyee: { borderRadius: Radius.notice },
});
