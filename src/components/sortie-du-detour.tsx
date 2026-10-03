import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Côté du chevron dessiné. Exporté pour le test, qui vérifie que son trait tombe sur la marge. */
export const CHEVRON = 18;

/**
 * Où commence le trait du chevron dans sa boîte : `M14.5 5.5 8 12` le pose à 8/24. La cible recule
 * d'autant, pour que le trait tombe sur la marge du contenu, comme le texte au-dessous de lui.
 */
export const RETRAIT_DU_CHEVRON = Math.round((CHEVRON * 8) / 24);

/**
 * La sortie d'un écran qui se consulte — en haut à gauche, au-dessus du titre, un chevron et son
 * libellé, en gris (`v1-33` T-10, décidé le 03/10/2026).
 *
 * **Le défaut.** Sortir d'un écran avait quatre formes et trois places : un lien gris en haut de
 * « Toi », un lien vert en haut des pistes, un lien vert **à la fin** des pages légales (10 559 px
 * à 390 de large) et d'un bilan relu (1 370 px, hors de l'écran à l'arrivée). On cherchait la sortie
 * à chaque écran.
 *
 * **La règle tient en deux places, et c'est l'écran qui décide, jamais son état** (`FRONT.md` §2.4) :
 * - **un écran qui se consulte** — « Toi », les pages légales, les pistes, un bilan relu — n'a pas
 *   d'action principale à côté de laquelle se ranger : sa sortie va là où on la cherche, ici. Dans
 *   **tous** ses états, chargement et échec compris : la place ne bouge pas quand la lecture traîne
 *   ou échoue ;
 * - **un écran qui pose une question** — un flux, la connexion, un formulaire — garde sa sortie en
 *   bas, sous l'action principale : c'est l'autre réponse, lue au moment de choisir. « Plus tard »
 *   y reste collé à la phrase qui dit ce qu'on perd sans compte (`v1-28` §7.2). Celle-là est un
 *   `TextLink` gris, ou le bouton secondaire « Retour » d'un flux.
 *
 * **Gris, jamais vert** : le vert est à ce qui fait avancer, et une sortie n'avance pas. Le chevron la
 * distingue des autres liens gris de la page (« Faire un nouveau bilan », sur un bilan relu). Le
 * libellé, lui, ne change pas : « Retour au plan » et « Revenir à mon suivi » disent où l'on va.
 *
 * **La forme d'un lien discret** : le libellé prend l'apparence `discret` de `TextLink`, et le test les
 * compare rendus côte à côte, pour qu'une retouche de l'une ne laisse pas l'autre en arrière. Le
 * chevron est le cinquième tracé du produit (grille 24, trait 1,9, arrondi), décidé avec la règle.
 *
 * Elle ne décide pas de sa destination : `revenirOu(repli)` pour un retour, une destination nommée
 * quand le libellé en nomme une (`FRONT.md` §2.8).
 */
export function SortieDuDetour({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      // Une navigation, donc un lien (24/09/2026, `v1-29`).
      accessibilityRole="link"
      accessibilityLabel={label}
      // Sous le doigt, le libellé se souligne, comme celui d'un lien discret — sa couleur ne change pas.
      style={styles.cible}
    >
      {({ pressed }) => (
        <>
          {/* Décoratif : la cible porte son libellé (`accessibilityLabel`), le lecteur d'écran n'annonce que lui. */}
          <Svg width={CHEVRON} height={CHEVRON} viewBox="0 0 24 24">
            <Path
              d="M14.5 5.5 8 12l6.5 6.5"
              stroke={theme.textTertiary}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          {/* L'apparence `discret` de `TextLink` : `small`, 500, l'encre tertiaire. */}
          <ThemedText type="small" weight={500} themeColor="textTertiary" style={pressed && styles.souligne}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cible: {
    flexDirection: 'row',
    alignItems: 'center',
    // La cible ne s'étire pas sur la largeur de la page : elle épouse son libellé.
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: ControlHeight.target,
    marginLeft: -RETRAIT_DU_CHEVRON,
    paddingRight: 8,
  },
  souligne: { textDecorationLine: 'underline' },
});
