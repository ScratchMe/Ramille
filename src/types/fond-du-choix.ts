/**
 * Le fond d'un choix — puce, rangée, item de mode, ligne de canal —, au repos et sous le doigt.
 * Module pur, lu par `Chip`, `ChoiceRow`, `ModeListItem` et `LigneDeCanal` (25/09/2026).
 *
 * **Les quatre écrivaient le même ternaire à deux étages**, chacun dans son ordre : `Chip` en deux
 * constantes (le repos, puis l'appui), les trois autres imbriqué dans leur `style`. Trois règles y
 * étaient recopiées quatre fois, et c'est à la quatrième copie qu'on en oublie une :
 *
 * - **un choix coché** est sur l'accent quand il est plein (`solid` de `Chip`), sur la teinte
 *   choisie sinon ;
 * - **un choix libre** est sur le fond des éléments — ou sur celui de la page quand il est posé
 *   dans un encart déjà teinté (`nestedBackground`), sans quoi il s'y fond et se lit comme du texte ;
 * - **sous le doigt, chaque surface a sa teinte appuyée** (décision n° 6 du 24/09/2026, `v1-29`) :
 *   `accentPressed` sous l'accent, `backgroundSelectedPressed` sous la teinte choisie,
 *   `backgroundPressed` ailleurs — **dans un encart comme hors d'un encart**, parce qu'elle tranche
 *   sur les deux fonds (le commentaire de `ModeListItem` le disait déjà).
 *
 * **Une option désactivée n'a pas de branche ici, et c'est voulu** : `Pressable` ne passe jamais à
 * `pressed` quand il est désactivé, et ce qui paraît coché se décide avant (`paraitChoisie`,
 * `src/types/ligne-de-canal.ts`) — une option désactivée n'est donc jamais qu'un choix libre au
 * repos, sur le fond des éléments, ce que le kit demande (`readme.md`, puce « États »).
 *
 * La dérivation rend le **nom** d'un jeton et non une couleur : ce module ne tire pas le thème, qui
 * importe la plateforme, et chaque appelant lit `theme[…]` — un nom qui ne serait pas une couleur du
 * thème n'y compilerait pas.
 */
export type FondDuChoix =
  | 'accent'
  | 'accentPressed'
  | 'backgroundSelected'
  | 'backgroundSelectedPressed'
  | 'backgroundElement'
  | 'background'
  | 'backgroundPressed';

export function fondDuChoix({
  choisi,
  appuye,
  plein = false,
  imbrique = false,
}: {
  /** Ce qui **paraît** coché — pour une ligne de canal, `paraitChoisie` et non la préférence. */
  choisi: boolean;
  /** Le `pressed` que `Pressable` passe à son `style`. */
  appuye: boolean;
  /** Le choix coché est plein, sur l'accent (`selectedStyle: 'solid'` de `Chip`). */
  plein?: boolean;
  /** Le choix est posé dans un encart teinté (`nestedBackground`). */
  imbrique?: boolean;
}): FondDuChoix {
  if (choisi) {
    if (plein) return appuye ? 'accentPressed' : 'accent';
    return appuye ? 'backgroundSelectedPressed' : 'backgroundSelected';
  }
  if (appuye) return 'backgroundPressed';
  return imbrique ? 'background' : 'backgroundElement';
}
