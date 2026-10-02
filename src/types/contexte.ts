import type {
  HouseholdVehicles,
  Teletravail,
  TransportProche,
  ZoneType,
} from '@/types/bilan';

/**
 * Ce que la base rend des réponses de contexte, avant qu'on les ramène à ce que l'écran édite.
 *
 * **Un type de lecture** : `string | null`, parce que ces colonnes sont du `text` — `text[]` pour ce qui
 * passe près de chez soi (`v1-34`). L'encart du plan lit les siennes par `ReponsesDeContexte`
 * (`src/types/plan.ts`), qui garde l'accès aux transports : depuis `v1-34` il se déduit de la réponse,
 * et c'est sa phrase que l'encart dit.
 */
export type ReponsesLuesDuContexte = {
  zone_type: string | null;
  transports_proches: string[] | null;
  household_vehicles: string | null;
  teletravail: string | null;
};

/**
 * Les quatre réponses de contexte B4, éditables hors du questionnaire (C6.4, `v1-19` D5).
 *
 * **Deux types pour deux métiers, et les confondre coûterait quelque chose.** `ReponsesLuesDuContexte`
 * est un type de **lecture**, `ChoixDeContexte` un type d'**écriture** : il ne peut porter qu'une
 * valeur que le produit propose, et c'est ce qui rend impossible d'envoyer au RPC une chaîne que le
 * `check` de la table refuserait — en anglais, et neuf étapes trop tard.
 *
 * **La deuxième réponse n'est plus l'accès aux transports** (`v1-34`, 02/10/2026) : c'est ce qui passe
 * près de chez la personne, et le serveur en déduit l'accès.
 *
 * `lireLeContexte` est le seul passage de l'un à l'autre, et il refuse en rendant `null`.
 */
export type ChoixDeContexte = {
  zone_type: ZoneType | null;
  transports_proches: TransportProche[] | null;
  household_vehicles: HouseholdVehicles | null;
  teletravail: Teletravail | null;
};

/**
 * Le même contexte, mais dont les trois réponses obligatoires sont là.
 *
 * **Le type est la garde, et c'est ce qui la rend impossible à oublier** : `enregistrerLeContexte`
 * ne prend que celui-ci, donc rien ne peut appeler le RPC avec une réponse vide sans passer par
 * `contexteEstComplet`. Le serveur refuse aussi (`RM003`), et les deux ne protègent pas la même
 * chose — le type empêche d'écrire l'appel, le serveur empêche qu'un autre appelant l'émette.
 */
export type ContexteEnregistrable = ChoixDeContexte & {
  zone_type: ZoneType;
  transports_proches: TransportProche[];
  household_vehicles: HouseholdVehicles;
};

/**
 * Les puces de chaque question, dans l'ordre de l'étape « Contexte ».
 *
 * **Elles vivent ici et non dans l'écran**, parce qu'elles sont désormais lues par deux surfaces —
 * l'étape du questionnaire et l'écran autonome — et que deux listes de trois libellés divergent par
 * une faute de frappe que personne ne relit. C'est la leçon de `CarteDOuverture` (C5.6) appliquée à
 * plus petit : ce qui est rendu deux fois s'écrit une fois.
 *
 * Elles sont aussi le **miroir des `check` du schéma**, comme `PARTS_DU_SECOND_MODE` : rien ne peut
 * lire ces bornes depuis TypeScript, et un test les épingle valeur par valeur.
 */
export const CHOIX_DE_ZONE: { value: ZoneType; label: string }[] = [
  { value: 'urbain_dense', label: 'Urbain dense' },
  { value: 'periurbain', label: 'Périurbain' },
  { value: 'rural', label: 'Rural' },
];

/**
 * Ce qui peut passer près de chez soi (`v1-34`), dans l'ordre où l'écran le propose — et dans lequel
 * la réponse se range (`transportsRanges`). « RER ou Transilien » est déjà le libellé du mode dans le
 * questionnaire (C4.4) : les mêmes mots aux deux endroits.
 */
export const CHOIX_DE_TRANSPORTS: { value: TransportProche; label: string }[] = [
  { value: 'metro_tram', label: 'Métro ou tram' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'train', label: 'Train (TER, Intercités)' },
  { value: 'bus', label: 'Bus' },
  { value: 'aucun', label: 'Rien de tout ça' },
];

/** La réponse qui exclut les autres. */
export const AUCUN_TRANSPORT: TransportProche = 'aucun';

const ORDRE_DES_TRANSPORTS = CHOIX_DE_TRANSPORTS.map((c) => c.value);

