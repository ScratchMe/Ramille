/** Carte d’action du plan — bordée, ou saillante quand elle porte l’engagement. */
/**
 * @startingPoint section="Ramille" subtitle="Action du plan" viewport="360x200"
 */
export interface ActionCardProps {
  titre: string;
  gainKg?: number | null;
  partPercent?: number | null;
  detail?: string | null;
  /** « le mardi et le jeudi » — affichée seulement si engagée, après « par an ». */
  intention?: string | null;
  /** Une ligne sans chiffre qui décrit un essai — affichée seulement une fois l'action engagée, jamais reconduite. */
  premierPas?: string | null;
  engagee?: boolean;
  /** L'engagement vient du cycle précédent : l'étiquette devient « TON ENGAGEMENT · RECONDUIT ». */
  reconduite?: boolean;
  /** Une autre action porte l'engagement : celle-ci recule par son cadre, sans perdre son bouton. */
  estompee?: boolean;
  children?: React.ReactNode;
}
export declare function ActionCard(props: ActionCardProps): JSX.Element;
