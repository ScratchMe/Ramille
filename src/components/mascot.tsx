import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type MascotMood = 'calm' | 'happy' | 'encouraging';

// Mascotte TraceVerte — la silhouette du logo (assets/images/logo-mark.svg, feuille +
// nervure inchangées) à laquelle on ajoute un visage, pour incarner les moments de
// feedback de la boucle d'engagement sans jamais culpabiliser (décision produit du
// 03/09/2026, cf. CLAUDE.md "factuelle, non culpabilisante") :
//   - `calm` : expression neutre, utilisée comme marque de confiance (ex. écran de
//     connexion) à la place du logo abstrait seul.
//   - `happy` : réponse positive à un check-in — grand sourire, yeux en ^^.
//   - `encouraging` : réponse négative à un check-in — yeux mi-clos et petit sourire,
//     jamais un visage triste ou déçu (aucun sourcil froncé, aucune bouche tombante).
//
// assets/images/mascot-mark.svg est la version statique de la variante `calm` ci-dessous —
// source de vérité pour la régénération de icon.png/android-icon-*.png/splash-icon.png, qui
// doit rester visuellement identique à ce composant si l'un des deux est retouché.
// favicon.png reste dérivé du logo sans visage (assets/images/logo-mark.svg) : un visage ne
// se lit plus en dessous d'environ 40px (vérifié visuellement), la taille d'un favicon.
const FACE_BY_MOOD: Record<MascotMood, { eyes: 'dots' | 'happy' | 'soft'; mouth: string; blushOpacity: number; blushR: number; blushCy: number }> = {
  calm: { eyes: 'dots', mouth: 'M42,62 Q50,68 58,62', blushOpacity: 0.55, blushR: 5, blushCy: 60 },
  happy: { eyes: 'happy', mouth: 'M40,60 Q50,72 60,60', blushOpacity: 0.6, blushR: 5.4, blushCy: 59 },
  encouraging: { eyes: 'soft', mouth: 'M43,63 Q50,66 57,63', blushOpacity: 0.55, blushR: 5, blushCy: 60 },
};

export function Mascot({
  mood = 'calm',
  size = 40,
  animated = true,
  style,
}: {
  mood?: MascotMood;
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
}) {
  const c = Colors.light;
  const face = FACE_BY_MOOD[mood];
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [animated, breathe]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.035 }, { translateY: -breathe.value * 1.5 }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, style, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z" fill={c.accent} />
        <Path
          d="M50,18 C46,26 46,32 50,38"
          stroke={c.backgroundSelected}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />

        <Circle cx={33} cy={face.blushCy} r={face.blushR} fill={c.accentMuted} opacity={face.blushOpacity} />
        <Circle cx={67} cy={face.blushCy} r={face.blushR} fill={c.accentMuted} opacity={face.blushOpacity} />

        {face.eyes === 'dots' && (
          <>
            <Circle cx={39} cy={50} r={4.2} fill={c.text} />
            <Circle cx={61} cy={50} r={4.2} fill={c.text} />
          </>
        )}
        {face.eyes === 'happy' && (
          <>
            <Path d="M34,49 Q39,44 44,49" stroke={c.text} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            <Path d="M56,49 Q61,44 66,49" stroke={c.text} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          </>
        )}
        {face.eyes === 'soft' && (
          <>
            <Path d="M35,51 Q39,54 43,51" stroke={c.text} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            <Path d="M57,51 Q61,54 65,51" stroke={c.text} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          </>
        )}

        <Path d={face.mouth} stroke={c.text} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
