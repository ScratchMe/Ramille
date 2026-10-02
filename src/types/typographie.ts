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
 * **Et « % », et le signe d'un nombre** (30/09/2026, recette `v1-13` §18) : au suivi, « 511 kg de plus
 * que ton bilan précédent (+ 875 %). » laissait « % » seul en début de ligne à 390 px. L'espace qui
 * précède « % » ne se coupe pas non plus, ni celle qui suit un « + » ou un « − » posé devant un
 * nombre — sans elle, la même phrase aurait laissé « (+ » en fin de ligne, le signe séparé de son
 * chiffre. Un « − » ou un « + » qui n'est pas suivi d'un chiffre n'est pas touché.
 *
 * **Et un nombre ne se sépare pas de son unité** (01/10/2026, `v1-33`, Q-7). L'onboarding coupait son
 * titre sur « 9,5 tonnes en moyenne, 2 / tonnes visées en 2050 », et le questionnaire sur « les trajets
 * de plus de 300 / km ? » : un chiffre resté seul en fin de ligne se lit sans son unité, et dans un
 * titre c'est la première chose qu'on lit. L'espace entre un chiffre et `km`, `kg`, `t`, `tonne(s)`,
 * `h`, `min` ou `minute(s)` est donc insécable — et, devant « CO₂e », celle qui suit une de ces unités
 * dont le nombre est devant elle : « 1,9 t CO₂e » est une seule unité, que la ligne ne coupe pas entre
 * « t » et le nom du gaz. **L'unité doit finir là** : suivie d'une lettre, y compris accentuée, c'est un
 * mot (« 2 trajets », « 3 tours », « 5 hôtes »), et le nombre garde sa coupure — `\b` ne ferait pas
 * l'affaire, qui ne voit pas « é » ni « ô » comme des lettres. La classe des lettres exclues couvre donc
 * le latin étendu (U+00C0 à U+024F, sans « × » ni « ÷ »), tout ce que le français peut poser après
 * `t` ou `h`.
 *
 * Trois choses que la fonction ne fait pas, et c'est voulu :
 * - **elle n'ajoute aucune espace** : « Note: » reste tel quel. Corriger un texte se fait à la
 *   source, pas au rendu ;
 * - elle ne touche que l'espace ordinaire (U+0020) : une espace déjà insécable, fine ou non, est
 *   laissée comme l'a écrite qui l'a posée ;
 * - elle ne s'applique qu'à l'affichage (`ThemedText`) : les dérivations de `src/types/` rendent
 *   des chaînes à espaces ordinaires, que leurs tests comparent telles quelles, et que
 *   `api/partage.ts` recopie sans passer par ici.
 *
 * **Elle voit une chaîne, et c'est `ThemedText` qui lui donne le texte entier** (30/09/2026) : les
 * chaînes et les nombres voisins d'un même texte y sont réunis avant l'appel, sans quoi
 * `− {gain} kg` lui arrivait en trois morceaux et le signe restait sécable.
 *
 * **Sa jumelle vit dans le kit** (`docs/design/design-system/components/core/ThemedText.jsx`), qui
 * la recopie faute de pouvoir importer `src/` : toucher à ces motifs impose de la suivre.
 */
const AVANT_LA_PONCTUATION = / (?=[?!:;»%])/g;
const APRES_LE_GUILLEMET = /« /g;
// Un signe en début de texte, ou après une espace ou une parenthèse, suivi d'un chiffre : le « − »
// d'un gain, le « + » d'un écart. Le trait d'union « - » n'est pas un signe, et reste hors du motif.
const APRES_LE_SIGNE = /(^|[\s(])([+−]) (?=\d)/g;
// Un chiffre, une espace, puis une unité qui **finit là** : une lettre du latin (accentuée comprise)
// ne peut pas la suivre, sans quoi « 2 tours » ou « 3 hôtes » seraient collés. Un chiffre peut : « 2 h30 »
// est une heure. Pas de `\p{L}` ni de lookbehind : le fichier s'en tient à ce que ses trois premiers
// motifs emploient déjà sur l'appareil (un lookahead, des classes écrites), et Hermes ne s'éprouve pas
// sous Jest.
const UNITES = 'km|kg|tonnes?|min(?:utes?)?|t|h';
const LETTRE_DU_LATIN = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F';
const NOMBRE_ET_SON_UNITE = new RegExp(`(\\d) (?=(?:${UNITES})(?![${LETTRE_DU_LATIN}]))`, 'g');
// « t CO₂e » et « kg CO₂e » : l'unité de masse, déjà collée à son nombre par le motif d'avant, garde son
// nom de gaz. Elle passe en second, et lit donc le résultat du premier — ou un texte qui portait déjà
// l'insécable.
const UNITE_ET_SON_GAZ = /(\d\u00A0(?:kg|t|tonnes?)) (?=CO₂)/g;

// Écrite par son point de code, jamais collée en littéral (`FRONT.md` §1) : une U+00A0 collée ne
// se distingue pas d'une espace ordinaire à la relecture, et un éditeur ou un copier-coller la
// remplace sans que rien ne bronche.
export const ESPACE_INSECABLE = '\u00A0';

export function espacesInsecables(texte: string): string {
  return texte
    .replace(AVANT_LA_PONCTUATION, ESPACE_INSECABLE)
    .replace(APRES_LE_GUILLEMET, `«${ESPACE_INSECABLE}`)
    .replace(APRES_LE_SIGNE, `$1$2${ESPACE_INSECABLE}`)
    .replace(NOMBRE_ET_SON_UNITE, `$1${ESPACE_INSECABLE}`)
    .replace(UNITE_ET_SON_GAZ, `$1${ESPACE_INSECABLE}`);
}
