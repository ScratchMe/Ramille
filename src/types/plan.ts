// Logique pure de l'engagement sur une action du plan (étape 6b, v1-07 §3.3 point 2).
// Séparée des requêtes, comme `src/types/bilan.ts` et `src/types/suivi.ts` : un module importé
// par un test ne doit tirer ni React Native ni `@/lib/supabase`.
//
// L'intention d'implémentation prend deux formes selon le poste, et ce n'est pas cosmétique :
// un trajet domicile-travail a un rythme hebdomadaire (« le mardi et le jeudi »), un trajet
// loisir ou un voyage n'en a pas — lui demander un jour de la semaine produirait une intention
// que personne ne peut tenir. Les deux formes s'excluent, et la base le vérifie
// (`plan_actions_engagement_coherent`).

/**
 * La forme insérable du poste (C2.6) est définie dans `@/constants/postes` — le vocabulaire d'un
 * poste y tient en un seul endroit, avec ses quatre registres et la raison de chacun. Réexportée
 * ici parce que c'est le module que l'écran du plan et la carte de point importent déjà ;
 * **la définition et son commentaire sont là-bas.**
 */
export { formeInserable } from '@/constants/postes';

export type IntentionTiming = 'ce_mois' | 'le_mois_prochain' | 'prochaine_occasion';

/** 1 = lundi … 7 = dimanche, comme ISO 8601 et comme la contrainte SQL. */
export type IntentionDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const INTENTION_DAYS: { value: IntentionDay; short: string; long: string }[] = [
  { value: 1, short: 'L', long: 'lundi' },
  { value: 2, short: 'M', long: 'mardi' },
  { value: 3, short: 'M', long: 'mercredi' },
  { value: 4, short: 'J', long: 'jeudi' },
  { value: 5, short: 'V', long: 'vendredi' },
  { value: 6, short: 'S', long: 'samedi' },
  { value: 7, short: 'D', long: 'dimanche' },
];

export const INTENTION_TIMINGS: { value: IntentionTiming; label: string }[] = [
  { value: 'ce_mois', label: 'Ce mois-ci' },
  { value: 'le_mois_prochain', label: 'Le mois prochain' },
  { value: 'prochaine_occasion', label: 'À ma prochaine occasion' },
];

/**
 * Le poste décide de la forme d'intention proposée. `commute` est le seul poste au rythme
 * hebdomadaire ; loisirs et voyages se pensent en échéance.
 */
export function intentionKindForPoste(poste: string | null): 'days' | 'timing' {
  return poste === 'commute' ? 'days' : 'timing';
}

/**
 * « le mardi et le jeudi » — l'intention telle qu'elle sera relue par la personne, pas une
 * liste de cases cochées. C'est la formulation qui fait le levier, donc elle est rendue en
 * toutes lettres et pas en initiales.
 */
export function formatIntentionDays(days: number[] | null | undefined): string | null {
  if (!days || days.length === 0) return null;

  const noms = [...days]
    .sort((a, b) => a - b)
    .map((d) => INTENTION_DAYS.find((j) => j.value === d)?.long)
    .filter((nom): nom is string => nom !== undefined);

  if (noms.length === 0) return null;
  if (noms.length === 7) return 'tous les jours';

  // L'article se répète devant chaque jour : « le lundi, le mardi et le mercredi ». Le
  // factoriser donnerait « le lundi, mardi et le mercredi », qui boite.
  const avecArticle = noms.map((nom) => `le ${nom}`);
  if (avecArticle.length === 1) return avecArticle[0];

  return `${avecArticle.slice(0, -1).join(', ')} et ${avecArticle[avecArticle.length - 1]}`;
}

export function formatIntentionTiming(timing: string | null | undefined): string | null {
  return INTENTION_TIMINGS.find((t) => t.value === timing)?.label.toLowerCase() ?? null;
}

