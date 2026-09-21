// Forme locale du questionnaire — miroir de `assessment_answers` (mêmes noms de colonnes,
// mêmes valeurs de CHECK) pour un mapping direct à l'insert final, cf.
// docs/architecture/v1-05-bilan-v2.md §3.
import type { TransportModeId } from '@/constants/transport-modes';

export type DistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus';
export type LeisureDistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_plus';
export type LeisureFrequency = 'rarely' | 'weekly' | 'multiple_weekly';
export type ZoneType = 'urbain_dense' | 'periurbain' | 'rural';
export type TcAccess = 'bon' | 'limite' | 'inexistant';
export type HouseholdVehicles = '0' | '1' | '2_plus';
/**
 * B4.4 — « Peux-tu travailler depuis chez toi ? » (C3.8).
 *
 * Trois réponses et non deux, parce que les gabarits en lisent **deux seuils** : un jour de
 * télétravail se tient avec « un jour », deux jours demandent « deux ou plus ». Un booléen aurait
 * forcé à trancher pour la personne.
 *
 * **Les valeurs disent un nombre de jours depuis C5.4**, et « Parfois » n'existe plus : c'était une
 * réponse sans unité que le produit lisait comme un seuil, donc elle coûtait l'action à deux jours
 * sans que rien ne le dise (constat 13.1 de la recette web du 16/09/2026). La traduction
 * `non → aucun`, `parfois → un_jour`, `oui → deux_ou_plus` préserve exactement le comportement —
 * la migration le prouve par une table de vérité plutôt que de l'affirmer.
 */
export type Teletravail = 'aucun' | 'un_jour' | 'deux_ou_plus';
// Thermique/électrique change fortement le calcul (facteur ~9x plus faible pour
// l'électrique, cf. migration 20260904*_car_engine.sql) — une seule question de suivi,
// jamais une entrée séparée dans les listes de mode (qui resteraient "Voiture (seul)" /
// "Voiture (covoiturage)"), posée à chaque endroit où "voiture" peut être choisi.
export type CarEngine = 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique';

// Même mécanique pour le deux-roues, et pour une raison plus forte encore : l'écart entre un
// scooter électrique et une grosse cylindrée est d'un facteur 3,6 (0,0593 contre 0,2147), et
// **une grosse moto émet une fois et demie plus qu'une voiture thermique**. Compter les quatre
// au tarif du scooter, comme le produit le faisait, sous-estimait de 64 % l'empreinte d'un
// motard — dans le sens qui fait passer le deux-roues pour vertueux (cf. migration
// 20260905200000_cylindree_deux_roues.sql).
//
// Les libellés ne montrent pas la cylindrée brute : la frontière ADEME est à 250 cm³, mais
// c'est la distinction « petite / grosse cylindrée » que les gens ont en tête.
export type TwoWheelerType = 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse';

// C4.4, même mécanique encore, et cette fois le défaut était dans le **libellé** : le mode
// s'appelait « Train ou RER » et portait le facteur du TER, soit 2,83 fois celui du RER. Le
// produit promettait une chose et en comptait une autre, à tout usager du RER ou du Transilien.
export type TrainType = 'ter' | 'rer' | 'intercites';

// Et sous « Vélo » : l'assistance électrique vaut 64 fois le mécanique (0,010950 contre
// 0,000170). `velo` reste le mode du vélo mécanique — même facteur, mêmes mots —, donc
// « mecanique » et « pas de réponse » résolvent tous deux vers lui côté serveur.
export type VeloType = 'mecanique' | 'electrique';

export type BilanAnswers = {
  commute_has_regular_trip: boolean | null;
  commute_days_per_week: number | null;
  commute_distance_km: number | null;
  commute_distance_bracket: DistanceBracket | null;
  commute_mode: TransportModeId | null;
  commute_is_carpool: boolean;
  commute_carpool_size: number | null;
  /**
   * Y a-t-il un second mode ? — avec un troisième état, `null`, qui veut dire **pas encore
   * répondu** (recette du 14/09/2026, `v1-16` §4).
   *
   * Le défaut était `false`, donc « Non » arrivait coché sur un questionnaire vierge et
   * `manqueDeLEtape` laissait passer : on traversait la question sans jamais décider. Et le
   * défaut penchait du mauvais côté — « je n'ai pas de second mode » **sous-estime** un trajet
   * intermodal, sur le poste qui décide du poste dominant, donc du plan. C'est le motif que
   * C3.4, C3.5 et C3.6 ont corrigé partout ailleurs, resté ici parce qu'il préexistait à la
   * règle.
   *
   * **La colonne, elle, reste `not null`, et ce n'est pas une facilité.** `null` décrit un
   * questionnaire en cours, jamais un bilan : l'étape est visible exactement quand la question
   * s'applique, donc un bilan soumis porte toujours une réponse. La rendre nullable importerait
   * un état d'écran dans le schéma — et le calcul lit
   * `if a.commute_second_mode_used and a.commute_second_mode is not null`, où un `null` se
   * comporte **exactement comme `false`** : l'ambiguïté qu'on retire de l'écran reparaîtrait en
   * base, muette, à l'endroit précis où elle fausse un total.
   */
  commute_second_mode_used: boolean | null;
  commute_second_mode: TransportModeId | null;
  /**
   * Part du trajet faite avec le second mode, en fraction (C3.4).
   *
   * En fraction et non en énumération parce que c'est ce que le calcul multiplie : le SQL
   * n'a pas à traduire, et une quatrième nuance ne sera pas une migration de contrainte. Les
   * bornes sont strictes des deux côtés (`0 < x < 1`) — à 0 il n'y a pas de second mode, à 1
   * il n'y a plus de mode principal.
   */
  commute_second_mode_share: number | null;
  // Un seul champ pour les deux jambes (principale/second mode) : elles ne peuvent pas
  // valoir "voiture" toutes les deux à la fois (B1.7 exclut le mode déjà choisi en B1.4),
  // donc au plus une jambe est concernée à un instant donné.
  commute_car_engine: CarEngine | null;
  commute_two_wheeler_type: TwoWheelerType | null;
  /** Un seul champ pour les deux jambes, comme la motorisation juste au-dessus (C4.4). */
  commute_train_type: TrainType | null;
  commute_velo_type: VeloType | null;

  leisure_frequency: LeisureFrequency | null;
  leisure_mode: TransportModeId | null;
  leisure_distance_bracket: LeisureDistanceBracket | null;
  /**
   * Distance d'un aller sous la tranche ouverte « Plus de 30 km » (C3.6).
   *
   * La seule tranche du questionnaire sans borne haute était aussi la seule à ne rien
   * demander de plus : une sortie de 120 km comptait pour 40, sur un poste qui peut être
   * dominant. Le calcul la préfère à la tranche dès qu'elle existe (`coalesce`), donc
   * `normaliserReponses` l'efface sous toute autre tranche — sans quoi une valeur laissée
   * par un aller-retour écraserait silencieusement le milieu de tranche choisi.
   */
  leisure_distance_km: number | null;
  /** Vrai quand la sortie se fait en voiture partagée (C3.5) — la jumelle loisirs de
   *  `commute_is_carpool`, qui n'existait pas : une sortie à quatre comptait quatre fois. */
  leisure_is_carpool: boolean;
  leisure_carpool_size: number | null;
  leisure_car_engine: CarEngine | null;
  leisure_two_wheeler_type: TwoWheelerType | null;
  leisure_train_type: TrainType | null;
  leisure_velo_type: VeloType | null;

  flights_total_per_year: number;
  flights_short_per_year: number | null;
  train_long_trips_per_year: number;
  car_long_trips_per_year: number;
  car_long_trips_engine: CarEngine | null;
  /** Nombre de personnes dans la voiture sur un long trajet (C3.5) — 1 = seul. Partir à
   *  trois est plus courant sur 700 km qu'au quotidien, et le calcul supposait « seul »
   *  sans le dire. */
  car_long_trips_occupancy: number | null;
  /**
   * Le troisième compteur de B3.4 (C4.4) — l'autocar, qui n'existait nulle part, donc un
   * Paris-Lyon en car était compté comme s'il n'avait pas eu lieu.
   *
   * Pas de question de suivi sous ce compteur, et c'est la différence avec la voiture : l'autocar
   * est partagé par construction, son facteur ADEME est déjà par voyageur, et il n'a pas de
   * motorisation à choisir.
   */
  coach_long_trips_per_year: number;

  zone_type: ZoneType | null;
  tc_access: TcAccess | null;
  household_vehicles: HouseholdVehicles | null;
  /**
   * Ne se demande que s'il y a un trajet régulier : la question n'a pas d'objet sans lui, et les
   * deux gabarits qui la lisent sont des gabarits du poste domicile-travail.
   */
  teletravail: Teletravail | null;
};

