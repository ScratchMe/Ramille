import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Mascot, type MascotMood } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { APP_NAME } from '@/constants/produit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Écran d'ouverture — le seul par lequel tout le monde passe, à chaque lancement.
//
// Il montrait un fond blanc et un `ActivityIndicator`, juste après un splash natif vert
// portant la mascotte (`app.json` → `expo-splash-screen`, fond `#E4EFE8`) : le produit
// s'annonçait, puis se vidait. Le fond reprend donc **exactement** la couleur du splash
// (`backgroundSelected` vaut `#E4EFE8` en clair, et l'app est verrouillée en clair sur
// natif), et la mascotte y continue son entrée au lieu de disparaître.
//
// **Elle sourit, elle ne fait pas de clin d'œil.** Le clin d'œil serait une sixième
// expression, et la règle du produit est qu'on n'en ajoute pas (cf. `mascot.tsx`) — le
// mouvement suffit à donner vie à celles qui existent. Elle arrive en `calm`, le visage même
// du splash natif, et passe en `happy` une fois posée : elle se réveille. C'est aussi le seul
// endroit du produit où un visage peut occuper l'écran entier sans rien commenter — il n'y a
// pas un chiffre dessus.
// 168 et non une taille ronde : la feuille du splash natif mesure ~142 px de haut à
// `imageWidth: 180`, et la silhouette de ce composant occupe 84 % de sa boîte — 168 lui
// donne la même hauteur, donc la même présence d'un écran à l'autre.
const TAILLE = 168;
const DELAI_SOURIRE = 380;

export function EcranLancement() {
  const theme = useTheme();
  const [humeur, setHumeur] = useState<MascotMood>('calm');
  const entree = useSharedValue(0);

  useEffect(() => {
    // Écriture sur une valeur partagée, pas un `setState` : le corps d'un effet peut la
    // faire (même motif que la respiration de `mascot.tsx`). Le passage au sourire, lui,
    // est bien un `setState` — d'où le `setTimeout`, qui le sort du corps de l'effet et le
    // met hors de portée de `react-hooks/set-state-in-effect` (React Compiler).
    entree.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    const minuteur = setTimeout(() => setHumeur('happy'), DELAI_SOURIRE);
    return () => clearTimeout(minuteur);
  }, [entree]);

  // La feuille se pose : elle monte de quelques pixels en se redressant. L'inclinaison passe
  // par ce conteneur et non par la prop `tilt`, qui n'est pas animable — les deux rotations
  // se composent, d'où `tilt={0}` sur le composant.
  const styleMascotte = useAnimatedStyle(() => ({
    opacity: Math.min(1, entree.value * 2),
    transform: [
      { translateY: (1 - entree.value) * 14 },
      { rotate: `${(1 - entree.value) * -7}deg` },
      { scale: 0.88 + entree.value * 0.12 },
    ],
  }));

  const styleNom = useAnimatedStyle(() => ({
    opacity: entree.value,
    transform: [{ translateY: (1 - entree.value) * 10 }],
  }));

  return (
    <View style={[styles.ecran, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={styleMascotte}>
        <Mascot mood={humeur} size={TAILLE} tilt={0} />
      </Animated.View>
      <Animated.View style={styleNom}>
        <ThemedText weight={600} themeColor="accentText" style={styles.nom}>
          {APP_NAME}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Plein cadre, sans zone sûre : c'est la continuation du splash, qui couvre l'écran entier
  // encoche comprise.
  ecran: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  nom: { fontSize: 30, lineHeight: 38, letterSpacing: -0.6 },
});
