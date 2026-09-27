/** La part de `BilanAnswers` (src/types/bilan.ts) que l'étape « mode et distance des sorties » lit ou écrit ; `null` = pas encore répondu. */
export interface LeisureDetailStepAnswers {
  /** Le mode des sorties. Les deux voitures écrivent `voiture` ; les cinq derniers vivent derrière « Voir les autres modes ». */
  leisure_mode: 'voiture' | 'bus' | 'train' | 'metro_tram' | 'velo' | 'marche' | 'deux_roues_motorise' | 'trottinette' | null;
  /** Vrai pour « Voiture (covoiturage) » : c'est lui qui distingue les deux voitures, et ouvre la taille du covoiturage. */
  leisure_is_carpool: boolean;
  /** « Vous êtes combien dans la voiture ? » : 2 à 6, la dernière puce valant « 6 ou plus ». */
  leisure_carpool_size: number | null;
  /** « Quelle motorisation ? », sous l'une des deux voitures. */
  leisure_car_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  /** « Quel type de deux-roues ? », sous « Deux-roues motorisé ». */
  leisure_two_wheeler_type: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse' | null;
  /** « Quel type de train ? », sous « Train ». */
  leisure_train_type: 'ter' | 'rer' | 'intercites' | null;
  /** « Quel type de vélo ? », sous « Vélo ». */
  leisure_velo_type: 'mecanique' | 'electrique' | null;
  /** « Quelle distance aller, en général ? » : Moins de 5 km, 5 à 15 km, 15 à 30 km, Plus de 30 km. */
  leisure_distance_bracket: 'lt_5' | '5_15' | '15_30' | '30_plus' | null;
  /** La distance d'un aller, demandée sous « Plus de 30 km » seulement. */
  leisure_distance_km: number | null;
}
/** Étape du questionnaire — le mode principal des sorties du week-end, ses précisions, puis la distance d'un aller. */
export interface LeisureDetailStepProps {
  answers: LeisureDetailStepAnswers;
  /** Écrit les réponses touchées ; l'écran du questionnaire efface ensuite les précisions d'un mode quitté. */
  update: (patch: Partial<LeisureDetailStepAnswers>) => void;
}
export declare function LeisureDetailStep(props: LeisureDetailStepProps): JSX.Element;
