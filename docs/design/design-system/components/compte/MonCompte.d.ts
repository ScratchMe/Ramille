/** Section « Mes données » — export et suppression, sans retenue. */
export interface MonCompteProps {
  confirmation?: boolean;
  onExporter?: () => void;
  onDemanderSuppression?: () => void;
  onAnnuler?: () => void;
  onSupprimer?: () => void;
  message?: string | null;
}
export declare function MonCompte(props: MonCompteProps): JSX.Element;
