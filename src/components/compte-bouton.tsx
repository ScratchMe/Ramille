import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ControlHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Côté de l'icône dessinée, au centre de sa cible. Exporté parce que `BandeHaute` aligne son bord
 * **visible** sur la marge du contenu, et que ce bord dépend de l'écart entre la cible et l'icône.
 */
export const ICONE_DU_COMPTE = 22;

// Accès au compte depuis les deux onglets — v1-11 §1.
//
// Une icône et pas un troisième onglet : « Compte » en permanence dans la barre contredirait
// la promesse « pas besoin de compte », qui tient tout le parcours anonyme du produit. En haut
// à droite, il est atteignable sans peser sur la navigation principale.
//
// **Il répond au doigt** (24/09/2026, `v1-29`, décision n° 6) : sous le doigt, un disque
// `backgroundPressed` apparaît derrière l'icône — teinte immédiate, sans animation, comme partout
// dans le produit. Aucun contrôle ne répondait au toucher, et une icône qui ne bouge pas se lit
// « l'app n'a pas pris mon geste ». Un disque et non un carré : la cible est invisible au repos,
// et c'est un rond qui se lit comme appartenant à l'icône.
export function CompteBouton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/compte')}
      accessibilityRole="button"
      accessibilityLabel="Ton compte"
      style={({ pressed }) => [styles.cible, pressed && { backgroundColor: theme.backgroundPressed }]}
    >
      <Svg width={ICONE_DU_COMPTE} height={ICONE_DU_COMPTE} viewBox="0 0 24 24">
        <Circle cx={12} cy={8.5} r={3.6} stroke={theme.textTertiary} strokeWidth={1.9} fill="none" />
        <Path
          d="M4.8 19.5c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9"
          stroke={theme.textTertiary}
          strokeWidth={1.9}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cible: {
    width: ControlHeight.target,
    height: ControlHeight.target,
    borderRadius: ControlHeight.target / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
