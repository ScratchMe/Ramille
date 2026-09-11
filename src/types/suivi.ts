// Formes et calculs purs du suivi dans la durée (v1-07 §3.2) — aucune dépendance au client
// Supabase, donc testables directement, comme `src/types/bilan.ts`. Les requêtes qui les
// alimentent vivent dans `src/lib/bilan-history.ts`.

export type AssessmentSnapshot = {
  assessmentId: string;
  submittedAt: string;
  totalKg: number;
  dominantPoste: string;
  dominantLabel: string;
};

export type CheckinRecord = {
  id: string;
  loopType: 'commute' | 'extras';
  periodLabel: string;
  periodStart: string;
  response: boolean;
  respondedAt: string;
};

/**
 * Un point par jour, le dernier.
 *
 * Corriger une réponse juste après avoir soumis crée un second bilan (le questionnaire
 * insère toujours une nouvelle ligne) : deux barres à la même date, avec deux valeurs
 * différentes, se lisent comme un bug alors que c'est une correction. L'historique garde
 * donc la dernière version de chaque journée. Attend une liste déjà triée par date
 * croissante.
 */
export function keepLatestPerDay(snapshots: AssessmentSnapshot[]): AssessmentSnapshot[] {
  const byDay = new Map<string, AssessmentSnapshot>();
  for (const snapshot of snapshots) {
    byDay.set(snapshot.submittedAt.slice(0, 10), snapshot);
  }
  return [...byDay.values()];
}

/**
 * Formulation de l'écart entre deux bilans.
 *
 * Une hausse n'est jamais présentée comme une faute : elle peut venir d'un déménagement,
 * d'un changement de travail, d'une année avec un voyage familial. On dit le fait, pas un
 * verdict — spec §2 (ne pas traiter en mauvais élève un profil sans alternative) et §7
 * (relance factuelle, non culpabilisante).
 */
export function variationNote(previousKg: number, currentKg: number): string {
  if (previousKg === 0) return 'Premier point de comparaison.';

  const deltaKg = currentKg - previousKg;
  const percent = Math.round(Math.abs(deltaKg / previousKg) * 100);
  if (percent < 3) return 'Stable par rapport à ton bilan précédent.';
  if (deltaKg < 0) return `${percent} % de moins que ton bilan précédent.`;
  return `${percent} % de plus que ton bilan précédent. Une année n’est pas l’autre.`;
}

/**
 * La date d'un bilan, telle qu'elle s'écrit à l'écran : « 12 mars 2026 ».
 *
 * Une seule implémentation, parce qu'il y a deux écrans à la dater — la liste du suivi et la
 * relecture d'un bilan (A3-15). Et une seule entrée : `submittedAt`, la **date de soumission**,
 * jamais le `computed_at` d'`assessment_results`. Les deux coïncident à la soumission, mais
 * une reprise de calcul en masse côté serveur (correction de facteur, chemin explicitement
 * prévu par CLAUDE.md) déplace le second : les deux écrans dateraient alors le même bilan
 * différemment, sans que rien ne le signale.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Depuis combien de jours cette date remonte-t-elle ?
 * Sert à proposer un re-bilan sans jamais l'imposer.
 */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// Six mois : assez long pour qu'un changement d'habitude ait eu le temps de se voir, assez
// court pour que la comparaison reste parlante. Une proposition, jamais un rappel insistant
// (spec §7) — l'écran de suivi l'affiche, rien ne la relance.
export const REBILAN_SUGGESTION_DAYS = 182;
