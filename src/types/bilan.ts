// Forme locale du questionnaire — miroir de `assessment_answers` (mêmes noms de colonnes,
// mêmes valeurs de CHECK) pour un mapping direct à l'insert final, cf.
// docs/architecture/v1-05-bilan-v2.md §3.
import type { TransportModeId } from '@/constants/transport-modes';

export type DistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus';
export type LeisureDistanceBracket = 'lt_5' | '5_15' | '15_30' | '30_plus';
export type LeisureFrequency = 'rarely' | 'multiple_monthly' | 'weekly' | 'multiple_weekly';
export type ZoneType = 'urbain_dense' | 'periurbain' | 'rural';
/**
 * L'accès aux transports, **déduit** depuis `v1-34` (02/10/2026) : la question n'est plus posée, et
 * le déclencheur `assessment_answers_deduit_l_acces` écrit la colonne d'après `transports_proches`.
 * Le type reste, parce que la colonne reste — la moyenne française, la phrase du plan et les vues de
 * la mesure la lisent.
 */
export type TcAccess = 'bon' | 'limite' | 'inexistant';
/**
 * « Près de chez toi, qu'est-ce que tu pourrais prendre ? » (`v1-34`) : ce qui passe assez souvent pour
 * s'en servir, plusieurs réponses à la fois, ou `aucun` seul. Décide des actions de transport en
 * commun du plan, à la place de la zone.
 */
export type TransportProche = 'metro_tram' | 'rer' | 'train' | 'bus' | 'aucun';
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

  /**
   * Le nombre de vols d'une année type — avec `null` pour **pas encore répondu** (01/10/2026,
   * `v1-33` D1), comme `commute_second_mode_used`.
   *
   * Il démarrait à `0` : la puce « 0 » arrivait cochée en vert plein, « Suivant » était actif, et le
   * profil minimal traversait le poste le plus lourd du bilan sans un toucher. Un « 0 » de trop
   * **sous-estime** les voyages, qui décident souvent du poste dominant, donc du plan — la règle
   * « une question à laquelle personne n'a répondu ne vaut pas Non », restée ici parce qu'elle
   * préexistait.
   *
   * **La colonne reste `not null default 0`**, pour la raison de `commute_second_mode_used` : `null`
   * décrit un questionnaire en cours, jamais un bilan — l'étape est toujours visible et le réclame.
   * D'où un `?? 0` à l'insert, inatteignable par construction. Un brouillon écrit avant ce changement
   * porte `0`, et il reste valide : c'est une réponse, qu'on ne distingue plus d'un défaut.
   */
  flights_total_per_year: number | null;
  flights_short_per_year: number | null;
  /**
   * Les trois compteurs des trajets de plus de 300 km (B3.3 / B3.4), avec `null` pour **sans
   * réponse** (01/10/2026, `v1-33` D1). L'étape s'ouvre par « Hors avion, fais-tu des trajets de
   * plus de 300 km… ? » : « Non » les met tous trois à `0`, « Oui » les laisse vides, sans puce
   * cochée, et l'étape réclame au moins un trajet (`reponseAuxLongsTrajets`).
   *
   * Les colonnes restent `not null default 0` : l'insert écrit `?? 0`, et **ce repli-ci est
   * atteignable**, à la différence de celui des vols — « Oui » puis deux trajets en train laisse
   * l'autocar et la voiture vides, ce qui veut dire « aucun » : l'étape réclame un trajet, pas une
   * réponse par série.
   */
  train_long_trips_per_year: number | null;
  car_long_trips_per_year: number | null;
  car_long_trips_engine: CarEngine | null;
  /** Nombre de personnes dans la voiture sur un long trajet (C3.5) — 1 = seul. Partir à
   *  trois est plus courant sur 700 km qu'au quotidien, et le calcul supposait « seul »
   *  sans le dire. */
  car_long_trips_occupancy: number | null;
  /**
   * Le troisième compteur de B3.4 (C4.4) — l'autocar, qui n'existait nulle part, donc un
   * Paris-Lyon en car était compté comme s'il n'avait pas eu lieu.
   *
   * Pas de question de suivi sous ce compteur, et c'est la différence avec la voiture : la
   * personne ne choisit ni la motorisation ni le remplissage d'un autocar — ce n'est pas son
   * véhicule, donc il n'y a rien à lui demander de plus.
   */
  coach_long_trips_per_year: number | null;

  zone_type: ZoneType | null;
  /**
   * Plus demandé depuis `v1-34` : le serveur le déduit de `transports_proches` à l'écriture. Le
   * questionnaire l'envoie nul, et la colonne reste pour ce qui la lit.
   */
  tc_access: TcAccess | null;
  /** Ce qui passe près de chez la personne (`v1-34`) — rangé dans l'ordre des puces, sans doublon. */
  transports_proches: TransportProche[] | null;
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

  // `null` et non `0` (01/10/2026, `v1-33` D1) : personne n'a encore répondu. Cf. les champs.
  flights_total_per_year: null,
  flights_short_per_year: null,
  train_long_trips_per_year: null,
  car_long_trips_per_year: null,
  car_long_trips_engine: null,
  car_long_trips_occupancy: null,
  coach_long_trips_per_year: null,

  zone_type: null,
  tc_access: null,
  transports_proches: null,
  household_vehicles: null,
  teletravail: null,
};

