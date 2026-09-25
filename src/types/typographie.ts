/**
 * Les espaces que la typographie française veut insécables, posés au moment d'afficher
 * (24/09/2026, `v1-29` §3).
 *
 * Une question de l'app se terminait par « ? » seul en début de ligne dès que la phrase
 * remplissait la largeur — la carte du point de la semaine, la plus lue du produit, le faisait
 * sur un téléphone ordinaire. La règle est celle de l'imprimerie française : l'espace qui précède
 * `?`, `!`, `:` et `;`, et celles qui bordent l'intérieur des guillemets, ne se coupent pas.
 *
 * **U+00A0 et non l'espace fine U+202F**, qui serait la forme savante devant `?`, `!` et `;` :
 * dans Spline Sans elle mesure 71 unités sur 1 000, un quatorzième de cadratin, et le signe paraît
 * collé au mot. U+00A0 en mesure 357, l'espace ordinaire de la police : la phrase garde l'allure
 * qu'elle avait, seule la coupure disparaît.
 *
 * Trois choses que la fonction ne fait pas, et c'est voulu :
 * - **elle n'ajoute aucune espace** : « Note: » reste tel quel. Corriger un texte se fait à la
 *   source, pas au rendu ;
 * - elle ne touche que l'espace ordinaire (U+0020) : une espace déjà insécable, fine ou non, est
 *   laissée comme l'a écrite qui l'a posée ;
 * - elle ne s'applique qu'à l'affichage (`ThemedText`) : les dérivations de `src/types/` rendent
 *   des chaînes à espaces ordinaires, que leurs tests comparent telles quelles, et que
 *   `api/partage.ts` recopie sans passer par ici.
 */
const AVANT_LA_PONCTUATION = / (?=[?!:;»])/g;
const APRES_LE_GUILLEMET = /« /g;

// Écrite par son point de code, jamais collée en littéral (`FRONT.md` §1) : une U+00A0 collée ne
// se distingue pas d'une espace ordinaire à la relecture, et un éditeur ou un copier-coller la
// remplace sans que rien ne bronche.
export const ESPACE_INSECABLE = '\u00A0';

export function espacesInsecables(texte: string): string {
  return texte
    .replace(AVANT_LA_PONCTUATION, ESPACE_INSECABLE)
    .replace(APRES_LE_GUILLEMET, `«${ESPACE_INSECABLE}`);
}
