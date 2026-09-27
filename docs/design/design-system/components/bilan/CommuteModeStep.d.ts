/** Les champs de `BilanAnswers` (le questionnaire du dépôt, miroir de `assessment_answers`) que l’étape lit ou écrit. */
export interface CommuteModeStepAnswers {
  /** B1.4 — le mode principal du trajet, ou `null` sans réponse. « Voiture (seul) » et « Voiture (covoiturage) » valent tous deux `voiture`. */
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
  /** Vrai pour « Voiture (covoiturage) » : c’est lui qui distingue les deux entrées « voiture » de la liste. */
  commute_is_carpool: boolean;
  /** Sous « Voiture (covoiturage) » : combien vous êtes à partager le trajet, de 2 à 6 (6 = « 6+ »), ou `null`. */
  commute_carpool_size: number | null;
  /** Sous une voiture : la motorisation. Un seul champ pour les deux jambes du trajet. */
  commute_car_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  /** Sous « Deux-roues motorisé » : le type. Un seul champ pour les deux jambes. */
  commute_two_wheeler_type: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse' | null;
  /** Sous « Train » : le type de train. Un seul champ pour les deux jambes. */
  commute_train_type: 'ter' | 'rer' | 'intercites' | null;
  /** Sous « Vélo » : mécanique ou à assistance électrique. Un seul champ pour les deux jambes. */
  commute_velo_type: 'mecanique' | 'electrique' | null;
}
/** B1.4 — le mode principal du trajet domicile-travail et la précision qu’il appelle, ouverte sous lui ; posée dans `StepShell`. */
export interface CommuteModeStepProps {
  answers: CommuteModeStepAnswers;
  /**
   * Écrit le choix qui vient d’être fait, rien d’autre. L’écran du questionnaire fusionne le fragment puis efface ce
   * qu’il rend impossible (taille du covoiturage hors covoiturage, motorisation d’une voiture qu’on n’a plus…).
   */
  update: (patch: Partial<CommuteModeStepAnswers>) => void;
}
export declare function CommuteModeStep(props: CommuteModeStepProps): JSX.Element;
