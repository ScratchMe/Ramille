import { defilementPourMontrer } from '@/types/mouvement';

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

/** Ce qu'un défilement garde au-dessus du pied : la cible s'arrête 16 px au-dessus de lui. */
export const MARGE_AU_DESSUS_DU_PIED = 16;
/** Ce qu'il garde sous l'en-tête pour une cible plus haute que la zone, qui s'aligne en haut. */
export const MARGE_SOUS_L_EN_TETE = 24;
/** Ce qu'une ouverture garde au-dessus du choix qui l'a déclenchée, au bord supérieur de la zone. */
export const MARGE_DU_CHOIX = 8;

/**
 * **Le minimum à défiler pour montrer une cible dans la zone qui défile** (29/09/2026, `v1-31` §4.7) —
 * entre l'en-tête et le pied de `StepShell`. Deux usages, et ils ne défilent pas de la même façon :
 *
 * - **vers ce qui manque**, au toucher du « Suivant » en attente ou de la ligne : une cible déjà
 *   entière dans la zone ne fait rien défiler ; une cible sous le pied remonte juste assez pour
 *   s'arrêter 16 au-dessus de lui ; une cible au-dessus de la zone redescend jusqu'à 24 sous l'en-tête,
 *   et une cible plus haute que la zone s'aligne là, en haut — on voit la question et le début de ses
 *   réponses ;
 * - **à l'ouverture** (`ouverture`) d'une précision, de « Lequel ? » ou de la distance d'une sortie :
 *   `haut` est alors le haut **du choix qui l'a déclenchée**, et `bas` le bas de ce qui s'ouvre. La
 *   zone ne défile que si l'ouverture passerait sous le pied, juste assez pour qu'elle s'arrête 16
 *   au-dessus, et **jamais au point de faire passer le choix au-dessus du bord** : la borne, 8 px sous
 *   le bord, gagne sur la marge du bas. Elle ne fait jamais remonter la page.
 *
 * Les positions sont celles du **contenu** qui défile (0 en haut du contenu), `decalage` le défilement
 * courant, `hauteurZone` la hauteur visible. Rend le nouveau décalage, ou `null` quand il n'y a rien à
 * défiler. La moitié « vers le bas » est celle de `defilementPourMontrer` (`v1-32`), réutilisée plutôt
 * que réécrite : deux jumelles divergeraient à la première retouche.
 */
export function decalagePourMontrer({
  decalage,
  hauteurZone,
  haut,
  bas,
  ouverture = false,
}: {
  decalage: number;
  hauteurZone: number;
  haut: number;
  bas: number;
  ouverture?: boolean;
}): number | null {
  const hautVisible = haut - decalage;
  const basVisible = bas - decalage;
  // Au-dessus de la zone, ou plus haute qu'elle et débordant des deux côtés : la demande redescend
  // jusqu'à aligner le haut. Une ouverture, jamais.
  if (!ouverture && hautVisible < 0) return Math.max(0, haut - MARGE_SOUS_L_EN_TETE);
  // Le bas dans la zone — la cible y est entière, ou déborde en haut pour une ouverture : rien.
  if (basVisible <= hauteurZone) return null;
  const aDefiler = defilementPourMontrer({
    haut: hautVisible,
    bas: basVisible,
    hauteurFenetre: hauteurZone,
    marge: MARGE_AU_DESSUS_DU_PIED,
    margeHaut: ouverture ? MARGE_DU_CHOIX : MARGE_SOUS_L_EN_TETE,
  });
  return aDefiler > 0 ? decalage + aDefiler : null;
}
