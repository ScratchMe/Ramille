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
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  /** Ce que le champ demande. L'unité affichée à droite n'est pas un label : « km » seul ne
   *  dit pas ce qu'on saisit, et un lecteur d'écran n'a que ça à annoncer sans elle. */
  label: string;
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
        accessibilityLabel={`${label}, en ${unit}`}
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
  // `minWidth: 0` est nécessaire sur web : un <input> a une largeur intrinsèque que
  // flexbox ne réduit pas automatiquement (contrairement à RN natif), donc sans ça le
  // champ refuse de rétrécir et pousse "km" à cheval sur son bord droit.
  input: { flex: 1, minWidth: 0, fontSize: 28, fontFamily: FontFamily.semibold, padding: 0 },
  unit: { fontSize: 17, flexShrink: 0 },
});
