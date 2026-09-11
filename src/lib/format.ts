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
 * toujours tous deux « 1,2 t » sous une note disant « 5 % de moins » (A5-3, symptôme 1,
 * ouvert). Le remède recommandé par l'audit — « 1,2 t · −60 kg depuis mars » — est une
 * décision d'écran du suivi, pas une forme de plus dans ce formateur : c'est l'**écart** qui
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
  const kilos = Math.round(kg);
  if (kilos < 1000) return `${kilos} kg CO₂e`;
  return `${(kg / 1000).toFixed(1).replace('.', ',')} t CO₂e`;
}
