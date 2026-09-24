import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Le cadre d'une feuille du bas : la fenêtre, le voile, la feuille, sa poignée et son titre
 * (24/09/2026, `v1-29`).
 *
 * **Il était écrit deux fois**, dans `FeuilleNouveauBilan` et dans `FeuilleRappels`, à la valeur
 * près — le voile recopié en dur aux deux endroits, la poignée, les marges. Deux copies d'un même
 * cadre divergent au premier ajustement ; c'est la leçon de `CarteDePiste` (C5.2) et de
 * `CarteDOuverture` (C5.6). Ce qui reste chez chaque feuille est son **contenu**, et lui seul.
 *
 * **Le titre est obligatoire, et c'est lui qui nomme le dialogue.** Sur web, react-native-web rend
 * la fenêtre en `role="dialog"` : les deux feuilles s'y annonçaient **sans nom** (audit
 * d'accessibilité, 1.3.1), donc un lecteur d'écran entrait dans « dialogue » sans savoir lequel.
 * Le même texte sert aux deux usages — l'en-tête affiché et le nom du dialogue —, écrit une fois
 * par l'appelant, pour qu'ils ne puissent pas se contredire. L'en-tête est de niveau 2 : la feuille
 * s'ouvre par-dessus un écran qui porte déjà son titre.
 *
 * **Le geste de retour referme toujours** (`onFerme`) : une feuille qu'on ne peut pas fermer n'est
 * plus une proposition. C'était le contrat des deux, il est ici une fois.
 */
export function FeuilleDuBas({
  titre,
  onFerme,
  children,
}: {
  /** Affiché en tête de la feuille, et nom du dialogue. */
  titre: string;
  /** Le geste de retour, la touche Échap sur web. */
  onFerme: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onFerme} aria-label={titre}>
      <View style={[styles.voile, { backgroundColor: theme.scrim }]}>
        <ThemedView style={[styles.feuille, { borderColor: theme.border }]}>
          <View style={[styles.poignee, { backgroundColor: theme.border }]} />
          <ThemedText type="cardTitle" accessibilityRole="header">
            {titre}
          </ThemedText>
          {children}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voile: { flex: 1, justifyContent: 'flex-end' },
  feuille: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: Stroke.hairline,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  poignee: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two },
});
