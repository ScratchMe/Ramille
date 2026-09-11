import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Bouton "Se connecter avec Google" — pastille neutre en placeholder dans la maquette,
// à remplacer par le bouton officiel non personnalisé (cf. annotation design, contrainte
// des règles de marque Google). Réutilisé par la proposition post-bilan et, plus tard,
// par l'écran "session expirée".
//
// Il partage la hauteur de `Button` par le jeton et non par un 54 recopié (A10-22) : les deux
// sont côte à côte sur l'écran de connexion et dériveraient au premier ajustement du jeton. Et
// c'est un **minimum** avec son padding, pour la même raison que `Button` (A10-21) : le libellé
// grandit avec le réglage système de taille de police, la boîte doit suivre.
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
    minHeight: ControlHeight.button,
    paddingVertical: 15,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  dot: { width: 20, height: 20, borderRadius: 10 },
  label: { fontSize: 16 },
});
