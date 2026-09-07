import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

// Question de précision attachée au mode qui la déclenche — motorisation d'une voiture,
// type de deux-roues.
//
// **Elle se rend juste sous l'élément sélectionné, à l'intérieur de la liste**, et c'est tout
// l'objet de ce composant. Elle vivait auparavant après la liste entière : sur un écran de
// 390 × 844, avec neuf modes, elle tombait à 774 px pour un conteneur de 684 — 242 px hors
// champ, sous le pied collant. La personne voyait un mode sélectionné, un « Suivant » grisé,
// et une liste qui semblait complète. Rien n'indiquait qu'il restait quelque chose à faire.
//
// Le défilement automatique aurait été un pansement : il ne dit rien au retour sur l'étape,
// quand la sélection est déjà faite. Sous l'élément, la question est là où l'œil vient de se
// poser — et « Voiture (seul) » est le premier de la liste.
export function PrecisionMode<T extends string>({
  question,
  options,
  valeur,
  onChange,
}: {
  question: string;
  options: readonly { value: T; label: string }[];
  valeur: T | null;
  onChange: (valeur: T) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.boite}>
      <ThemedText type="small" themeColor="textTertiary">
        {question}
      </ThemedText>
      <View style={styles.puces}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            radius={Radius.field}
            selectedStyle="outline"
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Léger retrait à gauche : la boîte se lit comme rattachée à l'élément du dessus, pas
  // comme un bloc de plus dans la liste.
  boite: {
    borderRadius: Radius.field,
    padding: Spacing.three,
    gap: Spacing.two,
    marginLeft: Spacing.three,
  },
  // Quatre motorisations : largeur naturelle et retour à la ligne — équiréparties,
  // « Hybride rechargeable » écraserait les trois autres.
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
