/** Les champs de `BilanAnswers` (le questionnaire du dépôt, miroir de `assessment_answers`) que l’étape lit ou écrit. */
export interface CommuteExtraStepAnswers {
  /** B1.4, lu seulement : le mode principal, rappelé sous la question (« En plus de : Voiture. ») et retiré de la liste du second mode. */
  commute_mode:
    | 'voiture'
    | 'bus'
    | 'train'
    | 'metro_tram'
    | 'velo'
    | 'marche'
    | 'deux_roues_motorise'
    | 'trottinette'
    | null;
  /** B1.6 — un second mode en complément : `true`, `false`, ou `null` tant que la personne n’a pas répondu (rien n’est coché d’avance). */
  commute_second_mode_used: boolean | null;
  /** B1.7 — « Lequel ? » : le second mode, jamais le mode principal, ou `null`. « Non » le remet à `null`. */
  commute_second_mode:
    | 'voiture'
    | 'bus'
    | 'train'
    | 'metro_tram'
    | 'velo'
    | 'marche'
    | 'deux_roues_motorise'
    | 'trottinette'
    | null;
  /** La part du trajet faite avec le second mode, en fraction : 0.25, 0.5 ou 0.75, ou `null`. */
  commute_second_mode_share: number | null;
  /** Sous une voiture : la motorisation. Un seul champ pour les deux jambes du trajet. */
  commute_car_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  /** Sous « Deux-roues motorisé » : le type. Un seul champ pour les deux jambes. */
  commute_two_wheeler_type: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse' | null;
  /** Sous « Train » : le type de train. Un seul champ pour les deux jambes. */
  commute_train_type: 'ter' | 'rer' | 'intercites' | null;
  /** Sous « Vélo » : mécanique ou à assistance électrique. Un seul champ pour les deux jambes. */
  commute_velo_type: 'mecanique' | 'electrique' | null;
}
/** B1.6 / B1.7 — « Utilises-tu un second mode en complément ? », puis lequel et quelle part du trajet ; posée dans `StepShell`. */
export interface CommuteExtraStepProps {
  answers: CommuteExtraStepAnswers;
  /**
   * Écrit le choix qui vient d’être fait — « Non » efface aussi le second mode. L’écran du questionnaire fusionne le
   * fragment puis efface ce qu’il rend impossible (la part d’un second mode qu’on n’a plus, une motorisation orpheline).
   */
  update: (patch: Partial<CommuteExtraStepAnswers>) => void;
}
export declare function CommuteExtraStep(props: CommuteExtraStepProps): JSX.Element;
