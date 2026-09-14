// Formes et calculs purs du suivi dans la durée (v1-07 §3.2) — aucune dépendance au client
// Supabase, donc testables directement, comme `src/types/bilan.ts`. Les requêtes qui les
// alimentent vivent dans `src/lib/bilan-history.ts`.

import { MOIS_FRANCAIS, type ReponseDuPoint } from '@/types/checkin';
import { POSTES, type Poste } from '@/constants/postes';
import { formatTonnesNu } from '@/lib/format';
import { saisonDuJour } from '@/types/saison';

export type AssessmentSnapshot = {
  assessmentId: string;
  submittedAt: string;
  totalKg: number;
  dominantPoste: string;
  dominantLabel: string;
  /**
   * Les trois postes du bilan, en kg/an — non nullables en base (C2.7).
   *
   * **Le total seul cachait l'essentiel** : un effort tenu tout l'hiver sur le trajet quotidien
   * disparaît derrière un vol de l'été, et le suivi ne montrait que le total. Le poste dominant peut
   * de surcroît **changer** d'un bilan à l'autre — c'est en général une réussite, pas une anomalie —
   * donc la comparaison se fait poste à poste et jamais « dominant contre dominant ».
   */
  parPoste: Record<Poste, number>;
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
 * Ce qu'une réponse affiche dans la colonne de droite du suivi (C2.7, point 5, `v1-14` §3.2).
 *
 * « Oui » et « Non » étaient les libellés du bouton, pas ceux d'une ligne d'historique : relus six
 * mois plus tard, hors de la question, ils ne disent plus à quoi ils répondaient. Les trois formes
 * nomment donc le fait — « Changement fait », « Pas cette fois », « Pas de trajet » — et l'écran les
 * rend **au même niveau typographique** : un « Changement fait » en accent au-dessus d'un « Pas cette
 * fois » en tertiaire classait les réponses, alors que la troisième n'est pas un échec et que la
 * seconde n'en est pas un non plus.
 */
export function libelleDeReponse(reponse: ReponseDuPoint): string {
  if (reponse === 'oui') return 'Changement fait';
  if (reponse === 'non') return 'Pas cette fois';
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
    byDay.set(jourLocalDe(snapshot.submittedAt), snapshot);
  }
  return [...byDay.values()];
}

/**
 * Le jour **local** d'un horodatage — et c'est ce que `keepLatestPerDay` regroupe (C2.7, point 7).
 *
 * Les dix premiers caractères d'un `timestamptz` sont son jour **UTC**, ce qui n'est pas le jour de
 * la personne : un bilan soumis le 10 mars à 23 h 00 UTC et sa correction le 11 à 00 h 30 UTC sont
 * le même 11 mars à Paris, et l'ancien regroupement en faisait deux barres avec deux valeurs
 * différentes — exactement le doublon que cette fonction existe pour empêcher, et il se lit comme
 * un bug alors que c'est une correction. Le raisonnement est celui de `saisonDe` : quand on range
 * par jour ce qu'une personne a fait, c'est son calendrier qui décide.
 */
function jourLocalDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
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
  if (estStable(previousKg, currentKg)) return 'Stable par rapport à ton bilan précédent.';
  // **L'écart se dit d'abord en kilos, et c'est ce qui referme vraiment A5-3** (14/09/2026). La
  // note ne portait qu'un pourcentage, au-dessus de deux barres étiquetées « 1,2 t » toutes les
  // deux : 1 240 puis 1 180 kg s'affichent identiques dès qu'on passe la tonne, donc la seule chose
  // qui montrait le changement était un « 5 % de moins » que rien ne corroborait à l'écran. Trois
  // documents donnaient le constat pour refermé par `formatTonnesNu` alors que cette fonction
  // n'était lue que par la restitution ; le pourcentage reste, en second, parce qu'un écart absolu
  // seul ne dit pas l'échelle.
  //
  // **La baisse est reconnue, la hausse reste un fait** (C2.7, point 1). Une hausse recevait
  // « Une année n'est pas l'autre » — une phrase qui désamorce — et une baisse un pourcentage sec :
  // le seul moment où la personne peut voir que ce qu'elle a changé a compté passait sans un mot.
  // La seconde phrase attribue le résultat sans le chiffrer, et sans accord qui genre.
  const ecart = formatTonnesNu(Math.abs(deltaKg));
  if (deltaKg < 0) {
    return `${ecart} de moins que ton bilan précédent (− ${percent} %). Ce que tu as changé se voit ici.`;
  }
  return `${ecart} de plus que ton bilan précédent (+ ${percent} %). Une année n’est pas l’autre.`;
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

/**
 * Faut-il proposer un re-bilan ? Un seul seuil, deux écrans (C2.7, point 7).
 *
 * Le plan et le suivi comparaient chacun `daysSince(...) >= REBILAN_SUGGESTION_DAYS` de leur côté,
 * avec pour l'un une date qui peut manquer et pour l'autre une date toujours présente : deux
 * conditions à tenir en phase pour une seule règle. `null` répond non — sans bilan il n'y a rien à
 * refaire, et cet écran-là propose déjà d'en faire un premier.
 */
