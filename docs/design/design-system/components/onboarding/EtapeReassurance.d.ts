/** Onboarding, écran 3 — « Pas de jugement. Un état des lieux honnête. », sur fond teinté. */
export interface EtapeReassuranceProps {
  /** « Continuer ». */
  onSuivant?: () => void;
  /** « Ce qu’on enregistre, et pourquoi » — vers la page de confidentialité. */
  onConfidentialite?: () => void;
  style?: React.CSSProperties;
}
export declare function EtapeReassurance(props: EtapeReassuranceProps): JSX.Element;
