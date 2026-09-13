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
 *
 * ## Ce que C2.8 y a ajouté
 *
 * La fin d'une période et son début : le libellé de fin que porte la carte du cap, la part du
 * temps écoulée que remplit le trait de temps, la fenêtre de deux semaines pendant laquelle
 * l'ouverture se dit, et le contenu de la carte d'ouverture. Tout y est pur — l'écran du plan ne
 * fabrique aucune de ces phrases et ne compte rien.
 */

import { jourDuMois, MOIS_FRANCAIS, type ReponseDuPoint } from '@/types/checkin';

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
  /**
   * **Le genre de la réponse, et non un booléen** (repris de `boolean | null` en C2.8). La forme
   * booléenne datait d'avant la troisième réponse : `null` y voulait dire « répondu sans objet »
   * sur une ligne `answered` et « pas répondu » sur les autres, deux faits différents sous la même
   * valeur. `CheckinRecord` (`src/types/suivi.ts`) parle déjà le même vocabulaire, qui est celui de
   * `response_kind` en base — la seule vérité (C2.4).
   *
   * `null` vaut donc uniquement « pas de réponse », et un point `answered` en porte toujours une.
   */
  reponse: ReponseDuPoint | null;
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
 * `repondus` filtre sur `status = 'answered'` et **non** sur la réponse elle-même, et c'est ce qui
 * l'a rendu compatible avec la troisième réponse livrée par C2.4 : « pas de trajet cette période »
 * est un point bel et bien répondu. Compter sur la valeur ferait disparaître ces points du
 * récapitulatif, sans que rien ne le signale. `changements` lit `reponse === 'oui'`, donc un
 * « sans objet » n'en est pas un.
 */
export function recapDeSaison(points: PointDeSaison[], bornes: BornesDeSaison): RecapDeSaison {
  return recapDeLaPeriode(points, isoJour(bornes.debut), isoJour(bornes.fin));
}

/**
 * Le même décompte, entre deux jours ISO — et c'est la forme dont la carte d'ouverture a besoin.
 *
 * La période écoulée qu'elle récapitule est celle du **cycle précédent**, dont les bornes sont
 * lues sur sa ligne (`plan_cycles.period_start` / `.period_end`) et non recalculées : une cadence
 * `rolling_quarter` n'a pas de saison nommée, donc pas de `BornesDeSaison`, et dériver les bornes
 * de la saison plutôt que de les lire ferait compter les points d'un trimestre glissant sur trois
 * mois calendaires qui ne sont pas les siens.
 *
 * Une seule implémentation du comptage, deux entrées : `recapDeSaison` ci-dessus n'est que celle
 * qui nomme ses bornes par une saison.
 */
