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

export type BilanAnswers = {
  commute_has_regular_trip: boolean | null;
  commute_days_per_week: number | null;
  commute_distance_km: number | null;
  commute_distance_bracket: DistanceBracket | null;
  commute_mode: TransportModeId | null;
  commute_is_carpool: boolean;
  commute_carpool_size: number | null;
  commute_second_mode_used: boolean;
  commute_second_mode: TransportModeId | null;
  // Un seul champ pour les deux jambes (principale/second mode) : elles ne peuvent pas
  // valoir "voiture" toutes les deux à la fois (B1.7 exclut le mode déjà choisi en B1.4),
  // donc au plus une jambe est concernée à un instant donné.
  commute_car_engine: CarEngine | null;
  commute_two_wheeler_type: TwoWheelerType | null;

  leisure_frequency: LeisureFrequency | null;
  leisure_mode: TransportModeId | null;
  leisure_distance_bracket: LeisureDistanceBracket | null;
  leisure_car_engine: CarEngine | null;
  leisure_two_wheeler_type: TwoWheelerType | null;

  flights_total_per_year: number;
  flights_short_per_year: number | null;
  train_long_trips_per_year: number;
  car_long_trips_per_year: number;
  car_long_trips_engine: CarEngine | null;

  zone_type: ZoneType | null;
  tc_access: TcAccess | null;
  household_vehicles: HouseholdVehicles | null;
};

export const EMPTY_BILAN_ANSWERS: BilanAnswers = {
  commute_has_regular_trip: null,
  commute_days_per_week: null,
  commute_distance_km: null,
  commute_distance_bracket: null,
  commute_mode: null,
  commute_is_carpool: false,
  commute_carpool_size: null,
  commute_second_mode_used: false,
  commute_second_mode: null,
  commute_car_engine: null,
  commute_two_wheeler_type: null,

  leisure_frequency: null,
  leisure_mode: null,
  leisure_distance_bracket: null,
  leisure_car_engine: null,
  leisure_two_wheeler_type: null,

  flights_total_per_year: 0,
  flights_short_per_year: null,
  train_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  car_long_trips_engine: null,

  zone_type: null,
  tc_access: null,
  household_vehicles: null,
};

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

export const BILAN_SECTION_LABEL: Record<BilanStepId, string> = {
  commute_has_trip: 'Domicile-travail',
  commute_days_distance: 'Domicile-travail',
  commute_mode: 'Domicile-travail',
  commute_extra: 'Domicile-travail',
  leisure_frequency: 'Weekend et loisirs',
  leisure_detail: 'Weekend et loisirs',
  flights: 'Voyages sur l’année',
  long_trips: 'Voyages sur l’année',
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
  if (a.commute_has_regular_trip === false) {
    a.commute_days_per_week = null;
    a.commute_distance_km = null;
    a.commute_distance_bracket = null;
    a.commute_mode = null;
    a.commute_is_carpool = false;
    a.commute_second_mode_used = false;
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
  if (a.commute_second_mode !== null && a.commute_second_mode === a.commute_mode) {
    a.commute_second_mode = null;
    a.commute_second_mode_used = false;
  }
  if (!a.commute_second_mode_used) a.commute_second_mode = null;

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

  // Loisirs : un seul mode, donc une seule jambe à regarder — **sauf sur « rarement »**, et
  // cette exception tient au calcul, pas à l'écran. `recompute_assessment_results` y force le
  // mode à « voiture » (`leisure_default_mode`) et résout quand même la motorisation avec
  // `a.leisure_car_engine` : effacer la motorisation parce que l'étape loisirs a disparu ferait
  // retomber le poste sur la voiture générique, 0,142253 au lieu de 0,067365 pour une
  // électrique — 2,1× plus lourd, dans le sens qui alourdit l'empreinte de quelqu'un qui roule
  // à l'électrique. Revenir à « une fois par semaine » repose la question du mode, et la règle
  // reprend alors la main.
  if (a.leisure_frequency !== 'rarely') {
    if (a.leisure_mode !== 'voiture') a.leisure_car_engine = null;
    if (a.leisure_mode !== 'deux_roues_motorise') a.leisure_two_wheeler_type = null;
  }

  // Voyages : la motorisation ne tient qu'à la présence d'un trajet en voiture. Rien à
  // normaliser pour la part de vols courts — `0` et `null` sont équivalents au calcul
  // (`coalesce(flights_short_per_year, 0)` côté SQL), et B3.1 écrit l'un ou l'autre.
  if (a.car_long_trips_per_year === 0) a.car_long_trips_engine = null;

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
      return null;
    case 'commute_extra':
      if (answers.commute_is_carpool && answers.commute_carpool_size === null)
        return 'le nombre de personnes dans la voiture';
      if (answers.commute_second_mode_used && answers.commute_second_mode === null)
        return 'le second mode';
      if (answers.commute_second_mode === 'voiture' && answers.commute_car_engine === null)
        return 'la motorisation';
      if (
        answers.commute_second_mode === 'deux_roues_motorise' &&
        answers.commute_two_wheeler_type === null
      )
        return 'le type de deux-roues';
      return null;
    case 'leisure_frequency':
      return answers.leisure_frequency === null ? 'ta fréquence' : null;
    case 'leisure_detail':
      if (answers.leisure_mode === null) return 'ton mode de transport';
      if (answers.leisure_mode === 'voiture' && answers.leisure_car_engine === null)
        return 'la motorisation';
      if (answers.leisure_mode === 'deux_roues_motorise' && answers.leisure_two_wheeler_type === null)
        return 'le type de deux-roues';
      // En dernier, et c'est voulu : la distance est plus bas dans la page que la précision
      // du mode, donc on ne l'annonce qu'une fois le reste rempli — on nomme ce qu'il reste
      // à faire, dans l'ordre où on le rencontre.
      if (answers.leisure_distance_bracket === null) return 'la distance habituelle';
      return null;
    case 'flights':
      if (answers.flights_total_per_year > 0 && answers.flights_short_per_year === null)
        return 'la part de vols courts';
      return null;
    case 'long_trips':
      if (answers.car_long_trips_per_year > 0 && answers.car_long_trips_engine === null)
        return 'la motorisation';
      return null;
    case 'context':
      if (answers.zone_type === null) return 'ton type de zone';
      if (answers.tc_access === null) return 'l’accès aux transports en commun';
      if (answers.household_vehicles === null) return 'le nombre de véhicules du foyer';
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
