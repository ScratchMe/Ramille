/** Section « Mes données » — carte blanche cernée ; export et suppression, sans retenue. */
export interface MonCompteProps {
  confirmation?: boolean;
  onExporter?: () => void;
  onDemanderSuppression?: () => void;
  onAnnuler?: () => void;
  onSupprimer?: () => void;
  /** Le retour d'un export ou d'une suppression, succès compris — dit par `MessageInline`. */
  message?: string | null;
}
export declare function MonCompte(props: MonCompteProps): JSX.Element;
