import { Children, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ControlHeight, Spacing } from '@/constants/theme';

/**
 * Le conteneur d'une série de puces : un `radiogroup` quand on n'en choisit qu'une, un `group`
 * quand elles se cumulent — **toujours nommé par la question à laquelle il répond** (24/09/2026,
 * `v1-29`, audit d'accessibilité 4.1.2).
 *
 * Onze séries du questionnaire et du plan s'annonçaient encore en `button` (A2-8, `v1-13` §11.4) :
 * rien ne disait « sélectionné », ni la place dans le groupe, ni surtout **à quelle question** la
 * puce répond. La question est un frère dans l'arbre, pas un libellé rattaché : en lecture
 * séquentielle elle précède bien la série, mais en navigation de contrôle en contrôle — ou en
 * explorant l'écran au doigt — une puce « 1 » arrive seule, et il y a trois séries de chiffres sur
 * l'étape du contexte. Nommer le groupe le dit une fois ; le répéter sur chaque puce le dirait
 * autant de fois qu'il y a de puces (A2-9, même raisonnement que `PrecisionChiffres`).
 *
 * **La question se passe en chaîne, et l'appelant l'écrit une fois** pour ses deux usages — le texte
 * affiché et le nom du groupe. Deux copies d'un même libellé finissent par ne plus se
 * correspondre ; c'est la dérive que `TextLink` existe pour empêcher ailleurs.
 *
 * `role` et `aria-label` plutôt que `accessibilityRole` : le rôle d'un groupe de cases, `group`,
 * n'existe que dans le vocabulaire ARIA que React Native accepte depuis la 0.71.
 *
 * **`colonnes` range la série en grille, pour les jours** (décision n° 7 du 24/09/2026 : une cible
 * de 48 × 48). Sur une ligne, les sept jours ne laissaient que 38 à 42 px à chacun dans le
 * questionnaire, et 27 à 31 dans la carte d'une action, sur un téléphone de 360 à 390 dp ; ils n'y
 * tiennent à 48 qu'au-delà de 432 dp. La grille garde des colonnes égales d'une ligne à l'autre —
 * « 1 2 3 4 / 5 6 7 », « L M M J / V S D » — là où un simple retour à la ligne laissait un jour seul
 * sur la seconde, ou l'étirait sur toute la largeur. L'écart vient d'une marge intérieure de chaque
 * cellule et non d'un `gap`, qui s'ajoute aux largeurs en pourcentage au lieu de s'en retrancher ;
 * les cellules ne portent aucun rôle, donc le lecteur d'écran ne les voit pas.
 *
 * **`colonnes` est un maximum, pas une promesse** : une cellule ne descend jamais sous une cible
 * plus son écart. Dans la carte d'une action, à 320 dp — un petit téléphone, ou un téléphone courant
 * dont on a agrandi la taille d'affichage d'Android, c'est-à-dire souvent l'écran de qui voit mal —,
 * quatre colonnes ne laissaient que 47,5 px par cellule : les puces, tenues à 48 par leur
 * `minWidth`, débordaient et se touchaient (mesuré le 24/09/2026). Avec ce minimum, la rangée passe
 * d'elle-même à trois colonnes égales, sans mesure ni second rendu.
 */
export function GroupeDeChoix({
  question,
  cumulable = false,
  colonnes,
  style,
  children,
}: {
  /** La question telle qu'elle est affichée au-dessus de la série. */
  question: string;
  /** Vrai quand les puces se cumulent (des `checkbox`) : le groupe n'est alors pas un `radiogroup`. */
  cumulable?: boolean;
  /**
   * Nombre de colonnes d'une grille — au plus : moins quand une cible de 48 n'y tiendrait plus.
   * Sans lui, les puces suivent la mise en page de `style`.
   */
  colonnes?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const role = cumulable ? 'group' : 'radiogroup';

  if (colonnes === undefined) {
    return (
      <View role={role} aria-label={question} style={style}>
        {children}
      </View>
    );
  }

  const largeur = `${100 / colonnes}%` as const;
  return (
    <View role={role} aria-label={question} style={[styles.grille, style]}>
      {Children.map(children, (puce) => (
        <View style={[styles.cellule, { width: largeur }]}>{puce}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
    marginHorizontal: -Spacing.two / 2,
  },
  cellule: { paddingHorizontal: Spacing.two / 2, minWidth: ControlHeight.target + Spacing.two },
});
