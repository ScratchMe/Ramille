import { AccessibilityInfo, Platform, type HostInstance } from 'react-native';

/**
 * Déplacer le focus sur ce qui vient d'arriver à l'écran — celui du clavier sur web, celui du
 * lecteur d'écran sur natif (24/09/2026, `v1-29`, audit d'accessibilité 4.1.3).
 *
 * **Ce qui se passe sans lui.** Un geste qui remplace ce qu'on voit laisse le focus sur le bouton
 * qu'on vient d'actionner ; si ce bouton sort de l'arbre ou devient inerte, le focus retombe sur
 * le document. Au clavier, la tabulation repart du haut de la page ; au lecteur d'écran, rien de ce
 * qui vient d'apparaître n'est annoncé. Mesuré sur l'export le 24/09/2026 : dans l'onboarding,
 * après « Découvrir mon impact » pressé au clavier, `document.activeElement` était `<body>`. Même
 * chose pour un écran qui en **remplace** un autre sous le doigt — « C'est envoyé, merci. » après
 * « Envoyer », le calcul du bilan après « Voir mon bilan ».
 *
 * **Deux mécanismes, un par plateforme :**
 * - sur web, `focus()` du nœud DOM, qui doit être focalisable — c'est ce que
 *   `FOCALISABLE_PAR_PROGRAMME` lui donne. `preventScroll` laisse le défilement à qui l'a lancé :
 *   sans lui, le navigateur ramène le nœud à l'écran d'un saut, au milieu d'un défilement animé qui
 *   fait déjà ce travail — ou ne défile que si la cible est entièrement hors de l'écran, d'où une
 *   étape du questionnaire ouverte au décalage de la précédente, que `StepShell` règle désormais
 *   lui-même en remontant sa `ScrollView` (mesuré le 24/09/2026 à 360 × 440) ;
 * - sur natif, `sendAccessibilityEvent(…, 'focus')`, la voie que React Native désigne depuis qu'il
 *   a déprécié `setAccessibilityFocus` (commentaire de `AccessibilityInfo.js`) : elle prend le
 *   nœud lui-même et passe par le moteur de rendu, là où l'ancienne prend un numéro de nœud.
 *
 * **Le chemin sûr, sur natif, est que la cible soit un nœud d'accessibilité** (`accessible`), ce que
 * fait `TitreDArrivee` : un conteneur sans aucune propriété d'accessibilité peut être aplati par
 * React Native hors de l'arbre natif, et le focus demandé ne trouverait alors rien, sans erreur.
 *
 * Trois chantiers du même soir en ont eu besoin — l'onboarding, les écrans remplacés, et
 * `StepShell`, qui faisait suivre le focus d'étape en étape depuis C1.9 par l'ancienne voie et passe
 * désormais par celle-ci : la fonction a été écrite deux fois en parallèle, au même corps près, et
 * n'en fait plus qu'une. **Ce qui n'est vérifié nulle part ici, c'est la moitié native** : aucune
 * suite ne tourne sous TalkBack, elle reste à éprouver sur appareil (`v1-29` §6.5).
 */
export function donnerLeFocus(cible: unknown): void {
  if (cible === null || cible === undefined) return;
  if (Platform.OS === 'web') {
    (cible as { focus?: (options?: { preventScroll?: boolean }) => void }).focus?.({
      preventScroll: true,
    });
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(cible as HostInstance, 'focus');
}

/**
 * Ce qu'un titre décompose pour pouvoir recevoir le focus : la référence que `donnerLeFocus`
 * lira, et `FOCALISABLE_PAR_PROGRAMME`. Un objet à décomposer (`{...titre}`) et non deux props,
 * parce que `ThemedText` ne déclare ni `ref` ni `tabIndex` : il les transmet tels quels à son
 * `Text`, qui les connaît. Même recours que pour `inert` dans le pager de l'onboarding.
 *
 * L'objet se construit **dans le JSX** (`{ ref, ...FOCALISABLE_PAR_PROGRAMME }`) et non par une
 * fonction qui recevrait la référence : le compilateur React refuse qu'une référence passe par un
 * appel de fonction pendant le rendu (`react-hooks/refs`), faute de pouvoir savoir si elle y est
 * lue.
 */
export type TitreFocalisable = Record<string, unknown>;

/**
 * Sur web, un titre n'est pas focalisable : `tabIndex` à -1 le rend focalisable **par programme**
 * sans l'insérer dans la tabulation. Sur natif, rien à poser — un texte est déjà un élément que le
 * lecteur d'écran sait atteindre.
 */
export const FOCALISABLE_PAR_PROGRAMME: TitreFocalisable =
  Platform.OS === 'web' ? { tabIndex: -1 } : {};