export function doitProposerUnRebilan(submittedAt: string | null | undefined): boolean {
  if (!submittedAt) return false;
  return daysSince(submittedAt) >= REBILAN_SUGGESTION_DAYS;
}

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
 * Deux bilans se valent-ils, à 3 % près ?
 *
 * Le seuil vivait dans `variationNote` ; il sert maintenant à trois endroits — la note du suivi, la
 * phrase de la restitution, et la décision d'afficher ou non « Je vois la différence. » —, et trois
 * copies d'un seuil finissent par diverger. Sous ce seuil on dit « stable » : l'écart tient dans
 * l'imprécision des facteurs et des réponses, l'annoncer comme un progrès serait le surestimer.
 */
export function estStable(previousKg: number, currentKg: number): boolean {
  // **Deux bilans égaux sont stables, même à zéro** (contre-lecture de la vague 6, 14/09/2026). Le
  // seuil est relatif, donc il n'a pas de sens sur une base nulle ; mais renvoyer `false` sans
  // regarder l'égalité faisait dire « 0 kg de plus que ton bilan de mars. Une année n'est pas
  // l'autre. » — une consolation de hausse pour un écart nul. Le cas n'est pas théorique : un bilan
  // à zéro est celui d'un piéton qui ne prend ni vol ni long trajet.
  if (currentKg === previousKg) return true;
  if (previousKg === 0) return false;
  return Math.abs((currentKg - previousKg) / previousKg) < 0.03;
}

/** Une baisse réelle : plus qu'un écart de mesure, et dans le bon sens. */
export function estUneBaisse(previousKg: number, currentKg: number): boolean {
  return currentKg < previousKg && !estStable(previousKg, currentKg);
}

/**
 * L'écart entre deux bilans, poste par poste (C2.7, point 3).
 *
 * **Poste à poste, jamais dominant contre dominant.** Le poste dominant peut changer d'un bilan à
 * l'autre, et c'est le plus souvent une réussite : comparer « ton poste dominant d'avant » à « ton
 * poste dominant d'aujourd'hui » ferait passer ce succès pour une hausse. L'accent suit le dominant
 * du bilan **courant**, et il vient du serveur (`assessment_results.dominant_poste`) plutôt que d'un
 * maximum recalculé ici : le départage du serveur n'est pas un simple max (les loisirs l'emportent
 * sur les voyages à 5 % près), donc un maximum local désignerait parfois un autre poste que celui
 * sur lequel le plan travaille.
 *
 * Les postes nuls **des deux côtés** sont retirés : « Voyages · 0 kg → 0 kg » n'apprend rien à
 * quelqu'un qui n'a jamais déclaré de voyage, et allonge la carte d'une ligne vide.
 */
export type EcartDePoste = {
  poste: Poste;
  precedentKg: number;
  courantKg: number;
  /** Le poste le plus lourd du bilan courant : celui dont la barre est en `accent`. */
  dominant: boolean;
};

export function ecartParPoste(
  precedent: AssessmentSnapshot,
  courant: AssessmentSnapshot
): EcartDePoste[] {
  return POSTES.map((poste) => ({
    poste,
    precedentKg: precedent.parPoste[poste],
    courantKg: courant.parPoste[poste],
    dominant: courant.dominantPoste === poste,
  }))
    .filter((ecart) => ecart.precedentKg > 0 || ecart.courantKg > 0)
    // Le plus lourd d'abord, sur le bilan courant : l'ordre dit où l'effort compte le plus
    // aujourd'hui. Il peut donc changer d'un bilan à l'autre, ce qui est le fait qu'on montre.
    .sort((a, b) => b.courantKg - a.courantKg);
}

/**
 * La phrase de variation de la restitution d'un re-bilan (C2.7, point 2).
 *
 * **En écart absolu et non en pourcentage**, à la différence de `variationNote` : la restitution
 * affiche des barres en tonnes, et « 8 % de moins » ne se rattache à rien de ce qu'on y voit. C'est
 * aussi la seule forme qui distingue deux bilans proches — `formatTonnesNu` passe en kilos sous la
 * tonne, donc un écart de 60 kg se dit « 60 kg » et non « 0,1 t ».
 *
 * Le mois vient de `MOIS_FRANCAIS` et non de `toLocaleDateString` : Hermes peut être construit sans
 * ICU complet et rendrait un mois en anglais, invisible en CI et visible sur l'appareil (même piège
 * que `moisFrancais`, `src/types/checkin.ts`). Il est lu en **local**, comme la date affichée : un
 * bilan soumis le 1er septembre à 00 h 30 à Paris porte un horodatage d'août en UTC.
 */
