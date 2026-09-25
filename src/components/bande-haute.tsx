import { StyleSheet, View } from 'react-native';

import { CompteBouton, ICONE_DU_COMPTE } from '@/components/compte-bouton';
import { ThemedText } from '@/components/themed-text';
import { APP_NAME } from '@/constants/produit';
import { ControlHeight, Spacing, TypeScale } from '@/constants/theme';
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
      {/* **Un repère, pas un titre** (24/09/2026, `v1-29`). Annoncé en en-tête, le nom passait
          avant le titre de chaque écran : sur web un `<h2>` devant le `<h1>`, et sur Android la
          première étape de la navigation par titres sur chaque onglet, toujours la même. Le titre
          de l'écran est le premier titre ; le nom situe, il ne commence rien. */}
      <ThemedText weight={600} style={styles.nom}>
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
    height: ControlHeight.topBand,
    // **Le bord visible de l'icône du compte tombe sur la marge du contenu** (`Spacing.four`),
    // celle du contenu défilant juste en dessous : la marge de la bande s'en déduit, l'icône
    // étant centrée dans sa cible. Elle valait 13 écrit en dur, juste pour une cible de 44 ; la
    // cible passant à 48 le 24/09/2026 (`v1-29`), le même 13 aurait décalé l'icône de 2 px vers
    // l'intérieur — d'où le calcul plutôt qu'un 11 recopié.
    paddingHorizontal: Spacing.four - (ControlHeight.target - ICONE_DU_COMPTE) / 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  creneau: { width: ControlHeight.target, alignItems: 'center', justifyContent: 'center' },
  nom: { ...TypeScale.card, flex: 1, textAlign: 'center', letterSpacing: -0.1 },
});