/**
 * Les trois statuts d'un bilan, **miroir du `check` de `assessments.status`**
 * (`20260823094800_core_schema.sql` : `in ('in_progress', 'completed')`, puis `withdrawn` depuis
 * `20260927230411_retirer_un_bilan.sql`, C4.7).
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
 * racine route et que le cron sélectionne ; `retire` est un bilan que la personne a déclaré ne pas
 * lui ressembler (C4.7, `v1-22`) — la ligne reste, l'export la rend, et **aucune requête ne le
 * sélectionne** : c'est ce qui rend justes, sans y toucher, toutes les lectures de `complete`. Seule
 * la restitution par identifiant le reconnaît, pour dire qu'il a été retiré (`src/types/retrait-du-bilan.ts`).
 * Aucun client ne l'écrit : le retrait passe par `retirer_le_bilan`, et un `update` direct est refusé
 * par la base (`RM007`).
 */
export const STATUT_DE_BILAN = { enCours: 'in_progress', complete: 'completed', retire: 'withdrawn' } as const;
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
 * Les quatre réponses à B2.1, dans l'ordre de l'écran.
 *
 * **« Deux ou trois fois par mois » est la quatrième depuis le 02/10/2026** (`v1-33` D5) : entre
 * « Rarement » (0,25 sortie par semaine) et « Une fois par semaine » (1), il n'y avait rien, et qui
 * sort deux ou trois fois par mois se trompait d'un facteur 2 environ. Elle vaut 0,6 sortie par
 * semaine (`HYPOTHESES.sortiesParSemaine`), et elle se comporte comme une sortie déclarée : seule
 * « Rarement » saute le détail des sorties et passe sur le résiduel.
 *
 * Miroir du `check` de `assessment_answers.leisure_frequency`, comparé à la base
 * (`scripts/verifier-miroirs-de-check.mjs`), comme l'union `LeisureFrequency`.
 */
