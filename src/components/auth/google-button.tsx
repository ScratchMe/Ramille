import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Bouton "Se connecter avec Google". Réutilisé par la proposition post-bilan et par l'écran de
// session refusée.
//
// **Le « G » est celui de Google, et il ne se redessine pas** (C3.9, constat A1-13 bis). Le bouton
// portait une pastille grise en attendant — un placeholder de maquette laissé en production, qui
// ne disait pas de quel fournisseur il s'agissait et que les règles de marque de Google ne
// permettent de toute façon pas. Les quatre chemins ci-dessous sont le logo officiel, en SVG
// inline plutôt qu'en image : il reste net à toute densité, il n'a pas de fond blanc à poser sur
// un bouton blanc, et il ne coûte pas une requête. `assets/images/google-oauth-logo.png` reste la
// **référence** à laquelle le comparer, pas une source à afficher.
//
// **Le libellé annoncé est le texte affiché**, et il ne l'était pas : l'`accessibilityLabel`
// disait « Continuer avec Google » quand le bouton affichait « Se connecter avec Google ». C'est
// exactement la dérive que `TextLink` existe pour empêcher ailleurs — un libellé recopié à côté
// du texte visible finit par ne plus lui correspondre.
//
// Il partage la hauteur de `Button` par le jeton et non par un 54 recopié (A10-22) : les deux
// sont côte à côte sur l'écran de connexion et dériveraient au premier ajustement du jeton. Et
// c'est un **minimum** avec son padding, pour la même raison que `Button` (A10-21) : le libellé
// grandit avec le réglage système de taille de police, la boîte doit suivre.
const LIBELLE = 'Se connecter avec Google';

/**
 * Le « G » officiel de Google, quatre chemins dans un `viewBox` 0 0 24 24.
 *
 * Masqué au lecteur d'écran : le bouton porte déjà son libellé, et annoncer « image » entre les
 * deux n'ajoute rien. Aucune couleur de thème ici — ce sont les couleurs de la marque, elles ne
 * suivent ni la palette du produit ni le mode sombre.
 */
function LogoGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden accessibilityElementsHidden>
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

export function GoogleButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={LIBELLE}
      accessibilityState={{ disabled: !!loading, busy: !!loading }}
      style={[styles.button, { backgroundColor: theme.background, borderColor: theme.border }]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <>
          <LogoGoogle />
          <ThemedText weight={600} style={styles.label}>
            {LIBELLE}
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
  label: { fontSize: 16 },
});
