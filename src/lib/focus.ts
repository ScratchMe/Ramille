import { AccessibilityInfo, Platform, type HostInstance } from 'react-native';

/**
 * Donne le focus à un élément qui vient d'apparaître : celui du clavier et du lecteur d'écran sur
 * web, celui du lecteur d'écran sur natif (24/09/2026, `v1-29`, audit d'accessibilité 4.1.3).
 *
 * **Le mécanisme est celui de `StepShell`**, qui fait suivre le focus d'une étape du questionnaire à
 * la suivante, sorti ici quand deux écrans de plus en ont eu besoin : un écran qui en **remplace** un
 * autre sous le doigt — « C'est envoyé, merci. » après « Envoyer », le calcul du bilan après « Voir
 * mon bilan » — faisait disparaître le bouton pressé, et le focus avec lui. Un lecteur d'écran ne
 * disait rien de ce qui venait d'arriver, et reprenait sa lecture on ne sait où.
 *
 * **Sur web**, la cible porte `tabIndex={-1}` : focalisable par programme, absente de l'ordre de
 * tabulation. Le focus se pose avec `preventScroll` : le défilement n'est pas son affaire. Sans lui,
 * le navigateur ne défilait que quand la cible était entièrement hors de l'écran — d'où une nouvelle
 * étape du questionnaire ouverte au décalage de la précédente, titre caché, que `StepShell` règle
 * désormais lui-même en remontant sa `ScrollView` (mesuré le 24/09/2026 à 360 × 440).
 *
 * **Sur natif**, `sendAccessibilityEvent(…, 'focus')` : c'est la voie que React Native désigne
 * depuis qu'il a déprécié `setAccessibilityFocus` (commentaire de `AccessibilityInfo.js`), et elle
 * prend le nœud lui-même plutôt qu'un numéro. Le chemin sûr est que ce nœud soit un nœud
 * d'accessibilité (`accessible`), ce que fait `TitreDArrivee` : un conteneur sans aucune propriété
 * d'accessibilité peut être aplati par React Native hors de l'arbre natif, et le focus demandé ne
 * trouverait alors rien, sans erreur. Le conteneur de `StepShell` n'en porte pas ; le passage
 * TalkBack du 14/09/2026, qui cherchait ce déplacement d'étape en étape, n'a rien relevé (`v1-13`
 * §11.1), mais rien n'a démêlé ici s'il y réussit ou si c'est l'écran qui change qui se fait
 * entendre. **Cette moitié native n'est vérifiée par aucune suite** : elle est à rejouer sous TalkBack.
 */
export function donnerLeFocus(cible: unknown): void {
  if (cible === null || cible === undefined) return;
  if (Platform.OS === 'web') {
    (cible as { focus?: (options?: { preventScroll?: boolean }) => void }).focus?.({ preventScroll: true });
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(cible as HostInstance, 'focus');
}
