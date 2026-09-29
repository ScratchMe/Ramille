/**
 * Ce que le « Suivant » en attente fait voir, sorti de l'écran pour être éprouvé (29/09/2026, `v1-31`).
 *
 * Au toucher du « Suivant » d'une étape incomplète — ou de la ligne « Il manque encore … » qui apparaît
 * alors —, `StepShell` **mène** à ce qui manque : le focus s'y pose, l'écran y défile s'il le faut,
 * l'intitulé passe en vert. Ce module décide des deux choses que l'écran ne doit pas trancher en
 * ternaire : sur quelle option d'un groupe le focus se pose, et de combien défiler.
 *
 * Logique pure : il ne lit ni la préférence du système ni les mesures, on les lui passe.
 */

/**
 * L'option d'un groupe qui reçoit le focus quand on mène à lui : **la cochée, ou la première**. C'est
 * l'arrêt de tabulation du groupe au clavier (`groupe-au-clavier.ts`), et c'est d'elle que le lecteur
 * d'écran annonce le groupe, par sa question.
 *
 * Rend un indice dans la liste des états « cochée » des options, dans l'ordre de l'écran — `0` pour
 * une liste vide, qui n'a de toute façon aucune option à qui le donner.
 */
export function optionCible(cochees: readonly boolean[]): number {
  const cochee = cochees.indexOf(true);
  return cochee === -1 ? 0 : cochee;
}
