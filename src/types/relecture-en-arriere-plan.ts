/**
 * Une lecture qu'on reprend **sans le dire**, parce que rien n'attend après elle — `v1-33` §9, 02/10/2026.
 *
 * Module **pur** au sens de `src/types` : l'attente est injectée, et le défaut (`setTimeout`) est la seule
 * chose qu'il connaisse du monde.
 *
 * ## Le défaut
 *
 * Depuis le 01/10/2026, les lectures ne sont plus rejouées par le client (`retry: false`,
 * `src/lib/supabase.ts`, `v1-33` R-5) : un échec réseau se dit tout de suite, parce que les écrans portent
 * leur reprise — l'écran d'erreur son « Réessayer », la ligne de relecture le sien. **Deux lectures n'en
 * ont aucune**, à l'entrée d'un re-bilan : le préremplissage (les réponses du dernier bilan) et
 * l'engagement en cours (la feuille « Ton plan va être recalculé »). Un raté réseau d'une seconde y
 * donnait un questionnaire vide, sans bandeau ni feuille — rien de faux n'était dit, mais neuf étapes
 * étaient à refaire.
 *
 * ## Pourquoi une reprise silencieuse, et pas un bandeau
 *
 * Le rejeu retiré coûtait sept secondes **muettes devant un écran qui attendait** ; ici, l'écran
 * n'attend rien. Le questionnaire est affiché et utilisable avant ces deux lectures, et elles ne font que
 * l'affiner : les reprendre en arrière-plan ne retarde personne. C'est exactement ce que le rejeu
 * absorbait — le raté d'une seconde —, rendu aux deux seules lectures qui n'ont pas d'autre reprise. Un
 * bandeau aurait demandé une phrase de plus, pour un cas que la reprise ferme presque toujours.
 *
 * **Ce qui ne change pas** : une panne qui dure finit comme avant, questionnaire vide et sans feuille.
 * Et une réponse donnée pendant la reprise n'est jamais écrasée par un préremplissage tardif — c'est
 * l'écran qui le garde (`reponseModifiee`, `src/app/bilan/index.tsx`).
 */

/** Deux reprises, une seconde puis deux secondes et demie plus tard — l'échelle du raté qu'on vise. */
export const DELAIS_DE_RELECTURE: readonly number[] = [1000, 2500];

type Options = {
  /** Attendre `ms` millisecondes. Injecté dans les tests. */
  attendre?: (ms: number) => Promise<void>;
  /** L'écran a été quitté : on n'attend ni ne relit plus. */
  annule?: () => boolean;
  delais?: readonly number[];
};

const attendreVraiment = (ms: number) => new Promise<void>((rendre) => setTimeout(rendre, ms));

/**
 * Lit, puis relit après chaque délai tant que `aReprendre` le demande — et rend le dernier résultat.
 * `lire` ne doit pas lever : l'appelant range une exception du côté « à reprendre ».
 */
export async function relireEnArrierePlan<T>(
  lire: () => Promise<T>,
  aReprendre: (resultat: T) => boolean,
  { attendre = attendreVraiment, annule = () => false, delais = DELAIS_DE_RELECTURE }: Options = {}
): Promise<T> {
  let resultat = await lire();
  for (const delai of delais) {
    if (!aReprendre(resultat) || annule()) return resultat;
    await attendre(delai);
    if (annule()) return resultat;
    resultat = await lire();
  }
  return resultat;
}
