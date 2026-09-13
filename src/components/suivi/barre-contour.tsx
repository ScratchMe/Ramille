import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Une barre **en contour** : le bilan précédent, sur les mêmes axes que le bilan courant (C2.7).
 *
 * Le contour est ce qui permet de superposer deux valeurs sans que la plus ancienne pèse autant que
 * l'actuelle : une seconde barre pleine, même en couleur atténuée, se lit comme un second résultat.
 * Le rail reste **transparent** — un rail gris derrière un contour donnerait trois épaisseurs pour
 * une seule information.
 *
 * La hauteur est une prop parce que ses deux consommateurs ne la partagent pas : 10 px dans
 * `EcartParPoste` (six barres à lire d'un coup), 14 px sur la restitution (trois barres, une par
 * repère). Le rayon suit la hauteur, il ne se choisit pas séparément.
 */
export function BarreContour({ percent, hauteur = 10 }: { percent: number; hauteur?: number }) {
  const theme = useTheme();
  const part = Math.max(0, Math.min(100, percent));

  return (
    <View
      style={[styles.rail, { height: hauteur }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <View
        style={[
          styles.contour,
          {
            width: `${part}%`,
            borderRadius: hauteur / 2,
            borderColor: theme.accentMuted,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Aucun fond : c'est ce qui distingue cette barre de celles du bilan courant.
  rail: { width: '100%' },
  // 1,5 px : à 1 px le contour disparaît à l'antialiasing sur un écran à densité 2, à 2 px il pèse
  // autant qu'une barre pleine.
  contour: { height: '100%', borderWidth: 1.5 },
});
