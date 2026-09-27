/** Une session refusée par le serveur : on le dit, et on laisse choisir — retrouver son compte, ou repartir ici. */
export interface SessionRefuseeProps {
  /** « J’ai déjà un compte » — vers la reconnexion par code. */
  onRetrouver?: () => void;
  /** « Commencer un bilan sur cet appareil ». */
  onCommencer?: () => void;
}
export declare function SessionRefusee(props: SessionRefuseeProps): JSX.Element;
