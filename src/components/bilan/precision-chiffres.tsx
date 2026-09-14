import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

/**
 * La jumelle chiffrée de `PrecisionMode` : même encart, même retrait, mêmes garanties
 * d'accessibilité — mais des puces au lieu de rangées.
 *
 * **Pourquoi des puces ici et des rangées là-bas.** `precision-mode.tsx` a choisi les rangées
 * pour deux raisons nommées : des libellés de largeurs très inégales (« Hybride » contre
 * « Hybride rechargeable ») donnaient un retour à la ligne en escalier, et un libellé long
 * risquait d'être rogné. Aucune des deux ne vaut pour des chiffres : ils ont tous la même
 * largeur, ils tiennent à cinq sur une ligne, et cinq rangées hautes pour cinq chiffres
 * feraient une liste plus longue que la question. C'est la même décision que le questionnaire
 * prend déjà partout ailleurs — jours par semaine, nombre de vols, taille du covoiturage.
 *
 * Le groupe est un `radiogroup` **nommé**, et c'est ce qui le distingue de ses voisins : une
 * étape peut porter deux séries de puces rigoureusement identiques (les longs trajets en
 * portent déjà deux), et en navigation de contrôle en contrôle plus rien ne dirait dans
 * laquelle on se trouve. Nommer le groupe le dit une fois ; le répéter sur chaque puce le
 * dirait cinq (A2-9).
 */
export function PrecisionChiffres({
  question,
  options,
  valeur,
  onChange,
}: {
  question: string;
  options: readonly { value: number; label: string; accessibilityLabel?: string }[];
  valeur: number | null;
  onChange: (valeur: number) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.boite}>
      <ThemedText type="small" themeColor="textSecondary">
        {question}
      </ThemedText>
      <View style={styles.reponses} accessibilityRole="radiogroup" accessibilityLabel={question}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            role="radio"
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            flex
            radius={14}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Retrait identique à `PrecisionMode` : l'encart se lit comme rattaché à l'élément du
  // dessus, pas comme un bloc de plus dans la liste.
  boite: {
    borderRadius: Radius.field,
    padding: Spacing.three,
    gap: Spacing.two,
    marginLeft: Spacing.three,
  },
  reponses: { flexDirection: 'row', gap: Spacing.two },
});
