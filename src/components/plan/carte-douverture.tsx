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
import { Radius, Spacing, Stroke, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ContenuDOuverture, SortieDouverture } from '@/types/saison';

/** Entrée de la carte : elle glisse depuis le bas, 320 ms (canvas B2). */
const ENTREE = 320;

/**
 * La carte d'ouverture du plan — **les trois** : celle d'une saison (C2.8, planches B2 et B3),
 * celle du tout premier plan (C5.6, planche B1) et celle des deux lieux (C5.7, planche F3).
 *
 * **Un seul composant pour les trois**, et ce n'est pas une économie : le canvas décrit les trois
 * cadres de la même façon au pixel près — bordure 1 px, fond `backgroundTinted`, étiquette
 * 13/18/700, titre `screenTitle`, corps `body`, Ramille dessous en 44 penchée de − 5. En écrire
 * deux garantirait qu'ils divergent, exactement comme `CarteDePiste` en C5.2. Ce qui change est du
 * **contenu** : l'étiquette, le titre, le corps, les sorties, et ce que Ramille dit — le tout
 * dérivé dans `src/types/saison.ts` et `src/types/premier-parcours.ts`.
 *
 * **Elles ne s'affichent jamais ensemble, mais une seule des deux exclusions est structurelle**
 * (corrigé par la contre-lecture du lot 5). L'ouverture de saison exige un cycle précédent et le
 * premier plan exige qu'il n'y en ait pas : celles-là ne peuvent pas se croiser. Celle des deux
 * lieux, en revanche, reste due tant que son « Compris » n'a pas eu lieu — donc quelqu'un qui
 * referme le premier plan puis ne revient qu'après la bascule suivante les devrait toutes les
 * deux le même jour. C'est l'**écran** qui tranche, et la carte de saison passe devant. Toutes
 * trois prennent la place de la **carte d'attente**, jamais celle d'un point en attente (C2.8).
 *
 * **L'effet « nouveau départ » était perdu quatre fois par an** (constat A13-6) : à la bascule, le
 * cycle suivant se créait dans la nuit, et la seule trace en était la puce « Cadence : Hiver
 * 2026-2027 » qui changeait de texte sans rien annoncer.
 *
 * Quatre choses à ne pas défaire — et la quatrième est arrivée avec C5.7 sans que ce compte soit
 * repris, ce qui la laissait hors de la liste qu'on croit lire :
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
 * — **La ligne de Ramille et son visage sont passés par l'appelant**, sans valeur par défaut : une
 *   carte qui retomberait sur « On repart pour une saison. » au premier plan de quelqu'un dirait la
 *   seule phrase qui ne peut pas y être vraie — on ne repart pas d'une saison qu'on n'a pas vécue.
 *   Le visage suit le même chemin parce qu'il varie aussi (`happy` pour ce qui commence, `calm`
 *   pour ce qui s'explique), et qu'un défaut ferait passer l'oubli inaperçu.
 *
 * L'animation d'entrée respecte « réduire les animations » par le défaut de reanimated
 * (`ReduceMotion.System`), rappelé explicitement comme dans `ecran-lancement.tsx`.
 */
export function CarteDOuverture({
  ouverture,
  sorties,
  ligne,
  visage,
  onSortie,
}: {
  ouverture: ContenuDOuverture;
  sorties: SortieDouverture[];
  /** Ce que Ramille dit sous le cadre — `RAMILLE.ouvertureSaison`, `.premierPlan`, `.planEtSuivi`. */
  ligne: string;
  /** Son visage : `happy` pour ce qui commence, `calm` pour ce qui s'explique. */
  visage: 'happy' | 'calm';
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
        {/* Niveau 2 : la carte est une section de l'écran du plan, dont « Ton plan » est le titre de
            niveau 1 — même si elle se rend au-dessus. Deux `<h1>` diraient deux écrans. */}
        <ThemedText type="screenTitle" headingLevel={2}>
          {ouverture.titre}
        </ThemedText>
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
              // `onPanel` : la carte est teintée, et un secondaire gris s'y confondait (1,06:1) —
              // « Choisir une autre », le défaut que `Button` décrit sur la carte du point.
              <Button
                key={sortie.cle}
                title={sortie.label}
                variant={sortie.forme === 'primaire' ? 'primary' : 'secondary'}
                onPanel
                onPress={() => onSortie(sortie.cle)}
              />
            )
          )}
        </View>
      </View>
      {/* Hors du cadre, sous les chiffres : c'est tout ce qu'elle dit, et elle ne compte rien. */}
      <RamilleDit
        ligne={ligne}
        mood={visage}
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
  carte: { borderWidth: Stroke.hairline, borderRadius: Radius.card, padding: 20, gap: 12 },
  // Même étiquette que celle de `ActionCard` — 13/18, interlettrage +0,3, en 700 par la prop
  // `weight` —, nommée `TypeScale.label` depuis le 24/09/2026 (`v1-29`).
  etiquette: TypeScale.label,
  // 4 px de plus que le `gap` de la carte : les boutons forment un groupe, pas deux lignes de
  // texte de plus.
  sorties: { gap: Spacing.two, marginTop: 4 },
  ramille: { paddingHorizontal: 4 },
});
