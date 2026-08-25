import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

// Marque TraceVerte — feuille + trajet tracé (nervure décalée en courbe, point d'arrivée).
// Source de vérité pour tout regénération d'asset (favicon, icônes) : assets/images/logo-mark.svg,
// qui doit rester visuellement identique à ce composant si l'un des deux est retouché.
export function Logo({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  const c = Colors.light;

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z" fill={c.accent} />
        <Path d="M50,20 C42,44 42,64 50,82" stroke={c.backgroundSelected} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <Circle cx="50" cy="82" r="5" fill={c.backgroundSelected} />
      </Svg>
    </View>
  );
}