export function variationDepuisLeBilanPrecedent(
  precedent: { totalKg: number; submittedAt: string },
  courantKg: number
): string {
  const mois = moisLocalDe(precedent.submittedAt);
  const complement = mois ? ` de ${mois}` : ' précédent';

  if (estStable(precedent.totalKg, courantKg)) {
    return `Stable par rapport à ton bilan${complement}.`;
  }

  const deltaKg = Math.abs(courantKg - precedent.totalKg);
  if (courantKg < precedent.totalKg) {
    return `${formatTonnesNu(deltaKg)} de moins que ton bilan${complement}.`;
  }
  return `${formatTonnesNu(deltaKg)} de plus que ton bilan${complement}. Une année n’est pas l’autre.`;
}

/** Le mois d'un horodatage, en français et en heure locale. `null` si la date est illisible. */
export function moisLocalDe(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return MOIS_FRANCAIS[d.getMonth()] ?? null;
}

/**
 * Ce que la personne a décidé, saison après saison (C2.7, point 4).
 *
 * Le suivi ne lisait **jamais** `plan_cycles` ni `plan_actions` : le seul choix personnel que le
 * produit demande — une action, des jours — ne laissait aucune trace une fois la saison passée.
 *
 * **Une ligne par cycle, et c'est l'engagement vivant qui gagne.** Un cycle peut porter à la fois
 * une action engagée et des lignes d'archive (la personne a changé d'avis en cours de saison) ;
 * c'est la décision qui tient encore qui compte, et à défaut la dernière libérée — la plus récente
 * est celle qui a tenu le plus longtemps. Une archive sans cycle est écartée : elle n'aurait rien à
 * mettre à gauche de la ligne, et le cycle est ce qui nomme la saison.
 *
 * **Jamais un statut tenu / pas tenu, jamais un chiffre présenté comme un résultat obtenu.** C'est
 * une liste de décisions, pas un bulletin : le produit n'a aucun moyen de savoir si l'action a été
 * menée, seulement ce que la personne a répondu aux points — qui vivent dans leur propre carte.
 */
export type DecisionDeSaison = {
  cycleId: string;
  /** « Automne 2026 », tel que `plan_cycles.period_label` le fige. */
  periodLabel: string;
  periodStart: string;
  actionText: string;
  intentionDays: number[] | null;
  intentionTiming: string | null;
};

export type DecisionBrute = DecisionDeSaison & {
  /** `null` pour l'engagement encore en place ; la date de libération pour une ligne d'archive. */
  releasedAt: string | null;
};

export function decisionsParSaison(brutes: DecisionBrute[]): DecisionDeSaison[] {
  const parCycle = new Map<string, DecisionBrute>();

  for (const brute of brutes) {
    const tenante = parCycle.get(brute.cycleId);
    if (!tenante) {
      parCycle.set(brute.cycleId, brute);
      continue;
    }
    // L'engagement vivant gagne toujours ; entre deux archives, la plus récemment libérée.
    if (tenante.releasedAt === null) continue;
    if (brute.releasedAt === null || brute.releasedAt > tenante.releasedAt) {
      parCycle.set(brute.cycleId, brute);
    }
  }

  return [...parCycle.values()]
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : a.periodStart > b.periodStart ? -1 : 0))
    .map(({ releasedAt: _releasedAt, ...decision }) => decision);
}

/**
 * Les points répondus, regroupés par saison (C2.7, point 5).
 *
 * La liste était tronquée à huit **en silence**, sous un compteur global qui en annonçait
 * davantage : l'en-tête et la liste ne comptaient pas la même chose. Chaque groupe porte donc son
 * propre total, et la troncature devient visible et réversible (« Voir tout »).
 *
 * La saison passe par `saisonDuJour` et non par `saisonDe(new Date(...))` : `period_start` est une
 * date nue, donc interprétée en UTC, et un point du 1er septembre se rangerait dans l'été à l'ouest
 * de Greenwich. À défaut de saison — inatteignable, la colonne étant une `date` — le groupe garde le
 * libellé snapshoté du point, qui est un vrai libellé et non un nom inventé.
 */
export type GroupeDeSaison = {
  /** « Automne 2026 » — sert de clé de rendu et d'état « déplié ». */
  libelle: string;
  points: CheckinRecord[];
};

export function pointsParSaison(points: CheckinRecord[]): GroupeDeSaison[] {
  const groupes: GroupeDeSaison[] = [];
  const parLibelle = new Map<string, GroupeDeSaison>();

  for (const point of points) {
    const libelle = saisonDuJour(point.periodStart)?.libelle ?? point.periodLabel;
    const groupe = parLibelle.get(libelle);
    if (groupe) {
      groupe.points.push(point);
      continue;
    }
    const neuf = { libelle, points: [point] };
    parLibelle.set(libelle, neuf);
    groupes.push(neuf);
  }

  // L'ordre d'arrivée est celui de la lecture, du plus récent au plus ancien : on le garde plutôt
  // que de retrier sur le libellé, qui est du texte (« Hiver 2026-2027 » ne se compare pas).
  return groupes;
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