export const EMPTY_BILAN_ANSWERS: BilanAnswers = {
  commute_has_regular_trip: null,
  commute_days_per_week: null,
  commute_distance_km: null,
  commute_distance_bracket: null,
  commute_mode: null,
  commute_is_carpool: false,
  commute_carpool_size: null,
  // `null` et non `false` : personne n'a encore répondu. Cf. le champ, qui porte la raison.
  commute_second_mode_used: null,
  commute_second_mode: null,
  commute_second_mode_share: null,
  commute_car_engine: null,
  commute_two_wheeler_type: null,
  commute_train_type: null,
  commute_velo_type: null,

  leisure_frequency: null,
  leisure_mode: null,
  leisure_distance_bracket: null,
  leisure_distance_km: null,
  leisure_is_carpool: false,
  leisure_carpool_size: null,
  leisure_car_engine: null,
  leisure_two_wheeler_type: null,
  leisure_train_type: null,
  leisure_velo_type: null,

  flights_total_per_year: 0,
  flights_short_per_year: null,
  train_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  car_long_trips_engine: null,
  car_long_trips_occupancy: null,
  coach_long_trips_per_year: 0,

  zone_type: null,
  tc_access: null,
  household_vehicles: null,
  teletravail: null,
};

/**
 * Les deux statuts d'un bilan, **miroir du `check` de `assessments.status`**
 * (`20260823094800_core_schema.sql` : `in ('in_progress', 'completed')`).
 *
 * La colonne est un `text` sans enum, donc `database.types.ts` la type `string` et rien, au
 * typecheck, ne distingue `'completed'` de `'complete'`. **Chaque requête qui filtre sur ce statut
 * lit donc ceci, et aucune ne réécrit la valeur** — un `.eq('status', …)` faux ne serait vu par
 * personne avant la recette, et il se lirait « Ton bilan n'est pas encore fait » pour tout le
 * monde. Le compte de ces sites ne s'écrit pas ici : celui qui y figurait (« six ») était faux le
 * jour même — il y en avait neuf — et c'est la règle que `CLAUDE.md` s'est déjà donnée sur le point
 * de résolution, où un « six endroits » écrit une fois avait vieilli en silence.
 *
 * Deux gardes, et elles ne regardent pas la même chose : le test de ce fichier épingle les deux
 * valeurs **sans base**, et `scripts/verifier-miroirs-de-check.mjs` les compare au `check` réel
 * dans le travail `db-tests`. La première dit que le code ne se contredit pas, la seconde que la
 * base n'a pas changé d'avis.
 *
 * `enCours` est l'état que rien ne lit (la soumission l'écrit d'abord, pour qu'une panne entre
 * deux écritures ne laisse pas un bilan fantôme — CLAUDE.md) ; `complete` est celui sur lequel la
 * racine route et que le cron sélectionne.
 */
export const STATUT_DE_BILAN = { enCours: 'in_progress', complete: 'completed' } as const;
export type StatutDeBilan = (typeof STATUT_DE_BILAN)[keyof typeof STATUT_DE_BILAN];

/**
 * Les trois parts proposées pour le second mode du trajet domicile-travail (C3.4).
 *
 * **Miroir des bornes du schéma**, pas un choix d'écran : `assessment_answers` porte
 * `check (commute_second_mode_share > 0 and commute_second_mode_share < 1)`, et les trois
 * valeurs tiennent dedans avec de la marge. Une quatrième nuance s'ajoute ici seule ; une
 * valeur hors bornes ne serait refusée qu'à la soumission, en anglais, neuf étapes trop tard.
 *
 * Les libellés disent « environ » là où le chiffre ne se sent pas : personne ne sait quelle
 * fraction exacte de son trajet il fait à vélo, et prétendre le contraire ferait hésiter sur
 * une réponse dont l'ordre de grandeur suffit.
 */
export const PARTS_DU_SECOND_MODE: { value: number; label: string }[] = [
  { value: 0.25, label: 'Un quart environ' },
  { value: 0.5, label: 'La moitié environ' },
  { value: 0.75, label: 'Les trois quarts environ' },
];

/**
 * Les trois réponses à B4.4 (C3.8).
 *
 * L'échelle reste courte — trois puces, aucune précision qui s'ouvre — mais elle porte l'unité que
 * le calcul lit. Le nombre de jours de trajet vient de B1.2 et s'écrit dans la question.
 */
export const REPONSES_TELETRAVAIL: {
  value: Teletravail;
  label: string;
  /**
   * Ce que le lecteur d'écran annonce (handoff `v1-17`, planche D), et il n'est pas décoratif :
   * la puce est annoncée **seule**, détachée de la question posée trois lignes plus haut, donc
   * « Aucun » n'y dit rien du tout. Même raison que les initiales des jours de la semaine, qui
   * portent déjà cette prop sur `Chip`. Porté après coup par la contre-lecture du lot 5 — C5.4
   * avait écrit les trois libellés visibles et oublié ceux-là.
   */
  accessibilityLabel: string;
}[] = [
  { value: 'aucun', label: 'Aucun', accessibilityLabel: 'Aucun jour' },
  { value: 'un_jour', label: 'Un jour', accessibilityLabel: 'Un jour par semaine' },
  {
    value: 'deux_ou_plus',
    label: 'Deux ou plus',
    accessibilityLabel: 'Deux jours par semaine ou plus',
  },
];

