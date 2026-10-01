// Référentiel statique des 9 modes sélectionnables (B1.4/B2.2), aligné sur
// `transport_modes` en base (docs/architecture/v1-05-bilan-v2.md §2). En dur plutôt que
// fetché : ce sont des libellés d'UI stables, pas une donnée qui varie par utilisateur —
// évite une dépendance réseau bloquante pour afficher le questionnaire.
export type TransportModeId =
  | 'voiture'
  | 'bus'
  | 'train'
  | 'metro_tram'
  | 'velo'
  | 'marche'
  | 'deux_roues_motorise'
  | 'trottinette';

export const TRANSPORT_MODE_LABELS: Record<TransportModeId, string> = {
  voiture: 'Voiture',
  bus: 'Bus',
  train: 'Train',
  metro_tram: 'Métro ou tram',
  velo: 'Vélo',
  marche: 'Marche',
  deux_roues_motorise: 'Deux-roues motorisé',
  trottinette: 'Trottinette ou mobilité douce',
};

/**
 * Les trois familles de modes, dans l'ordre où les listes les montrent (29/09/2026, `v1-31`,
 * décision 2) : les véhicules individuels à moteur, les transports en commun, et la mobilité active.
 */
export type FamilleDeMode = 'motorise' | 'collectif' | 'actif';

/**
 * **L'ordre des modes, déclaré une fois** (29/09/2026, `v1-31` §2.1) : par famille, puis dans
 * l'ordre de la famille. Neuf modes sur une seule colonne se lisent mieux en trois blocs sans
 * intertitre — 4 px dans une famille, 16 entre deux —, et le deux-roues motorisé passe de la
 * huitième à la troisième place, à côté de la voiture. *Ce qu'on a accepté* : l'ordre ne suit plus
 * l'usage, et un re-bilan ne retrouve plus le deux-roues à sa place, même si sa réponse arrive
 * cochée.
 *
 * **Une liste et non l'ordre des clés de `TRANSPORT_MODE_LABELS`**, que le handoff désignait : l'ordre
 * des clés d'un objet est un accident, et une clé ajoutée plus tard irait en queue sans que rien ne le
 * dise. `TRANSPORT_MODE_LABELS` garde donc ses clés dans l'ordre d'avant — le test de propriétés de
 * `normaliserReponses` y tire ses modes, et réordonner changerait ses 6 000 tirages.
 *
 * « Lequel ? » itère cette liste. Les trois tableaux de choix ci-dessous (`COMMUTE_MODE_CHOICES`,
 * `LEISURE_MODE_CHOICES_PRIMARY`, `LEISURE_MODE_CHOICES_MORE`) restent **littéraux**, réordonnés à la
 * main et vérifiés contre elle par `transport-modes.test.ts` : la section H de
 * `scripts/verifier-etats-export.mjs` lit le premier mode de `LEISURE_MODE_CHOICES_MORE` dans ce
 * fichier source, et un script `.mjs` ne peut pas importer du TypeScript.
 */
export const MODES_PAR_FAMILLE: readonly { modeId: TransportModeId; famille: FamilleDeMode }[] = [
  { modeId: 'voiture', famille: 'motorise' },
  { modeId: 'deux_roues_motorise', famille: 'motorise' },
  { modeId: 'bus', famille: 'collectif' },
  { modeId: 'train', famille: 'collectif' },
  { modeId: 'metro_tram', famille: 'collectif' },
  { modeId: 'velo', famille: 'actif' },
  { modeId: 'marche', famille: 'actif' },
  { modeId: 'trottinette', famille: 'actif' },
];

/** La famille de chaque mode, lue dans `MODES_PAR_FAMILLE`. */
export const FAMILLE_DU_MODE = Object.fromEntries(
  MODES_PAR_FAMILLE.map(({ modeId, famille }) => [modeId, famille])
) as Record<TransportModeId, FamilleDeMode>;

/**
 * Une liste de choix déjà rangée, coupée en familles : un bloc par suite de choix de la même famille.
 * C'est ce que l'écran rend en sous-vues **sans rôle** dans le `GroupeDeChoix` — les flèches du
 * clavier ne les voient pas, `groupe-au-clavier.ts` prenant les options dont le groupe est le plus
 * proche. Une liste que personne n'a rangée par famille rendrait plusieurs blocs de la même famille :
 * c'est pourquoi `transport-modes.test.ts` vérifie l'ordre des listes, et pas seulement ce découpage.
 */
export function enFamilles<T>(choix: readonly T[], modeDe: (c: T) => TransportModeId): T[][] {
  const blocs: T[][] = [];
  let precedente: FamilleDeMode | null = null;
  for (const c of choix) {
    const famille = FAMILLE_DU_MODE[modeDe(c)];
    if (famille !== precedente) blocs.push([]);
    blocs[blocs.length - 1].push(c);
    precedente = famille;
  }
  return blocs;
}

// Liste complète pour le picker du mode principal (B1.4) — voiture seul et covoiturage sont deux
// entrées distinctes dans la maquette (elles ne partagent qu'un même `transport_mode_id`, le
// covoiturage se distingue par `commute_is_carpool`). Le « Lequel ? » du second mode (B1.7) n'en a
// pas besoin : il n'y a pas de covoiturage en second mode, et il itère `MODES_PAR_FAMILLE`.
export type CommuteModeChoice = { key: string; modeId: TransportModeId; carpool: boolean; label: string };

// Rangée dans l'ordre de `MODES_PAR_FAMILLE`, à la main (29/09/2026, `v1-31`).
export const COMMUTE_MODE_CHOICES: CommuteModeChoice[] = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];

