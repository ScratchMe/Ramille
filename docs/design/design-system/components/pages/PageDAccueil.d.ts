/** La page d'accueil du web — un récit de l'été 2026, puis ce que fait Ramille, à la racine du site. */
export interface PageDAccueilProps {
  /** Les trois temps de la fiche Play (« Ton bilan », « Ton plan », « Ton suivi »), mot pour mot. */
  sections?: { titre: string; texte: string }[];
  /** « Voir ce que pèsent mes trajets » : l'onboarding, où la session s'ouvre. Chaque bouton compte son emplacement. */
  onCommencer?: () => void;
  /** « J'ai déjà un compte » : la retrouvaille, provenance `accueil`. */
  onDejaUnCompte?: () => void;
}
export declare function PageDAccueil(props: PageDAccueilProps): JSX.Element;