/**
 * La réponse rangée dans l'ordre des puces, sans doublon — **la jumelle de `public.transports_ranges`**,
 * que le déclencheur applique à chaque écriture. Les deux se tiennent : l'écran compare la réponse lue
 * à la réponse éditée pour savoir s'il y a quelque chose à enregistrer (`contexteAChange`), et le RPC
 * fait la même comparaison de son côté ; si l'un rangeait autrement, l'écran promettrait une mise à jour
 * que le serveur jugerait inutile.
 */
export function transportsRanges(transports: readonly TransportProche[]): TransportProche[] {
  return ORDRE_DES_TRANSPORTS.filter((valeur) => transports.includes(valeur));
}

/**
 * Ce que devient la réponse quand on touche une puce.
 *
 * **« Rien de tout ça » exclut les autres, dans les deux sens** : la toucher retire tout le reste, et
 * toucher une autre puce la retire. La base refuse aussi `aucun` combiné (`check`), donc l'écran ne doit
 * jamais pouvoir le produire. **Plus rien de coché rend `null`**, pas un tableau vide : la question est
 * alors sans réponse, et c'est ce que `manqueDeLEtape` et `contexteEstComplet` doivent voir — la base
 * refuse le tableau vide.
 */
export function basculerTransport(
  actuels: readonly TransportProche[] | null,
  valeur: TransportProche
): TransportProche[] | null {
  const deja = actuels ?? [];
  if (valeur === AUCUN_TRANSPORT) {
    return deja.includes(AUCUN_TRANSPORT) ? null : [AUCUN_TRANSPORT];
  }
  const sansAucun = deja.filter((v) => v !== AUCUN_TRANSPORT);
  const suivants = sansAucun.includes(valeur)
    ? sansAucun.filter((v) => v !== valeur)
    : [...sansAucun, valeur];
  return suivants.length === 0 ? null : transportsRanges(suivants);
}

export const CHOIX_DE_VEHICULES: { value: HouseholdVehicles; label: string }[] = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2_plus', label: '2 ou plus' },
];

/** Les valeurs de télétravail admissibles, dans l'ordre de `REPONSES_TELETRAVAIL`. */
const VALEURS_TELETRAVAIL: Teletravail[] = ['aucun', 'un_jour', 'deux_ou_plus'];

function narrow<T extends string>(valeur: string | null, admissibles: readonly T[]): T | null {
  return valeur !== null && (admissibles as readonly string[]).includes(valeur)
    ? (valeur as T)
    : null;
}

/**
 * Ce que la base rend, ramené à ce que l'écran peut éditer.
 *
 * **Une valeur inconnue devient `null`, et ce n'est pas une perte de donnée** : l'écran ne
 * sélectionnerait de toute façon aucune puce, et rendre `null` fait dire à `contexteEstComplet` ce
 * qui est vrai — la question est à reposer. Le seul cas de production est un bilan soumis avant
 * qu'une colonne n'existe ; un identifiant hors liste ne peut venir que d'une migration qui aurait
 * ajouté une réponse sans passer ici, et alors on préfère reposer la question à envoyer au RPC une
 * chaîne que la table refusera.
 */
export function lireLeContexte(reponses: ReponsesLuesDuContexte): ChoixDeContexte {
  return {
    zone_type: narrow(
      reponses.zone_type,
      CHOIX_DE_ZONE.map((c) => c.value)
    ),
    transports_proches: lireLesTransports(reponses.transports_proches),
    household_vehicles: narrow(
      reponses.household_vehicles,
      CHOIX_DE_VEHICULES.map((c) => c.value)
    ),
    teletravail: narrow(reponses.teletravail, VALEURS_TELETRAVAIL),
  };
}

/**
 * La réponse aux transports, ramenée à ce que l'écran édite — **entière ou pas du tout** : une seule
 * valeur inconnue, une réponse vide ou « rien de tout ça » combiné, et la question est à reposer plutôt
 * qu'à corriger à moitié. Un bilan d'avant la question rend `null`, ce qui est vrai : elle n'a pas de
 * réponse.
 */
function lireLesTransports(lus: string[] | null): TransportProche[] | null {
  if (lus === null || lus.length === 0) return null;
  if (!lus.every((v) => (ORDRE_DES_TRANSPORTS as readonly string[]).includes(v))) return null;
  const ranges = transportsRanges(lus as TransportProche[]);
  if (ranges.includes(AUCUN_TRANSPORT) && ranges.length > 1) return null;
  return ranges;
}

