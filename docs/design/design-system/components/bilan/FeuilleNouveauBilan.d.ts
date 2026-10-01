/** L'engagement en cours, tel que la feuille le nomme — la forme du dépôt (`EngagementEnCours`). */
export interface EngagementEnCours {
  /** Le libellé de l'action engagée, figé sur le gabarit. */
  action: string;
  /** « le mardi et le jeudi », « ce mois-ci »… ou `null` si la ligne n'en porte pas. */
  intention: string | null;
}
/** « Ton plan va être recalculé » — ce qu'un re-bilan fait à l'engagement en cours, dit avant de commencer. */
export interface FeuilleNouveauBilanProps {
  engagement: EngagementEnCours;
  /** Commencer le questionnaire, en sachant ce qu'un nouveau bilan fait : la feuille redescend sur la première étape. */
  onCommencer?: () => void;
  /** Ne pas commencer — « Pas maintenant », ou le geste de retour : on ressort vers l'écran d'où l'on vient. */
  onQuitter?: () => void;
  /** Rendre la feuille dans son voile, vrai par défaut (`FeuilleDuBas`). */
  voile?: boolean;
  style?: React.CSSProperties;
}
export declare function FeuilleNouveauBilan(props: FeuilleNouveauBilanProps): JSX.Element;
