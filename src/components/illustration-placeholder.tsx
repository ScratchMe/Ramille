import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type IllustrationPlaceholderProps = {
  caption: string;
  style?: ViewStyle;
};

// Emplacement d'illustration à produire — aucun asset final pour cette V1 (cf. handoff
// design §Assets). La maquette utilise un motif de rayures diagonales ; simplifié ici
// en aplat teinté pour éviter une dépendance de gradient pour du contenu placeholder
// qui sera de toute façon remplacé par un vrai visuel.
export function IllustrationPlaceholder({ caption, style }: IllustrationPlaceholderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement2 }, style]}>
      <ThemedText type="code" themeColor="textTertiary" style={styles.caption}>
        {caption}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  caption: {
    textAlign: 'center',
  },
});
