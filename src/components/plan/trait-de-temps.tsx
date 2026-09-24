import { StyleSheet, View } from 'react-native';

import { Rail } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Le temps écoulé dans la période — un trait sous la carte du cap (C2.8, planche B1), sur le rail
 * que partagent les barres de progression du produit (`Rail`).
 *
 * **Il mesure la saison, pas la personne**, et c'est la raison pour laquelle il se remplit en
 * `accentMuted` et jamais en `accent` : rien de ce que la personne fait ne le fait avancer, et rien
 * ne le retient. Le confondre avec une jauge de progression vers le cap ferait de chaque semaine
 * écoulée un retard — exactement la mécanique d'échec que le produit refuse. La légende qui
 * l'accompagne le dit en mots, dans l'écran qui le pose.
 *
 * Masqué au lecteur d'écran : la carte porte déjà « jusqu'au 30 novembre », qui est l'information.
 * Un trait annoncé en plus ne dirait rien de neuf, et une valeur en pourcentage dirait autre chose
 * que ce que le trait signifie.
 */
export function TraitDeTemps({ progression }: { progression: number }) {
  const theme = useTheme();
  const part = Math.max(0, Math.min(1, progression));

  return (
    <View
      style={[styles.rail, { backgroundColor: theme.border }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <View
        style={[styles.ecoule, { backgroundColor: theme.accentMuted, width: `${part * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { height: Rail.height, borderRadius: Rail.radius, overflow: 'hidden', marginTop: 6 },
  ecoule: { height: '100%', borderRadius: Rail.radius },
});
