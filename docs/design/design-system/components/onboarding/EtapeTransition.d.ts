/** Onboarding, écran 4 — le temps estimé, les quatre sections, ce qui vient après le bilan. */
export interface EtapeTransitionProps {
  /** « Commencer » — dans le dépôt, vide la pile avant d'entrer dans le questionnaire. */
  onCommencer?: () => void;
  /** « Retour », à gauche de « Commencer » — la page d'avant. */
  onPrecedent?: () => void;
  /** « Ce qu’on enregistre, et pourquoi ». */
  onConfidentialite?: () => void;
  style?: React.CSSProperties;
}
export declare function EtapeTransition(props: EtapeTransitionProps): JSX.Element;
