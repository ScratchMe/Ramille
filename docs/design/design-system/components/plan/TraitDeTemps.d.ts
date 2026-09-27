/** Le temps écoulé dans la période — accentMuted sur le rail, jamais accent : il mesure la saison, pas la personne. */
export interface TraitDeTempsProps {
  /** De 0 à 1 — la part de la période écoulée. Plein seulement une fois la période révolue. */
  progression: number;
}
export declare function TraitDeTemps(props: TraitDeTempsProps): JSX.Element;