export const REPONSES_FREQUENCE_DES_LOISIRS: { value: LeisureFrequency; label: string }[] = [
  { value: 'rarely', label: 'Rarement — une fois par mois ou moins' },
  { value: 'multiple_monthly', label: 'Deux ou trois fois par mois' },
  { value: 'weekly', label: 'Une fois par semaine' },
  { value: 'multiple_weekly', label: 'Plusieurs fois par semaine' },
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
 * §7.2) — ne toucher que l'écran laisse un « Suivant » qui n'avance jamais, et dont la demande mène
 * à une question absente de l'écran : sa ligne la nommerait, et aucune ancre ne la porterait
 * (`v1-31` §2.5) ; oublier `normaliserReponses` laisse partir à la soumission une réponse que
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
  // **Le compte est la position, et c'est exact sur le chemin normal** : « Suivant » n'avance pas
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
  //
  // **Un compteur vide vaut zéro trajet** (01/10/2026, `v1-33` D1) : « Oui » aux longs trajets les
  // laisse vides, et l'insert écrit `0` sous une série sans réponse. Une motorisation n'y décrit
  // aucune voiture.
  if ((a.car_long_trips_per_year ?? 0) === 0) {
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

/**
 * La phrase qui confirme, sous la répartition des vols, ce que le calcul comptera en long-courrier.
 *
 * **À zéro, elle le dit en mots** (27/09/2026, décision de la personne qui pilote). « 0 vol
 * long-courrier sera compté. » était juste et maladroit — le seul zéro de ce genre dans le
 * questionnaire —, et se taire aurait ôté la confirmation à la seule personne qui vient de dire
 * qu'elle n'en prend aucun, alors que l'écran répond à toutes les autres. La confirmation compte :
 * un long-courrier vaut six fois la distance d'un vol court.
 */
export function decompteDesLongsCourriers(longsCourriers: number): string {
  if (longsCourriers <= 0) return 'Aucun vol long-courrier ne sera compté.';
  if (longsCourriers === 1) return '1 vol long-courrier sera compté.';
  return `${longsCourriers} vols long-courriers seront comptés.`;
}

/**
 * La part de vols courts après un changement du nombre de vols (B3.1 → B3.2).
 *
 * **Sous un total nul, le 0 des vols courts n'est pas une réponse** (27/09/2026). La seconde
 * question ne s'affiche qu'à partir d'un vol ; à zéro vol, l'étape pose d'elle-même
 * `flights_short_per_year = 0`, et un re-bilan le relit tel quel de la base. La règle d'avant —
 * « ramener les courts sous le nouveau total » — gardait ce 0 en passant à quatre vols : la
 * question « Sur ces 4, combien sont courts ? » arrivait **déjà répondue**, le décompte des
 * quatre long-courriers s'affichait, et l'étape se validait sans que la personne ait rien choisi —
 * l'erreur la plus lourde possible sur le poste le plus lourd, puisqu'un long-courrier compte six
 * fois la distance d'un vol court. C'est le « binaire qu'on n'a pas choisi » de `v1-16` §4.
 *
 * Un total qui change entre deux valeurs non nulles garde, lui, la réponse donnée, ramenée sous le
 * nouveau total : c'en était une. **Un total sans réponse** (`null`, 01/10/2026) est un total nul :
 * aucune part de vols courts n'a pu y être donnée.
 */
export function volsCourtsApresTotal(
  avant: Pick<BilanAnswers, 'flights_total_per_year' | 'flights_short_per_year'>,
  nouveauTotal: number
): number | null {
  if (nouveauTotal === 0) return 0;
  if (!avant.flights_total_per_year || avant.flights_short_per_year === null) return null;
  return Math.min(avant.flights_short_per_year, nouveauTotal);
}

/**
 * Ce que le questionnaire a reçu et qu'**aucune colonne ne porte** (01/10/2026, `v1-33` D1).
 *
 * `BilanAnswers` est un miroir exact des colonnes, et c'est ce qui permet à l'insert de le diffuser
 * tel quel : un champ en plus ferait refuser l'insert entier par PostgREST (`src/app/bilan/index.tsx`).
 * Une réponse d'écran sans colonne vit donc à côté, ici, tenue par l'écran du questionnaire — et
 * `manqueDeLEtape` la reçoit, pour rester la seule source de « ce qui manque ».
 *
 * **Une seule aujourd'hui : le « Oui » aux longs trajets, quand les compteurs ne le disent pas.**
 * « Oui » laisse les trois séries sans puce cochée ; sans ce drapeau, un « Oui » qu'on vient de
 * toucher ne se distinguerait pas d'une question qu'on n'a pas encore vue. Il n'est **pas** écrit dans
 * le brouillon (sa forme est celle de `src/lib/bilan-draft.ts`) : un questionnaire quitté sur « Oui »
 * sans aucun trajet se rouvre sur la question, à reposer — rien n'y est perdu, puisqu'aucun compteur
 * n'était rempli.
 */
export type HorsColonnes = { ouiAuxLongsTrajets: boolean };
export const RIEN_HORS_COLONNES: HorsColonnes = { ouiAuxLongsTrajets: false };

/** Les trois compteurs des longs trajets, dans l'ordre de l'écran — train, autocar, voiture. */
function compteursDesLongsTrajets(
  a: Pick<BilanAnswers, 'train_long_trips_per_year' | 'coach_long_trips_per_year' | 'car_long_trips_per_year'>
): (number | null)[] {
  return [a.train_long_trips_per_year, a.coach_long_trips_per_year, a.car_long_trips_per_year];
}

/**
 * La réponse à « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? » — `null`
 * tant qu'elle n'est pas donnée (01/10/2026, `v1-33` D1).
 *
 * **Dérivée des compteurs, et du seul « Oui » qu'ils ne savent pas dire.** Un trajet déclaré vaut
 * « Oui » ; trois zéros valent « Non », ce que « Non » écrit — et ce qu'un re-bilan relit d'un bilan
 * sans long trajet, comme un brouillon d'avant cette question : c'est une réponse. Trois compteurs
 * vides valent « pas encore répondu », sauf juste après « Oui » (`HorsColonnes`). Et un mélange de vide
 * et de zéro, sans trajet, est un « Oui » : « Non » écrit les trois, donc seul « Oui » suivi d'un « 0 »
 * le produit — c'est ce qui le rend lisible dans un brouillon relu, où le drapeau n'est plus.
 *
 * Le drapeau l'emporte sur trois zéros : « Oui », puis « 0 » dans chaque série, est un « Oui » qui
 * attend encore son trajet, pas un « Non » qu'on n'a pas touché.
 */
export function reponseAuxLongsTrajets(
  a: Pick<BilanAnswers, 'train_long_trips_per_year' | 'coach_long_trips_per_year' | 'car_long_trips_per_year'>,
  horsColonnes: HorsColonnes
): boolean | null {
  const compteurs = compteursDesLongsTrajets(a);
  if (compteurs.some((n) => n !== null && n > 0)) return true;
  if (horsColonnes.ouiAuxLongsTrajets) return true;
  if (compteurs.every((n) => n === null)) return null;
  return compteurs.every((n) => n === 0) ? false : true;
}

/**
 * Ce que « Oui » ou « Non » écrit dans les trois compteurs (01/10/2026, `v1-33` D1) — à côté du
 * drapeau de `HorsColonnes`, que l'écran pose en même temps.
 *
 * « Non » vaut zéro partout. « Oui » vide les trois séries, pour qu'aucune puce n'arrive cochée — un
 * « 0 » qui resterait de « Non » serait une réponse donnée à la place de la personne, le défaut même
 * que la question corrige. **Sauf si un trajet est déjà déclaré** : la réponse était déjà « Oui », et
 * la toucher de nouveau n'efface rien.
 */
export function compteursApresLaReponse(
  a: Pick<BilanAnswers, 'train_long_trips_per_year' | 'coach_long_trips_per_year' | 'car_long_trips_per_year'>,
  oui: boolean
): Partial<BilanAnswers> {
  if (!oui) return { train_long_trips_per_year: 0, coach_long_trips_per_year: 0, car_long_trips_per_year: 0 };
  if (compteursDesLongsTrajets(a).some((n) => n !== null && n > 0)) return {};
  return { train_long_trips_per_year: null, coach_long_trips_per_year: null, car_long_trips_per_year: null };
}

export function distanceDomicileTravailARelire(reponses: BilanAnswers): boolean {
  const km = distanceDomicileTravailKm(reponses);
  return km !== null && km > COMMUTE_DISTANCE_A_RELIRE_KM;
}

/**
 * Un champ du questionnaire tel qu'une étape peut le réclamer (29/09/2026, `v1-31` §2.3).
 *
 * **C'est le nom de la colonne, sauf quand deux colonnes répondent à la même question** : la distance
 * du trajet se saisit en kilomètres **ou** par tranche, et l'étape n'en montre qu'une — elle devient
 * `distance_du_trajet`, et l'étape enregistre sous ce nom ce qu'elle affiche. La distance d'une sortie,
 * elle, n'est pas dans ce cas : la tranche et le champ libre sous « Plus de 30 km » sont deux questions
 * posées l'une sous l'autre, donc deux champs.
 *
 * **Les longs trajets en ajoutent deux qui ne sont pas des colonnes** (01/10/2026, `v1-33` D1) :
 * `fait_des_longs_trajets`, la question d'entrée (« Oui / Non »), qu'aucune colonne ne porte — elle se
 * dérive des compteurs (`reponseAuxLongsTrajets`) ; et `nombre_de_longs_trajets`, le trajet qu'un
 * « Oui » réclame, et que trois colonnes peuvent donner — la même raison que la distance du trajet.
 */
export type ChampDuBilan =
  | 'commute_has_regular_trip'
  | 'commute_days_per_week'
  | 'distance_du_trajet'
  | 'commute_mode'
  | 'commute_car_engine'
  | 'commute_two_wheeler_type'
  | 'commute_train_type'
  | 'commute_velo_type'
  | 'commute_carpool_size'
  | 'commute_second_mode_used'
  | 'commute_second_mode'
  | 'commute_second_mode_share'
  | 'leisure_frequency'
  | 'leisure_mode'
  | 'leisure_car_engine'
  | 'leisure_two_wheeler_type'
  | 'leisure_train_type'
  | 'leisure_velo_type'
  | 'leisure_carpool_size'
  | 'leisure_distance_bracket'
  | 'leisure_distance_km'
  | 'flights_total_per_year'
  | 'flights_short_per_year'
  | 'fait_des_longs_trajets'
  | 'nombre_de_longs_trajets'
  | 'car_long_trips_engine'
  | 'car_long_trips_occupancy'
  | 'zone_type'
  | 'transports_proches'
  | 'household_vehicles'
  | 'teletravail';

/** Ce qui manque encore à une étape : le champ, pour y mener, et la phrase, pour le dire. */
export type CeQuiManque = { champ: ChampDuBilan; phrase: string };

/**
 * Les champs que `manqueDeLEtape` peut réclamer, étape par étape — une table fermée (`v1-31` §2.3).
 *
 * Elle dit à chaque étape ce qu'elle doit enregistrer auprès de `StepShell` : un champ qui peut manquer
 * doit toujours avoir où mener, sinon « Suivant » en attente mènerait à une question absente de
 * l'écran — la forme neuve du défaut de C5.4 (`teletravailSePose`). Un test de propriétés la ferme :
 * sur des milliers de réponses tirées, le champ rendu appartient toujours à la table de son étape, et
 * il rougit le jour où `manqueDeLEtape` réclame un champ que personne n'a déclaré ici.
 */
export const CHAMPS_DE_L_ETAPE: Record<BilanStepId, readonly ChampDuBilan[]> = {
  commute_has_trip: ['commute_has_regular_trip'],
  commute_days_distance: ['commute_days_per_week', 'distance_du_trajet'],
  commute_mode: [
    'commute_mode',
    'commute_car_engine',
    'commute_two_wheeler_type',
    'commute_train_type',
    'commute_velo_type',
    'commute_carpool_size',
  ],
  commute_extra: [
    'commute_second_mode_used',
    'commute_second_mode',
    'commute_car_engine',
    'commute_two_wheeler_type',
    'commute_train_type',
    'commute_velo_type',
    'commute_second_mode_share',
  ],
  leisure_frequency: ['leisure_frequency'],
  leisure_detail: [
    'leisure_mode',
    'leisure_car_engine',
    'leisure_two_wheeler_type',
    'leisure_train_type',
    'leisure_velo_type',
    'leisure_carpool_size',
    'leisure_distance_bracket',
    'leisure_distance_km',
  ],
  flights: ['flights_total_per_year', 'flights_short_per_year'],
  long_trips: ['fait_des_longs_trajets', 'nombre_de_longs_trajets', 'car_long_trips_engine', 'car_long_trips_occupancy'],
  context: ['zone_type', 'transports_proches', 'household_vehicles', 'teletravail'],
};

/**
 * La question que pose le titre de chaque étape — celle dont l'intitulé est le titre lui-même, et qui
 * ne se marque donc jamais (`seMarque`). `null` quand le titre ne porte pas de groupe : le contexte,
 * dont les quatre questions ont chacune leur intitulé. **Les longs trajets en ont une depuis le
 * 01/10/2026** (`v1-33` D1) : leur titre chapeautait trois séries (« Et les trajets de plus de
 * 300 km ? ») ; il pose désormais la question d'entrée, « Oui / Non ».
 */
export const QUESTION_PRINCIPALE: Record<BilanStepId, ChampDuBilan | null> = {
  commute_has_trip: 'commute_has_regular_trip',
  commute_days_distance: 'commute_days_per_week',
  commute_mode: 'commute_mode',
  commute_extra: 'commute_second_mode_used',
  leisure_frequency: 'leisure_frequency',
  leisure_detail: 'leisure_mode',
  flights: 'flights_total_per_year',
  long_trips: 'fait_des_longs_trajets',
  context: null,
};

/**
 * L'intitulé de ce champ passe-t-il en vert quand il est celui qui manque (`v1-31`, décision 1) ?
 *
 * **Jamais la question de l'étape** : son titre ne se recolore pas — la question est déjà en titre, et
 * la marquer d'une couleur de plus ne dirait rien de plus. Tout autre champ de la table de l'étape se
 * marque. Un champ qui n'est pas de cette étape ne se marque pas : il n'y a rien à marquer ici.
 *
 * **L'écran ne tranche jamais cela en ternaire** : `TitreDEtape` reçoit la marque de sa question comme
 * tout intitulé, et c'est cette dérivation seule qui l'en empêche — un titre qu'on ne brancherait pas
 * rendrait muette la garde qui vérifie qu'il ne change pas de couleur (`v1-31` §2.3).
 */
export function seMarque(etape: BilanStepId, champ: ChampDuBilan): boolean {
  return champ !== QUESTION_PRINCIPALE[etape] && CHAMPS_DE_L_ETAPE[etape].includes(champ);
}

/**
 * Ce qui manque encore à une étape, nommé — ou `null` si elle est complète.
 *
 * Existe parce qu'un bouton grisé ne dit pas pourquoi. Sur l'étape loisirs, choisir
 * « Voiture » déplie la question de motorisation, qui repousse la tranche de distance sous la
 * ligne de flottaison : la personne voit une étape qu'elle croit finie, et rien n'indique qu'il
 * reste un champ plus bas (retour d'appareil du 07/09/2026). Le même défaut guette partout où une
 * étape porte plusieurs champs.
 *
 * **Le champ et sa phrase** (29/09/2026, `v1-31` §2.3) : la phrase se dit sous « Il manque encore … »
 * au toucher du « Suivant » en attente, et le champ dit **où mener** — `StepShell` y fait défiler
 * l'écran, y pose le focus et en marque l'intitulé. Les phrases et leur ordre n'ont pas changé : c'est
 * l'ordre de l'écran, de haut en bas, et un test les épingle toutes.
 *
 * **`isStepComplete` en dérive**, et ce n'est pas un raffinement : deux listes de conditions
 * tenues en parallèle finiraient par diverger, et l'écart serait silencieux — un « Suivant » qui
 * avance sur une étape incomplète, ou une ligne qui réclame un champ déjà rempli.
 *
 * **`horsColonnes` est obligatoire, et c'est voulu** (01/10/2026) : c'est ce que l'écran a reçu sans
 * colonne pour l'écrire — le « Oui » aux longs trajets. Un appel qui l'oublierait réclamerait « une
 * réponse » sous un « Oui » coché ; le typecheck est ce qui empêche de l'oublier.
 */
export function manqueDeLEtape(
  step: BilanStepId,
  answers: BilanAnswers,
  horsColonnes: HorsColonnes
): CeQuiManque | null {
  const manque = (champ: ChampDuBilan, phrase: string): CeQuiManque => ({ champ, phrase });
  switch (step) {
    case 'commute_has_trip':
      return answers.commute_has_regular_trip === null
        ? manque('commute_has_regular_trip', 'une réponse')
        : null;
    case 'commute_days_distance':
      if (answers.commute_days_per_week === null)
        return manque('commute_days_per_week', 'le nombre de jours par semaine');
      // Un « 0 » n'est pas une réponse — cf. `distanceDomicileTravailKm`.
      if (
        distanceDomicileTravailKm(answers) === null &&
        answers.commute_distance_bracket === null
      )
        return manque('distance_du_trajet', 'la distance');
      return null;
    case 'commute_mode':
      if (answers.commute_mode === null) return manque('commute_mode', 'ton mode de transport');
      if (answers.commute_mode === 'voiture' && answers.commute_car_engine === null)
        return manque('commute_car_engine', 'la motorisation');
      if (answers.commute_mode === 'deux_roues_motorise' && answers.commute_two_wheeler_type === null)
        return manque('commute_two_wheeler_type', 'le type de deux-roues');
      // C4.4 : obligatoires dès que leur déclencheur est là, comme la motorisation. Laisser le
      // choix facultatif reviendrait à garder le défaut — le TER — pour tous ceux qui passent
      // sans répondre, c'est-à-dire exactement le défaut que ce chantier corrige.
      if (answers.commute_mode === 'train' && answers.commute_train_type === null)
        return manque('commute_train_type', 'le type de train');
      if (answers.commute_mode === 'velo' && answers.commute_velo_type === null)
        return manque('commute_velo_type', 'le type de vélo');
      // La taille du covoiturage vient de l'étape suivante (recette du 14/09/2026, `v1-16` §3) :
      // elle se rend désormais sous « Voiture (covoiturage) », après la motorisation, comme la
      // jumelle des sorties. Elle reste obligatoire pour la raison qui vaut des deux côtés : le
      // calcul ne divise que si elle est renseignée, donc sans elle le choix « covoiturage » ne
      // change **rien** au chiffre.
      if (answers.commute_is_carpool && answers.commute_carpool_size === null)
        return manque('commute_carpool_size', 'le nombre de personnes dans la voiture');
      return null;
    case 'commute_extra':
      // **En tête, parce que c'est la première chose que l'écran demande** (`v1-16` §4). Sans
      // cette ligne, un questionnaire vierge traversait la question : le défaut répondait
      // « Non », et « Non » sous-estime un trajet intermodal. Un re-bilan prérempli arrive avec
      // une vraie réponse et ne bute pas ici.
      if (answers.commute_second_mode_used === null)
        return manque('commute_second_mode_used', 'une réponse sur le second mode');
      if (answers.commute_second_mode_used && answers.commute_second_mode === null)
        return manque('commute_second_mode', 'le second mode');
      if (answers.commute_second_mode === 'voiture' && answers.commute_car_engine === null)
        return manque('commute_car_engine', 'la motorisation');
      if (
        answers.commute_second_mode === 'deux_roues_motorise' &&
        answers.commute_two_wheeler_type === null
      )
        return manque('commute_two_wheeler_type', 'le type de deux-roues');
      if (answers.commute_second_mode === 'train' && answers.commute_train_type === null)
        return manque('commute_train_type', 'le type de train');
      if (answers.commute_second_mode === 'velo' && answers.commute_velo_type === null)
        return manque('commute_velo_type', 'le type de vélo');
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
        return manque('commute_second_mode_share', 'la part de ce second mode');
      return null;
    case 'leisure_frequency':
      return answers.leisure_frequency === null ? manque('leisure_frequency', 'ta fréquence') : null;
    case 'leisure_detail':
      if (answers.leisure_mode === null) return manque('leisure_mode', 'ton mode de transport');
      if (answers.leisure_mode === 'voiture' && answers.leisure_car_engine === null)
        return manque('leisure_car_engine', 'la motorisation');
      if (answers.leisure_mode === 'deux_roues_motorise' && answers.leisure_two_wheeler_type === null)
        return manque('leisure_two_wheeler_type', 'le type de deux-roues');
      if (answers.leisure_mode === 'train' && answers.leisure_train_type === null)
        return manque('leisure_train_type', 'le type de train');
      if (answers.leisure_mode === 'velo' && answers.leisure_velo_type === null)
        return manque('leisure_velo_type', 'le type de vélo');
      // La taille du covoiturage se rend sous « Voiture (covoiturage) », après la motorisation.
      // Elle est obligatoire pour la raison qui vaut déjà côté quotidien : le calcul ne divise
      // que si elle est renseignée, donc sans elle le choix « covoiturage » ne change **rien**
      // au chiffre — une réponse qu'on a prise et qui ne sert à rien.
      if (answers.leisure_is_carpool && answers.leisure_carpool_size === null)
        return manque('leisure_carpool_size', 'le nombre de personnes dans la voiture');
      // En dernier, et c'est voulu : la distance est plus bas dans la page que la précision
      // du mode, donc on ne l'annonce qu'une fois le reste rempli — on nomme ce qu'il reste
      // à faire, dans l'ordre où on le rencontre.
      if (answers.leisure_distance_bracket === null)
        return manque('leisure_distance_bracket', 'la distance habituelle');
      // C3.6 : la tranche ouverte est la seule sans borne haute, et c'est celle qui en avait
      // le plus besoin — « Plus de 30 km » valait 40 km, donc une sortie de 120 km comptait
      // pour un tiers d'elle-même. La demander est le chantier ; la laisser facultative
      // reviendrait à garder le défaut pour tous ceux qui passent sans répondre.
      if (answers.leisure_distance_bracket === '30_plus' && distanceSortieKm(answers) === null)
        return manque('leisure_distance_km', 'la distance d’une sortie');
      return null;
    case 'flights':
      // **Réclamé, et non plus supposé à zéro** (01/10/2026, `v1-33` D1) : c'est la question du titre,
      // donc elle ne se marque pas (`seMarque`), mais elle se demande comme les autres.
      if (answers.flights_total_per_year === null) return manque('flights_total_per_year', 'le nombre de vols');
      if (answers.flights_total_per_year > 0 && answers.flights_short_per_year === null)
        return manque('flights_short_per_year', 'la part de vols courts');
      return null;
    case 'long_trips': {
      // La question d'entrée d'abord, puis le trajet qu'un « Oui » annonce (01/10/2026, `v1-33` D1) —
      // au moins un, sur l'une des trois séries : une série laissée vide vaut zéro.
      const reponse = reponseAuxLongsTrajets(answers, horsColonnes);
      if (reponse === null) return manque('fait_des_longs_trajets', 'une réponse');
      if (reponse && !compteursDesLongsTrajets(answers).some((n) => n !== null && n > 0))
        return manque('nombre_de_longs_trajets', 'le nombre de trajets');
      const enVoiture = answers.car_long_trips_per_year ?? 0;
      if (enVoiture > 0 && answers.car_long_trips_engine === null)
        return manque('car_long_trips_engine', 'la motorisation');
      // C3.5 : le calcul supposait « seul » sur 700 km, alors que c'est le trajet qu'on partage
      // le plus. Obligatoire comme la motorisation juste au-dessus, et pour la même raison —
      // déclarer des longs trajets en voiture, c'est en déclarer deux choses.
      if (enVoiture > 0 && answers.car_long_trips_occupancy === null)
        return manque('car_long_trips_occupancy', 'le nombre de personnes dans la voiture');
      return null;
    }
    case 'context':
      if (answers.zone_type === null) return manque('zone_type', 'ton type de zone');
      if (answers.transports_proches === null || answers.transports_proches.length === 0)
        return manque('transports_proches', 'ce qui passe près de chez toi');
      if (answers.household_vehicles === null)
        return manque('household_vehicles', 'le nombre de véhicules du foyer');
      // C3.8 : demandée, pas supposée. Le calcul du plan écarte les gabarits de télétravail quand
      // la réponse manque — « une condition qu'on ne peut pas évaluer n'est pas remplie » —, donc
      // une étape qu'on pourrait valider sans elle retirerait silencieusement un levier réel à
      // quelqu'un qui l'a.
      if (teletravailSePose(answers) && answers.teletravail === null)
        return manque('teletravail', 'ta réponse sur le télétravail');
      return null;
  }
}

// Dérivé, jamais réécrit — cf. `manqueDeLEtape`.
export function isStepComplete(step: BilanStepId, answers: BilanAnswers, horsColonnes: HorsColonnes): boolean {
  return manqueDeLEtape(step, answers, horsColonnes) === null;
}

/** Ce que fait « Suivant » (ou « Voir mon bilan ») sur une étape, pour ces réponses. */
export type IssueDuSuivant =
  | { genre: 'attendre' }
  | { genre: 'passer'; vers: BilanStepId }
  | { genre: 'revenir'; vers: BilanStepId }
  | { genre: 'soumettre' };

/**
 * Ce que fait « Suivant » sur une étape (29/09/2026, `v1-31` §2.4) — une dérivation qui décide d'une
 * navigation, donc hors de l'écran et testée (`FRONT.md` §1.1).
 *
 * **Une étape incomplète n'avance pas, et c'est une seconde garde.** `StepShell` n'appelle déjà pas
 * `onNext` sur une étape incomplète : son « Suivant » en attente mène à ce qui manque. Mais ce bouton
 * n'est plus `disabled`, et c'est lui qui tenait la porte ; sur la dernière étape, « Voir mon bilan »
 * soumet. Une régression de la coquille suffirait sinon à soumettre un bilan incomplet — et la base
 * n'en refuserait qu'une partie : une part du second mode absente passe (la colonne est nullable, le
 * calcul retombe sur la moitié), c'est-à-dire exactement le défaut que C3.4 a fermé.
 *
 * **À la dernière étape, toutes les étapes visibles, pas seulement la courante.** Sur web, l'adresse
 * `/bilan?etape=context` se tape, et elle est acceptée sur un questionnaire vierge : trois réponses
 * puis « Voir mon bilan » soumettaient un bilan fait des replis de l'insert (`?? false`,
 * `?? 'rarely'`). Une étape visible incomplète **ramène** à elle — la première, par le même chemin que
 * « Retour » — plutôt que de refuser en silence : le « Suivant » en attente y dira ce qui manque, là où
 * un refus muet laisserait un bouton qui ne fait rien.
 */
export function issueDuSuivant(
  step: BilanStepId,
  answers: BilanAnswers,
  horsColonnes: HorsColonnes
): IssueDuSuivant {
  if (!isStepComplete(step, answers, horsColonnes)) return { genre: 'attendre' };
  const suivante = nextStep(step, answers);
  if (suivante !== null) return { genre: 'passer', vers: suivante };
  const incomplete = visibleSteps(answers).find((etape) => !isStepComplete(etape, answers, horsColonnes));
  return incomplete === undefined ? { genre: 'soumettre' } : { genre: 'revenir', vers: incomplete };
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
 * bandeau « Tes réponses précédentes sont préremplies » reste vrai, et il disparaissait —
 * ouvrir le questionnaire et repartir suffisait à écrire un brouillon, et c'est par cette
 * branche que la visite suivante entrait (audit A2-6).
 *
 * La comparaison porte sur les clés du modèle, pas sur les objets : un brouillon relu peut
 * porter des clés en plus, jamais en moins.
 *
 * **Un tableau se compare par son contenu** (03/10/2026, contre-lecture de `v1-34`) :
 * `transports_proches` est la première réponse en tableau, et le brouillon relu par `JSON.parse`
 * comme le bilan lu sur le serveur en portent chacun leur exemplaire — `['bus'] === ['bus']` est
 * faux. Avec `===`, aucun brouillon ne se reconnaissait plus dans le dernier bilan. Les deux côtés
 * sont rangés (le déclencheur côté serveur, `basculerTransport` côté écran), donc l'ordre compare.
 */
export function memesReponses(a: BilanAnswers, b: BilanAnswers): boolean {
  return (Object.keys(EMPTY_BILAN_ANSWERS) as (keyof BilanAnswers)[]).every((cle) => {
    const x = a[cle];
    const y = b[cle];
    if (Array.isArray(x) || Array.isArray(y)) {
      return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((v, i) => v === y[i]);
    }
    return x === y;
  });
}
