/** La carte du cap de la saison : le cap en kg par an, la période et sa fin, le trait de temps. */
export interface CarteDuCapProps {
  /** Le cap en kilos par an (`capDuCycle`), ou `null` sans baseline : la carte se rend alors sans chiffre. */
  capKg: number | null;
  /** Ce que le cadre du plan permet de chiffrer (`cadreDuPlan`). */
  chiffreLeCap: boolean;
  /** La période a-t-elle un nom de saison ? Sinon « période », jamais « saison ». */
  cadenceDeSaison: boolean;
  /** −20 % au lancement. */
  reductionPct: number;
  /** Le poste du cycle, en forme insérable (`nomDuPoste`) : « ton trajet domicile-travail ». */
  posteEnMots: string;
  /** La baseline du poste, en tonnes (`formatTonnes`), ou `null`. */
  baselineEnMots: string | null;
  /** Ce que le cap dit des pistes, quand c'est vrai (`phraseDesPistesSuffisantes`). */
  phraseDuCap: string | null;
  /** « Automne 2026 ». */
  periodLabel: string;
  /** « jusqu’au 30 novembre » (`finDePeriodeEnMots`). */
  finDeLaPeriode: string | null;
  /** De 0 à 1, ou `null` pour une période sans durée. */
  progression: number | null;
  /** Le trait se rend-il (`cartesDuPlan`) ? Pas au tout premier plan. */
  traitDeTemps: boolean;
}
export declare function CarteDuCap(props: CarteDuCapProps): JSX.Element;