export function recapDeLaPeriode(
  points: PointDeSaison[],
  debut: string,
  fin: string
): RecapDeSaison {
  let repondus = 0;
  let changements = 0;

  for (const point of points) {
    if (point.status !== 'answered') continue;
    const jour = point.periodStart.slice(0, 10);
    if (jour < debut.slice(0, 10) || jour > fin.slice(0, 10)) continue;
    repondus += 1;
    if (point.reponse === 'oui') changements += 1;
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

// ── La fin d'une période, et le temps qui passe (C2.8) ──────────────────────────────────────

/**
 * Les composantes d'un jour ISO `YYYY-MM-DD`, lues sur ses **caractères**.
 *
 * Même raison que `moisFrancais` (`src/types/checkin.ts`) : `new Date('2026-11-30')` est minuit
 * **UTC**, donc le 29 novembre à l'ouest de Greenwich. Une carte du cap qui annoncerait
 * « jusqu'au 29 novembre » à Montréal serait fausse d'un jour sans qu'aucun test tournant en UTC
 * ne le voie. `period_start` et `period_end` arrivent de Postgres en date nue : on lit les
 * chiffres.
 *
 * `null` sur une chaîne qui n'en est pas une — le produit préfère ne rien afficher à afficher un
 * « jusqu'au NaN undefined ».
 */
function composantesDuJour(iso: string): { annee: number; mois: number; jour: number } | null {
  const annee = Number(iso.slice(0, 4));
  const mois = Number(iso.slice(5, 7));
  const jour = Number(iso.slice(8, 10));
  if (!Number.isInteger(annee) || annee < 1000) return null;
  if (!Number.isInteger(mois) || mois < 1 || mois > 12) return null;
  if (!Number.isInteger(jour) || jour < 1 || jour > 31) return null;
  return { annee, mois, jour };
}

/**
 * Un numéro de jour, pour soustraire deux dates sans qu'un fuseau s'en mêle.
 *
 * `Date.UTC` sur des composantes déjà séparées ne dépend d'aucun fuseau : les deux bornes et le
 * jour courant passent par la même conversion, donc la différence est un nombre de jours exact —
 * y compris à travers un changement d'heure, que 86 400 000 ms ferait dériver si l'on soustrayait
 * des horodatages locaux.
 */
function numeroDeJour(c: { annee: number; mois: number; jour: number }): number {
  return Math.round(Date.UTC(c.annee, c.mois - 1, c.jour) / 86_400_000);
}

/**
 * Le jour courant, en calendrier **local** — et c'est délibérément l'inverse de
 * `debutDePeriodeInterrogee` (`src/types/checkin.ts`).
 *
 * Celle-là est la jumelle du `date_trunc` des deux générateurs et lit donc l'UTC. Ici on nomme la
 * fin d'une saison à quelqu'un qui regarde son calendrier : le 30 novembre au soir à Paris, la
 * saison n'est pas terminée, même s'il est déjà le 1er décembre à Sydney. Même choix que
 * `saisonDe` et que la comparaison de `period_end` dans l'écran du plan.
 */
function jourLocal(maintenant: Date): { annee: number; mois: number; jour: number } {
  return {
    annee: maintenant.getFullYear(),
    mois: maintenant.getMonth() + 1,
    jour: maintenant.getDate(),
  };
}

/**
 * « jusqu'au 30 novembre » — la fin de la période, telle que la carte du cap la porte à droite.
 *
 * Le cap était annoncé puis abandonné : `plan_cycles.period_end` est écrit à chaque génération et
 * n'était lu par aucun écran (constat A8-8). Une échéance sans date n'en est pas une.
 *
 * La préposition est toujours « au » (« jusqu'au 1er mars », « jusqu'au 30 novembre ») et
 * `jourDuMois` porte la seule irrégularité, le premier du mois.
 */
export function finDePeriodeEnMots(periodEnd: string): string | null {
  const c = composantesDuJour(periodEnd);
  if (!c) return null;
  return `jusqu’au ${jourDuMois(c.jour)} ${MOIS_FRANCAIS[c.mois - 1]}`;
}

/**
 * La part du temps écoulée dans la période, entre 0 et 1 — ce que le trait de temps remplit.
 *
 * **Ce n'est pas une jauge de progression vers le cap**, et c'est pourquoi le trait se remplit en
 * `accentMuted` et jamais en `accent` : il mesure la saison, pas la personne. Rien de ce qu'elle
 * fait ne le fait avancer ni ne le retient.
 *
 * `period_end` est le dernier jour **inclus** (comme `season_bounds`), d'où le `+ 1` : du 1er
 * septembre au 30 novembre, la saison dure 91 jours et non 90. Sans lui, le trait afficherait
 * « plein » au matin du dernier jour, alors qu'il en reste un. Il n'atteint donc 1 qu'une fois la
 * période révolue — c'est-à-dire au moment où le bandeau de bascule prend le relais.
 */
export function progressionDeLaPeriode(
  periodStart: string,
  periodEnd: string,
  maintenant: Date = new Date()
): number | null {
  const debut = composantesDuJour(periodStart);
  const fin = composantesDuJour(periodEnd);
  if (!debut || !fin) return null;

  const premierJour = numeroDeJour(debut);
  const duree = numeroDeJour(fin) + 1 - premierJour;
  if (duree <= 0) return null;

  const ecoule = numeroDeJour(jourLocal(maintenant)) - premierJour;
  if (ecoule <= 0) return 0;
  if (ecoule >= duree) return 1;
  return ecoule / duree;
}

// ── L'ouverture d'une saison (C2.8) ─────────────────────────────────────────────────────────

/**
 * Deux semaines : la fenêtre pendant laquelle l'ouverture d'une période se dit encore.
 *
 * Passé ce délai, la nouvelle n'en est plus une — et la carte ne doit pas devenir un meuble en
 * tête du plan. La marque locale « vue » la referme plus tôt ; cette borne est celle qui la
 * referme toute seule, y compris sur un appareil où personne n'a touché aux boutons.
 */
export const JOURS_DOUVERTURE = 14;

export function estDansLouverture(periodStart: string, maintenant: Date = new Date()): boolean {
  const debut = composantesDuJour(periodStart);
  if (!debut) return false;
  const ecoule = numeroDeJour(jourLocal(maintenant)) - numeroDeJour(debut);
  return ecoule >= 0 && ecoule < JOURS_DOUVERTURE;
}

/**
 * La cadence d'un cycle, telle que `plan_cycles.cadence_type` la fige : `season` nomme une saison,
 * tout le reste n'en a pas.
 *
 * `rolling_quarter` est un mécanisme dormant (aucun écran ne l'écrit, les profils valent tous
 * `season` — cf. CLAUDE.md), mais la chaîne serveur existe et est testée : la carte d'ouverture
 * doit donc savoir se passer d'un nom de saison plutôt que d'en inventer un. On lit la valeur
 * snapshotée et on ne la devine pas : un trimestre glissant peut parfaitement commencer un 1er
 * décembre.
 */
export function cadenceNommeUneSaison(cadence: string): boolean {
  return cadence === 'season';
}

export type OuvertureDeSaison = {
  /** « NOUVELLE SAISON » — l'étiquette de la carte, en majuscules dans le texte lui-même. */
  etiquette: string;
  /** « L'hiver commence. » */
  titre: string;
  /**
   * « Cet automne : 11 points répondus, 8 fois où tu as changé quelque chose. »
   *
   * `null` quand il n'y a rien à dire : aucun point répondu sur la période écoulée. **Jamais un
   * décompte de manqués** — l'écran `/suivi` n'a aucune mécanique d'échec, et « 0 point répondu »
   * serait exactement la phrase qui les nomme.
   */
  corps: string | null;
};

/** L'article qui précède le nom d'une saison : le printemps est le seul à ne pas s'élider. */
const AVEC_ARTICLE: Record<Saison, string> = {
  hiver: 'L’hiver',
  printemps: 'Le printemps',
  ete: 'L’été',
  automne: 'L’automne',
};

/** « Cet automne », « Ce printemps » — le démonstratif de la saison qu'on vient de quitter. */
const DEMONSTRATIF: Record<Saison, string> = {
  hiver: 'Cet hiver',
  printemps: 'Ce printemps',
  ete: 'Cet été',
  automne: 'Cet automne',
};

/**
 * Ce que dit la carte d'ouverture : l'étiquette, le titre, et le récapitulatif de la période
 * écoulée.
 *
 * **L'effet « nouveau départ » était perdu quatre fois par an** (constat A13-6) : à la bascule, le
 * cycle suivant se créait dans la nuit et rien ne le disait — la seule trace était la puce
 * « Cadence : Hiver 2026-2027 », qui change de texte sans rien annoncer.
 *
 * Trois choses que cette dérivation refuse de faire :
 *
 * — **Nommer un poste dans le récapitulatif.** Le canvas écrit « … changé quelque chose sur ton
 *   trajet » ; le décompte porte sur les **deux** boucles (`recapDeLaPeriode` ne filtre pas sur
 *   `loop_type`), donc la phrase serait fausse pour quelqu'un dont les changements sont des
 *   voyages. Écart consigné en `v1-14` §10, même raison que la fausseté lisible retirée par C2.6.
 * — **Dire zéro.** Aucun point répondu → pas de récapitulatif du tout ; aucun changement → la
 *   seconde moitié de la phrase tombe. Le produit compte ce qui a été fait, jamais ce qui a été
 *   laissé passer.
 * — **Deviner la saison précédente.** Les bornes viennent du cycle précédent, pas d'un calcul à
 *   partir du cycle courant : c'est la même ligne qui porte la période et son nom.
 */
export function ouvertureDeSaison(params: {
  /** `plan_cycles.period_start` du cycle qui commence. */
  debutDuCycle: string;
  /** `plan_cycles.cadence_type` du cycle qui commence. */
  cadence: string;
  /** Les bornes du cycle précédent, lues sur sa ligne — `null` s'il n'y en a pas. */
  precedente: { debut: string; fin: string; cadence: string } | null;
  /** Les points de la fenêtre lue par l'écran ; seuls ceux de la période écoulée comptent. */
  points: PointDeSaison[];
}): OuvertureDeSaison {
  const { debutDuCycle, cadence, precedente, points } = params;

  const saisonQuiCommence = cadenceNommeUneSaison(cadence)
    ? composantesDuJour(debutDuCycle)
    : null;

  const etiquette = saisonQuiCommence ? 'NOUVELLE SAISON' : 'NOUVELLE PÉRIODE';
  const titre = saisonQuiCommence
    ? `${AVEC_ARTICLE[saisonDe(dateLocale(saisonQuiCommence.annee, saisonQuiCommence.mois, saisonQuiCommence.jour)).saison]} commence.`
    : 'Une nouvelle période commence.';

  return { etiquette, titre, corps: recapEnMots(precedente, points) };
}

/**
 * « Cet automne : 11 points répondus, 8 fois où tu as changé quelque chose. »
 *
 * Le sujet de la phrase vient de la cadence **du cycle précédent** et non de celui qui commence :
 * c'est bien cette période-là qu'on récapitule, et rien n'interdit que la cadence ait changé entre
 * les deux.
 */
function recapEnMots(
  precedente: { debut: string; fin: string; cadence: string } | null,
  points: PointDeSaison[]
): string | null {
  if (!precedente) return null;

  const { repondus, changements } = recapDeLaPeriode(points, precedente.debut, precedente.fin);
  if (repondus === 0) return null;

  const bornes = composantesDuJour(precedente.debut);
  const sujet =
    cadenceNommeUneSaison(precedente.cadence) && bornes
      ? DEMONSTRATIF[saisonDe(dateLocale(bornes.annee, bornes.mois, bornes.jour)).saison]
      : 'Ces trois mois';

  const pointsRepondus = repondus === 1 ? '1 point répondu' : `${repondus} points répondus`;
  // « 0 fois où tu as changé quelque chose » nommerait ce que le produit ne compte pas : la
  // seconde moitié de la phrase tombe plutôt que de dire zéro.
  if (changements === 0) return `${sujet} : ${pointsRepondus}.`;

  // « fois » est invariable — un seul gabarit pour 1 comme pour 8.
  return `${sujet} : ${pointsRepondus}, ${changements} fois où tu as changé quelque chose.`;
}

/**
 * Les sorties de la carte d'ouverture — ce qui suit le récapitulatif.
 *
 * Le canvas en dessine deux, « Reprendre la même action » et « Choisir une autre », et suppose donc
 * qu'une action est engagée et reconduite (C2.2 la reconduit). Deux cas qu'il ne dessine pas
 * existent en production et ne peuvent pas recevoir ces libellés :
 *
 * — **rien n'est engagé** (personne ne s'était engagé la saison passée, ou la reconduction n'a pas
 *   trouvé son gabarit dans le nouveau plan) : « Reprendre la même action » ne nomme rien ;
 * — **le plan n'a aucune action**, ce qui est le cas de tout cycliste et de tout profil sédentaire
 *   depuis C2.5 : proposer d'en choisir une serait promettre une liste vide.
 *
 * D'où une dérivation plutôt qu'un ternaire dans le composant, et un test par cas. Écart consigné
 * en `v1-14` §10.
 */
export type SortieDouverture = {
  cle: 'reprendre' | 'choisir_une_autre' | 'choisir' | 'compris';
  label: string;
  /** `primaire` et `secondaire` sont des `Button` ; `lien` est un `TextLink`. */
  forme: 'primaire' | 'secondaire' | 'lien';
};

export function sortiesDeLouverture(plan: {
  actionEngagee: boolean;
  nombreDActions: number;
}): SortieDouverture[] {
  if (plan.nombreDActions === 0) {
    return [{ cle: 'compris', label: 'Compris', forme: 'lien' }];
  }

  if (!plan.actionEngagee) {
    return [{ cle: 'choisir', label: 'Choisir une action', forme: 'primaire' }];
  }

  const reprendre: SortieDouverture = {
    cle: 'reprendre',
    label: 'Reprendre la même action',
    forme: 'primaire',
  };

  // Une seule action au plan : « Choisir une autre » ne mène nulle part.
  if (plan.nombreDActions === 1) return [reprendre];

  return [reprendre, { cle: 'choisir_une_autre', label: 'Choisir une autre', forme: 'secondaire' }];
}

// ── La bascule pendant qu'on regarde (C2.8) ─────────────────────────────────────────────────

/**
 * La phrase du bandeau quand le cycle affiché est révolu : « L'hiver a commencé pendant que tu
 * étais là. »
 *
 * **Jamais une carte remplacée sous les yeux** : le plan garde ce qu'il montrait — l'action
 * engagée, les jours choisis, le cap — et dit qu'une période a tourné. C'est la phrase que C2.2
 * avait posée en attendant (« Cette période est terminée. »), rendue à la saison qu'elle nomme.
 *
 * La saison nommée est celle **du jour**, pas celle du cycle suivant : le cycle suivant peut ne pas
 * exister encore (le cron nocturne ne passe qu'une fois par nuit), tandis que le calendrier, lui,
 * a bien tourné.
 */
export function basculeDeSaison(cadence: string, maintenant: Date = new Date()): string {
  if (!cadenceNommeUneSaison(cadence)) return 'Une nouvelle période a commencé pendant que tu étais là.';
  return `${AVEC_ARTICLE[saisonDe(maintenant).saison]} a commencé pendant que tu étais là.`;
}