/**
 * La question du télétravail se pose-t-elle ?
 *
 * **Écrite une fois et lue par les trois endroits qui doivent dire la même chose** — l'écran pour
 * afficher, `manqueDeLEtape` pour réclamer, `normaliserReponses` pour effacer. Même motif que
 * `distanceDomicileTravailKm`, partagée entre la complétude de l'étape et l'insert, et pour la même
 * raison : `teletravail` n'est pas une étape mais un **champ** de l'étape « Contexte », donc
 * `isStepVisible` ne le gouverne pas. En oublier un coûte cher, et pas de la même façon (v1-17
 * §7.2) — ne toucher que l'écran laisse « Suivant » inactif pour toujours sous un message qui nomme
 * une question absente ; oublier `normaliserReponses` laisse partir à la soumission une réponse que
 * la personne ne voit plus et ne peut plus corriger, ce qui est le défaut de `v1-16` §4 par une
 * autre porte.
 *
 * Deux conditions, et la seconde est celle de C5.4 : à **un seul jour** de trajet, « travailler
 * depuis chez toi un jour par semaine » supprimerait 100 % du trajet, et la garde du `remove_day`
 * l'écarte déjà (`commute_days_per_week <= t.trips`). La réponse ne pourrait donc rien changer, et
 * poser une question dont la réponse ne change rien est exactement le défaut que ce chantier
 * corrige, retourné.
 *
 * Un nombre de jours inconnu vaut « ne se pose pas » : la question **nomme** ce nombre, donc sans
 * lui elle ne peut même pas s'écrire.
 */
export function teletravailSePose(
  // **Le trajet déclaré suffit, et le type le dit depuis C6.4** : l'écran de contexte autonome lit
  // ces deux colonnes sur `assessment_answers` sans reconstruire un `BilanAnswers` entier. Un
  // `BilanAnswers` satisfait toujours ce `Pick`, donc les trois appels du questionnaire ne bougent
  // pas — et il n'y a toujours **qu'un** prédicat, ce qui est tout l'enjeu de `v1-17` §7.2.
  answers: Pick<BilanAnswers, 'commute_has_regular_trip' | 'commute_days_per_week'>
): boolean {
  return (
    answers.commute_has_regular_trip !== false &&
    answers.commute_days_per_week !== null &&
    answers.commute_days_per_week >= 2
  );
}

/** Le plafond du covoiturage, borne haute du `check` des deux colonnes. */
const PLAFOND_COVOITURAGE = 6;

/**
 * Les tailles de covoiturage proposées, pour le trajet quotidien comme pour les sorties.
 *
 * Une seule table pour les deux écrans depuis C3.5 : `commute_carpool_size` et
 * `leisure_carpool_size` portent le **même** `check (>= 2 and <= 6)`, et deux listes
 * recopiées auraient divergé au premier ajout. La dernière vaut « ce nombre ou plus », comme
 * la puce de plafond des longs trajets.
 *
 * **Elle porte son libellé accessible, et il est dérivé.** L'œil lit « 6+ » ; un lecteur
 * d'écran, lui, annonçait « six plus ». Le plafond est nommé une fois et les deux libellés en
 * descendent, pour la raison qui vaut déjà sur les longs trajets : une valeur recopiée ferait
 * annoncer « 6 personnes ou plus » sur une puce qui aurait cessé d'être le plafond. Les autres
 * disent « N personnes » plutôt que le chiffre nu — les deux questions demandent un nombre de
 * personnes, et la puce sortie de sa question ne dit plus de quoi elle compte.
 */
export const TAILLES_DE_COVOITURAGE: {
  value: number;
  label: string;
  accessibilityLabel: string;
}[] = [2, 3, 4, 5, PLAFOND_COVOITURAGE].map((n) => ({
  value: n,
  label: n === PLAFOND_COVOITURAGE ? `${n}+` : String(n),
  accessibilityLabel:
    n === PLAFOND_COVOITURAGE ? `${n} personnes ou plus` : `${n} personnes`,
}));

/**
 * Le nombre de personnes dans la voiture sur un long trajet (B3.4, C3.5).
 *
 * S'arrête à 5 là où le covoiturage quotidien va à 6 : un long trajet se fait en voiture
 * familiale, pas en minibus — et c'est la borne du `check` de la colonne. Commence à 1, qui
 * est une réponse (« seul »), pas une absence : c'est justement la valeur que le calcul
 * supposait sans jamais la demander.
 */
export const OCCUPATIONS_LONG_TRAJET: number[] = [1, 2, 3, 4, 5];

export const BILAN_STEP_ORDER = [
  'commute_has_trip',
  'commute_days_distance',
  'commute_mode',
  'commute_extra',
  'leisure_frequency',
  'leisure_detail',
  'flights',
  'long_trips',
  'context',
] as const;

export type BilanStepId = (typeof BILAN_STEP_ORDER)[number];

/**
 * Le libellé de section de l'en-tête du questionnaire.
 *
 * **Un seul libellé par poste dans tout le produit** (C2.6) : c'est ici que « Weekend et
 * loisirs » devenait « Loisirs du week-end » une fois le bilan rendu, et « Voyages sur l'année »
 * devenait « Voyages longue distance ». Trois noms pour le même poste selon l'écran — le canvas
 * v1-14 (planche G) tranche pour celui de la restitution et du suivi.
 *
 * Écart assumé au handoff, qui écrivait « Weekend et loisirs » : le handoff nommait une **étape
 * du questionnaire**, le produit nomme un **poste**, et c'est le poste que la personne retrouve
 * partout ensuite.
 *
 * « Domicile-travail » reste court : c'est le seul libellé où la forme longue
 * (« Trajet domicile-travail ») sonnerait redondante en face de « Étape 3 sur 9 ».
 */
export const BILAN_SECTION_LABEL: Record<BilanStepId, string> = {
  commute_has_trip: 'Domicile-travail',
  commute_days_distance: 'Domicile-travail',
  commute_mode: 'Domicile-travail',
  commute_extra: 'Domicile-travail',
  leisure_frequency: 'Loisirs du week-end',
  leisure_detail: 'Loisirs du week-end',
  flights: 'Voyages longue distance',
  long_trips: 'Voyages longue distance',
  context: 'Contexte de mobilité',
};

// Un pas n'est affiché que si sa condition d'affichage est vraie — toujours déterminée
// par une réponse à une étape *antérieure*, donc toujours connue au moment d'afficher
// ce pas (cf. discussion increment 7 : permet un recalcul de "Étape N sur M" purement
// dérivé de l'état courant, sans logique de prévision). Question pas encore répondue
// (valeur `null`) => visible par défaut (optimiste), exactement comme B1.1 affiche
// "Étape 1 sur 9" avant même d'avoir répondu — seule une réponse qui déclenche
// explicitement le saut (Non / rarement) exclut le pas.
export function isStepVisible(step: BilanStepId, answers: BilanAnswers): boolean {
  switch (step) {
    case 'commute_days_distance':
    case 'commute_mode':
    case 'commute_extra':
      return answers.commute_has_regular_trip !== false;
    case 'leisure_detail':
      return answers.leisure_frequency !== 'rarely';
    default:
      return true;
  }
}

