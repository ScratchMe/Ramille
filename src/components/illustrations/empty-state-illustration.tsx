import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

// Plan 5.1 — « illustration — état vide » (docs/design/README.md §5.1 : "rayures
// #F0F1EC/#F6F8F3"). Brique Plan = "UI fonctionnelle sobre, pas d'illustration custom"
// (spec-uiux §0) : un motif neutre plutôt qu'une scène illustrée, cohérent avec le
// placeholder rayé de la maquette d'origine (IllustrationPlaceholder ne faisait qu'un
// aplat teinté, simplification provisoire documentée dans son propre commentaire).
const STRIPE_WIDTH = 26;
const GAP = 26;
// viewBox volontairement plus grand que le cadrage visible : à 135deg, les rayures
// doivent couvrir toute la diagonale du conteneur, pas seulement son viewBox nominal.
const VIEWBOX_SIZE = 300;
const STRIPE_COUNT = Math.ceil((VIEWBOX_SIZE * 2.5) / (STRIPE_WIDTH + GAP));

export function EmptyStateIllustration({ style }: { style?: ViewStyle }) {
  const c = Colors.light;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.container, style]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill={c.backgroundElement} />
        <G rotation={135} origin={`${VIEWBOX_SIZE / 2}, ${VIEWBOX_SIZE / 2}`}>
          {Array.from({ length: STRIPE_COUNT }, (_, i) => (
            <Rect
              key={i}
              x={-VIEWBOX_SIZE}
              y={i * (STRIPE_WIDTH + GAP) - VIEWBOX_SIZE}
              width={VIEWBOX_SIZE * 3}
              height={STRIPE_WIDTH}
              fill={c.backgroundElement2}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
