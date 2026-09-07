import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Message d'échec affiché sous l'action qui a échoué — issue #59.
//
// Il remplace les derniers `Alert.alert` du produit. Aucun d'eux n'enchaînait d'action dans
// `onPress`, donc le piège documenté dans CLAUDE.md (`window.alert()` n'invoque pas
// fiablement `onPress` sur web) ne les concernait pas : ce qui les condamne, c'est qu'ils
// ouvrent une boîte système grise, non stylée, en plein produit soigné, et qu'ils bloquent le
// fil d'exécution.
//
// **Le `role="alert"` n'est pas décoratif, il évite une régression.** Une boîte système est
// annoncée par un lecteur d'écran ; un texte qui apparaît dans la page ne l'est pas. Remplacer
// l'une par l'autre sans région vivante rendrait l'échec silencieux pour qui ne voit pas
// l'écran — moins bon qu'avant. `accessibilityLiveRegion` couvre Android,
// `role="alert"` couvre le web (react-native-web le rend en `aria-live`).
//
// Trois écrans disaient déjà l'échec ainsi, chacun avec son propre bout de JSX
// (`/connexion/email`, `/connexion/retrouver`, `/compte/suppression`) : ils passent par ce
// composant, pour qu'il n'existe qu'une façon de dire qu'une action n'a pas abouti — et un
// seul endroit à corriger le jour où elle doit changer.
export function MessageInline({
  message,
  style,
}: {
  /** `null` ne rend rien : l'appelant garde son état tel quel, sans `{message && …}`. */
  message: string | null;
  style?: StyleProp<TextStyle>;
}) {
  if (!message) return null;

  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      role="alert"
      accessibilityLiveRegion="polite"
      style={[styles.message, style]}
    >
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  // Le message se lit comme une suite de l'action, pas comme un paragraphe de plus.
  message: { lineHeight: 20 },
});