export function visibleSteps(answers: BilanAnswers): BilanStepId[] {
  return BILAN_STEP_ORDER.filter((step) => isStepVisible(step, answers));
}

export function nextStep(current: BilanStepId, answers: BilanAnswers): BilanStepId | null {
  const idx = BILAN_STEP_ORDER.indexOf(current);
  for (let i = idx + 1; i < BILAN_STEP_ORDER.length; i++) {
    if (isStepVisible(BILAN_STEP_ORDER[i], answers)) return BILAN_STEP_ORDER[i];
  }
  return null;
}

export function previousStep(current: BilanStepId, answers: BilanAnswers): BilanStepId | null {
  const idx = BILAN_STEP_ORDER.indexOf(current);
  for (let i = idx - 1; i >= 0; i--) {
    if (isStepVisible(BILAN_STEP_ORDER[i], answers)) return BILAN_STEP_ORDER[i];
  }
  return null;
}

/**
 * Les nombres de 1 à 9, en lettres — l'écran de reprise en dit deux dans la même phrase.
 *
 * Écrits et non calculés : le questionnaire a neuf étapes et n'en aura jamais des dizaines, donc
 * une table de neuf entrées est plus courte et plus sûre qu'une conversion. Au-delà, la phrase
 * n'aurait de toute façon plus de sens.
 */
const ECRANS_EN_LETTRES = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
] as const;

function enLettres(nombre: number): string {
  return ECRANS_EN_LETTRES[nombre - 1] ?? String(nombre);
}

/**
 * Où en est un brouillon, en toutes lettres — « Quatre écrans déjà remplis. Il en reste cinq, en
 * comptant celui-ci. » (C3.9, canvas v1-14 planche G).
 *
 * **Le total se dérive, il ne s'écrit pas** : le questionnaire saute des étapes selon les réponses
 * (pas de trajet régulier, loisirs « rarement »), donc « sur 9 » serait faux pour une bonne part
 * des brouillons. C'est `visibleSteps` qui décide, la même fonction que l'en-tête « Étape N sur M »
 * et que la navigation — trois lectures d'une seule vérité.
 *
 * Deux cas que la phrase du canvas ne couvre pas et qu'il faut tenir :
 *
 *   - **zéro écran rempli** : la première moitié disparaît plutôt que d'annoncer « Aucun écran
 *     déjà rempli », qui est une façon de dire à quelqu'un qu'il n'a rien fait. Même règle que le
 *     récapitulatif de la carte d'ouverture (C2.8), qui ne dit jamais zéro ;
 *   - **une étape devenue invisible** : un brouillon peut porter une étape que ses propres réponses
 *     excluent désormais. Aucun chemin du produit ne produit cet état et rien ne le corrigerait —
 *     le questionnaire rend l'étape telle quelle, contrairement à ce que disait cette phrase — donc
 *     on se contente de ne pas compter l'écran courant parmi ce qui reste (relevé le 14/09/2026).
 */
export function avancementDeLaReprise(step: BilanStepId, answers: BilanAnswers): string {
  const visibles = visibleSteps(answers);
  // **Le compte est la position, et c'est exact sur le chemin normal** : « Suivant » est inactif
  // tant que l'étape n'est pas complète, donc tout écran derrière celui-ci a bel et bien été rempli.
  //
  // **Compter la complétude serait pire**, et l'essai a été fait (contre-lecture de la vague 6, le
  // 14/09/2026) : `commute_extra` — le second mode, facultatif — est complète sans aucune réponse,
  // donc `visibles.filter(isStepComplete).length` annonce « Trois écrans déjà remplis » sur un
  // brouillon que personne n'a touché. Une imprécision rare échangée contre une fausseté à chaque
  // première reprise. L'imprécision qui reste, assumée : un brouillon dont tous les écrans sont
  // renseignés mais qu'on a quitté après un « Retour » sous-compte ce qui est derrière. Rien ne
  // permet de distinguer un écran facultatif renseigné d'un écran facultatif jamais vu.
  const position = visibles.indexOf(step);
  const remplis = position < 0 ? 0 : position;
  const restants = visibles.length - remplis;

  const reste = `Il en reste ${enLettres(restants)}, en comptant celui-ci.`;
  if (remplis === 0) return reste;

  const pluriel = remplis > 1 ? 's' : '';
  const debut = `${enLettres(remplis)} écran${pluriel} déjà rempli${pluriel}.`;
  return `${debut.charAt(0).toUpperCase()}${debut.slice(1)} ${reste}`;
}

/**
 * Remet à zéro les réponses qu'un changement vient de rendre impossibles — appliquée après
 * chaque `update` du questionnaire, et à la relecture d'un brouillon.
 *
 * Elle existe parce que ces remises à zéro étaient tenues à la main dans trois écrans, avec
 * trois listes qui divergeaient déjà (audit A2-17, A2-4) :
 *
 *  - changer le mode principal effaçait la motorisation sans regarder si le **second** mode,
 *    lui, était encore une voiture — réponse perdue, et le calcul qui retombe sur le mode
 *    générique, soit jusqu'à 2,1× d'écart sur cette jambe, sans un mot ;
 *  - répondre « Non » à B1.1 effaçait neuf champs et oubliait le type de deux-roues ;
 *  - et surtout, changer le mode principal pour celui déjà choisi en second laissait les deux
 *    jambes sur « voiture » : la ligne n'apparaissait plus nulle part (B1.7 filtre le mode
 *    principal), « Suivant » restait actif, et la moitié du trajet était facturée au tarif
 *    solo alors que la personne venait de déclarer covoiturer.
 *
 * Rien ici n'invente une réponse : la fonction n'efface que ce qu'aucune question de l'écran
 * ne porte plus. Elle est idempotente, et c'est voulu — elle s'applique aussi à un brouillon
 * ou à un bilan relu, qui ont pu être écrits avant ces règles.
 *
 * **Une question disparue de l'écran ne suffit pourtant pas à effacer son champ** : ce qui
 * décide, c'est ce que le calcul lit encore. La branche « rarement » des loisirs en est
 * l'exemple, et elle est commentée sur place.
 */
