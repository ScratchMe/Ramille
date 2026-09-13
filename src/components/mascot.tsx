import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import {
  mascotFaceGeometry,
  mascotSeasonGeometry,
  type MascotColorToken,
  type MascotMood,
  type MascotSeasonElement,
} from '@/types/mascot';
import { saisonDe, type Saison } from '@/types/saison';

export type { MascotMood } from '@/types/mascot';

// Ramille — la mascotte, et le nom du produit (src/constants/produit.ts) : la silhouette du logo (assets/images/logo-mark.svg, feuille +
// nervure inchangées) à laquelle on ajoute un visage, pour incarner les moments de
// feedback de la boucle d'engagement sans jamais culpabiliser (décision produit du
// 03/09/2026, cf. CLAUDE.md "factuelle, non culpabilisante") :
//   - `calm` : expression neutre, utilisée comme marque de confiance (ex. écran de
//     connexion) à la place du logo abstrait seul.
//   - `happy` : réponse positive à un check-in — grand sourire, yeux en ^^.
//   - `encouraging` : réponse négative à un check-in — yeux mi-clos et petit sourire,
//     jamais un visage triste ou déçu (aucun sourcil froncé, aucune bouche tombante).
//   - `thinking` : le calcul du bilan, seul moment d'attente du produit — regard levé et
//     porté de côté, bouche neutre. Elle réfléchit, elle ne se réjouit pas d'un chiffre
//     qu'elle n'a pas encore.
//   - `resting` : périodes calmes de `/suivi` — yeux clos, paisible. « Rien à faire cette
//     semaine » n'est pas un échec, et le visage ne doit pas le présenter comme une attente
//     déçue.
//
// **Aucune expression négative, et il ne faut pas en ajouter.** Le registre triste n'existe
// pas ici par construction (canvas `docs/design/v1-08-mascotte`), et la mascotte n'apparaît
// jamais à côté d'un chiffre lourd : y mettre un visage serait commenter, et le produit ne
// commente pas.
//
// **Le visage n'est PAS dessiné à l'échelle du reste.** Toute la géométrie vient de
// `mascotFaceGeometry` (src/types/mascot.ts), qui épaissit les traits à mesure que `size`
// diminue : à taille nominale le trait fait 3,2 unités de viewBox, ce qui tombait à 0,70 px
// à l'écran pour `size={22}` et ne laissait qu'une tache grise. Ne pas remettre de valeurs
// figées ici — voir l'en-tête de ce module pour le raisonnement, et son test pour
// l'invariant (aucun trait sous ~1,3 px tant que `size >= MASCOT_MIN_FACE_SIZE`).
//
// **Elle porte la saison** (C2.13) : un bonnet en hiver, un bourgeon au printemps, une goutte de
// rosée en été, des joues plus chaudes en automne. C'est la seule chose du produit qui change
// d'elle-même avec le calendrier, sans mise à jour de l'app et sans dire un chiffre — la saison
// est l'unité de temps du plan, et voilà ce qui la rend visible. Toute la géométrie vient de
// `mascotSeasonGeometry` ; ce qui suit ne fait que la dessiner, et l'accessoire n'est pas découpé
// par le `clipPath` (le pompon se porte au-dessus de la feuille, et la goutte à son bord — le
// raisonnement complet est en tête de `src/types/mascot.ts`).
//
// La saison par défaut est celle du jour (`saisonDe`), donc aucun écran n'a à la passer ; la
// carte de partage (`api/share-card.ts`) ne l'a pas non plus, elle ne rend pas ce composant.
//
// assets/images/mascot-mark.svg est la version statique de la variante `calm` à taille
// nominale — source de vérité pour la régénération de icon.png/android-icon-*.png/
// splash-icon.png, qui doit rester visuellement identique à ce composant si l'un des deux
// est retouché.
//
// Le favicon porte lui aussi la mascotte, mais **pas ce dessin-là** : sa source est
// assets/images/favicon-mark.svg, qui pousse la compensation à son plafond ET supprime les
// joues et la nervure. C'est cette suppression qui rend un visage lisible à 16 px, et c'est
// précisément ce que ce composant ne peut pas faire — d'où le repli sur la feuille seule
// sous MASCOT_MIN_FACE_SIZE, qui reste la bonne règle ici. Les deux ne se contredisent pas :
// un favicon est un dessin figé qu'on peut simplifier, un composant doit rester le même
// visage à toutes ses tailles.
const LEAF_PATH = 'M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z';

// La géométrie nomme ses couleurs et ne les résout pas (module pur, cf. `MascotColorToken`) :
// voici la correspondance, et c'est le seul endroit du composant qui connaisse une couleur.
// `rosee` n'est pas un jeton de `Colors` — la goutte est blanche dans les deux thèmes, parce que
// la feuille reste verte dans les deux et qu'une goutte ne se lit comme de l'eau qu'en étant plus
// claire que ce sur quoi elle repose.
const COULEUR: Record<MascotColorToken, string> = {
  accentMuted: Colors.light.accentMuted,
  mascotAccessory: Colors.light.mascotAccessory,
  mascotWarm: Colors.light.mascotWarm,
  rosee: '#FFFFFF',
};

