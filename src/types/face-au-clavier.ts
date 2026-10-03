/**
 * Ce que fait un écran quand le clavier s'ouvre (03/10/2026, recette du build d'octobre, ligne 01.3).
 *
 * **Depuis le SDK 54, Android affiche l'app bord à bord, et l'app ne rétrécit plus** sous le clavier :
 * le pied d'une étape et « Suivant » restaient dessous, masqués — rien ne l'avait montré avant un build,
 * les recettes web se jouant sur un navigateur de bureau, sans clavier à l'écran. Hors du web, un écran
 * qui porte un champ se rembourre donc de la hauteur du clavier (`padding`). Sur le web, rien — pas
 * même une vue de plus, pour que l'export reste celui que ses gardes relisent. **Ce que fait un
 * navigateur de téléphone n'est pas mesuré** : Chrome sur Android ne réduit par défaut que la zone
 * visible, pas la mise en page, et le pied collant y tombe probablement sous le clavier lui aussi
 * (`v1-27` §12.33).
 */
export function faceAuClavier(plateforme: string): 'padding' | null {
  return plateforme === 'web' ? null : 'padding';
}
