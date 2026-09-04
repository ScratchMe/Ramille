// Repères carbone affichés à l'utilisateur — source unique.
//
// Ces valeurs étaient auparavant codées en dur et dupliquées dans `onboarding/contexte.tsx`
// et `bilan/resultat.tsx`, marquées « à confirmer » depuis le handoff design. Décision
// produit du 04/09/2026 : elles ne peuvent pas rester des placeholders, parce qu'elles
// portent tout le cadrage du produit — c'est l'endroit où la crédibilité se joue.
//
// Règle : **toute valeur ici est soit publiée par une source officielle citée, soit une
// dérivation explicitement signalée comme telle.** Rien d'approximé en silence.

/** Étiquette de source affichée sous les graphiques qui utilisent ces repères. */
export const CARBON_SOURCE_LABEL = 'ADEME · SDES (données 2017)';

/**
 * Empreinte carbone moyenne d'un Français, tous postes confondus.
 * ADEME, via impactco2.fr/outils/caspratiques/2050 — « près de 9,3 tonnes de CO2 par an ».
 *
 * La spec fonctionnelle §4 annonçait « ~10 t » : c'était un ordre de grandeur arrondi, que
 * le handoff design signalait déjà comme à confirmer. On retient la valeur publiée.
 */
export const FRANCE_AVERAGE_TOTAL_T = 9.3;

/**
 * Objectif par personne à l'horizon 2050.
 * ADEME, même page — « un objectif maximum de 2 tonnes de CO₂e par personne par an d'ici 2050 ».
 * Cohérent avec la SNBC-3, qui vise une empreinte française de 2,3 à 3,1 t/habitant en 2050 ;
 * les 2 t sont la cible de sobriété individuelle, plus exigeante que la trajectoire nationale.
 */
export const TARGET_2050_TOTAL_T = 2;

/**
 * Décomposition de l'empreinte par poste de consommation.
 * SDES (service statistique du ministère de la Transition écologique), données 2017,
 * publication d'octobre 2021 — « la décomposition de l'empreinte carbone de la demande
 * finale de la France par postes de consommation ».
 *
 * Le total de ces postes (9,5 t) diffère légèrement de FRANCE_AVERAGE_TOTAL_T (9,3 t) :
 * ce sont deux publications d'années différentes. On ne les mélange donc pas dans un même
 * graphique — l'onboarding montre la décomposition, la restitution montre la moyenne.
 */
export const CONSUMPTION_POSTES = [
  { key: 'transport', label: 'Transport', valueT: 2.8 },
  { key: 'logement', label: 'Logement', valueT: 2.2 },
  { key: 'alimentation', label: 'Alimentation', valueT: 2.1 },
  { key: 'services', label: 'Services', valueT: 1.5 },
  { key: 'equipements', label: 'Équipements', valueT: 0.9 },
] as const;

/** Somme des postes ci-dessus — 9,5 t selon le SDES. Calculée, jamais recopiée. */
export const CONSUMPTION_POSTES_TOTAL_T = CONSUMPTION_POSTES.reduce(
  (total, poste) => total + poste.valueT,
  0
);

/**
 * Part transport de l'empreinte moyenne : 2,8 t, soit 30 % du total (SDES, 2017).
 * C'est le repère auquel la restitution compare le bilan de l'utilisateur.
 */
export const FRANCE_AVERAGE_TRANSPORT_T = 2.8;

/**
 * Part transport compatible avec l'objectif 2050.
 *
 * **DÉRIVATION, pas une cible officielle.** Aucune source publique ne donne d'objectif 2050
 * par poste de consommation : la SNBC raisonne par secteur d'activité (transports, bâtiment,
 * industrie), pas par poste d'empreinte individuelle. On applique donc à la cible de 2 t la
 * part que le transport représente aujourd'hui (30 %), ce qui suppose que tous les postes
 * baissent dans les mêmes proportions — hypothèse simple et neutre, mais hypothèse.
 *
 * À remplacer si une trajectoire par poste est publiée. C'est pour cette raison que l'écran
 * qui l'affiche doit dire « repère » et jamais « objectif officiel ».
 */
export const TARGET_2050_TRANSPORT_T =
  Math.round(TARGET_2050_TOTAL_T * (FRANCE_AVERAGE_TRANSPORT_T / CONSUMPTION_POSTES_TOTAL_T) * 10) / 10;

/** Formatage court d'une valeur en tonnes, à la française (virgule décimale). */
export function formatTonnesShort(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} t`;
}
