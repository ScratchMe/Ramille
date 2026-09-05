import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

// Onboarding 1.3 — « scène calme, paysage / matin » (docs/design/README.md §1.3). Seul
// écran "chaleureux" de l'onboarding (cf. spec-uiux §0) : composition volontairement
// dégagée (peu d'éléments, beaucoup d'espace), soleil levant + collines en aplats
// successifs pour une impression de calme plutôt qu'un tableau chargé.
export function ReassuranceIllustration({ style }: { style?: ViewStyle }) {
  const c = Colors.light;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.container, style]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
        <Path d="M0 0H360V200H0Z" fill={c.backgroundElement2} />

        {/* halo + soleil levant */}
        <Circle cx="180" cy="70" r="70" fill={c.backgroundSelected} opacity={0.6} />
        <Circle cx="180" cy="70" r="34" fill={c.background} />

        {/* oiseaux */}
        <Path d="M64 44 q8 -8 16 0 q8 -8 16 0" stroke={c.textTertiary} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
        <Path d="M258 30 q6 -6 12 0 q6 -6 12 0" stroke={c.textTertiary} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />

        {/* collines, du fond vers le premier plan */}
        <Path d="M0 132 Q90 96 190 126 T360 108 V200 H0 Z" fill={c.accentMuted} opacity={0.5} />
        <Path d="M0 172 Q100 138 210 168 T360 150 V200 H0 Z" fill={c.accent} opacity={0.85} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
