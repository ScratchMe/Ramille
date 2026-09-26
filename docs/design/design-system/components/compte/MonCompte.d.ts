/** Section « Mes données » — carte blanche cernée ; export et suppression, sans retenue. */
export interface MonCompteProps {
  confirmation?: boolean;
  /** Un export ou une suppression en cours : tout se désactive, et le bouton qui travaille le dit (« Génération… », « Suppression… »). */
  occupe?: 'export' | 'suppression' | null;
  /** La suppression a abouti : la carte dit ce qui est parti, Ramille dit au revoir, et un bouton ramène au début. */
  supprime?: boolean;
  onExporter?: () => void;
  onDemanderSuppression?: () => void;
  onAnnuler?: () => void;
  onSupprimer?: () => void;
  /** « Revenir au début », après la suppression. */
  onRevenir?: () => void;
  /** Le retour d'un export ou d'une suppression, succès compris — dit par `MessageInline`. */
  message?: string | null;
}
export declare function MonCompte(props: MonCompteProps): JSX.Element;
