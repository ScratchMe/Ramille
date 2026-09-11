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
