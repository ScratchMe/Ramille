/** Onboarding, écran 2 — la moyenne française, la cible 2050, les cinq postes de l'empreinte. */
export interface EtapeContexteProps {
  /** « Continuer ». */
  onSuivant?: () => void;
  /** « Retour », à gauche de « Continuer » — la page d'avant. */
  onPrecedent?: () => void;
  style?: React.CSSProperties;
}
export declare function EtapeContexte(props: EtapeContexteProps): JSX.Element;
