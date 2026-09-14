import { StyleSheet, View } from 'react-native';

import { ModeListItem } from '@/components/bilan/mode-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

// Question de précision attachée au mode qui la déclenche — motorisation d'une voiture,
// type de deux-roues.
//
// **Elle se rend juste sous l'élément sélectionné, à l'intérieur de la liste**, et c'est la
// première raison d'être de ce composant. Elle vivait auparavant après la liste entière : sur
// un écran de 390 × 844, avec neuf modes, elle tombait à 774 px pour un conteneur de 684 —
// 242 px hors champ, sous le pied collant. La personne voyait un mode sélectionné, un
// « Suivant » grisé, et une liste qui semblait complète. Rien n'indiquait qu'il restait
// quelque chose à faire.
//
// Le défilement automatique aurait été un pansement : il ne dit rien au retour sur l'étape,
// quand la sélection est déjà faite. Sous l'élément, la question est là où l'œil vient de se
// poser — et « Voiture (seul) » est le premier de la liste.
//
// **Les réponses sont des rangées, pas des puces** (retour d'appareil du 07/09/2026). En
// puces, deux défauts se cumulaient :
//
//   - *On ne les distinguait pas.* Une puce non sélectionnée porte le fond
//     `backgroundElement`, celui-là même de cette boîte : elles se lisaient comme du texte,
//     sans rien qui dise qu'on peut appuyer dessus. `ModeListItem` a déjà la réponse du
//     dépôt à ce problème — `nestedBackground`, qui repasse en blanc le fond non sélectionné
//     d'un item posé dans un encart teinté. La même décision avait été prise pour le
//     « Lequel ? » imbriqué de `commute-extra.tsx`, à deux composants d'ici.
//   - *Elles n'étaient pas ordonnées.* Quatre libellés de largeurs très inégales
//     (« Hybride » contre « Hybride rechargeable ») donnaient un retour à la ligne en
//     escalier : deux puces, puis une, puis une. Une par rangée, l'alignement est régulier,
//     et un libellé long ne risque plus d'être rogné — le piège de `baseFlex` dans `chip.tsx`.
//
// Le rôle d'accessibilité suit gratuitement : `ModeListItem` s'annonce en `radio`, seul rôle
// qui dit « sélectionné », alors qu'une puce s'annonce en `button`. Ces réponses sont bien
// des choix exclusifs.
//
// Le paramètre accepte un nombre autant qu'une chaîne : la part du second mode (C3.4) est une
// fraction, parce que c'est ce que le calcul multiplie — traduire une énumération en fraction
// quelque part entre l'écran et le SQL serait un troisième endroit où se tromper.
export function PrecisionMode<T extends string | number>({
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
      <ThemedText type="small" themeColor="textSecondary">
        {question}
      </ThemedText>
      <View style={styles.reponses}>
        {options.map((option) => (
          <ModeListItem
            key={option.value}
            label={option.label}
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            nestedBackground
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
  reponses: { gap: Spacing.two },
});
