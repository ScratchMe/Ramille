/** L'engagement en cours, tel que la feuille le nomme — la forme du dépôt (`EngagementEnCours`). */
export interface EngagementEnCours {
  /** Le libellé de l'action engagée, figé sur le gabarit. */
  action: string;
  /** « le mardi et le jeudi », « ce mois-ci »… ou `null` si la ligne n'en porte pas. */
  intention: string | null;
}
/** « Ton plan va être recalculé » — ce qu'un re-bilan fait à l'engagement en cours, dit avant de soumettre. */
export interface FeuilleNouveauBilanProps {
  engagement: EngagementEnCours;
  /** Poursuivre la soumission, en sachant ce qu'elle fait. */
  onSoumettre?: () => void;
  /** Refermer sans rien soumettre — « Pas maintenant », ou le geste de retour. */
  onFerme?: () => void;
  /** Rendre la feuille dans son voile, vrai par défaut (`FeuilleDuBas`). */
  voile?: boolean;
  style?: React.CSSProperties;
}
export declare function FeuilleNouveauBilan(props: FeuilleNouveauBilanProps): JSX.Element;
