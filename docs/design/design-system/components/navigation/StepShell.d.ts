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
  /** Un mot de Ramille à l'entrée d'une section (quatre étapes sur neuf), sous l'en-tête, sans second visage. */
  motDeRamille?: string | null;
  /** Échec, au-dessus des boutons — une phrase du produit, en français. */
  message?: string | null;
  /** La cause technique de l'échec, en chasse fixe, à recopier : jamais concaténée au message. */
  detail?: string | null;
  /** Ce qui reste à renseigner quand Suivant est inactif. */
  manque?: string | null;
  style?: React.CSSProperties;
}
export declare function StepShell(props: StepShellProps): JSX.Element;
