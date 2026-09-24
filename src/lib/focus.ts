import { AccessibilityInfo, Platform, type HostInstance } from 'react-native';

/**
 * Déplacer le focus sur ce qui vient d'arriver à l'écran — celui du clavier sur web, celui du
 * lecteur d'écran sur natif (24/09/2026, `v1-29`).
 *
 * **Ce qui se passe sans lui.** Un geste qui remplace ce qu'on voit laisse le focus sur le bouton
 * qu'on vient d'actionner ; si ce bouton sort de l'arbre ou devient inerte, le focus retombe sur
 * le document. Au clavier, la tabulation repart du haut de la page ; au lecteur d'écran, rien de ce
 * qui vient d'apparaître n'est annoncé. Mesuré sur l'export le 24/09/2026 : dans l'onboarding,
 * après « Découvrir mon impact » pressé au clavier, `document.activeElement` était `<body>`.
 *
 * **Deux mécanismes, un par plateforme :**
 * - sur web, `focus()` du nœud DOM, qui doit être focalisable — c'est ce que
 *   `FOCALISABLE_PAR_PROGRAMME` lui donne. `preventScroll` laisse le défilement à qui l'a lancé :
 *   sans lui, le navigateur ramène le nœud à l'écran d'un saut, au milieu d'un défilement animé qui
 *   fait déjà ce travail ;
 * - sur natif, `sendAccessibilityEvent(…, 'focus')`, la voie que React Native désigne depuis qu'il
 *   a déprécié `setAccessibilityFocus` (commentaire de `AccessibilityInfo.js`) : elle prend le
 *   nœud lui-même et passe par le moteur de rendu, là où l'ancienne prend un numéro de nœud.
 *
 * Le modèle est `StepShell`, qui fait suivre le focus d'étape en étape dans le questionnaire depuis
 * C1.9 — avec l'ancienne voie, qu'il n'appartenait pas à ce chantier de reprendre. **Ce qui n'est
 * vérifié nulle part ici, c'est la moitié native** : aucune suite ne tourne sous TalkBack, elle
 * reste à éprouver sur appareil.
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
