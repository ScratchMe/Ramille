import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Champ numérique encadré (B1.2/B1.3 "Quelle distance pour un aller ?") — bordure
// accent permanente dans la maquette, pas seulement au focus.
export function NumericField({
  value,
  onChange,
  unit,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
      <TextInput
        value={value === null ? '' : String(value)}
        onChangeText={(text) => {
          const cleaned = text.replace(/[^0-9]/g, '');
          onChange(cleaned === '' ? null : Number(cleaned));
        }}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { color: theme.text }]}
      />
      <ThemedText themeColor="textTertiary" style={styles.unit}>
        {unit}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 20,
  },
  input: { flex: 1, fontSize: 28, fontFamily: FontFamily.semibold, padding: 0 },
  unit: { fontSize: 17 },
});
