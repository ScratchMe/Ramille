// Formatage partagé du chiffre affiché — restitution, suivi, plan et proposition de connexion
// lisent tous cette fonction. Module pur (aucun import de `@/lib/supabase`), donc testé :
// `src/lib/format.test.ts`.
//
// **Et cette pureté n'est plus une commodité locale** : `src/types/resultat.ts` importe ce
// module, alors que la ligne de partage du dépôt est `src/types/*` pur / `src/lib/*` requêtes.
// Introduire ici la moindre dépendance — le client Supabase, une API React Native — ferait
// donc tomber `resultat.test.ts` et tout ce qui en dépend, par un lien que rien n'affiche.
// Le rangement propre serait de descendre `formatTonnes` dans `src/types/` ; en attendant,
// ce fichier reste pur, sans exception.

/**
 * L'empreinte, dans l'unité qui la rend lisible : **kilos sous la tonne, dixième de tonne
 * au-dessus**.
 *
 * La fonction n'avait qu'une forme, le dixième de tonne, et tout ce qui vaut moins de 50 kg
 * s'affichait donc « 0,0 t CO₂e ». Deux endroits en faisaient un contresens, pas une
 * imprécision (A3-1, A10-3), et la bascule les corrige :
 *
 *   - la phrase du palier, qui annonçait « Le repère 2050 est à ta portée : 0,0 t CO₂e de
 *     moins sur l'année » — une marche de quelques dizaines de kilos est exactement ce qui
 *     reste à quelqu'un qui est **juste au-dessus** du repère, donc au profil le plus près
 *     d'y arriver ;
 *   - les postes secondaires de n'importe quel bilan, affichés « 0,0 t CO₂e » à côté d'une
 *     barre visible — le cas de loin le plus fréquent, et il se lit comme un bug.
 *
 * **Ce que la bascule ne corrige pas**, et qu'il ne faut pas lire ici comme réglé : au-dessus
 * de la tonne, le dixième reste la forme, donc deux bilans à 1 240 puis 1 180 kg s'affichent
 * toujours tous deux « 1,2 t » (A5-3, symptôme 1). Le remède est une décision d'écran du suivi et
 * non une forme de plus dans ce formateur, et il est posé depuis le 14/09/2026 : `variationNote`
 * dit l'écart absolu d'abord (« 60 kg de moins que ton bilan précédent (− 5 %) »), donc la note
 * corrobore ce que les deux barres ne distinguent pas. Le constat est refermé ; ce qui reste vrai
 * ici, et qu'il ne faut pas lire comme un défaut, c'est que le total lui-même garde le dixième de
 * tonne au-dessus de 1 t. C'est l'**écart** qui
 * se dit en kilos, pas le total.
 *
 * Le seuil est la tonne, et l'arrondi vient **avant** la comparaison : 999,6 kg est une
 * tonne, pas « 1000 kg ».
 *
 * `formatTonnesShort` (`@/constants/carbon-reference`) ne bascule pas, lui, et c'est
 * délibéré : il porte l'échelle de comparaison — toi, le palier, la moyenne française, le
 * repère 2050 — qui doit rester dans une seule unité pour que les barres se comparent.
 */
export function formatTonnes(kg: number): string {
  const { nombre, unite } = valeurEtUnite(kg);
  return `${nombre} ${unite} CO₂e`;
}

/**
 * La même valeur, **sans le nom du gaz** — pour une ligne qui en porte deux (C2.7).
 *
 * Deux endroits en ont besoin, et dans les deux « CO₂e » est du bruit plutôt qu'une précision :
 * « 2,1 t CO₂e → 1,7 t CO₂e » sur une ligne de l'écart par poste, et « 600 kg CO₂e de moins que ton
 * bilan de mars » dans une phrase, où le gaz s'intercale entre le nombre et ce qu'il qualifie. Le
 * nom du gaz appartient au chiffre qui se tient **seul**, c'est-à-dire à `formatTonnes` : un total,
 * un gain, un cap.
 *
 * **Ce n'est pas une troisième règle d'unité**, et c'est ce qui fait qu'elle n'entre pas en
 * concurrence avec les deux autres formateurs : même bascule que `formatTonnes` — kilos sous la
 * tonne, dixième de tonne au-dessus — par la même fonction interne, donc les deux ne peuvent pas
 * diverger. `formatTonnesShort` (`@/constants/carbon-reference`), lui, ne bascule pas : il porte
 * l'échelle de comparaison, qui reste dans une seule unité pour que les barres se comparent.
 */
export function formatTonnesNu(kg: number): string {
  const { nombre, unite } = valeurEtUnite(kg);
  return `${nombre} ${unite}`;
}

/**
 * Un nombre de kilos, avec l'espace fine des milliers (C5.8, écart 15).
 *
 * « − 1 601 kg CO₂e » et non « − 1601 kg ». Le séparateur est une **espace fine insécable**
 * (U+202F), celle que la typographie française demande entre les groupes de chiffres : une espace
 * ordinaire laisserait le nombre se couper en fin de ligne, et une espace insécable large
 * l'écarterait trop.
 *
 * **Ce formateur ne concerne pas les totaux**, et c'est pourquoi il ne touche pas aux deux jumeaux
 * d'`api/` : `formatTonnes` et ses copies basculent en tonnes dès 1 000 kg, donc leur branche en
 * kilos ne peut jamais porter de millier. Les seuls kilos à quatre chiffres du produit sont les
 * **gains** d'action et le **cap**, qui ne sortent pas de `src/`. La règle que `CLAUDE.md` énonce —
 * un formatage affiché impose de chercher son jumeau dans `api/` — a donc bien été jouée ici : elle
 * a rendu « rien à faire », ce qui n'est une réponse valable qu'une fois qu'on a regardé.
 *
 * L'entrée est arrondie avant d'être groupée : un gain vient de la base en `numeric` et peut porter
 * des décimales que l'écran n'affiche pas.
 */
export function formatKg(kg: number): string {
  return String(Math.round(kg)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/**
 * Le nombre et son unité, une fois pour les deux formes.
 *
 * Extrait plutôt que recopié, ou pire, obtenu par un `.replace` sur la sortie de l'autre : c'est le
 * seuil de bascule qui doit être unique, et lui seul décide de la forme. L'arrondi vient **avant** la
 * comparaison — 999,6 kg est une tonne, pas « 1000 kg ».
 */
function valeurEtUnite(kg: number): { nombre: string; unite: 'kg' | 't' } {
  const kilos = Math.round(kg);
  if (kilos < 1000) return { nombre: String(kilos), unite: 'kg' };
  return { nombre: (kg / 1000).toFixed(1).replace('.', ','), unite: 't' };
}
