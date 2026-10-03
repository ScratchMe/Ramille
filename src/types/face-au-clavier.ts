/**
 * Ce que fait un écran quand le clavier s'ouvre (03/10/2026, recette du build d'octobre, ligne 01.3).
 *
 * **Depuis le SDK 54, Android affiche l'app bord à bord, et la fenêtre ne rétrécit plus** sous le
 * clavier : le pied d'une étape et « Suivant » restaient dessous, masqués, alors que le navigateur, lui,
 * réduit la zone visible de lui-même — rien ne l'avait montré avant le premier build. Hors du web, un
 * écran qui porte un champ se rembourre donc de la hauteur du clavier (`padding`) ; sur le web, rien
 * — pas même une vue de plus, pour que l'export reste celui que ses gardes relisent.
 */
export function faceAuClavier(plateforme: string): 'padding' | null {
  return plateforme === 'web' ? null : 'padding';
}