export function normaliserReponses(reponses: BilanAnswers): BilanAnswers {
  const a = { ...reponses };

  // Pas de trajet régulier : toute la section 1 disparaît de l'écran. Les champs qui en
  // dépendent — taille du covoiturage, second mode, motorisation, type de deux-roues —
  // tombent par les règles ci-dessous, il n'y a pas à les répéter ici : c'est précisément
  // cette répétition qui avait oublié le type de deux-roues dans B1.1.
  //
  // `commute_second_mode_used` est la seule remise à zéro qui doit se faire **ici**, et il ne
  // faut pas la retirer : aucune règle en dessous ne peut savoir qu'il n'y a plus de trajet
  // auquel rattacher une seconde jambe — celle du second mode lit ce drapeau, elle ne le
  // contredit pas. Sans cette ligne, `commute_second_mode` survit à un « Non ».
  //
  // **Et c'est `false` et non `null`**, à l'inverse de la règle du même nom plus bas (`v1-16`
  // §4) : ici la question ne s'applique pas, elle n'est pas « à reposer » — l'étape est
  // invisible. C'est aussi ce qui rend inatteignable le repli de l'insert : sans trajet
  // régulier on écrit `false`, avec trajet régulier l'étape exige une réponse.
  if (a.commute_has_regular_trip === false) {
    a.commute_days_per_week = null;
    a.commute_distance_km = null;
    a.commute_distance_bracket = null;
    a.commute_mode = null;
    a.commute_is_carpool = false;
    a.commute_second_mode_used = false;
  }

  // C3.8 puis C5.4 : B4.4 ne se pose pas sans trajet régulier, ni en dessous de deux jours de
  // trajet. **Ce qui décide de l'afficher décide aussi de l'effacer** — les deux lisent
  // `teletravailSePose`, sans quoi quelqu'un qui répond à 3 jours puis redescend à 1 jour envoie
  // à la soumission une réponse qu'aucun écran ne lui montre plus (v1-17 §7.2).
  if (!teletravailSePose(a)) {
    a.teletravail = null;
  }

  // Un kilométrage saisi et une tranche ne coexistent pas. Le calcul fait
  // `coalesce(a.commute_distance_km, <milieu de tranche>)`
  // (supabase/migrations/20260905130000_actions_chiffrees.sql) : dès qu'un kilométrage existe,
  // la tranche est morte au calcul tout en continuant de piloter l'écran — la liste de
  // tranches s'ouvre sur sa présence, et la phrase « On comptera environ N km » annoncerait
  // alors une distance que le calcul n'utilise pas. Les deux liens de l'étape s'effacent l'un
  // l'autre, donc l'UI d'aujourd'hui ne produit pas cet état ; un brouillon écrit avant cette
  // règle ou un bilan relu, oui.
  if (distanceDomicileTravailKm(a) !== null) a.commute_distance_bracket = null;

  // Le covoiturage ne se déclare que sur une voiture : B1.4 le porte dans le choix lui-même
  // (« Voiture (covoiturage) »), aucune autre ligne ne peut l'activer.
  if (a.commute_mode !== 'voiture') a.commute_is_carpool = false;
  if (!a.commute_is_carpool) a.commute_carpool_size = null;

  // État inatteignable en avant (B1.7 exclut le mode principal de sa liste), fabriqué par un
  // retour en arrière — et que le calcul suppose impossible, cf. `commute_car_engine`.
  //
  // **On repose la question au lieu d'y répondre à sa place** (`v1-16` §4) : cette ligne écrivait
  // `false`, c'est-à-dire « Non » pour quelqu'un qui venait de dire « Oui, train » avant de
  // passer son mode principal au train. C'est le défaut du chantier dans un autre habit — un
  // binaire qu'on n'a pas choisi. `null` rend l'étape incomplète, donc la question revient.
  if (a.commute_second_mode !== null && a.commute_second_mode === a.commute_mode) {
    a.commute_second_mode = null;
    a.commute_second_mode_used = null;
  }
  // `null` passe ici comme `false` — pas de réponse, donc pas de second mode à garder.
  if (!a.commute_second_mode_used) a.commute_second_mode = null;
  // C3.4 : la part n'a de sens qu'attachée à un second mode. Sans cette ligne, répondre
  // « un quart » puis revenir à « Non » laissait une fraction orpheline que l'insert aurait
  // écrite — et que le calcul aurait ignorée, la branche entière étant gardée par
  // `commute_second_mode_used`. Une réponse écrite mais jamais lue est pire qu'absente : elle
  // reparaît telle quelle dans le re-bilan prérempli, sous une question qu'on ne pose plus.
  if (a.commute_second_mode === null) a.commute_second_mode_share = null;

  // Un seul champ de motorisation pour les deux jambes (cf. `BilanAnswers`) : il ne s'efface
  // que si plus aucune des deux ne porte le mode concerné.
  if (a.commute_mode !== 'voiture' && a.commute_second_mode !== 'voiture') {
    a.commute_car_engine = null;
  }
  if (
    a.commute_mode !== 'deux_roues_motorise' &&
    a.commute_second_mode !== 'deux_roues_motorise'
  ) {
    a.commute_two_wheeler_type = null;
  }
  // C4.4 : mêmes deux jambes, même champ unique, même règle d'effacement.
  if (a.commute_mode !== 'train' && a.commute_second_mode !== 'train') {
    a.commute_train_type = null;
  }
  if (a.commute_mode !== 'velo' && a.commute_second_mode !== 'velo') {
    a.commute_velo_type = null;
  }

  // Loisirs : un seul mode, donc une seule jambe à regarder — **sauf sur « rarement »**, et
  // cette exception tient au calcul, pas à l'écran. `recompute_assessment_results` y force le
  // mode à « voiture » (`leisure_default_mode`) et résout quand même la motorisation avec
  // `a.leisure_car_engine` : effacer la motorisation parce que l'étape loisirs a disparu ferait
  // retomber le poste sur la voiture générique, 0,142253 au lieu de 0,067365 pour une
  // électrique — 2,1× plus lourd, dans le sens qui alourdit l'empreinte de quelqu'un qui roule
  // à l'électrique. Revenir à « une fois par semaine » repose la question du mode, et la règle
  // reprend alors la main.
  if (a.leisure_frequency === 'rarely') {
    // **Le mode et la tranche partent, la motorisation reste** — et c'est ici, pas dans l'écran.
    // L'étape B2.1 tenait sa propre liste de remises à zéro, donc les deux chemins d'entrée dans le
    // questionnaire ne convergeaient pas : cliquer « Rarement » effaçait, relire un brouillon non
    // (relevé le 14/09/2026). Sans conséquence sur le calcul — `recompute_assessment_results` force
    // le mode à `leisure_default_mode` dans cette branche — mais c'est exactement le genre d'écart
    // que cette fonction existe pour ne pas avoir à vérifier écran par écran.
    a.leisure_mode = null;
    a.leisure_distance_bracket = null;
    a.leisure_distance_km = null;
    // **Le covoiturage part, la motorisation reste — et la règle du dessus ne s'applique pas
    // ici.** Le calcul lit encore les deux dans cette branche : il divise par
    // `leisure_carpool_size` quel que soit le mode, donc laisser le drapeau diviserait le
    // résiduel de « rarement » (15 km, 0,25 sortie par semaine) par une taille déclarée pour
    // une sortie qui n'est plus déclarée. La motorisation, elle, décrit le **véhicule** de la
    // personne et rend le résiduel plus juste ; le covoiturage décrit un **trajet** qui
    // n'existe plus.
    //
    // Ce que cette ligne ne fait **pas** : garder vraie la promesse de la migration C3.5, qu'un
    // bilan « rarement » déjà soumis rende le même total qu'avant. Celle-là tient au **défaut de
    // la colonne** — `leisure_is_carpool` n'existait pas, donc aucune ligne ancienne ne la porte
    // à vrai — et rien de ce qui s'écrit ici ne touche un bilan déjà en base. L'en créditer
    // ferait croire cette promesse gardée par un test qui ne l'éprouve pas.
    a.leisure_is_carpool = false;
    // **Le type de train et le type de vélo partent avec le covoiturage, pas avec la
    // motorisation** (C4.4), et l'asymétrie mérite d'être dite parce qu'elle n'est pas
    // évidente : la motorisation décrit le **véhicule** de la personne, qu'elle possède
    // encore, donc elle rend le résiduel plus juste ; un type de train ou de vélo décrit un
    // **trajet** qu'on ne déclare plus. Et il y a une conséquence mesurable — le résiduel de
    // « rarement » vaut `train` quand le foyer n'a pas de voiture, donc un `leisure_train_type`
    // survivant y serait lu, et un bilan resoumis à l'identique changerait de total.
    a.leisure_train_type = null;
    a.leisure_velo_type = null;
  } else {
    if (a.leisure_mode !== 'voiture') a.leisure_car_engine = null;
    if (a.leisure_mode !== 'deux_roues_motorise') a.leisure_two_wheeler_type = null;
    if (a.leisure_mode !== 'train') a.leisure_train_type = null;
    if (a.leisure_mode !== 'velo') a.leisure_velo_type = null;
    // Le covoiturage de loisirs ne se déclare que sur une voiture, comme celui du quotidien :
    // c'est le choix « Voiture (covoiturage) » de B2.2 qui le porte, aucune autre ligne.
    if (a.leisure_mode !== 'voiture') a.leisure_is_carpool = false;
    // C3.6 : la distance libre n'est proposée que sous la tranche ouverte, mais le calcul la
    // préfère à **toute** tranche dès qu'elle existe (`coalesce(a.leisure_distance_km, …)`).
    // Sans cette ligne, quelqu'un qui saisit 120 km puis redescend sur « 5 à 15 km » repart
    // avec 120 : la tranche affichée et la distance calculée ne diraient plus la même chose.
    if (a.leisure_distance_bracket !== '30_plus') a.leisure_distance_km = null;
  }
  if (!a.leisure_is_carpool) a.leisure_carpool_size = null;

  // Voyages : la motorisation ne tient qu'à la présence d'un trajet en voiture. Rien à
  // normaliser pour la part de vols courts — `0` et `null` sont équivalents au calcul
  // (`coalesce(flights_short_per_year, 0)` côté SQL), et B3.1 écrit l'un ou l'autre.
  if (a.car_long_trips_per_year === 0) {
    a.car_long_trips_engine = null;
    a.car_long_trips_occupancy = null;
  }

  return a;
}

