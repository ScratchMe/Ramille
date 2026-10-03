import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Le tracé de la coche, dans une boîte de 24. **Le seul du dépôt**, partagé avec la case d'une puce à
 * cocher (`Chip`, 03/10/2026) : la recopier, c'est laisser diverger la marque du geste le plus important
 * du produit et celle d'une réponse cochée.
 */
export const TRACE_DE_LA_COCHE = 'M5 13l4 4L19 7';

/**
 * La coche qui marque une action engagée — 20 px, fond `accent`, trait `onAccent` de 3 (le blanc
 * écrit en dur jusqu'au 24/09/2026, `v1-29` §3).
 *
 * **Une seule implémentation pour deux surfaces** : l'en-tête d'une carte d'action, et la ligne
 * engagée de « Toutes les pistes » (planche A2 du canvas `v1-17`). Elle vivait en clair dans
 * `ActionCard`, ce qui suffisait tant qu'elle y était seule ; la recopier serait garantir que les
 * deux divergent, sur la marque du geste le plus important du produit — et ce dépôt n'a pas
 * d'icônes, donc ce tracé **est** le vocabulaire.
 *
 * Purement décorative : ce qu'elle signifie est porté par le texte à côté d'elle et par le libellé
 * accessible de la surface qui la contient. Un lecteur d'écran qui l'annoncerait dirait deux fois
 * la même chose.
 */
export function PastilleEngagee() {
  const theme = useTheme();

  return (
    <View style={[styles.pastille, { backgroundColor: theme.accent }]}>
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Path
          d={TRACE_DE_LA_COCHE}
          stroke={theme.onAccent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
