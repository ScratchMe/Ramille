// Le palier de la restitution — logique pure, testée (cf. palier.test.ts).
//
// ## Ce que le palier remplace, et pourquoi
//
// La restitution mettait « Toi : 15,8 t » à côté de « Repère 2050 : 0,6 t ». Sur les treize
// bilans réels en base, l'amplitude va de 15,82 t à 0,06 t — un facteur 264 — et aucune
// formulation ne rattrape un rapport visuel de 1 à 26 affiché en grand. La spec §4 le dit :
// « l'écart à 2050 est abstrait et lointain, et le registre anxiogène tend à paralyser plutôt
// qu'à mobiliser ». La barre 2050 cède donc sa place au palier, et 2050 reste en mots.
//
// ## Pourquoi le palier est un pourcentage de soi, et pas une marche partagée
//
// Deux mécaniques ont été écartées sur ces mêmes données :
//
//   - **trajectoire linéaire jusqu'en 2050** : le pas dépend du point de départ. Elle offre
//     −0,609 t/an à celui qui émet 15,8 t et **−6 kg/an** à celui qui est déjà à 0,76 t. Elle
//     récompense le retard et rend la sobriété invisible.
//   - **marches absolues partagées** (2,8 → 2,0 → 1,4 → 1,0 → 0,6) : la première marche de
//     quelqu'un à 15,8 t reste à −82 %. On remplace un gouffre par un gouffre.
//
// Le cap de la saison, lui, est **le même effort relatif pour tout le monde** et il est déjà
// calculé, figé sur `plan_cycles` et affiché sur `/plan` : le palier n'introduit donc aucun
// nouveau chiffre à sourcer ni à tenir cohérent. Et il est atteignable par construction,
// puisque les actions du plan sont chiffrées pour y mener.

export type Palier = {
  /** Empreinte visée, en kg CO2e/an. */
  targetKg: number;
  /** Ce qu'il faut retirer pour l'atteindre. */
  reductionKg: number;
  /** Le palier fait-il passer sous le repère 2050 ? Change la phrase, pas le chiffre. */
  reachesTarget2050: boolean;
};

/**
 * Le prochain palier, ou `null` quand il ne faut pas en montrer.
 *
 * Deux cas rendent `null`, et ce sont des décisions produit, pas des cas d'erreur :
 *
 *   - **déjà sous le repère 2050.** Quatre des treize bilans en base le sont. Leur proposer
 *     −20 % reviendrait à demander toujours plus à ceux qui font déjà le plus — exactement ce
 *     que `/plan` refuse avec son état « Tu fais déjà l'essentiel sur ce poste ».
 *   - **aucun cap disponible** (pas de cycle de plan, ou cap nul) : sans cap il n'y a pas de
 *     palier atteignable à proposer, et on préfère ne rien dire qu'inventer une marche.
 */
export function nextPalier(
  totalKg: number,
  capKg: number | null | undefined,
  target2050Kg: number
): Palier | null {
  if (totalKg <= target2050Kg) return null;
  if (!capKg || capKg <= 0) return null;

  // Le cap peut dépasser ce qui sépare la personne du repère 2050 : on ne propose alors pas un
  // palier « sous 2050 », qui n'aurait pas de sens comme étape — le repère devient le palier.
  const brut = totalKg - capKg;
  const targetKg = Math.max(brut, target2050Kg);

  return {
    targetKg,
    reductionKg: totalKg - targetKg,
    reachesTarget2050: targetKg <= target2050Kg,
  };
}