/**
 * Ce qu'on garde d'une frappe dans un champ de distance : les chiffres et **un seul**
 * séparateur décimal.
 *
 * Le champ filtrait tout ce qui n'était pas un chiffre, puis convertissait le reste : « 3,5 »
 * ne donnait ni erreur ni refus, il donnait **35** (audit A2-3). Le clavier numérique
 * d'Android propose une virgule, le geste est rapide, et l'erreur porte sur le poste le plus
 * lourd de la majorité des bilans, multiplié par deux fois le nombre de jours et par
 * quarante-cinq semaines : un trajet de 2,5 km en voiture devenait 25 km.
 *
 * La virgule est conservée telle quelle — c'est le séparateur français, et le réécrire en
 * point sous les doigts de la personne serait pire que le problème ; la conversion en nombre
 * se fait à part. Un second séparateur est ignoré, ses chiffres restent : on ne fabrique
 * jamais une saisie à deux virgules, dont aucune valeur ne serait évidente.
 */
export function nettoyerSaisieNumerique(texte: string): string {
  let separateurVu = false;
  let nettoye = '';
  for (const caractere of texte) {
    if (caractere >= '0' && caractere <= '9') {
      nettoye += caractere;
    } else if ((caractere === ',' || caractere === '.') && !separateurVu) {
      separateurVu = true;
      nettoye += ',';
    }
  }
  return nettoye;
}

/** Valeur portée par une saisie, ou `null` si elle ne porte aucun chiffre (« » ou « , »). */
export function saisieVersNombre(saisie: string): number | null {
  if (!/[0-9]/.test(saisie)) return null;
  const nombre = Number(saisie.replace(',', '.'));
  return Number.isFinite(nombre) ? nombre : null;
}

/** Une valeur numérique telle qu'un champ de saisie français doit l'afficher. */
export function afficherNombreSaisi(valeur: number | null): string {
  return valeur === null ? '' : String(valeur).replace('.', ',');
}

/**
 * Distance retenue pour un aller domicile-travail, ou `null` si la réponse n'en porte pas.
 *
 * **Un « 0 » saisi n'est pas une distance.** La colonne porte `check (commute_distance_km > 0)`
 * et `manqueDeLEtape` ne testait que la nullité : le zéro traversait les neuf étapes et
 * n'échouait qu'à la soumission, en anglais, sans désigner ni le champ ni l'étape — au pire
 * moment du produit (audit A2-1). Une seule définition, lue par la complétude de l'étape et
 * par l'insert, pour qu'elles ne puissent pas diverger.
 */
export function distanceDomicileTravailKm(reponses: BilanAnswers): number | null {
  const km = reponses.commute_distance_km;
  return km !== null && km > 0 ? km : null;
}

/**
 * Distance retenue pour un aller de sortie, ou `null` si la réponse n'en porte pas (C3.6).
 *
 * Jumelle exacte de `distanceDomicileTravailKm`, pour la même raison et avec le même piège :
 * la colonne porte `check (leisure_distance_km > 0)`, donc un « 0 » saisi n'est pas une
 * distance et ne doit pas franchir la soumission. Une seule définition, lue par la complétude
 * de l'étape et par l'insert.
 */
export function distanceSortieKm(reponses: BilanAnswers): number | null {
  const km = reponses.leisure_distance_km;
  return km !== null && km > 0 ? km : null;
}

/**
 * Au-delà de quoi un aller domicile-travail mérite une relecture — **jamais un blocage** : un
 * aller de 250 km existe (TGV quotidien), et le produit ne dit pas à quelqu'un que son trajet
 * est faux. À cinq jours par semaine, 200 km par aller valent déjà 90 000 km par an : c'est
 * l'ordre de grandeur où un chiffre saisi de travers (1200 au lieu de 120) rend tout le bilan
 * faux sans que rien ne le signale.
 */
export const COMMUTE_DISTANCE_A_RELIRE_KM = 200;

export function distanceDomicileTravailARelire(reponses: BilanAnswers): boolean {
  const km = distanceDomicileTravailKm(reponses);
  return km !== null && km > COMMUTE_DISTANCE_A_RELIRE_KM;
}

