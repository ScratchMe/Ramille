import { StyleSheet, View } from 'react-native';

import { CompteBouton } from '@/components/compte-bouton';
import { ThemedText } from '@/components/themed-text';
import { APP_NAME } from '@/constants/produit';
import { ControlHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Bande haute des deux onglets — retour d'appareil du 07/09/2026.
//
// Elle existe pour une raison utilitaire : l'accès au compte défilait avec le contenu et
// disparaissait dès le premier geste. Une bande fixe le garde atteignable partout.
//
// **Elle porte le nom, pas le visage.** La règle de la mascotte (CLAUDE.md) est qu'elle
// n'apparaît jamais à côté d'un chiffre lourd : un visage en permanence au-dessus du cap de
// la saison ou de l'empreinte d'un bilan la mettrait exactement là. Le mot « Ramille »
// n'accompagne rien et ne commente rien — il situe.
//
// Trois créneaux de largeur égale pour que le nom soit centré sur l'écran et non sur ce qui
// reste : le créneau de gauche est vide aujourd'hui, il attend le bouton retour dont iOS aura
// besoin (Android a le sien, matériel).
export function BandeHaute() {
  const theme = useTheme();

  return (
    <View style={[styles.bande, { borderBottomColor: theme.border }]}>
      <View style={styles.creneau} />
      <ThemedText weight={600} style={styles.nom} accessibilityRole="header">
        {APP_NAME}
      </ThemedText>
      <View style={styles.creneau}>
        <CompteBouton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bande: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    // 13 et non Spacing.four : l'icône du compte mesure 22 dans une cible de 44, son bord
    // visible tombe donc à 13 + 11 = 24 — la marge du contenu défilant juste en dessous.
    paddingHorizontal: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  creneau: { width: ControlHeight.target, alignItems: 'center', justifyContent: 'center' },
  nom: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
});
