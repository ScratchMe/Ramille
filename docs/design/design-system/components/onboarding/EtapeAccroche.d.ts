/** Onboarding, écran 1 — l'illustration, Ramille qui se présente, la promesse, « Découvrir mon impact ». */
/**
 * @startingPoint section="Ramille" subtitle="Onboarding — accueil" viewport="390x844"
 */
export interface EtapeAccrocheProps {
  /** « Découvrir mon impact ». */
  onSuivant?: () => void;
  /** « J’ai déjà un compte » — le seul chemin vers un compte existant depuis l'accueil. */
  onDejaUnCompte?: () => void;
  style?: React.CSSProperties;
}
export declare function EtapeAccroche(props: EtapeAccrocheProps): JSX.Element;