// Conditionne l'activation du bouton "Suivant" — un pas est complet quand tous les
// champs qu'il affiche (compte tenu de ses propres sous-conditions internes) sont
// renseignés.
/**
 * Ce qui manque encore à une étape, nommé — ou `null` si elle est complète.
 *
 * Existe parce qu'un bouton grisé ne dit pas pourquoi. Sur l'étape loisirs, choisir
 * « Voiture » déplie la question de motorisation, qui repousse la tranche de distance sous la
 * ligne de flottaison : « Suivant » reste inactif, la personne voit une étape qu'elle croit
 * finie, et rien n'indique qu'il reste un champ plus bas (retour d'appareil du 07/09/2026).
 * Le même défaut guette partout où une étape porte plusieurs champs.
 *
 * **`isStepComplete` en dérive**, et ce n'est pas un raffinement : deux listes de conditions
 * tenues en parallèle finiraient par diverger, et l'écart serait silencieux — un bouton actif
 * sur une étape incomplète, ou un message qui réclame un champ déjà rempli.
 */
export function manqueDeLEtape(step: BilanStepId, answers: BilanAnswers): string | null {
  switch (step) {
    case 'commute_has_trip':
      return answers.commute_has_regular_trip === null ? 'une réponse' : null;
    case 'commute_days_distance':
      if (answers.commute_days_per_week === null) return 'le nombre de jours par semaine';
      // Un « 0 » n'est pas une réponse — cf. `distanceDomicileTravailKm`.
      if (
        distanceDomicileTravailKm(answers) === null &&
        answers.commute_distance_bracket === null
      )
        return 'la distance';
      return null;
    case 'commute_mode':
      if (answers.commute_mode === null) return 'ton mode de transport';
      if (answers.commute_mode === 'voiture' && answers.commute_car_engine === null)
        return 'la motorisation';
      if (answers.commute_mode === 'deux_roues_motorise' && answers.commute_two_wheeler_type === null)
        return 'le type de deux-roues';
      // C4.4 : obligatoires dès que leur déclencheur est là, comme la motorisation. Laisser le
      // choix facultatif reviendrait à garder le défaut — le TER — pour tous ceux qui passent
      // sans répondre, c'est-à-dire exactement le défaut que ce chantier corrige.
      if (answers.commute_mode === 'train' && answers.commute_train_type === null)
        return 'le type de train';
      if (answers.commute_mode === 'velo' && answers.commute_velo_type === null)
        return 'le type de vélo';
      // La taille du covoiturage vient de l'étape suivante (recette du 14/09/2026, `v1-16` §3) :
      // elle se rend désormais sous « Voiture (covoiturage) », après la motorisation, comme la
      // jumelle des sorties. Elle reste obligatoire pour la raison qui vaut des deux côtés : le
      // calcul ne divise que si elle est renseignée, donc sans elle le choix « covoiturage » ne
      // change **rien** au chiffre.
      if (answers.commute_is_carpool && answers.commute_carpool_size === null)
        return 'le nombre de personnes dans la voiture';
      return null;
    case 'commute_extra':
      // **En tête, parce que c'est la première chose que l'écran demande** (`v1-16` §4). Sans
      // cette ligne, un questionnaire vierge traversait la question : le défaut répondait
      // « Non », et « Non » sous-estime un trajet intermodal. Un re-bilan prérempli arrive avec
      // une vraie réponse et ne bute pas ici.
      if (answers.commute_second_mode_used === null) return 'une réponse sur le second mode';
      if (answers.commute_second_mode_used && answers.commute_second_mode === null)
        return 'le second mode';
      if (answers.commute_second_mode === 'voiture' && answers.commute_car_engine === null)
        return 'la motorisation';
      if (
        answers.commute_second_mode === 'deux_roues_motorise' &&
        answers.commute_two_wheeler_type === null
      )
        return 'le type de deux-roues';
      if (answers.commute_second_mode === 'train' && answers.commute_train_type === null)
        return 'le type de train';
      if (answers.commute_second_mode === 'velo' && answers.commute_velo_type === null)
        return 'le type de vélo';
      // En dernier, et pour la même raison que la distance des loisirs : la part se rend sous
      // la précision du mode, donc on ne la nomme qu'une fois le reste rempli.
      //
      // **Elle est demandée et non supposée** (C3.4). Le calcul en avait une — la moitié
      // exacte — et l'appliquait à tout le monde : vélo + train sous-estimé de 44 %, parc-relais
      // surestimé de 51 %, sur le poste qui décide du poste dominant et donc du plan. Trois
      // puces sous un mode qu'on vient de choisir coûtent moins que cette erreur-là. Un
      // re-bilan prérempli d'avant C3.4 arrive sans la réponse et bute ici : c'est voulu, c'est
      // exactement le bilan dont le chiffre était faux.
      if (answers.commute_second_mode !== null && answers.commute_second_mode_share === null)
        return 'la part de ce second mode';
      return null;
    case 'leisure_frequency':
      return answers.leisure_frequency === null ? 'ta fréquence' : null;
    case 'leisure_detail':
      if (answers.leisure_mode === null) return 'ton mode de transport';
      if (answers.leisure_mode === 'voiture' && answers.leisure_car_engine === null)
        return 'la motorisation';
      if (answers.leisure_mode === 'deux_roues_motorise' && answers.leisure_two_wheeler_type === null)
        return 'le type de deux-roues';
      if (answers.leisure_mode === 'train' && answers.leisure_train_type === null)
        return 'le type de train';
      if (answers.leisure_mode === 'velo' && answers.leisure_velo_type === null)
        return 'le type de vélo';
      // La taille du covoiturage se rend sous « Voiture (covoiturage) », après la motorisation.
      // Elle est obligatoire pour la raison qui vaut déjà côté quotidien : le calcul ne divise
      // que si elle est renseignée, donc sans elle le choix « covoiturage » ne change **rien**
      // au chiffre — une réponse qu'on a prise et qui ne sert à rien.
      if (answers.leisure_is_carpool && answers.leisure_carpool_size === null)
        return 'le nombre de personnes dans la voiture';
      // En dernier, et c'est voulu : la distance est plus bas dans la page que la précision
      // du mode, donc on ne l'annonce qu'une fois le reste rempli — on nomme ce qu'il reste
      // à faire, dans l'ordre où on le rencontre.
      if (answers.leisure_distance_bracket === null) return 'la distance habituelle';
      // C3.6 : la tranche ouverte est la seule sans borne haute, et c'est celle qui en avait
      // le plus besoin — « Plus de 30 km » valait 40 km, donc une sortie de 120 km comptait
      // pour un tiers d'elle-même. La demander est le chantier ; la laisser facultative
      // reviendrait à garder le défaut pour tous ceux qui passent sans répondre.
      if (answers.leisure_distance_bracket === '30_plus' && distanceSortieKm(answers) === null)
        return 'la distance d’une sortie';
      return null;
    case 'flights':
      if (answers.flights_total_per_year > 0 && answers.flights_short_per_year === null)
        return 'la part de vols courts';
      return null;
    case 'long_trips':
      if (answers.car_long_trips_per_year > 0 && answers.car_long_trips_engine === null)
        return 'la motorisation';
      // C3.5 : le calcul supposait « seul » sur 700 km, alors que c'est le trajet qu'on partage
      // le plus. Obligatoire comme la motorisation juste au-dessus, et pour la même raison —
      // déclarer des longs trajets en voiture, c'est en déclarer deux choses.
      if (answers.car_long_trips_per_year > 0 && answers.car_long_trips_occupancy === null)
        return 'le nombre de personnes dans la voiture';
      return null;
    case 'context':
      if (answers.zone_type === null) return 'ton type de zone';
      if (answers.tc_access === null) return 'l’accès aux transports en commun';
      if (answers.household_vehicles === null) return 'le nombre de véhicules du foyer';
      // C3.8 : demandée, pas supposée. Le calcul du plan écarte les gabarits de télétravail quand
      // la réponse manque — « une condition qu'on ne peut pas évaluer n'est pas remplie » —, donc
      // une étape qu'on pourrait valider sans elle retirerait silencieusement un levier réel à
      // quelqu'un qui l'a.
      if (teletravailSePose(answers) && answers.teletravail === null)
        return 'ta réponse sur le télétravail';
      return null;
  }
}

