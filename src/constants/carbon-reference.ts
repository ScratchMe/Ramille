// Repères carbone affichés à l'utilisateur — source unique.
//
// Ces valeurs étaient auparavant codées en dur et dupliquées dans `onboarding/contexte.tsx`
// et `bilan/resultat.tsx`, marquées « à confirmer » depuis le handoff design. Décision
// produit du 04/09/2026 : elles ne peuvent pas rester des placeholders, parce qu'elles
// portent tout le cadrage du produit — c'est l'endroit où la crédibilité se joue.
//
// Règle : **toute valeur ici est soit publiée par une source officielle citée, soit une
// dérivation explicitement signalée comme telle.** Rien d'approximé en silence.
//
// ## Pourquoi le SDES et pas la moyenne affichée par Impact CO2
//
// Il circule au moins quatre chiffres officiels pour « l'empreinte carbone moyenne d'un
// Français », dont deux sur le site de l'ADEME lui-même :
//
// | Source | Valeur |
// |---|---|
// | `impactco2.fr/outils/caspratiques/francais` (ADEME, via Nos Gestes Climat) | 9,1 t |
// | `impactco2.fr/outils/caspratiques/2050` (ADEME, même outil) | 9,3 t |
// | SDES, décomposition par postes (données 2017) | 9,5 t |
// | SDES, série empreinte carbone | 9,4 t (2023), 8,2 t (2024) |
//
// Une première version de ce fichier prenait 9,3 t pour le total (page ADEME « 2050 ») et
// 2,8 t pour le poste transport (SDES) : deux sources mélangées, donc un total qui ne
// correspondait pas à la somme de ses propres postes. On ne tranche pas entre 9,1 et 9,3 —
// **on cesse de citer cette moyenne-là**. Le total affiché est celui du SDES, c'est-à-dire
// la somme des cinq postes que le même tableau publie : une seule source, une seule année,
// des chiffres qui s'additionnent par construction.
//
// La seule valeur qui ne vienne pas du SDES est la cible 2050 (ADEME) : c'est un objectif
// normatif, pas une mesure concurrente, donc aucune contradiction possible avec le total.

/** Étiquette de source affichée sous les graphiques qui utilisent ces repères. */
export const CARBON_SOURCE_LABEL = 'SDES, données 2017 · cible 2050 : ADEME';

/**
 * Décomposition de l'empreinte carbone par poste de consommation.
 * SDES (service statistique du ministère de la Transition écologique), « La décomposition de
 * l'empreinte carbone de la demande finale de la France par postes de consommation »,
 * données 2017, publication du 26/07/2022.
 *
 * C'est la **seule publication officielle qui donne à la fois un total et sa ventilation**
 * par poste de vie — d'où son statut de source unique ici (cf. en-tête du fichier).
 */
export const CONSUMPTION_POSTES = [
  { key: 'transport', label: 'Transport', valueT: 2.8 },
  { key: 'logement', label: 'Logement', valueT: 2.2 },
  { key: 'alimentation', label: 'Alimentation', valueT: 2.1 },
  { key: 'services', label: 'Services', valueT: 1.5 },
  { key: 'equipements', label: 'Équipements', valueT: 0.9 },
] as const;

/** Somme des postes ci-dessus — 9,5 t selon le SDES. Calculée, jamais recopiée. */
export const CONSUMPTION_POSTES_TOTAL_T =
  Math.round(CONSUMPTION_POSTES.reduce((total, poste) => total + poste.valueT, 0) * 10) / 10;

/**
 * Empreinte carbone moyenne d'un Français, tous postes confondus.
 *
 * Volontairement **définie comme la somme des postes ci-dessus** plutôt que recopiée d'une
 * autre publication : c'est ce qui garantit que l'onboarding (qui montre la ventilation) et
 * la restitution (qui montre le total) ne peuvent pas se contredire.
 *
 * La spec fonctionnelle §4 annonçait « ~10 t » : c'était un ordre de grandeur arrondi, que
 * le handoff design signalait déjà comme à confirmer.
 */
export const FRANCE_AVERAGE_TOTAL_T = CONSUMPTION_POSTES_TOTAL_T;

/**
 * Part transport de l'empreinte moyenne : 2,8 t, soit 30 % du total (SDES, données 2017).
 * C'est le repère auquel la restitution compare le bilan de l'utilisateur.
 */
export const FRANCE_AVERAGE_TRANSPORT_T = CONSUMPTION_POSTES[0].valueT;

/**
 * Objectif par personne à l'horizon 2050.
 * ADEME, `impactco2.fr/outils/caspratiques/2050` — « un objectif maximum de 2 tonnes de CO₂e
 * par personne par an d'ici 2050 ». Cohérent avec la SNBC-3, qui vise une empreinte française
 * de 2,3 à 3,1 t/habitant en 2050 ; les 2 t sont la cible de sobriété individuelle, plus
 * exigeante que la trajectoire nationale.
 *
 * Seule valeur de ce fichier qui ne vienne pas du SDES — et la seule qui puisse l'être sans
 * incohérence, parce que c'est une cible et non une mesure.
 */
export const TARGET_2050_TOTAL_T = 2;

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

/**
 * La même valeur, unité en toutes lettres — pour un titre, où « 9,5 t » se lit comme une
 * étiquette de graphique et non comme une phrase.
 *
 * Existe parce que le titre de l'étape de contexte écrit la même valeur de deux façons à deux
 * lignes d'écart (A1-12) : `formatTonnesShort(...).replace(' t', ' tonnes')` d'un côté, la
 * constante interpolée brute de l'autre — donc un point décimal le jour où la cible cesserait
 * d'être un entier, dans une app dont le formatage à la française est justement centralisé ici.
 *
 * Deux règles que le `.replace` ad hoc ne pouvait pas tenir : la décimale nulle disparaît
 * (« 2 tonnes », jamais « 2,0 tonnes », qui est plus laid que le défaut corrigé), et
 * l'unité s'accorde — en français le singulier vaut jusqu'à 2 exclu, d'où « 1,5 tonne ».
 */
export function formatTonnesTexte(value: number): string {
  // L'accord suit le nombre **affiché**, pas la valeur d'entrée : 1,95 s'écrit « 2 », et
  // « 2 tonne » serait une faute d'orthographe produite par un arrondi.
  const arrondi = Math.round(value * 10) / 10;
  const nombre = formatTonnesShort(arrondi).replace(' t', '').replace(/,0$/, '');
  return `${nombre} ${Math.abs(arrondi) < 2 ? 'tonne' : 'tonnes'}`;
}
