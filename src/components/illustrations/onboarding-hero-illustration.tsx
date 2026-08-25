import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

// Onboarding 1.1 — « une personne et ses trajets du quotidien » (docs/design/README.md §1.1).
// Remplace IllustrationPlaceholder par un vrai visuel : une silhouette au sol, un
// itinéraire pointillé qui la relie à ses modes de déplacement (vélo, voiture), quelques
// feuilles pour l'ancrage "carbone" — palette Colors.light uniquement (app light-only,
// cf. constants/theme.ts). Le conteneur est en flex:1 (cf. onboarding/index.tsx), donc son
// ratio réel varie selon l'appareil ; viewBox carré + `slice` + marge de sécurité ~50px de
// chaque bord pour qu'aucun élément ne se fasse rogner par un recadrage plus serré que prévu.
export function OnboardingHeroIllustration({ style }: { style?: ViewStyle }) {
  const c = Colors.light;

  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 360" preserveAspectRatio="xMidYMid slice">
        <Path d="M0 0H360V360H0Z" fill={c.backgroundSelected} />

        {/* sol */}
        <Path d="M0 280 Q90 246 180 270 T360 258 V360 H0 Z" fill={c.accentMuted} opacity={0.45} />

        {/* itinéraire pointillé reliant la silhouette à ses modes de trajet */}
        <Path
          d="M108 254 C150 220 158 190 178 168 S 236 118 258 104"
          stroke={c.background}
          strokeWidth={4}
          strokeDasharray="1 14"
          strokeLinecap="round"
          fill="none"
        />

        {/* silhouette */}
        <Circle cx="96" cy="198" r="17" fill={c.accent} />
        <Path d="M74 222 Q96 212 118 222 L122 274 Q96 282 70 274 Z" fill={c.accent} />

        {/* voiture */}
        <Path
          d="M214 96 h44 a8 8 0 0 1 8 8 v14 h-60 v-14 a8 8 0 0 1 8-8 Z"
          fill={c.accentText}
          opacity={0.9}
        />
        <Path d="M222 96 l8 -16 h20 l8 16 Z" fill={c.accentText} opacity={0.9} />
        <Circle cx="218" cy="118" r="6" fill={c.background} />
        <Circle cx="258" cy="118" r="6" fill={c.background} />

        {/* vélo */}
        <Circle cx="216" cy="258" r="18" stroke={c.accentText} strokeWidth={4} fill="none" />
        <Circle cx="270" cy="258" r="18" stroke={c.accentText} strokeWidth={4} fill="none" />
        <Path
          d="M216 258 L244 216 L270 258 M244 216 L228 216 M244 216 L258 240"
          stroke={c.accentText}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* feuilles */}
        <Path d="M64 132 Q80 120 88 136 Q72 146 64 132 Z" fill={c.accent} opacity={0.55} />
        <Line x1="64" y1="132" x2="82" y2="134" stroke={c.background} strokeWidth={1.5} opacity={0.7} />
        <Path d="M290 176 Q306 164 314 180 Q298 190 290 176 Z" fill={c.accent} opacity={0.4} />
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
