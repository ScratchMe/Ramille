/**
 * La saison, côté client — module pur, sans import de `@/lib/supabase` ni de React (règle du
 * CLAUDE.md), donc testable.
 *
 * ## Pourquoi ce module existe avant les écrans qui s'en servent
 *
 * Trois chantiers du lot 2 ont besoin de savoir dans quelle saison tombe une date et comment
 * elle s'appelle : la carte d'ouverture et le cap (C2.8), le groupement des points par saison
 * (C2.7), l'accessoire de la mascotte (C2.13). Jusqu'ici la saison n'existait qu'en SQL
 * (`season_bounds`, 20260823110000_plan_reduction.sql). Trois implémentations d'écran
 * divergeraient — et divergeraient **en silence**, puisque rien ne compare un libellé de saison
 * calculé dans un écran à celui qu'un cycle porte en base. Une seule, écrite avant les trois,
 * ne peut pas.
 *
 * ## Ce que ce module n'est pas
 *
 * Ce n'est **pas** une lecture de `plan_cycles`, et il ne faut pas l'y brancher : la cadence
 * `rolling_quarter` (mécanisme dormant, cf. CLAUDE.md) produit des trimestres glissants qui
 * n'ont pas de saison nommée, alors que la mascotte et les regroupements du suivi suivent le
 * calendrier dans les deux cas. La saison est une propriété de la **date**, pas du cycle.
 *
 * ## Saisons météorologiques, pas astronomiques
 *
 * Blocs calendaires de trois mois, exactement comme `season_bounds` : décembre appartient à
 * l'hiver **qui commence**, pas à celui qui s'achève. Le test pgTAP
 * `00_period_bounds.test.sql` épingle les mêmes bornes ; `saison.test.ts` le cite en miroir.
 */

export const SAISONS = ['hiver', 'printemps', 'ete', 'automne'] as const;

export type Saison = (typeof SAISONS)[number];

export type BornesDeSaison = {
  saison: Saison;
  /** Premier jour de la saison, en date locale. */
  debut: Date;
  /** Dernier jour inclus — comme `season_bounds.period_end`, jamais le premier du suivant. */
  fin: Date;
  /** « Hiver 2026-2027 », « Printemps 2027 » — la forme qu'un écran affiche telle quelle. */
  libelle: string;
};

/**
 * Le mois de départ de chaque saison. `hiver` vaut 12 et c'est ce qui porte toute la
 * singularité : c'est la seule saison à cheval sur deux années, donc la seule dont le libellé
 * en cite deux.
 */
const MOIS_DE_DEPART: Record<Saison, number> = {
  hiver: 12,
  printemps: 3,
  ete: 6,
  automne: 9,
};

const NOM_AFFICHE: Record<Saison, string> = {
  hiver: 'Hiver',
  printemps: 'Printemps',
  ete: 'Été',
  automne: 'Automne',
};

/**
 * Construit une date locale à minuit. `new Date(y, m, d)` et non `new Date('2026-12-01')` :
 * la seconde forme est interprétée en UTC, ce qui décale d'un jour à l'ouest de Greenwich et
 * ferait basculer de saison une personne qui ouvre l'app le 30 novembre au soir. Le produit
 * est français, mais le web se visite d'où l'on veut.
 */
