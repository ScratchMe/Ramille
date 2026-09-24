import { AccessibilityInfo, findNodeHandle, Platform, type View } from 'react-native';

/**
 * Porte le focus sur un élément qui vient d'apparaître : celui du clavier et du lecteur d'écran sur
 * web, celui du lecteur d'écran sur natif (24/09/2026, `v1-29`, audit d'accessibilité 4.1.3).
 *
 * **Le mécanisme est celui de `StepShell`**, qui fait suivre le focus d'une étape du questionnaire à
 * la suivante, sorti ici quand deux écrans de plus en ont eu besoin : un écran qui en **remplace** un
 * autre sous le doigt — « C'est envoyé, merci. » après « Envoyer », le calcul du bilan après « Voir
 * mon bilan » — faisait disparaître le bouton pressé, et le focus avec lui. Un lecteur d'écran ne
 * disait rien de ce qui venait d'arriver, et reprenait sa lecture on ne sait où.
 *
 * Sur web, la cible porte `tabIndex={-1}` : focalisable par programme, absente de l'ordre de
 * tabulation. Sur natif, elle doit être un nœud d'accessibilité (`accessible`) : un conteneur nu
 * n'en est pas un pour TalkBack, et React Native peut même l'aplatir hors de l'arbre natif — le
 * focus demandé n'aurait alors aucun effet, sans erreur.
 */
export function porterLeFocus(cible: View | null): void {
  if (!cible) return;
  if (Platform.OS === 'web') {
    (cible as unknown as { focus?: () => void }).focus?.();
    return;
  }
  const handle = findNodeHandle(cible);
  if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
}
