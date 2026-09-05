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
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { mascotFaceGeometry, type MascotMood } from '@/types/mascot';

export type { MascotMood } from '@/types/mascot';

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
// **Le visage n'est PAS dessiné à l'échelle du reste.** Toute la géométrie vient de
// `mascotFaceGeometry` (src/types/mascot.ts), qui épaissit les traits à mesure que `size`
// diminue : à taille nominale le trait fait 3,2 unités de viewBox, ce qui tombait à 0,70 px
// à l'écran pour `size={22}` et ne laissait qu'une tache grise. Ne pas remettre de valeurs
// figées ici — voir l'en-tête de ce module pour le raisonnement, et son test pour
// l'invariant (aucun trait sous ~1,3 px tant que `size >= MASCOT_MIN_FACE_SIZE`).
//
// assets/images/mascot-mark.svg est la version statique de la variante `calm` à taille
// nominale — source de vérité pour la régénération de icon.png/android-icon-*.png/
// splash-icon.png, qui doit rester visuellement identique à ce composant si l'un des deux
// est retouché. favicon.png reste dérivé du logo sans visage (assets/images/logo-mark.svg) :
// en dessous de MASCOT_MIN_FACE_SIZE, aucune compensation ne rend deux yeux et une bouche
// lisibles, et ce composant retombe lui aussi sur la feuille seule.
const LEAF_PATH = 'M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z';
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
  const face = mascotFaceGeometry(mood, size);
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
        <Defs>
          {/* Le visage est découpé par la silhouette : les joues affleurent le bord de la
              feuille dès la taille nominale, et la compensation optique les pousse plus loin
              encore. Sans ce clip, elles flottaient hors du vert sur le fond de l'écran. */}
          <ClipPath id="mascot-leaf">
            <Path d={LEAF_PATH} />
          </ClipPath>
        </Defs>

        <Path d={LEAF_PATH} fill={c.accent} />
        <Path
          d="M50,18 C46,26 46,32 50,38"
          stroke={c.backgroundSelected}
          strokeWidth={face.veinStrokeWidth}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />

        {face.visible && (
          <G clipPath="url(#mascot-leaf)">
            {face.blushCircles.map((blush, i) => (
              <Circle
                key={`blush-${i}`}
                cx={blush.cx}
                cy={blush.cy}
                r={blush.r}
                fill={c.accentMuted}
                opacity={face.blushOpacity}
              />
            ))}

            {face.eyes === 'dots'
              ? face.eyeCircles.map((eye, i) => (
                  <Circle key={`eye-${i}`} cx={eye.cx} cy={eye.cy} r={eye.r} fill={c.text} />
                ))
              : face.eyeArcs.map((arc, i) => (
                  <Path
                    key={`eye-${i}`}
                    d={arc}
                    stroke={c.text}
                    strokeWidth={face.eyeStrokeWidth}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}

            <Path
              d={face.mouthPath}
              stroke={c.text}
              strokeWidth={face.mouthStrokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
