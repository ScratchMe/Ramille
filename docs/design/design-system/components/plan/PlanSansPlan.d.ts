/** L'état de l'écran du plan quand il n'y a pas de plan à montrer. */
export type EtatSansPlan =
  /** `relance` : la lecture est un « Réessayer », et la ligne se dit tout de suite. */
  | { status: 'loading'; relance?: true }
  /** Aucun bilan complété. */
  | { status: 'no_assessment' }
  /** Rien n'a pu être lu — jamais confondu avec « rien à afficher ». */
  | { status: 'erreur_reseau'; genre: 'horsLigne' | 'serveur' }
  /** Bilan complété, plan pas encore généré. */
  | { status: 'pending'; assessmentId: string };

/** Les quatre écrans du plan sans plan : chargement, pas de bilan, rien de lu, en préparation. */
export interface PlanSansPlanProps {
  etat: EtatSansPlan;
  /** La ligne de relecture (`BanniereDeRelecture`, centrée), ou rien. */
  banniere: JSX.Element | null;
  /** Le lien du rappel porte `?rappel=1` : sans bilan ici, la personne en a un ailleurs. */
  vientDUnRappel: boolean;
  relectureDemandee: boolean;
  onRelire: () => void;
  onReessayer: () => void;
}
export declare function PlanSansPlan(props: PlanSansPlanProps): JSX.Element;
