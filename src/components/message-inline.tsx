import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

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
// l'une par l'autre sans annonce rendrait l'échec silencieux pour qui ne voit pas l'écran —
// moins bon qu'avant.
//
// **Et l'annonce ne passe pas par le même chemin sur les deux plateformes** (24/09/2026, `v1-29`,
// audit d'accessibilité 4.1.3). Le composant se **monte avec son texte** : il n'existe pas tant
// qu'il n'y a rien à dire, et c'est ce qui laisse ses dix-sept appelants écrire
// `<MessageInline message={…} />` sans espace réservé ni `{message && …}`.
//   - Sur web, c'est exactement ce qu'il faut : un élément de rôle `alert` **inséré** dans la page
//     est annoncé par les navigateurs (ils émettent l'événement d'alerte à l'insertion), et un
//     texte qui change dans un élément déjà là l'est comme une région vivante. react-native-web rend
//     `role="alert"` tel quel.
//   - Sur Android, non. Une région vivante (`accessibilityLiveRegion`) annonce les changements d'un
//     nœud **déjà présent**, pas son apparition : un message qui se monte avec son texte n'était
//     donc pas annoncé à coup sûr, et la recette TalkBack du 14/09/2026 ne l'avait pas éprouvé.
//     L'annonce y est donc **demandée** (`announceForAccessibility`) au montage et à chaque
//     changement de texte — et la région vivante est retirée sur natif, sans quoi un texte qui
//     change sous un message déjà affiché serait dit deux fois.
// Un espace vivant monté en permanence aurait réglé Android autrement, mais il aurait ajouté un
// élément vide — donc un `gap` de plus — sous l'action de chacun des dix-sept écrans.
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
  useEffect(() => {
    if (!message || Platform.OS === 'web') return;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!message) return null;

  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      role="alert"
      // Web seulement : `aria-live` accompagne le rôle `alert` pour les changements de texte. Sur
      // natif, l'annonce est demandée ci-dessus, et une région vivante la doublerait.
      accessibilityLiveRegion={Platform.OS === 'web' ? 'polite' : undefined}
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
