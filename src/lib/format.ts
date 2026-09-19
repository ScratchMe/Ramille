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
 * « − 1 601 kg CO₂e » et non « − 1601 kg ». Le séparateur est l'**espace insécable** U+00A0, et
 * ce choix vient d'une mesure, pas d'un raisonnement.
 *
 * **La première version posait U+202F**, l'espace fine insécable, sur l'argument qu'une espace
 * insécable ordinaire « écarterait trop ». L'argument est juste en général et **faux pour la police
 * du produit** : relevé sur `SplineSans_500Medium.ttf` avec opentype.js, à 2000 unités par
 * cadratin, U+202F y vaut **71 unités** — 0,6 px à 17, un demi-pixel — tandis que U+00A0 en vaut
 * **357**, c'est-à-dire **1/6 de cadratin** (333), exactement la valeur que la typographie française
 * demande pour un séparateur de milliers. « 1 601 » se lisait donc « 1601 » à l'écran, et la recette
 * du 18/09/2026 l'a vu (constat 05.3, `v1-13` §14.5).
 *
 * L'insécabilité, qui est la raison pour laquelle U+202F avait été préféré à U+2009, est conservée :
 * U+00A0 ne permet pas au nombre de se couper en fin de ligne.
 *
 * **La règle qui en sort vaut au-delà de ce cas** : un caractère de mise en forme n'est pas un choix
 * typographique tant qu'on n'a pas relevé sa chasse dans la police du produit (`FRONT.md`).
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
  return grouperLesMilliers(String(Math.round(kg)));
}

/**
 * Le groupement des milliers d'une partie entière, **une fois pour tout le produit**.
 *
 * **Il était écrit quatre fois** — ici, dans l'équivalence en vols de `src/types/resultat.ts`, dans
 * la distance de l'étape « Vols » et dans le bloc « Comment ce chiffre est calculé ». Quatre copies
 * du même `replace`, avec le même séparateur, donc quatre endroits à corriger le jour où il s'avère
 * invisible — ce qui est arrivé le 18/09/2026. C'est le cas d'école de `FRONT.md` §1.6 : un chiffre
 * vit à un seul endroit, **et sa forme aussi**.
 *
 * **Écrit à la main plutôt que par `toLocaleString('fr-FR')`**, et ce n'est pas un choix de style :
 * Hermes peut être construit sans ICU complet et rendrait alors « 1,500 » — une virgule décimale au
 * milieu d'une distance. Invisible en CI, visible sur l'appareil. Même raison que `MOIS_FRANCAIS`.
 *
 * L'entrée est la partie entière **déjà en chaîne** : un appelant qui porte des décimales les
 * recolle lui-même, parce que le séparateur décimal n'est pas le même sujet que celui des milliers.
 */
export function grouperLesMilliers(entier: string): string {
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
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