// Loisirs (B2.2) : 4 modes en avant + "Voir les autres modes" pour le reste — même
// choix voiture seul/covoiturage que B1.4. Le covoiturage de loisirs demande combien on est
// (`leisure_carpool_size`, C3.5) et divise l'empreinte d'autant, comme celui du quotidien :
// ce commentaire disait l'inverse, d'après `v1-05` §2, écrit avant que la colonne n'existe.
export const LEISURE_MODE_CHOICES_PRIMARY: CommuteModeChoice[] = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
];

// Les cinq autres, en un bloc sous les quatre premiers et rangés par famille eux aussi (`v1-31`) :
// « Voir les autres modes » ne les intercale pas dans la première liste, et le premier révélé reste
// à la place du lien. **Le premier de ce tableau est lu dans ce fichier par la section H de
// `scripts/verifier-etats-export.mjs`** : le tableau doit rester littéral.
export const LEISURE_MODE_CHOICES_MORE: CommuteModeChoice[] = [
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];

// Question de suivi affichée dès que « deux-roues motorisé » est choisi (B1.4/B1.7/B2.2) — même
// forme que la motorisation voiture ci-dessous : quatre réponses au même niveau, surtout pas un
// premier niveau « scooter ou moto ? » suivi d'un second sur la cylindrée. La frontière ADEME est à
// 250 cm³ ; le libellé garde le vocabulaire courant, la correspondance exacte vit dans
// `emission_factor_sources`.
export const TWO_WHEELER_TYPE_OPTIONS: {
  value: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse';
  label: string;
}[] = [
  { value: 'scooter_thermique', label: 'Scooter thermique' },
  { value: 'scooter_electrique', label: 'Scooter électrique' },
  { value: 'moto_petite', label: 'Moto, petite cylindrée' },
  { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
];

// Question de suivi affichée dès que "voiture" est choisi (B1.4/B1.7/B2.2/B3.4) — jamais
// une entrée de plus dans les listes ci-dessus, cf. types/bilan.ts CarEngine.
// Quatre motorisations, au même niveau — pas de second « rechargeable ou non ? » imbriqué :
// la profondeur coûte plus cher en abandon qu'une puce de plus, et les deux hybrides sont
// assez éloignées (9,5 %) pour mériter d'être distinguées.
//
// **L'ordre n'est pas un classement par émission, et il ne s'y « corrige » pas** (01/10/2026,
// `v1-33`, Q-16 : ce paragraphe disait « du plus émetteur au moins émetteur », ce qui était faux dès
// le premier rang). Thermique en tête, puis l'ordre de la page ADEME dont ces quatre réponses sont
// tirées (thermique, hybride, hybride rechargeable, électrique) — celle d’une électrification
// croissante, du moteur thermique à l’électrique. Les facteurs en ACV complète, eux, ne la suivent
// pas : thermique 0,142253, hybride 0,146579, hybride rechargeable 0,133900, électrique 0,067365. Le
// seul écart à l'ordre d'émission est en tête : l'hybride non rechargeable émet **plus** que la
// thermique de référence, qui est une compacte diesel sobre à l'usage (cf. migration
// 20260905140000_motorisation_hybride.sql). Reclasser les réponses sur les facteurs mettrait
// « Hybride » devant la motorisation de référence, et la liste cesserait de se lire comme une
// progression.
export const CAR_ENGINE_OPTIONS: {
  value: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique';
  label: string;
}[] = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

// Question de suivi affichée dès que « Train » est choisi (B1.4/B1.7/B2.2) — même mécanique que
// la motorisation, et pour un écart plus grand encore : le mode s'appelait « Train ou RER » et
// portait le facteur du **TER**, soit **2,83 fois** celui du RER (0,027690 contre 0,009780). Un
// usager du RER voyait 249,2 kg/an là où 88,0 étaient justes, sur le poste qui décide du plan.
//
// Trois réponses et non une moyenne. `metro_tram` en fait une, légitimement : le métro (0,00444)
// et le tram (0,00428) sont à **3,7 %** l'un de l'autre, donc la moyenne ne coûte rien à personne.
// Le TER vaut **2,83 fois** le RER : moyenner ne réduirait pas l'erreur, il la répartirait sur
// deux populations qui n'ont rien en commun (v1-21 D1).
//
// **Les deux écarts sont mesurés ici plutôt que repris de `v1-21`**, qui les donne « à 2 % » et
// « à 283 % » : le premier est faux (relevé le 21/09/2026 sur l'endpoint ACV, l'écart est de
// 3,7 %) et les deux ne comptent pas dans la même unité — un écart relatif d'un côté, un rapport
// de l'autre. La page de décision est datée, on ne la réécrit pas ; ce commentaire-ci est du code
// vivant, il doit être juste.
export const TRAIN_TYPE_OPTIONS: { value: 'ter' | 'rer' | 'intercites'; label: string }[] = [
  { value: 'ter', label: 'TER ou train régional' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'intercites', label: 'Intercités' },
];

// Et la même sous « Vélo » : l'assistance électrique vaut 0,010950 contre 0,000170, soit 64 fois.
// L'écart absolu est petit, et il faut le dire ainsi — mais il tombe sur le profil sobre, dont le
// total est de l'ordre de la dizaine de kilos, et sur le mode qui remplace une voiture.
//
// **Deux réponses, et la trottinette n'en reçoit aucune** : elle est déjà à 0,0249 et n'a pas de
// variante mécanique crédible — une question dont une seule réponse existe n'est pas une question
// (v1-21 D2).
export const VELO_TYPE_OPTIONS: { value: 'mecanique' | 'electrique'; label: string }[] = [
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'electrique', label: 'À assistance électrique' },
];