/** Phrase complète de rappel, quelle que soit la forme de l'intention. */
export function formatIntention(
  days: number[] | null | undefined,
  timing: string | null | undefined
): string | null {
  return formatIntentionDays(days) ?? formatIntentionTiming(timing);
}

/**
 * Une intention est valide si elle porte exactement une des deux formes — miroir de la
 * contrainte `plan_actions_engagement_coherent`. Vérifié côté client pour ne pas envoyer un
 * appel que la base refusera, jamais à sa place.
 */
export function isIntentionComplete(
  kind: 'days' | 'timing',
  days: IntentionDay[],
  timing: IntentionTiming | null
): boolean {
  return kind === 'days' ? days.length > 0 : timing !== null;
}

// ── Ce que le plan met en avant, et ce qu'il garde derrière un lien (C4.6) ──────────────────

/**
 * Combien d'actions le plan présente d'emblée.
 *
 * Deux, comme la spec §6 (« 1 à 2 actions suggérées ») — mais **c'est un choix d'écran, et il ne
 * vivait pas à l'écran** : `generate_plan_cycle_for_user` jetait tout le reste avec un `limit 2`
 * avant même de l'écrire, alors que l'estimateur rend déjà toutes les actions dont le gain atteint
 * 5 kg/an. L'autonomie de la personne s'exerçait donc sur deux leviers et les autres restaient
 * invisibles (constat A13-18, arbitrage D18 du 10/09/2026).
 */
export const ACTIONS_EN_AVANT = 2;

/**
 * Combien d'actions gardent une **carte** quand on déplie les pistes ; au-delà, des lignes simples.
 *
 * Le canvas borne les cartes à quatre, et c'est une hiérarchie voulue : une liste de six cartes
 * pleines ne présente plus un choix, elle présente un catalogue. Les lignes qui suivent disent ce
 * qui existe sans le mettre au même rang.
 */
export const PISTES_ESTOMPEES = 2;

export type PistesDuPlan<T> = {
  /** Les cartes pleines, toujours visibles. */
  enAvant: T[];
  /** Les cartes estompées, visibles une fois les pistes dépliées. */
  estompees: T[];
  /** Le reste, en lignes simples, visible une fois les pistes dépliées. */
  lignes: T[];
  /** Ce que le lien annonce : combien de pistes se cachent derrière lui. */
  masquees: number;
};

/**
 * L'ordre d'affichage du plan et ses trois rangs (C4.6, planches F1 et F2).
 *
 * **L'action engagée passe toujours devant** : c'est la réponse à « qu'est-ce que je fais en ce
 * moment ? », elle n'a pas à être cherchée. Le reste suit le `rank` du serveur, qui porte déjà le
 * bon ordre — poste dominant d'abord, puis gain décroissant — et qui est figé à la génération. Un
 * `rank` nul (aucune migration n'en produit, mais la colonne l'autorise) passe en dernier plutôt que
 * de remonter en tête par accident, comme le `nulls last` du serveur.
 *
 * La fonction est générique parce que la forme d'une ligne `plan_actions` appartient à l'écran :
 * elle ne demande que les deux champs dont l'ordre dépend.
 */
export function pistesDuPlan<T extends { committed_at: string | null; rank: number | null }>(
  actions: T[]
): PistesDuPlan<T> {
  const ordonnees = [...actions].sort((a, b) => {
    const engagement = Number(b.committed_at !== null) - Number(a.committed_at !== null);
    if (engagement !== 0) return engagement;
    // `Infinity` plutôt que 0 : un rang absent va au bout, il ne se glisse pas en tête.
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
  });

  const enAvant = ordonnees.slice(0, ACTIONS_EN_AVANT);
  const reste = ordonnees.slice(ACTIONS_EN_AVANT);

  return {
    enAvant,
    estompees: reste.slice(0, PISTES_ESTOMPEES),
    lignes: reste.slice(PISTES_ESTOMPEES),
    masquees: reste.length,
  };
}
