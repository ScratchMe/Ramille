import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Mouvement, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { reglage } from '@/lib/mouvement';

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
 * **Sous « réduire les animations », rien ne se lance : tout est posé, et la fermeture démonte tout de
 * suite** — sans attendre le rappel de fin d'une animation, qui est le seul endroit où la préférence
 * pourrait laisser une feuille ouverte. Le `Modal` de react-native-web ne lisant pas la préférence, sa
 * feuille glissait même sous elle : ce défaut part avec son animation.
 *
 * **Toucher le voile ferme aussi** (01/10/2026, audit T-7) : c'est le geste d'Android pour une
 * feuille modale, et le toucher ne faisait rien — « l'app n'a pas pris mon geste ». Il appelle la même
 * `fermer()` que le retour, donc la même sortie et le même `onFerme` : la feuille des rappels se marque
 * vue comme sur un retour. Le voile n'est ni un arrêt de tabulation ni un nœud du lecteur d'écran — le
 * retour et Échap y suffisent —, et la zone au-dessus de la feuille laisse passer le toucher jusqu'à
 * lui. **La poignée, elle, ne se tire pas encore** : un glissé se juge au doigt, sur appareil.
 *
 * **Sur web, ce toucher n'arrivait jamais au voile** (mesuré le 01/10/2026 par `elementFromPoint` et un
 * clic au-dessus de la feuille, dans le parcours réel) : la place, qui couvre tout l'écran, était la
 * vue animée, et reanimated pose sur web les styles d'une vue animée **en ligne** — où `box-none`
 * n'est pas une valeur CSS, donc ignorée. La place prenait le clic, `pointer-events: auto`, et la
 * feuille restait ouverte. Elle est désormais une vue ordinaire, dont react-native-web compile le
 * `box-none` en classe (`pointer-events: none` sur elle, `auto` sur ses enfants), et seule la
 * feuille, à l'intérieur, s'anime. `sansToucher` reste sur la vue animée : `none`, lui, est une valeur
 * CSS. Le test natif ne le voyait pas (il lit la valeur du style, pas ce que le navigateur en fait) :
 * c'est l'étape « un toucher sur le voile » du parcours réel qui le garde.
 *
 * **Le voile n'est pas un `Pressable`, et ne doit pas le redevenir** (01/10/2026, CI de la PR #314).
 * Sur web, c'est le `Modal` de react-native-web qui pose le focus à l'ouverture : son piège, dès qu'il
 * est actif, essaie `.focus()` sur chaque descendant **dans l'ordre du DOM** et garde le premier qui le
 * prend — et le voile précède la feuille. Le `Pressable` de react-native-web écrit toujours un
 * `tabindex` (0, ou -1 désactivé), qui passe devant `focusable={false}` : le voile, `aria-hidden`, était
 * un arrêt de tabulation et le premier focalisable de la fenêtre, et la feuille du re-bilan s'ouvrait
 * le focus sur lui au lieu de « Commencer ». `tabIndex={-1}` ne suffit pas : l'arrêt part, mais
 * `.focus()` prend encore. Le voile reçoit donc le toucher par les répondeurs, **sans aucun
 * `tabindex`** ; sur natif, les répondeurs sont ce que `Pressable` emploie lui-même, et le toucher
 * ferme comme avant, ce qui se vérifie sur l'appareil. **Le focus d'ouverture va ainsi au premier
 * contrôle de la feuille, dans l'ordre du DOM**, et rien ici ne le pose : un contrôle placé avant
 * celui qu'on veut focaliser le prend. Gardé par `src/tests/ecrans/feuille-du-bas-sur-web.test.tsx`,
 * qui rend la feuille par react-native-web, et par le parcours réel sur la feuille du re-bilan.
 *
 * **Qui ferme en animant** : le geste de retour et Échap (`onRequestClose`), toucher le voile, et l'appelant par
 * `fermer` (la poignée passée en `ref`) — « Pas maintenant », un choix validé. Un bouton qui
 * **navigue** appelle son rappel directement : sur natif, une route poussée sous un `Modal` encore
 * ouvert reste dessous, donc il ne doit pas attendre une sortie. Une seconde fermeture pendant la
 * sortie ne relance rien — mais si elle porte un choix (`apres`), c'est lui que la fin rendra, ou
 * aussitôt si la fin est déjà passée. Pendant la sortie, la feuille ne prend plus de toucher ; le
 * clavier, lui, n'est pas bloqué — il faudrait changer de bouton et valider en moins de 200 ms.
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
  const sortieLancee = useRef(false);
  // Pendant la sortie, la feuille ne prend plus aucun toucher : « Pas maintenant » puis le bouton
  // plein de la feuille du re-bilan (« Soumettre mon bilan » jusqu'au 01/10/2026, « Commencer »
  // depuis) dans les 200 ms faisait les deux.
  const [enSortie, setEnSortie] = useState(false);
  // Ce que la fin de la sortie appelle. **Un `fermer(apres)` arrivé pendant la sortie le remplace**,
  // au lieu d'être ignoré : le retour lance la sortie, puis le choix de la feuille des rappels finit
  // de s'écrire — ignoré, ce choix partait en base sans que le plan le reçoive (contre-lecture du
  // 27/09/2026). Un second retour, sans rien à rendre, ne remplace rien. Et un choix qui arrive
  // **après** la fin de la sortie, avant que l'appelant ait démonté la feuille, est rendu tout de
  // suite : il n'y a plus de fin à attendre (seconde contre-lecture du 28/09/2026).
  const finisseur = useRef<(() => void) | null>(null);
  const sortieTerminee = useRef(false);
  // Le dernier `onFerme` reçu : la sortie le lit à sa fin, pas à son début.
  const onFermeCourant = useRef(onFerme);
  useEffect(() => {
    onFermeCourant.current = onFerme;
  }, [onFerme]);

  useEffect(() => {
    // Sous la préférence, rien ne se lance : les valeurs de départ sont déjà posées.
    if (animationsReduites) return;
    voile.value = withTiming(1, reglage(Mouvement.fondu));
    feuille.value = withTiming(1, reglage(Mouvement.entreeDeFeuille));
  }, [animationsReduites, voile, feuille]);

  const terminer = useCallback(() => {
    sortieTerminee.current = true;
    finisseur.current?.();
  }, []);

  const fermer = useCallback(
    (apres?: () => void) => {
      if (sortieLancee.current) {
        if (!apres) return;
        if (sortieTerminee.current) apres();
        else finisseur.current = apres;
        return;
      }
      sortieLancee.current = true;
      finisseur.current = apres ?? (() => onFermeCourant.current());
      if (animationsReduites) {
        terminer();
        return;
      }
      setEnSortie(true);
      // `set` et non `.value =` : le React Compiler refuse d'écrire une valeur hors d'un effet.
      voile.set(withTiming(0, reglage(Mouvement.sortie)));
      // Le rappel part même si la sortie est interrompue : une feuille qui ne se démonte jamais
      // serait un écran bloqué, bien pire qu'une sortie coupée.
      feuille.set(
        withTiming(0, reglage(Mouvement.sortie), () => {
          scheduleOnRN(terminer);
        })
      );
    },
    [animationsReduites, voile, feuille, terminer]
  );

  useImperativeHandle(ref, () => ({ fermer }), [fermer]);

  const styleDuVoile = useAnimatedStyle(() => ({ opacity: voile.value }));
  const styleDeLaFeuille = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - feuille.value) * height }],
  }));

  return (
    <Modal visible animationType="none" transparent onRequestClose={() => fermer()} aria-label={titre}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, styleDuVoile]}>
        {/* Une vue qui répond au toucher, jamais un `Pressable` : sur web, il serait focalisable, et
            le `Modal` lui donnerait le focus d'ouverture (voir l'en-tête). */}
        <View
          testID="voile-de-la-feuille"
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => fermer()}
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
          aria-hidden
        />
      </Animated.View>
      {/* La place est une vue ordinaire, et seule la feuille s'anime : voir « Toucher le voile ». */}
      <View style={styles.place}>
        <Animated.View style={[styleDeLaFeuille, enSortie && styles.sansToucher]}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // `box-none` : la zone au-dessus de la feuille laisse passer le toucher jusqu'au voile, qui ferme.
  // Sur une vue ordinaire, et pas sur une vue animée — sur web, reanimated pose ses styles en ligne, où
  // `box-none` n'est pas une valeur CSS : la place prenait le toucher (mesuré le 01/10/2026).
  place: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  sansToucher: { pointerEvents: 'none' },
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
