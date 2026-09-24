import { StyleSheet, TextInput, View } from 'react-native';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Champ labellisé des écrans de connexion (adresse email) — rayon 16, fond teinté,
// bordure accent uniquement quand le champ a du contenu ou une action associée (mot de
// passe), pour rester proche de la maquette sans dupliquer un style par écran.
//
// **Au repos, le contour est `fieldBorder`, et non plus transparent** (24/09/2026, `v1-29`, audit
// d'accessibilité 1.4.11). Vide, le champ n'était qu'un fond `backgroundElement` à 1,14:1 sur le
// blanc : on ne voyait pas où taper, sur l'écran de la suppression de compte que Google Play exige
// comme sur les deux de la connexion. `fieldBorder` tient 3,45:1 sur le blanc et 3,04:1 sur le fond
// du champ ; l'accent reste réservé au champ rempli, comme avant.
export function TextField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  rightActionLabel,
  onRightAction,
  keyboardType,
  autoCapitalize = 'none',
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  rightActionLabel?: string;
  onRightAction?: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  placeholder?: string;
  helperText?: string;
}) {
  const theme = useTheme();
  const accented = value.length > 0 || !!rightActionLabel;

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textTertiary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: accented ? theme.accent : theme.fieldBorder,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          // Le libellé au-dessus est un frère dans l'arbre, pas un `<label for>` : sans cette
          // ligne, le champ s'annonce sans nom.
          accessibilityLabel={label}
          accessibilityHint={helperText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text }]}
        />
        {rightActionLabel && (
          <TextLink
            label={rightActionLabel}
            onPress={() => onRightAction?.()}
            type="small"
            weight={600}
            themeColor="accentText"
          />
        )}
      </View>
      {helperText && (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ControlHeight.field,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    paddingHorizontal: 18,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16 },
});
