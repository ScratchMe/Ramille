import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// **`lightColor` et `darkColor` sont partis le 24/09/2026** (`v1-29`) : hérités du gabarit Expo, ils
// étaient acceptés puis ignorés — une couleur passée par là ne s'affichait jamais, sans rien pour
// le dire. Aucun appelant ne les passait. Le fond se choisit par `type`, parmi les jetons du thème.
export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
};

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
