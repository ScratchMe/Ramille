import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ControlHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Accès au compte depuis les deux onglets — v1-11 §1.
//
// Une icône et pas un troisième onglet : « Compte » en permanence dans la barre contredirait
// la promesse « pas besoin de compte », qui tient tout le parcours anonyme du produit. En haut
// à droite, il est atteignable sans peser sur la navigation principale.
export function CompteBouton() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/compte')}
      accessibilityRole="button"
      accessibilityLabel="Ton compte"
      style={styles.cible}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
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
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
