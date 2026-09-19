import type {
  HouseholdVehicles,
  TcAccess,
  Teletravail,
  ZoneType,
} from '@/types/bilan';
import type { ReponsesDeContexte } from '@/types/plan';

/**
 * Les quatre réponses de contexte B4, éditables hors du questionnaire (C6.4, `v1-19` D5).
 *
 * **Deux types pour deux métiers, et les confondre coûterait quelque chose.** `ReponsesDeContexte`
 * (`src/types/plan.ts`) est un type de **lecture** : il porte `string | null` parce qu'il décrit ce
 * qui sort de la base, où ces colonnes sont du `text`, et `motsDuContexte` tait poliment une valeur
 * qu'il ne sait pas dire. `ChoixDeContexte` est un type d'**écriture** : il ne peut porter qu'une
 * valeur que le produit propose, et c'est ce qui rend impossible d'envoyer au RPC une chaîne que le
 * `check` de la table refuserait — en anglais, et neuf étapes trop tard.
 *
 * `lireLeContexte` est le seul passage de l'un à l'autre, et il refuse en rendant `null`.
 */
export type ChoixDeContexte = {
  zone_type: ZoneType | null;
  tc_access: TcAccess | null;
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
  tc_access: TcAccess;
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

export const CHOIX_DE_TC: { value: TcAccess; label: string }[] = [
  { value: 'bon', label: 'Bon' },
  { value: 'limite', label: 'Limité' },
  { value: 'inexistant', label: 'Inexistant' },
];

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
export function lireLeContexte(reponses: ReponsesDeContexte): ChoixDeContexte {
  return {
    zone_type: narrow(
      reponses.zone_type,
      CHOIX_DE_ZONE.map((c) => c.value)
    ),
    tc_access: narrow(
      reponses.tc_access,
      CHOIX_DE_TC.map((c) => c.value)
    ),
    household_vehicles: narrow(
      reponses.household_vehicles,
      CHOIX_DE_VEHICULES.map((c) => c.value)
    ),
    teletravail: narrow(reponses.teletravail, VALEURS_TELETRAVAIL),
  };
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
  if (choix.zone_type === null || choix.tc_access === null || choix.household_vehicles === null) {
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
    avant.tc_access !== apres.tc_access ||
    avant.household_vehicles !== apres.household_vehicles ||
    avant.teletravail !== apres.teletravail
  );
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
 * **Ce qui n'est volontairement pas dit** : `zone_type` et `tc_access` décident ensemble de
 * `mobility_constrained`, qui n'entre dans aucun total mais décide si la restitution montre la
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