/**
 * Y a-t-il de quoi enregistrer ?
 *
 * **Les trois premières sont obligatoires, la quatrième dépend de la question posée.** C'est la
 * règle de C3.8 dans sa forme la plus coûteuse : une condition qu'on ne peut pas évaluer n'est pas
 * remplie, donc une réponse vidée **retire** des actions du plan — en silence, et dans le sens qui
 * appauvrit. Le RPC refuse les trois à `null` de son côté (`RM003`) ; ce prédicat est ce qui évite
 * d'envoyer une requête qui ne peut que échouer, et de désactiver le bouton sans dire pourquoi.
 *
 * `teletravailSePose` n'est **pas** réécrit ici : il est passé évalué par l'écran, qui est le seul
 * à savoir combien de jours de trajet la personne a déclarés. Le piège de `v1-17` §7.2 est d'en
 * avoir trois copies ; on n'en ajoute pas une quatrième.
 */
export function contexteEstComplet(
  choix: ChoixDeContexte,
  teletravailSePose: boolean
): choix is ContexteEnregistrable {
  if (
    choix.zone_type === null ||
    choix.transports_proches === null ||
    choix.transports_proches.length === 0 ||
    choix.household_vehicles === null
  ) {
    return false;
  }
  return !teletravailSePose || choix.teletravail !== null;
}

/**
 * Quelque chose a-t-il bougé ?
 *
 * La jumelle exacte du `is not distinct from` de `mettre_a_jour_le_contexte` : le RPC sort sans
 * rien toucher quand les quatre valeurs sont identiques, et ce prédicat est ce qui permet à l'écran
 * de le dire **avant** l'appel plutôt que d'annoncer un enregistrement qui n'a rien enregistré.
 * Les deux moitiés se tiennent — si l'une se met à ignorer une colonne, l'écran promettra une mise
 * à jour que le serveur ne fera pas.
 */
export function contexteAChange(avant: ChoixDeContexte, apres: ChoixDeContexte): boolean {
  return (
    avant.zone_type !== apres.zone_type ||
    memesTransports(avant.transports_proches, apres.transports_proches) === false ||
    avant.household_vehicles !== apres.household_vehicles ||
    avant.teletravail !== apres.teletravail
  );
}

/** Deux réponses aux transports égales, dans quelque ordre qu'on ait touché les puces. */
function memesTransports(a: TransportProche[] | null, b: TransportProche[] | null): boolean {
  if (a === null || b === null) return a === b;
  return transportsRanges(a).join() === transportsRanges(b).join();
}

/**
 * Ce que ces réponses font — ou ne font pas — au chiffre du bilan.
 *
 * **La phrase fixe était fausse pour un profil, et c'est celui où l'écart est le plus grand.**
 * L'étape du questionnaire affirmait « Elles n'entrent pas dans le calcul de ton bilan » depuis
 * C5.4, et le calcul dit le contraire pour qui sort **rarement** : `recompute_assessment_results`
 * y choisit le mode du résiduel de sorties sur `household_vehicles` — train si le foyer n'a aucun
 * véhicule, voiture sinon. Sur le bilan réel mesuré le 18/09/2026, le basculement vaut
 * **10,9 kg contre 55,6 kg**, c'est-à-dire 411 % d'un total de 11 kg ; sur les six bilans à sorties
 * hebdomadaires, 1,2 %. Une réponse de contexte compte d'autant plus que l'empreinte est petite —
 * et le profil « rarement » est justement le profil sobre, le cycliste, le piéton.
 *
 * On ne corrige donc pas la phrase pour tout le monde : on la rend vraie pour chacun. Le seuil est
 * `leisure_frequency`, la seule chose dont dépend la branche.
 *
 * **Ce qui n'est volontairement pas dit** : `zone_type` et `tc_access` — déduit depuis `v1-34` de ce qui
 * passe près de chez soi — décident ensemble de `mobility_constrained`, qui n'entre dans aucun total mais décide si la restitution montre la
 * barre de la moyenne française (C3.1). Ce n'est pas « le calcul de ton bilan » au sens où la
 * personne l'entend — son chiffre ne bouge pas —, et l'annoncer obligerait à expliquer un repère
 * qu'on a précisément décidé de taire à ce profil-là.
 */
export function phraseDuCalculDuContexte(leisureFrequency: string | null): string {
  if (leisureFrequency === 'rarely') {
    return 'Une seule entre dans le calcul de ton bilan : le nombre de véhicules du foyer, qui sert à estimer tes sorties occasionnelles.';
  }
  return 'Elles n’entrent pas dans le calcul de ton bilan.';
}
