import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { RAMILLE } from '@/constants/mascotte';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { OuvertureDeSaison, SortieDouverture } from '@/types/saison';

/** Entrée de la carte : elle glisse depuis le bas, 320 ms (canvas B2). */
const ENTREE = 320;

/**
 * La carte d'ouverture d'une saison (C2.8, planches B2 et B3).
 *
 * **L'effet « nouveau départ » était perdu quatre fois par an** (constat A13-6) : à la bascule, le
 * cycle suivant se créait dans la nuit, et la seule trace en était la puce « Cadence : Hiver
 * 2026-2027 » qui changeait de texte sans rien annoncer.
 *
 * Trois choses à ne pas défaire :
 *
 * — **Ramille est dessous et hors du cadre.** La carte porte deux nombres — les points répondus et
 *   les changements — et la règle du produit est qu'elle n'apparaît jamais à côté d'un chiffre qui
 *   se commente. Dehors, elle n'annonce que le départ ; dedans, elle aurait l'air de commenter un
 *   bilan de saison.
 * — **Les sorties viennent de `sortiesDeLouverture`**, jamais d'un ternaire écrit ici : le canvas
 *   suppose une action engagée et reconduite, et deux cas de production ne peuvent pas recevoir ces
 *   libellés (rien d'engagé, plan sans action — tout cycliste depuis C2.5).
 * — **Le corps peut être `null`**, et alors la carte n'a pas de corps du tout : aucun point répondu
 *   sur la période écoulée, et « 0 point répondu » nommerait les manqués.
 *
 * L'animation d'entrée respecte « réduire les animations » par le défaut de reanimated
 * (`ReduceMotion.System`), rappelé explicitement comme dans `ecran-lancement.tsx`.
 */
export function CarteDeSaison({
  ouverture,
  sorties,
  onSortie,
}: {
  ouverture: OuvertureDeSaison;
  sorties: SortieDouverture[];
  onSortie: (cle: SortieDouverture['cle']) => void;
}) {
  const theme = useTheme();
  const entree = useSharedValue(0);

  useEffect(() => {
    entree.value = withTiming(1, {
      duration: ENTREE,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [entree]);

  const styleEntree = useAnimatedStyle(() => ({
    opacity: entree.value,
    transform: [{ translateY: (1 - entree.value) * 16 }],
  }));

  return (
    <Animated.View style={[styles.bloc, styleEntree]}>
      <View style={[styles.carte, { backgroundColor: theme.backgroundTinted, borderColor: theme.border }]}>
        <ThemedText themeColor="accentText" weight={700} style={styles.etiquette}>
          {ouverture.etiquette}
        </ThemedText>
        <ThemedText type="screenTitle">{ouverture.titre}</ThemedText>
        {ouverture.corps && (
          <ThemedText type="body" themeColor="textSecondary">
            {ouverture.corps}
          </ThemedText>
        )}
        <View style={styles.sorties}>
          {sorties.map((sortie) =>
            sortie.forme === 'lien' ? (
              <TextLink
                key={sortie.cle}
                label={sortie.label}
                onPress={() => onSortie(sortie.cle)}
                type="small"
                weight={600}
                themeColor="accentText"
              />
            ) : (
              <Button
                key={sortie.cle}
                title={sortie.label}
                variant={sortie.forme === 'primaire' ? 'primary' : 'secondary'}
                onPress={() => onSortie(sortie.cle)}
              />
            )
          )}
        </View>
      </View>
      {/* Hors du cadre, sous les chiffres : c'est tout ce qu'elle dit, et elle ne compte rien. */}
      <RamilleDit
        ligne={RAMILLE.ouvertureSaison}
        mood="happy"
        size={44}
        tilt={-5}
        themeColor="text"
        style={styles.ramille}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.three },
  carte: { borderWidth: 1, borderRadius: Radius.card, padding: 20, gap: 12 },
  // Même étiquette que celle de `ActionCard` : 13/18/700, interlettrage +0,3.
  etiquette: { fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  // 4 px de plus que le `gap` de la carte : les boutons forment un groupe, pas deux lignes de
  // texte de plus.
  sorties: { gap: Spacing.two, marginTop: 4 },
  ramille: { paddingHorizontal: 4 },
});
