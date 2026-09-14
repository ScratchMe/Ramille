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
// ## Pourquoi le palier est adossé au cap de la saison
//
// Deux mécaniques ont été écartées sur ces mêmes données :
//
//   - **trajectoire linéaire jusqu'en 2050** : le pas dépend du point de départ. Elle offre
//     −0,609 t/an à celui qui émet 15,8 t et **−6 kg/an** à celui qui est déjà à 0,76 t. Elle
//     récompense le retard et rend la sobriété invisible.
//   - **marches absolues partagées** (2,8 → 2,0 → 1,4 → 1,0 → 0,6) : la première marche de
//     quelqu'un à 15,8 t reste à −82 %. On remplace un gouffre par un gouffre.
//
// Le cap de la saison, lui, est déjà calculé, figé sur `plan_cycles` et affiché sur `/plan` : le
// palier n'introduit donc aucun nouveau chiffre à sourcer ni à tenir cohérent, et il est
// atteignable par construction, puisque les actions du plan sont chiffrées pour y mener.
//
// ## Ce que ce cap est vraiment, et ce qu'il n'est pas (C3.11, constat A3-2)
//
// **Ce n'est pas « le même effort relatif pour tout le monde », et ce fichier l'a affirmé
// pendant deux increments.** Le cap vaut 20 % de `plan_cycles.baseline_co2_kg_year`, qui est le
// **poste dominant** — décision `v1-07` §3.3, prise pour le plan, parce que c'est le poste que
// les actions savent atteindre. Rapporté au **total**, que la restitution affiche, le même cap
// vaut donc :
//
//   - **−18 %** pour qui a un poste dominant à 90 % de son empreinte ;
//   - **−6,8 %** pour qui est à 34 %.
//
// C'est-à-dire exactement la propriété pour laquelle la trajectoire linéaire avait été écartée
// deux paragraphes plus haut, et dans le même sens : elle pénalise les profils diversifiés. Le
// commentaire d'origine décrivait une mécanique qui n'a jamais été celle du code, et le test qui
// la « prouvait » fabriquait un cap égal à 20 % du **total** — donc il éprouvait la phrase, pas
// la fonction.
//
// **Arbitrage retenu le 14/09/2026 : on garde le cap du poste dominant, et on le dit.** Normaliser
// sur le total donnerait un palier que le plan ne sait pas atteindre — les actions vivent sur un
// poste, pas sur l'empreinte entière —, donc une marche annoncée puis démentie par l'écran
// suivant. Ce qui change est la **phrase** : `palierNote` nomme désormais le poste (« une marche
// à 800 kg de moins sur l'année **sur ton trajet domicile-travail** »), ce qui la rend à la fois
// vraie et plus facile. Une marche non située se lit comme une exigence sur tout.
//
// `nextPalier` n'a donc pas bougé : elle reçoit le cap et le retranche du total. Ce fichier ne
// connaît pas le poste, et ne doit pas — c'est la copie qui le nomme, là où elle s'écrit.

export type Palier = {
  /** Empreinte visée, en kg CO2e/an. */
  targetKg: number;
  /** Ce qu'il faut retirer pour l'atteindre. */
  reductionKg: number;
  /**
   * Le palier tombe sur le repère 2050 : ce n'est plus une étape, c'est l'objectif final.
   * L'écran l'annonce alors comme le repère et non comme « ton prochain palier » — l'appeler
   * une marche sous-vendrait ce que c'est.
   */
  isTarget2050: boolean;
  /**
   * La personne est **déjà** sous le repère, et le palier va au-delà. Ce n'est plus un dû mais
   * une marge offerte : ce qu'elle n'émet pas laisse de la place ailleurs, pour d'autres postes
   * de son empreinte ou pour ceux dont la mobilité est contrainte. La phrase change
   * complètement de registre — proposition, jamais exigence.
   */
  beyondTarget2050: boolean;
};

