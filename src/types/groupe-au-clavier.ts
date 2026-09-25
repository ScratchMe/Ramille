/**
 * Un groupe de cases d'option au clavier : quelle option les flèches désignent, et laquelle
 * la tabulation atteint (25/09/2026, `v1-29` §6.4) — la logique pure, que
 * `src/lib/groupe-au-clavier.ts` applique aux nœuds du navigateur.
 *
 * **Le motif est celui de WAI-ARIA pour un `radiogroup`, et c'est celui d'un `<input
 * type="radio">` natif** : le groupe est **un seul** arrêt de tabulation — l'option cochée, ou la
 * première quand aucune ne l'est —, et les flèches passent d'une option à l'autre **en la
 * cochant**, du dernier au premier et inversement. Avant, chaque option était un arrêt : dix modes
 * de transport, dix tabulations pour atteindre « Suivant », et aucune flèche ne faisait rien.
 *
 * **Une option désactivée n'est ni un arrêt ni une étape des flèches** — comme une case d'option
 * native désactivée. La ligne de canal hors d'atteinte (« Rattache un compte pour l'activer. ») en
 * est une ; le groupe entier l'est le temps d'un enregistrement (`occupe`, `LigneDeCanal`).
 *
 * **Les cases à cocher n'y passent pas** : dans un `group`, chacune reste un arrêt de tabulation et
 * les flèches n'y font rien — c'est aussi le motif de WAI-ARIA, parce que cocher en passant y
 * cumulerait des choix qu'on n'a pas faits.
 */

/** Ce qu'il faut savoir d'une option pour décider — lu sur `aria-checked` et `aria-disabled`. */
export type OptionDuGroupe = { cochee: boolean; desactivee: boolean };

/** La part d'un `KeyboardEvent` dont la décision a besoin. */
export type ToucheDuGroupe = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

/**
 * Le sens où la touche déplace le choix : `1` vers l'option suivante, `-1` vers la précédente,
 * `null` quand elle ne le déplace pas.
 *
 * Bas et droite avancent, haut et gauche reculent, quelle que soit la disposition : une grille de
 * jours se parcourt dans l'ordre de lecture, comme une liste. **Une touche accompagnée d'un
 * modificateur ne compte pas** — Alt + flèche gauche est le retour arrière du navigateur, et le
 * prendre ici cocherait une option au lieu de quitter la page.
 */
export function sensDeLaTouche(touche: ToucheDuGroupe): 1 | -1 | null {
  if (touche.altKey || touche.ctrlKey || touche.metaKey || touche.shiftKey) return null;
  switch (touche.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return 1;
    case 'ArrowUp':
    case 'ArrowLeft':
      return -1;
    default:
      return null;
  }
}

/**
 * L'option que la flèche désigne depuis `courante`, en sautant les désactivées et en bouclant
 * d'un bout à l'autre ; `null` quand il n'y en a pas d'autre à atteindre.
 */
export function optionVoisine(
  options: readonly OptionDuGroupe[],
  courante: number,
  sens: 1 | -1
): number | null {
  const nombre = options.length;
  if (courante < 0 || courante >= nombre) return null;
  for (let pas = 1; pas < nombre; pas++) {
    const indice = (courante + sens * pas + nombre) % nombre;
    if (!options[indice].desactivee) return indice;
  }
  return null;
}

/**
 * Ce que le groupe fait d'une touche : rien (`retenir: false`), ou la retenir — pour que la page
 * ne défile pas — et porter le choix sur l'option `vers`, `null` quand il n'y en a pas d'autre.
 *
 * **La touche ne compte que si elle vient d'une option de CE groupe** (`courante` vaut `-1`
 * sinon). Une seule garde pour deux cas : une option d'une précision imbriquée, qui est l'affaire
 * de son propre groupe — son écouteur est passé avant celui-ci, la touche remontant de l'intérieur
 * —, et un contrôle posé dans le groupe sans en être une option, comme « Rattacher un compte » dans
 * le choix du canal, qui garde ses flèches. Elle en remplace deux : le
 * contrôle du rôle et du groupe le plus proche de la cible faisait ce que la liste des options fait
 * déjà — une mutation qui le retirait n'a rien fait tomber (25/09/2026).
 */
export function effetDeLaFleche(
  touche: ToucheDuGroupe,
  options: readonly OptionDuGroupe[],
  courante: number
): { retenir: false } | { retenir: true; vers: number | null } {
  const sens = sensDeLaTouche(touche);
  if (sens === null || courante < 0 || courante >= options.length) return { retenir: false };
  return { retenir: true, vers: optionVoisine(options, courante, sens) };
}

/**
 * L'option que la tabulation atteint : la cochée, sinon la première qu'on peut choisir ; `null`
 * quand aucune ne peut l'être. **Une cochée désactivée ne compte pas** : elle ne peut pas recevoir
 * le focus au clavier, et en faire l'arrêt retirerait le groupe entier de la tabulation.
 */
export function arretDeTabulation(options: readonly OptionDuGroupe[]): number | null {
  const cochee = options.findIndex((option) => option.cochee && !option.desactivee);
  if (cochee !== -1) return cochee;
  const premiere = options.findIndex((option) => !option.desactivee);
  return premiere === -1 ? null : premiere;
}
