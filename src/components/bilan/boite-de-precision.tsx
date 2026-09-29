import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { Depliage } from '@/lib/mouvement';

/**
 * Ce qui s'ouvre sous un choix pour le préciser — la motorisation sous « Voiture (seul) », le type de
 * train, le nombre de personnes d'un covoiturage : **le dépli, la boîte et ses marges, écrits une
 * fois** (29/09/2026, `v1-31` §2.2).
 *
 * `PrecisionMode` et `PrecisionChiffres` ne dessinent plus de boîte : ils sont un intitulé et son
 * groupe, et c'est ici qu'on les pose — un seul, ou **deux quand un choix ouvre deux précisions**
 * (le covoiturage du trajet et des sorties, la voiture des longs trajets, un second mode qui a un
 * type). Deux boîtes pour une même voiture se lisaient comme deux blocs de plus ; une boîte et deux
 * questions se lisent comme une voiture et ce qu'on en dit. Et deux façons de dessiner la même boîte
 * divergent au premier ajustement — la leçon de `CarteDePiste` en C5.2.
 *
 * **La règle d'accessibilité ne bouge pas** (`v1-29`, 25/09/2026) : chaque précision garde son propre
 * `radiogroup`, nommé par sa question, et la boîte les pose dans le groupe du choix qu'elle précise —
 * jamais un groupe fusionné. Le parcours réel vérifie qu'aucun groupe n'en coche deux.
 *
 * La géométrie est celle du handoff : 8 sous le choix, un retrait de 16, 12 de marge intérieure — pour
 * que cinq puces de 48 tiennent sur une rangée à 360, à 0 px près —, 16 entre deux groupes, et 8
 * sous la boîte. Les deux marges sont **dans** le dépli : elles comptent dans la hauteur qui s'ouvre,
 * au lieu d'apparaître d'un coup au-dessus ou au-dessous.
 */
export function BoiteDePrecision({ children }: { children: ReactNode }) {
  return (
    <Depliage style={styles.depli}>
      <ThemedView type="backgroundElement" style={styles.boite}>
        {children}
      </ThemedView>
    </Depliage>
  );
}

/**
 * 12 est hors de l'échelle `Spacing`, et c'est assumé (handoff `v1-31`, page Système) : 16 laissait
 * 264 px à cinq puces qui en demandent 272 à 360 dp, et la cinquième passait à la ligne ; 8 collerait
 * les réponses au bord. La valeur est déjà employée ailleurs — le premier pas d'une carte d'action.
 */
const MARGE_INTERIEURE = 12;

const styles = StyleSheet.create({
  depli: { marginTop: Spacing.two, marginBottom: Spacing.two },
  // Le retrait à gauche : la boîte se lit comme rattachée au choix du dessus, pas comme un bloc de plus
  // dans la liste.
  boite: {
    borderRadius: Radius.field,
    padding: MARGE_INTERIEURE,
    gap: Spacing.three,
    marginLeft: Spacing.three,
  },
});
