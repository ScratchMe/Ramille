// Les faits de l'été 2026 que la page d'accueil du web raconte (`docs/architecture/v1-36-la-page-d-accueil.md`).
//
// **La règle de `carbon-reference.ts`, ici aussi** : toute valeur est publiée par une source citée, et rien
// n'est approximé en silence. Une seule source, **le bilan climatique de l'été 2026 de Météo-France**
// (1er juin au 31 août 2026), lu le 31/10/2026 : ses pages 4 (« Ce qu'il faut retenir »), 5, 11 et 15 à 17.
// Les phrases de la page reprennent ses mots, et la page cite la source sous les chiffres.
//
// **Une date se périme, un fait daté non** : la page écrit « l'été 2026 », jamais « cet été ». À chaque
// nouveau bilan — l'été 2027 —, la question se repose : garder 2026, ou raconter le suivant.

export const SOURCE_DE_L_ETE = {
  libelle: 'Météo-France, bilan climatique de l’été 2026',
  url: 'https://meteofrance.fr/sites/default/files/files/editorial/bilan-climatique-ete-2026-meteo-france.pdf',
} as const;

/** La saison que le bilan couvre : l'été météorologique, du 1er juin au 31 août. */
export const ETE_2026 = { debut: '2026-06-01', fin: '2026-08-31' } as const;

/**
 * **Les trois vagues de chaleur, bornes comprises** (p. 4 et 5 : « 53 jours en trois épisodes » ; du 17 au
 * 30 juin, du 4 au 19 juillet, du 28 juillet au 19 août). Leur somme est vérifiée par le test de `ete.ts` :
 * une borne mal recopiée ne donnerait plus 53.
 */
export const VAGUES_DE_CHALEUR_2026: readonly { debut: string; fin: string }[] = [
  { debut: '2026-06-17', fin: '2026-06-30' },
  { debut: '2026-07-04', fin: '2026-07-19' },
  { debut: '2026-07-28', fin: '2026-08-19' },
];

/** Ce que le bilan dit en nombres, chacun avec sa page. */
export const FAITS_DE_L_ETE = {
  /** P. 4 : « 53 jours en trois épisodes au fil de la saison ». */
  joursDeVagueDeChaleur: 53,
  /** P. 4 : « loin devant l'été 2022 avec 33 jours ». */
  joursDeVagueDeChaleur2022: 33,
  /** P. 4 : « jusqu'à 72 départements placés en Vigilance rouge Canicule » (du 17 au 30 juin). */
  departementsEnVigilanceRouge: 72,
  /** P. 4 : « un déficit proche de 40 % » des précipitations. */
  deficitDePluiePct: 40,
  /** P. 15 : « 1 possibilité sur 100 de se produire » dans le climat actuel. */
  uneChanceSur: 100,
  /** P. 16 : « un été ordinaire dans une France à +4 °C ». */
  ordinaireDansUneFranceAC: 4,
  /** P. 15 : l'horizon 2050 de la TRACC, « France à +2,7 °C ». */
  franceA2050C: 2.7,
} as const;