function dateLocale(annee: number, mois1a12: number, jour: number): Date {
  const d = new Date(annee, mois1a12 - 1, jour);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * La saison d'une date, ses bornes et son libellé. Miroir exact de `public.season_bounds`.
 *
 * Le `switch` est écrit sur le mois plutôt que dérivé d'une formule (`floor((m % 12) / 3)`)
 * parce que la formule marche et ne se relit pas : il faut pouvoir confronter ces quatre
 * branches aux quatre branches SQL sans les exécuter.
 */
export function saisonDe(date: Date): BornesDeSaison {
  const mois = date.getMonth() + 1;
  const annee = date.getFullYear();

  let saison: Saison;
  let anneeDeDepart: number;
  let libelle: string;

  if (mois === 12) {
    // Décembre ouvre l'hiver suivant : « Hiver 2026-2027 » pour décembre 2026.
    saison = 'hiver';
    anneeDeDepart = annee;
    libelle = `${NOM_AFFICHE.hiver} ${annee}-${annee + 1}`;
  } else if (mois === 1 || mois === 2) {
    // Janvier et février appartiennent à l'hiver commencé en décembre **précédent**.
    saison = 'hiver';
    anneeDeDepart = annee - 1;
    libelle = `${NOM_AFFICHE.hiver} ${annee - 1}-${annee}`;
  } else if (mois >= 3 && mois <= 5) {
    saison = 'printemps';
    anneeDeDepart = annee;
    libelle = `${NOM_AFFICHE.printemps} ${annee}`;
  } else if (mois >= 6 && mois <= 8) {
    saison = 'ete';
    anneeDeDepart = annee;
    libelle = `${NOM_AFFICHE.ete} ${annee}`;
  } else {
    saison = 'automne';
    anneeDeDepart = annee;
    libelle = `${NOM_AFFICHE.automne} ${annee}`;
  }

  const debut = dateLocale(anneeDeDepart, MOIS_DE_DEPART[saison], 1);
  // Trois mois plus tard, moins un jour — `setMonth` gère le passage d'année et les longueurs
  // de mois, ce qu'un calcul en jours ne fait pas.
  const finExclusive = new Date(debut);
  finExclusive.setMonth(finExclusive.getMonth() + 3);
  const fin = new Date(finExclusive);
  fin.setDate(fin.getDate() - 1);

  return { saison, debut, fin, libelle };
}

/**
 * Un point de suivi, réduit à ce que le récapitulatif regarde. Volontairement plus étroit que
 * `CheckinRecord` (`src/types/suivi.ts`) : ce module ne doit pas dépendre de la forme exacte
 * d'une ligne, qui bouge au chantier suivant (C2.4 ajoute `response_kind`).
 */
export type PointDeSaison = {
  /** ISO `YYYY-MM-DD` ou date complète — seuls les dix premiers caractères sont lus. */
  periodStart: string;
  /** `answered`, `expired`, `pending`. Seuls les `answered` comptent. */
  status: string;
  /** `true` = oui, `false` = non, `null` = répondu sans objet (C2.4). */
  response: boolean | null;
};

export type RecapDeSaison = {
  /** Les points auxquels la personne a répondu, quelle que soit la réponse. */
  repondus: number;
  /** Les « oui » — un trajet fait autrement. */
  changements: number;
};

/**
 * Ce qu'une saison a produit : le nombre de points répondus et le nombre de changements.
 *
 * **Jamais les points manqués.** L'écran `/suivi` n'a aucune mécanique d'échec (CLAUDE.md) :
 * une période sans réponse n'y apparaît pas, les points non répondus sont clos en `expired`
 * côté serveur et ne sont jamais relus. Compter les manqués ici les rendrait affichables, et
 * c'est exactement la pente que le produit refuse — on compte les fois où la personne a
 * répondu, jamais celles où elle a laissé passer.
 *
 * `repondus` filtre sur `status = 'answered'` et **non** sur `response !== null` : c'est le
 * filtre que C2.4 conserve quand la troisième réponse (« pas de trajet cette période ») arrive
 * avec `response = null`. Compter sur la valeur ferait disparaître ces points du récapitulatif
 * le jour où ils existeront, sans que rien ne le signale.
 */
export function recapDeSaison(points: PointDeSaison[], bornes: BornesDeSaison): RecapDeSaison {
  const debut = isoJour(bornes.debut);
  const fin = isoJour(bornes.fin);

  let repondus = 0;
  let changements = 0;

  for (const point of points) {
    if (point.status !== 'answered') continue;
    const jour = point.periodStart.slice(0, 10);
    if (jour < debut || jour > fin) continue;
    repondus += 1;
    if (point.response === true) changements += 1;
  }

  return { repondus, changements };
}

/**
 * `YYYY-MM-DD` en date **locale**. `toISOString()` convertirait en UTC et décalerait la borne
 * d'un jour selon le fuseau — le 1er décembre à 00 h 00 à Paris devient le 30 novembre en UTC,
 * et la comparaison de chaînes exclurait alors le premier jour de la saison.
 */
function isoJour(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}