/**
 * Le prochain palier, ou `null` quand il n'y a rien à proposer.
 *
 * Un seul cas rend `null` : **aucun cap disponible** (pas de cycle de plan, ou cap nul). Sans
 * cap il n'existe pas de marche atteignable à proposer, et on préfère ne rien dire qu'en
 * inventer une. C'est notamment le cas du profil que `/plan` accueille par « Tu fais déjà
 * l'essentiel sur ce poste » : aucune action ne gagne assez pour valoir la peine.
 *
 * Être déjà sous le repère 2050 ne rend **pas** `null` — décision produit du 05/09/2026. Ce
 * qu'on n'émet pas laisse de la marge ailleurs, et le proposer à quelqu'un qui est déjà sobre
 * n'est pas lui en demander plus : c'est reconnaître que sa marge profite à d'autres. Le
 * drapeau `beyondTarget2050` fait basculer la phrase dans ce registre.
 */
export function nextPalier(
  totalKg: number,
  capKg: number | null | undefined,
  target2050Kg: number
): Palier | null {
  if (!capKg || capKg <= 0) return null;

  // Déjà sous le repère : la marche continue, bornée à zéro — on ne propose pas une empreinte
  // négative, qui n'aurait aucun sens pour un total de déplacements.
  if (totalKg <= target2050Kg) {
    const targetKg = Math.max(totalKg - capKg, 0);
    if (targetKg >= totalKg) return null;
    return {
      targetKg,
      reductionKg: totalKg - targetKg,
      isTarget2050: false,
      beyondTarget2050: true,
    };
  }

  // Le cap peut dépasser ce qui sépare la personne du repère : le palier s'y arrête, et devient
  // alors l'objectif final plutôt qu'une étape de plus.
  const brut = totalKg - capKg;
  const targetKg = Math.max(brut, target2050Kg);

  return {
    targetKg,
    reductionKg: totalKg - targetKg,
    isTarget2050: targetKg <= target2050Kg,
    beyondTarget2050: false,
  };
}

/**
 * Faut-il aussi montrer le repère 2050 ?
 *
 * **Oui dès qu'on est sous la moyenne française.** Le repère n'a pas le même sens des deux
 * côtés de cette ligne, et c'est ce qui justifie de le traiter différemment :
 *
 *   - **au-dessus**, l'écart est un gouffre — 15,8 t contre 0,6 t, un rapport de 1 à 26 que
 *     rien ne rattrape. Le montrer décourage, et c'est exactement ce que la spec §4 demande
 *     d'éviter. Seul le palier a du sens là.
 *   - **en dessous**, l'écart tombe à un facteur 2 à 4. Il redevient un horizon crédible pour
 *     quelqu'un qui a déjà fait du chemin, et le masquer reviendrait à priver de sa cible
 *     celui qui est le plus près de l'atteindre.
 *
 * Le palier reste affiché dans les deux cas : c'est la marche actionnable, et la retirer
 * l'enlèverait précisément à ceux qui sont le mieux placés pour la franchir.
 */
export function showsTarget2050(totalKg: number, franceAverageKg: number): boolean {
  return totalKg <= franceAverageKg;
}

/**
 * Le palier que la personne visait au bilan précédent est-il derrière elle ? (C2.7, point 2.)
 *
 * La restitution d'un re-bilan pouvait dire l'écart sans jamais dire ce que cet écart avait
 * franchi. C'est la seule phrase du produit qui ferme la boucle du plan : le palier a été annoncé
 * une saison plus tôt, et il est passé.
 *
 * **`capAlorsKg` est le cap qui était en vigueur alors, et il n'est pas toujours connaissable.**
 * `generate_plan_cycle_for_user` **réécrit** le cycle courant à chaque re-bilan : quand les deux
 * bilans tombent dans la même période, la ligne ne porte plus le cap qui avait été affiché, et
 * l'ancien n'est nulle part. Utiliser le cap d'aujourd'hui serait une sur-affirmation — la baseline
 * du poste dominant a baissé, donc le cap aussi, donc le palier recalculé serait plus près du total
 * précédent et la phrase s'afficherait plus souvent qu'elle ne le devrait. On passe `null` dans ce
 * cas, et la phrase ne s'affiche pas : elle n'est dite que quand elle est prouvable.
 *
 * **Jamais un décompte de paliers restants**, ici comme ailleurs : on dit qu'un seuil est passé, pas
 * combien il en reste.
 */
export function palierEstDerriere(params: {
  precedentKg: number;
  courantKg: number;
  capAlorsKg: number | null;
  target2050Kg: number;
}): boolean {
  const vise = nextPalier(params.precedentKg, params.capAlorsKg, params.target2050Kg);
  if (!vise) return false;
  return params.courantKg <= vise.targetKg;
}
