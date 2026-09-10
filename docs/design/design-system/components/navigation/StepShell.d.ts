/** Coquille des écrans du questionnaire — en-tête, contenu défilant, pied collant. */
/**
 * @startingPoint section="Ramille" subtitle="Étape de questionnaire" viewport="390x844"
 */
export interface StepShellProps {
  section: string;
  step: number;
  total: number;
  children?: React.ReactNode;
  /** Absent = premier écran, pas de Retour. */
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Bandeau teinté sous l'en-tête (réponses pré-remplies). */
  notice?: string;
  /** Échec, au-dessus des boutons. */
  message?: string | null;
  /** Ce qui reste à renseigner quand Suivant est inactif. */
  manque?: string | null;
  style?: React.CSSProperties;
}
export declare function StepShell(props: StepShellProps): JSX.Element;