// Dérivé, jamais réécrit — cf. `manqueDeLEtape`.
export function isStepComplete(step: BilanStepId, answers: BilanAnswers): boolean {
  return manqueDeLEtape(step, answers) === null;
}

/**
 * Distance que le calcul retient pour une tranche — la valeur affichée sous la tranche
 * choisie (« On comptera environ 10 km pour un aller. »).
 *
 * Elle était écrite ici sans appelant, pendant que le calcul la réécrivait en SQL : du code
 * mort **et** une seconde source de vérité pour un chiffre affiché (audit A2-22). L'afficher
 * rend la règle visible au lieu de la laisser dormir, mais impose de garder ces cinq valeurs
 * identiques à celles du `case a.commute_distance_bracket` de `recompute_assessment_results`
 * (supabase/migrations/20260905130000_actions_chiffrees.sql) : le test les épingle de ce
 * côté-ci, rien ne peut les épingler de l'autre.
 *
 * Ne couvre que les cinq tranches du domicile-travail. Les quatre tranches des loisirs
 * (`LeisureDistanceBracket`) n'ont pas d'équivalent ici, et l'écran loisirs n'affiche donc
 * pas de distance retenue.
 */
export function distanceBracketMidpointKm(bracket: DistanceBracket): number {
  switch (bracket) {
    case 'lt_5':
      return 2.5;
    case '5_15':
      return 10;
    case '15_30':
      return 22.5;
    case '30_50':
      return 40;
    case '50_plus':
      return 60;
  }
}

/**
 * Brouillon local du questionnaire — la forme écrite dans AsyncStorage, cf.
 * `src/lib/bilan-draft.ts`. Le type vit ici, avec la relecture qui le valide : tout est pur
 * et donc testé.
 */
export type BilanDraft = {
  step: BilanStepId;
  answers: BilanAnswers;
  /** Horodatage ISO de la dernière écriture. `null` pour un brouillon écrit avant que cet
   *  horodatage existe : âge inconnu, donc jamais traité comme ancien. */
  savedAt: string | null;
};

/**
 * Brouillon relu et remis en forme, ou `null` s'il n'est pas exploitable.
 *
 * La relecture était un `JSON.parse` suivi d'un `as BilanDraft` : rien ne vérifiait la forme,
 * et la clé de stockage n'a jamais changé alors que `BilanAnswers` a gagné trois champs
 * (motorisation, puis les quatre motorisations, puis le type de deux-roues). Un brouillon
 * écrit avant ces ajouts restituait des champs `undefined` — `manqueDeLEtape` compare à
 * `null`, donc `undefined !== null` : l'étape se déclarait complète et la question de
 * cylindrée n'était jamais posée. Le bilan partait au tarif du scooter pour un motard, ce que
 * la migration `cylindree_deux_roues` existe précisément pour empêcher (audit A2-7).
 *
 * Deux gardes, et la clé AsyncStorage reste `v1` — la renommer effacerait les brouillons en
 * cours, alors que normaliser les relit :
 *
 *  1. les clés absentes reprennent leur valeur vide (`EMPTY_BILAN_ANSWERS`), puis l'ensemble
 *     passe par `normaliserReponses` — un brouillon d'une version antérieure peut porter un
 *     état que les règles d'aujourd'hui n'autorisent plus ;
 *  2. un `step` inconnu rejette le brouillon entier. Sans ça, aucune des neuf branches de
 *     rendu ne s'active : l'écran garde son en-tête et ses boutons, et le corps est vide.
 */
export function lireBrouillonBilan(valeur: unknown): BilanDraft | null {
  if (typeof valeur !== 'object' || valeur === null) return null;
  const brut = valeur as { step?: unknown; answers?: unknown; savedAt?: unknown };

  if (typeof brut.step !== 'string') return null;
  if (!(BILAN_STEP_ORDER as readonly string[]).includes(brut.step)) return null;
  if (typeof brut.answers !== 'object' || brut.answers === null) return null;

  return {
    step: brut.step as BilanStepId,
    answers: normaliserReponses({
      ...EMPTY_BILAN_ANSWERS,
      ...(brut.answers as Partial<BilanAnswers>),
    }),
    savedAt: typeof brut.savedAt === 'string' ? brut.savedAt : null,
  };
}

/**
 * Au-delà de quoi un brouillon ne se reprend plus en silence : on demande à la personne si
 * elle le continue ou si elle repart de son dernier bilan.
 *
 * Trois semaines, parce qu'un questionnaire interrompu se reprend dans la journée ou dans la
 * semaine ; passé ce délai, ce qu'on rouvre n'est plus « là où j'en étais » mais un bilan à
 * demi modifié qui devient la base du suivant, et qui fausse la comparaison de deux bilans
 * sans que rien ne le dise (audit A2-6).
 */
export const BROUILLON_ANCIEN_JOURS = 21;

/** `false` si l'âge du brouillon est inconnu : on ne demande rien sur une supposition. */
export function brouillonEstAncien(brouillon: BilanDraft, maintenant: Date): boolean {
  if (brouillon.savedAt === null) return false;
  const enregistre = Date.parse(brouillon.savedAt);
  if (Number.isNaN(enregistre)) return false;
  const jours = (maintenant.getTime() - enregistre) / (24 * 60 * 60 * 1000);
  return jours >= BROUILLON_ANCIEN_JOURS;
}

/**
 * Deux jeux de réponses identiques champ par champ.
 *
 * Décide si un brouillon n'est rien d'autre que le dernier bilan rechargé : dans ce cas le
 * bandeau « Tes réponses précédentes sont pré-remplies » reste vrai, et il disparaissait —
 * ouvrir le questionnaire et repartir suffisait à écrire un brouillon, et c'est par cette
 * branche que la visite suivante entrait (audit A2-6).
 *
 * La comparaison porte sur les clés du modèle, pas sur les objets : un brouillon relu peut
 * porter des clés en plus, jamais en moins.
 */
export function memesReponses(a: BilanAnswers, b: BilanAnswers): boolean {
  return (Object.keys(EMPTY_BILAN_ANSWERS) as (keyof BilanAnswers)[]).every(
    (cle) => a[cle] === b[cle]
  );
}
