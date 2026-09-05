import { StyleSheet, TextInput, View } from 'react-native';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Champ labellisé des écrans de connexion (email, mot de passe) — rayon 16, fond teinté,
// bordure accent uniquement quand le champ a du contenu ou une action associée (mot de
// passe), pour rester proche de la maquette sans dupliquer un style par écran.
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
            borderColor: accented ? theme.accent : 'transparent',
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
  container: { gap: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16 },
});
