import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Mascot, type MascotMood } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { APP_NAME } from '@/constants/produit';
import { useTheme } from '@/hooks/use-theme';

// Écran d'ouverture — le seul par lequel tout le monde passe, à chaque lancement.
//
// Il montrait un fond blanc et un `ActivityIndicator`, juste après un splash natif vert
// portant la mascotte (`app.json` → `expo-splash-screen`, fond `#E4EFE8`) : le produit
// s'annonçait, puis se vidait. Le fond reprend donc **exactement** la couleur du splash
// (`backgroundSelected` vaut `#E4EFE8` en clair, et l'app est verrouillée en clair sur
// natif), et la mascotte y continue son entrée au lieu de disparaître.
//
// **Le changement d'expression ne se fond pas, il se cache derrière un mouvement.** Première
// version : la mascotte passait de `calm` à `happy` par simple changement d'état, et le
// remplacement des yeux (points → arcs) sautait à l'écran. Un fondu n'aurait fait que rendre
// le saut mou. Ici la feuille donne un petit à-coup — elle s'étire puis se tasse — et
// l'expression change **au sommet** de cet à-coup : l'œil suit le mouvement, pas la
// substitution. C'est le principe du clignement qui masque une coupe, en animation
// traditionnelle.
//
// **Elle sourit, elle ne fait pas de clin d'œil.** Le clin d'œil serait une sixième
// expression, et la règle du produit est qu'on n'en ajoute pas (cf. `mascot.tsx`). Elle
// arrive en `calm`, le visage même du splash natif, et se réveille. C'est aussi le seul
// endroit du produit où un visage peut occuper l'écran entier sans rien commenter — il n'y a
// pas un chiffre dessus.

/** La feuille se pose : elle monte, se redresse, avec un léger dépassement en fin de course. */
const ARRIVEE = 560;
/** Instant de l'à-coup — et donc du réveil. */
const REVEIL = 620;
/** Sommet de l'à-coup, où le visage change sans qu'on voie la substitution. */
const SOMMET_REVEIL = REVEIL + 110;

/**
 * Durée totale de l'animation, exportée : la racine s'en sert comme **plancher** d'affichage.
 *
 * Sans elle, une session déjà en cache redirige en 200 ms et l'animation ne se voit pas —
 * on paie le coût d'un écran d'ouverture sans en toucher le bénéfice. Ce n'est pas un délai
 * ajouté au chargement : un démarrage plus lent que ce plancher n'attend rien de plus.
 *
 * 1450 et non la durée exacte de l'animation (~1080 ms) : une image finale qui disparaît
 * dans la milliseconde où elle se pose ne se lit pas. Il reste ~400 ms de visage souriant.
 */
export const DUREE_ANIMATION_LANCEMENT = 1450;

export function EcranLancement() {
  const theme = useTheme();
  const [humeur, setHumeur] = useState<MascotMood>('calm');
  const arrivee = useSharedValue(0);
  const acoup = useSharedValue(1);
  const nom = useSharedValue(0);

  useEffect(() => {
    // Écritures sur des valeurs partagées, pas des `setState` : le corps d'un effet peut les
    // faire (même motif que la respiration de `mascot.tsx`). Le passage au sourire, lui, est
    // bien un `setState` — d'où le `setTimeout`, qui le sort du corps de l'effet et le met
    // hors de portée de `react-hooks/set-state-in-effect` (React Compiler).
    arrivee.value = withTiming(1, { duration: ARRIVEE, easing: Easing.out(Easing.back(1.4)) });
    acoup.value = withDelay(
      REVEIL,
      withSequence(
        withTiming(1.07, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(0.975, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 190, easing: Easing.out(Easing.quad) })
      )
    );
    nom.value = withDelay(
      REVEIL + 40,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );

    const minuteur = setTimeout(() => setHumeur('happy'), SOMMET_REVEIL);
    return () => clearTimeout(minuteur);
  }, [arrivee, acoup, nom]);

  // L'inclinaison passe par ce conteneur et non par la prop `tilt`, qui n'est pas animable —
  // les deux rotations se composeraient, d'où `tilt={0}` sur le composant.
  const styleMascotte = useAnimatedStyle(() => ({
    opacity: Math.min(1, arrivee.value * 3),
    transform: [
      { translateY: (1 - arrivee.value) * 18 },
      { rotate: `${(1 - arrivee.value) * -8}deg` },
      { scale: (0.9 + arrivee.value * 0.1) * acoup.value },
    ],
  }));

  const styleNom = useAnimatedStyle(() => ({
    opacity: nom.value,
    transform: [{ translateY: (1 - nom.value) * 12 }],
  }));

  return (
    <View style={[styles.ecran, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={styleMascotte}>
        <Mascot mood={humeur} size={TAILLE} tilt={0} />
      </Animated.View>
      {/* Le bloc du nom prend **toute la largeur**, et le texte se centre dedans. Cousu à sa
          propre largeur, il perdait son dernier « e » sur appareil : `_layout.tsx` ne retient
          pas le premier rendu en attendant `useFonts` (il ne s'en sert que pour masquer le
          splash), donc cet écran-ci — le tout premier — se mesure avec la police de repli
          puis se redessine en Spline Sans SemiBold, plus large. La boîte, elle, gardait
          l'ancienne mesure et rognait le glyphe qui dépassait. Un texte qui ne tire pas sa
          largeur de sa propre mesure ne peut pas se faire couper. */}
      <Animated.View style={[styles.blocNom, styleNom]}>
        <ThemedText weight={600} themeColor="accentText" style={styles.nom}>
          {APP_NAME}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

// 168 et non une taille ronde : la feuille du splash natif mesure ~142 px de haut à
// `imageWidth: 180`, et la silhouette de ce composant occupe 84 % de sa boîte — 168 lui
// donne la même hauteur, donc la même présence d'un écran à l'autre.
const TAILLE = 168;

const styles = StyleSheet.create({
  // Plein cadre, sans zone sûre : c'est la continuation du splash, qui couvre l'écran entier
  // encoche comprise. L'écart mascotte/nom est réservé en dur : il ne doit pas bouger quand
  // le nom s'anime, sinon la feuille se déplace avec lui.
  ecran: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  blocNom: { alignSelf: 'stretch' },
  nom: { fontSize: 30, lineHeight: 38, letterSpacing: -0.6, textAlign: 'center' },
});
