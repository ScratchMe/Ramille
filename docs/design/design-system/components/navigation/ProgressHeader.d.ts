/** En-tête du questionnaire — mascotte, section, compteur, barre 6 px. */
export interface ProgressHeaderProps {
  section: string;
  /** Écran affiché (pas étape de la spec). */
  step: number;
  /** Écrans réellement affichés à cette personne, recalculé à chaque branchement. */
  total: number;
}
export declare function ProgressHeader(props: ProgressHeaderProps): JSX.Element;
