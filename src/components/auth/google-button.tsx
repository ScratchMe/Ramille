import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Bouton "Se connecter avec Google" — pastille neutre en placeholder dans la maquette,
// à remplacer par le bouton officiel non personnalisé (cf. annotation design, contrainte
// des règles de marque Google). Réutilisé par la proposition post-bilan et, plus tard,
// par l'écran "session expirée".
export function GoogleButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continuer avec Google"
      accessibilityState={{ disabled: !!loading, busy: !!loading }}
      style={[styles.button, { backgroundColor: theme.background, borderColor: theme.border }]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <>
          <View style={[styles.dot, { backgroundColor: theme.backgroundElement }]} />
          <ThemedText weight={600} style={styles.label}>
            Se connecter avec Google
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 54,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  dot: { width: 20, height: 20, borderRadius: 10 },
  label: { fontSize: 16 },
});
