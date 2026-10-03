import { type Ref } from 'react';
import { Pressable, StyleSheet, type View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaceDuBouton } from '@/types/surface-du-bouton';

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
  /**
   * Le bouton est posé sur une surface grise ou teintée — la carte du point — et non sur le fond de
   * l'écran. Un secondaire y prend le fond de l'écran et un filet, au lieu du gris des panneaux
   * (24/09/2026, `v1-29`) : « Oui » et « Non » passés au même poids se sont retrouvés gris sur une
   * carte grise, leur forme disparaissait et ils se lisaient comme du texte. Sans effet sur le
   * principal, dont l'accent se voit partout. **Ni sur un bouton grisé, depuis le 03/10/2026** : en
   * attente ou désactivé, il y prend lui aussi le fond de l'écran et le filet, sans quoi « C'est noté »
   * se fondait dans l'encart du choix des jours (`surfaceDuBouton`).
   */
  onPanel?: boolean;
  /**
   * La surface du bouton, pour lui **rendre le focus** (29/09/2026, `v1-32` §4.2) : sur le plan,
   * « Annuler » referme le sélecteur d'intention et fait réapparaître « Je m'y engage » sous le
   * doigt — sans cette référence, le focus retombait sur le document (`donnerLeFocus`,
   * `FRONT.md` §2.4). Une prop et non `forwardRef` : React 19 la passe comme les autres, le motif de
   * `FeuilleDuBas`.
   */
  ref?: Ref<View>;
  /**
   * **Le bouton agit, mais l'action qu'il porte attend encore quelque chose** (29/09/2026, `v1-31`
   * §4.5) : le « Suivant » d'une étape incomplète du questionnaire, qui mène à ce qui manque au lieu
   * d'avancer. Il prend l'apparence du désactivé — fond `backgroundElement`, texte `textTertiary` — et
   * rien d'autre : ni `disabled`, ni `aria-disabled`.
   *
   * **Il ne peut pas se dire indisponible, et ce n'est pas un défaut à contourner.** Un bouton qui
   * agit n'est pas indisponible au sens de WAI-ARIA ; et react-native-web ne saurait pas le dire
   * autrement : son `Pressable` réécrit `aria-disabled` depuis `disabled`, et un `aria-disabled` vrai
   * sur un bouton y pose l'attribut natif `disabled`, qui le rend inerte (`EXPO.md` §1.5).
   *
   * **Sous le doigt, la teinte d'une surface neutre** (`backgroundPressed`), pas l'`accentPressed` d'un
   * principal : le bouton gris virerait au vert foncé au moment du toucher (`v1-31` §2.8). L'apparence
   * de `disabled` ne bouge pas — d'autres écrans la lisent, pour ce qui n'agit vraiment pas (un
   * aller-retour en cours).
   */
  enAttente?: boolean;
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
  onPanel,
  ref,
  enAttente,
}: ButtonProps) {
  const theme = useTheme();

  // L'apparence du désactivé vaut pour les deux : `disabled` (inerte) et `enAttente` (qui agit).
  const surface = surfaceDuBouton({
    variant,
    grise: Boolean(disabled || enAttente),
    enAttente: Boolean(enAttente),
    surPanneau: Boolean(onPanel),
  });

  return (
    <Pressable
      ref={ref}
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
        {
          backgroundColor: theme[pressed && !disabled ? surface.fondAppuye : surface.fond],
          flex: flex ? 1 : undefined,
        },
        surface.filet && styles.filet,
        surface.filet && { borderColor: theme.border },
        style,
      ]}
    >
      <ThemedText weight={variant === 'secondary' ? 500 : 600} style={{ color: theme[surface.encre], fontSize: 16 }}>
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
  // **Le filet se dessine dans la boîte, il ne l'agrandit pas** (27/09/2026). Posé en plus du
  // rembourrage, il donnait 56 px au lieu de 54 : invisible tant que les deux boutons d'une rangée
  // le portent (« Oui » / « Non » du point), un décalage d'un pixel en haut et en bas dès qu'un
  // bouton filé côtoie un principal — « Retour » à côté de « Continuer » sur la page teintée de
  // l'onboarding, où il a été mesuré. Le rembourrage cède donc l'épaisseur du trait.
  filet: {
    borderWidth: Stroke.hairline,
    paddingVertical: 15 - Stroke.hairline,
    paddingHorizontal: 24 - Stroke.hairline,
  },
});
