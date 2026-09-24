import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

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
 */
export function GroupeDeChoix({
  question,
  cumulable = false,
  style,
  children,
}: {
  /** La question telle qu'elle est affichée au-dessus de la série. */
  question: string;
  /** Vrai quand les puces se cumulent (des `checkbox`) : le groupe n'est alors pas un `radiogroup`. */
  cumulable?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View role={cumulable ? 'group' : 'radiogroup'} aria-label={question} style={style}>
      {children}
    </View>
  );
}
