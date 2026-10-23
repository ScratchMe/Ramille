/** La page d'accueil du web — la fiche Play et le film, à la racine du site, pour qui n'a ni bilan ni questionnaire en cours. */
export interface PageDAccueilProps {
  /** Les sections de la fiche Play (« Ton bilan », « Ton plan », « Ton suivi »…), mot pour mot. */
  sections?: { titre: string; texte: string }[];
  /** La version texte du film, chapitre par chapitre, repliée sous lui. */
  filmEnTexte?: { chapitre: string; texte: string }[];
  /** « Découvrir mon impact » : l'onboarding, où la session s'ouvre. */
  onCommencer?: () => void;
  /** « J'ai déjà un compte » : la retrouvaille, provenance `accueil`. */
  onDejaUnCompte?: () => void;
}
export declare function PageDAccueil(props: PageDAccueilProps): JSX.Element;
