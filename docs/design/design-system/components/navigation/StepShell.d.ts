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
  /** Appelé au toucher de « Suivant » quand l’étape est complète — jamais quand il manque quelque chose. */
  onNext?: () => void;
  /** Le nom du bouton, qui ne change jamais selon ce qui manque : « Suivant », ou « Voir mon bilan » à la dernière étape. */
  nextLabel?: string;
  /** Bandeau teinté sous l'en-tête (réponses préremplies). */
  notice?: string;
  /** Un mot de Ramille à l'entrée d'une section (quatre étapes sur neuf), sous l'en-tête, sans second visage. */
  motDeRamille?: string | null;
  /** Échec, au-dessus des boutons — une phrase du produit, en français. */
  message?: string | null;
  /** La cause technique de l'échec, en chasse fixe, à recopier : jamais concaténée au message. */
  detail?: string | null;
  /**
   * Ce qu’il reste à renseigner sur l’étape (`manqueDeLEtape`), ou `null` quand elle est complète : le champ, pour y
   * mener, et la phrase, dite sous « Il manque encore … » au toucher du « Suivant » en attente. Non nul, « Suivant »
   * prend l’apparence du désactivé (`Button enAttente`) mais reste un bouton ordinaire.
   */
  manque?: { champ: string; phrase: string } | null;
  /**
   * L’étape qui s’affiche, et le côté d’où elle arrive. À chaque nouvelle `cle`, le contenu revient en haut, entre en
   * fondu depuis 8 px de ce côté, et reçoit le focus ; sans `sens` (le montage, la reprise d’un brouillon, le retour
   * après un échec), il est posé et le focus ne bouge pas. La demande de ce qui manque retombe à chaque nouvelle `cle`.
   */
  entree: { cle: string; sens: 'avant' | 'arriere' | null };
  /**
   * Le nombre de réponses données au doigt ou au clavier depuis l’ouverture du questionnaire — une par `update`. Une
   * précision qui s’ouvre ne fait défiler l’écran que si elle suit l’une d’elles, jamais au préremplissage.
   */
  reponsesDonnees: number;
  style?: React.CSSProperties;
}
export declare function StepShell(props: StepShellProps): JSX.Element;
