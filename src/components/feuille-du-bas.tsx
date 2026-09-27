import { useCallback, useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Mouvement, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Le cadre d'une feuille du bas : la fenêtre, le voile, la feuille, sa poignée et son titre
 * (24/09/2026, `v1-29`).
 *
 * **Il était écrit deux fois**, dans `FeuilleNouveauBilan` et dans `FeuilleRappels`, à la valeur
 * près — le voile recopié en dur aux deux endroits, la poignée, les marges. Deux copies d'un même
 * cadre divergent au premier ajustement ; c'est la leçon de `CarteDePiste` (C5.2) et de
 * `CarteDOuverture` (C5.6). Ce qui reste chez chaque feuille est son **contenu**, et lui seul.
 *
 * **Le titre est obligatoire, et c'est lui qui nomme le dialogue.** Sur web, react-native-web rend
 * la fenêtre en `role="dialog"` : les deux feuilles s'y annonçaient **sans nom** (audit
 * d'accessibilité, 1.3.1), donc un lecteur d'écran entrait dans « dialogue » sans savoir lequel.
 * Le même texte sert aux deux usages — l'en-tête affiché et le nom du dialogue —, écrit une fois
 * par l'appelant, pour qu'ils ne puissent pas se contredire. L'en-tête est de niveau 2 : la feuille
 * s'ouvre par-dessus un écran qui porte déjà son titre.
 *
 * **Nommer n'oblige pas à afficher** (`enTete`, contre-lecture du 25/09/2026). La feuille des
 * rappels avait reçu un en-tête visible, « Les rappels », que ni son canvas ni aucune décision ne
 * portaient : ce que la feuille montre est une question de produit, et la correction d'accessibilité
 * n'en demandait pas tant — le nom du dialogue suffit. Avec `enTete={false}`, le titre ne s'affiche
 * pas et continue de nommer le dialogue.
 *
 * **Le geste de retour referme toujours** (`onFerme`) : une feuille qu'on ne peut pas fermer n'est
 * plus une proposition. C'était le contrat des deux, il est ici une fois.
 *
 * **Le voile se fond, la feuille glisse** (27/09/2026, `v1-30` §5.4). Le `Modal` animait tout son
 * contenu d'un bloc (`animationType="slide"`), donc le voile gris montait du bas avec la feuille au
 * lieu d'assombrir l'écran sur place — relevé image par image sur l'export. Le `Modal` n'anime plus
 * rien ; le voile passe de transparent à posé (`Mouvement.fondu`), la feuille monte de la hauteur de
 * la fenêtre (`Mouvement.entreeDeFeuille`), et **la fermeture s'anime aussi** : feuille et voile
 * repartent (`Mouvement.sortie`), puis seulement la feuille se démonte. Sur web, elle disparaissait
 * d'un coup.
 *
 * **Sous « réduire les animations », tout est posé, et la fermeture démonte tout de suite** — sans
 * attendre le rappel de fin d'une animation, qui est le seul endroit où la préférence pourrait
 * laisser une feuille ouverte. Le `Modal` de react-native-web ne lisant pas la préférence, sa
 * feuille glissait même sous elle : ce défaut part avec son animation.
 *
 * **Qui ferme en animant** : le geste de retour et Échap (`onRequestClose`), et l'appelant par
 * `fermer` (la poignée passée en `ref`) — « Pas maintenant », un choix validé. Un bouton qui
 * **navigue** appelle son rappel directement : sur natif, une route poussée sous un `Modal` encore
 * ouvert reste dessous, donc il ne doit pas attendre une sortie. Une seconde fermeture pendant la
 * sortie est ignorée.
 */
export type PoigneeDeFeuille = {
  /** Referme en animant, puis appelle `apres` — ou `onFerme` sans argument. */
  fermer: (apres?: () => void) => void;
};

export function FeuilleDuBas({
  titre,
  enTete = true,
  onFerme,
  ref,
  children,
}: {
  /** Nom du dialogue, et en-tête affiché de la feuille sauf `enTete={false}`. */
  titre: string;
  /** Afficher le titre en tête de la feuille. `false` quand le canvas n'en dessine pas. */
  enTete?: boolean;
  /** Le geste de retour, la touche Échap sur web — appelé une fois la sortie jouée. */
  onFerme: () => void;
  /** Pour refermer en animant depuis un bouton de la feuille. */
  ref?: Ref<PoigneeDeFeuille>;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const animationsReduites = useReducedMotion();
  const voile = useSharedValue(animationsReduites ? 1 : 0);
  const feuille = useSharedValue(animationsReduites ? 1 : 0);
  const enSortie = useRef(false);
  // Le dernier `onFerme` reçu : la sortie le lit à sa fin, pas à son début.
  const onFermeCourant = useRef(onFerme);
  useEffect(() => {
    onFermeCourant.current = onFerme;
  }, [onFerme]);

  useEffect(() => {
    const courbe = Easing.bezier(...Mouvement.courbe);
    voile.value = withTiming(1, { duration: Mouvement.fondu, easing: courbe, reduceMotion: ReduceMotion.System });
    feuille.value = withTiming(1, {
      duration: Mouvement.entreeDeFeuille,
      easing: courbe,
      reduceMotion: ReduceMotion.System,
    });
  }, [voile, feuille]);

  const fermer = useCallback(
    (apres?: () => void) => {
      if (enSortie.current) return;
      enSortie.current = true;
      const finir = apres ?? (() => onFermeCourant.current());
      if (animationsReduites) {
        finir();
        return;
      }
      const courbe = Easing.bezier(...Mouvement.courbe);
      // `set` et non `.value =` : le React Compiler refuse d'écrire une valeur hors d'un effet.
      voile.set(withTiming(0, { duration: Mouvement.sortie, easing: courbe, reduceMotion: ReduceMotion.System }));
      // Le rappel part même si la sortie est interrompue : une feuille qui ne se démonte jamais
      // serait un écran bloqué, bien pire qu'une sortie coupée.
      feuille.set(
        withTiming(0, { duration: Mouvement.sortie, easing: courbe, reduceMotion: ReduceMotion.System }, () => {
          scheduleOnRN(finir);
        })
      );
    },
    [animationsReduites, voile, feuille]
  );

  useImperativeHandle(ref, () => ({ fermer }), [fermer]);

  const styleDuVoile = useAnimatedStyle(() => ({ opacity: voile.value }));
  const styleDeLaFeuille = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - feuille.value) * height }],
  }));

  return (
    <Modal visible animationType="none" transparent onRequestClose={() => fermer()} aria-label={titre}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, styleDuVoile]} />
      <Animated.View style={[styles.place, styleDeLaFeuille]}>
        <ThemedView style={[styles.feuille, { borderColor: theme.border }]}>
          <View style={[styles.poignee, { backgroundColor: theme.border }]} />
          {enTete && (
            <ThemedText type="cardTitle" accessibilityRole="header">
              {titre}
            </ThemedText>
          )}
          {children}
        </ThemedView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  place: { flex: 1, justifyContent: 'flex-end' },
  feuille: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: Stroke.hairline,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  poignee: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two },
});
