import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { METHODE_TITRE, sectionsDeMethode } from '@/constants/methodologie';
import { Spacing } from '@/constants/theme';

// « Comment ce chiffre est calculé » — le bloc dépliable posé sous le total (C3.2).
//
// **Replié par défaut, et c'est le fond du chantier.** Le besoin auquel il répond n'est pas
// celui de la première lecture : quelqu'un qui sort du questionnaire veut son chiffre, pas une
// méthodologie. Il devient urgent au moment précis où la personne compare ce total à celui d'un
// autre simulateur et trouve un écart — un écart qui peut aller du simple au quintuple sur une
// voiture électrique, parce que nos facteurs comptent la fabrication. Déplié d'office, le bloc
// repousse le plan sous le pli pour tout le monde ; replié, il est là pour qui le cherche.
//
// **Le texte n'est pas ici.** Il vit dans `src/constants/methodologie.ts`, avec ses sources et
// ses hypothèses, pour la raison qui vaut pour `carbon-reference.ts` : une phrase qui porte la
// crédibilité du produit, écrite au milieu d'un `<View>`, finit par diverger de la valeur qu'elle
// décrit. Ce composant ne fait que rendre ce que cette constante dit.
export function BlocMethode({ dateDuBilan }: { dateDuBilan: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const sections = sectionsDeMethode(dateDuBilan);

  return (
    <View style={styles.bloc}>
      {/* Le libellé ne change pas en « Replier » : c'est le titre du contenu, et le remplacer
          fait perdre de quoi il s'agit à qui rouvre l'écran plus tard. L'état ouvert/fermé est
          annoncé par `expanded`, qui est fait pour ça — un lecteur d'écran dit « développé ». */}
      <TextLink
        label={METHODE_TITRE}
        onPress={() => setOuvert((etait) => !etait)}
        expanded={ouvert}
        type="small"
        weight={600}
        themeColor="textSecondary"
        containerStyle={styles.cible}
      />
      {ouvert && (
        <View style={styles.contenu}>
          {sections.map((section) => (
            <View key={section.titre} style={styles.section}>
              <ThemedText type="small" weight={600} themeColor="textSecondary">
                {section.titre}
              </ThemedText>
              {section.lignes.map((ligne) => (
                <ThemedText key={ligne} type="small" themeColor="textTertiary">
                  {ligne}
                </ThemedText>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.two },
  // La cible tactile de 44 px reste, mais sans son centrage vertical par défaut : le lien
  // s'aligne à gauche sous le total, pas au milieu d'une ligne vide.
  cible: { alignItems: 'flex-start' },
  contenu: { gap: Spacing.three },
  section: { gap: Spacing.one },
});