// Un élément d'accessoire, dessiné dans l'ordre où la géométrie le rend. Une fonction et non un
// composant : react-native-svg attend des primitives SVG pour enfants, et rien ici n'a d'état.
function elementDeSaison(element: MascotSeasonElement, index: number) {
  const couleur = COULEUR[element.couleur];
  if (element.forme === 'cercle') {
    return (
      <Circle key={`saison-${index}`} cx={element.cx} cy={element.cy} r={element.r} fill={couleur} />
    );
  }
  if (element.forme === 'trait') {
    return (
      <Path
        key={`saison-${index}`}
        d={element.d}
        stroke={couleur}
        strokeWidth={element.epaisseur}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <Path key={`saison-${index}`} d={element.d} fill={couleur} opacity={element.opacite} />
  );
}

export function Mascot({
  mood = 'calm',
  size = 40,
  tilt = 0,
  animated = true,
  saison = saisonDe(new Date()).saison,
  style,
}: {
  mood?: MascotMood;
  size?: number;
  /** Inclinaison en degrés. Un second registre sans redessiner un visage : une feuille
   *  penchée regarde, une feuille droite accompagne. Quelques degrés suffisent — au-delà
   *  d'une douzaine, la silhouette cesse de se lire comme une feuille. */
  tilt?: number;
  animated?: boolean;
  /** La saison portée par la mascotte. Le défaut suit le calendrier (`saisonDe`), qui est le
   *  miroir client de `season_bounds` — jamais la cadence du plan ni `plan_cycles` : un
   *  trimestre glissant n'a pas de saison nommée, la mascotte suit le calendrier dans les deux
   *  cas. `null` la rend sans saison, pour une capture, un canvas ou un test. */
  saison?: Saison | null;
  style?: ViewStyle;
}) {
  const c = Colors.light;
  const face = mascotFaceGeometry(mood, size, saison);
  // Pas de garde `face.visible` ici : le plancher de lisibilité est appliqué une seule fois, dans
  // la géométrie, qui rend une liste vide sous `MASCOT_MIN_FACE_SIZE`. Le redoubler ferait deux
  // seuils à tenir d'accord.
  const accessoires = mascotSeasonGeometry(saison, size);
  const breathe = useSharedValue(0);
  // **Sous « réduire les animations », la respiration ne tourne pas — et reanimated le faisait
  // déjà.** Contrairement à ce qu'affirme A10-8, la boucle n'a jamais survécu à la préférence :
  // `ReduceMotion.System` est le défaut de la bibliothèque (`animation/util.ts`, qui amène toute
  // animation sans `reduceMotion` explicite directement à sa valeur finale) et `repeat.ts` coupe
  // la boucle dès la première répétition. Cette garde ne corrige donc pas une régression : elle
  // rend l'intention lisible à la lecture et évite d'armer une animation qui sera annulée plus
  // bas. `useReducedMotion` lit la préférence système sur natif comme sur web
  // (`prefers-reduced-motion`) sans état à tenir ni écouteur à brancher. Le visage, lui, ne
  // change pas : il est rendu tel quel, à l'arrêt.
  const animationsReduites = useReducedMotion();

  useEffect(() => {
    if (!animated || animationsReduites) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true,
      undefined,
      // Écrit pour être lu : c'est **déjà** la valeur par défaut de reanimated, donc cette ligne
      // ne change rien au comportement. Elle dit au prochain lecteur que le cas a été regardé,
      // et elle tient si un jour la valeur par défaut de la bibliothèque change.
      ReduceMotion.System
    );
  }, [animated, animationsReduites, breathe]);

  const clampedTilt = Math.max(-12, Math.min(12, tilt));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${clampedTilt}deg` },
      { scale: 1 + breathe.value * 0.035 },
      { translateY: -breathe.value * 1.5 },
    ],
  }));

  return (
    <Animated.View
      // Purement décorative : elle accompagne un texte qui dit déjà tout. L'annoncer
      // ajouterait un « image » sans contenu entre chaque phrase.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[{ width: size, height: size }, style, animatedStyle]}
    >
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
          stroke={c.mascotVein}
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
                fill={COULEUR[face.blushToken]}
                opacity={face.blushOpacity}
              />
            ))}

            {face.eyes === 'dots'
              ? face.eyeCircles.map((eye, i) => (
                  <Circle key={`eye-${i}`} cx={eye.cx} cy={eye.cy} r={eye.r} fill={c.mascotInk} />
                ))
              : face.eyeArcs.map((arc, i) => (
                  <Path
                    key={`eye-${i}`}
                    d={arc}
                    stroke={c.mascotInk}
                    strokeWidth={face.eyeStrokeWidth}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}

            <Path
              d={face.mouthPath}
              stroke={c.mascotInk}
              strokeWidth={face.mouthStrokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        )}

        {/* Après le visage, et hors du groupe découpé — cf. l'en-tête de `src/types/mascot.ts`. */}
        {accessoires.map(elementDeSaison)}
      </Svg>
    </Animated.View>
  );
}
