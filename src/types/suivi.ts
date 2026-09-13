// Formes et calculs purs du suivi dans la durée (v1-07 §3.2) — aucune dépendance au client
// Supabase, donc testables directement, comme `src/types/bilan.ts`. Les requêtes qui les
// alimentent vivent dans `src/lib/bilan-history.ts`.

import type { ReponseDuPoint } from '@/types/checkin';

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
  /**
   * **La réponse, et non un booléen** (C2.4). `response` restait `boolean` en base, et
   * `loadAnsweredCheckins` écartait les lignes dont elle était nulle : la troisième réponse
   * (« pas de trajet cette période ») aurait donc été donnée puis perdue, sans message d'erreur
   * et sans rien afficher dans le suivi. C'est `response_kind` qui est la vérité côté base.
   */
  reponse: ReponseDuPoint;
  respondedAt: string;
};

/**
 * Ce qu'une réponse affiche dans la colonne de droite du suivi.
 *
 * Une fonction et non un ternaire dans l'écran, parce que C2.7 reprend cette colonne : « Changement
 * fait » / « Pas cette fois » / « Pas de trajet » (v1-14 §3.2). Les deux premiers libellés restent
 * ceux d'aujourd'hui jusque-là — C2.4 n'ajoute que le troisième, qui n'existait pas.
 */
export function libelleDeReponse(reponse: ReponseDuPoint): string {
  if (reponse === 'oui') return 'Oui';
  if (reponse === 'non') return 'Non';
  return 'Pas de trajet';
}

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

/** Les mois en lettres — au-delà de onze, on ne compte plus en mois. */
const MOIS_EN_MOTS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
] as const;

/**
 * L'âge d'un bilan, en mots : « six mois », « plus d'un an ».
 *
 * **Le fait, pas la saison** (C2.8, point 3). Les deux cartes de re-bilan disaient autre chose :
 * le plan annonçait « Une nouvelle saison a commencé » — ce qui pouvait être faux, la carte se
 * déclenchant sur 182 jours d'ancienneté du bilan et non sur une bascule, et ce qui pouvait de
 * surcroît coexister avec la puce « Cadence : Été 2026 » ; le suivi, lui, écrivait le nombre en
 * chiffres et le calculait sur place. La formulation saisonnière appartient maintenant à la carte
 * d'ouverture, qui, elle, se déclenche vraiment sur une bascule ; ces deux cartes disent l'âge, et
 * le disent par la même dérivation — deux écrans qui comptent chacun de leur côté finissent par
 * annoncer six mois d'un côté et cinq de l'autre.
 *
 * En mots plutôt qu'en chiffres parce que c'est un ordre de grandeur et non une mesure : « Ton
 * bilan a six mois » se lit, « Ton bilan a 187 jours » se compte. Le mois vaut trente jours, la
 * même approximation que le seuil lui-même (182).
 */
export function ancienneteEnMots(jours: number): string {
  const mois = Math.floor(jours / 30);
  // Au-delà de l'année, le compte exact n'apporte plus rien — et « quinze mois » se lit comme une
  // facture. La carte n'apparaît qu'à partir de six mois ; les deux bornes basses sont là pour que
  // la dérivation soit totale, pas parce qu'un écran les atteint.
  if (mois >= 12) return 'plus d’un an';
  if (mois < 1) return 'moins d’un mois';
  return `${MOIS_EN_MOTS[mois]} mois`;
}

/**
 * Le libellé de période d'un point, avec l'année quand elle n'est plus celle en cours.
 *
 * « Semaine du 31/08 » ne dit pas l'année. Sur un suivi de deux ans, deux points portent le même
 * libellé à douze mois d'écart, et la liste se lit comme un doublon. Le libellé mensuel, lui,
 * porte déjà son année (« septembre 2026 ») : il ressort inchangé.
 *
 * **Le libellé snapshoté n'est pas réécrit** (C2.3, point 2) : il reste ce qu'il était au moment
 * de la génération, et l'année est ajoutée à l'affichage, à partir de `periodStart`. Réécrire un
 * `period_label` déjà posé effacerait ce que la personne a vu quand elle a répondu — c'est
 * précisément ce que le snapshot existe pour empêcher.
 *
 * `maintenant` est un paramètre plutôt qu'un `new Date()` interne : l'année en cours est une
 * entrée du calcul, et une fonction qui lit l'horloge ne se teste qu'au 31 décembre.
 */
export function libellePeriodeAffiche(
  periodLabel: string,
  periodStart: string,
  maintenant: Date = new Date()
): string {
  // L'année est déjà là (libellé mensuel) : ne rien ajouter.
  const annee = periodStart.slice(0, 4);
  if (periodLabel.includes(annee)) return periodLabel;

  return annee === String(maintenant.getFullYear()) ? periodLabel : `${periodLabel} ${annee}`;
}
