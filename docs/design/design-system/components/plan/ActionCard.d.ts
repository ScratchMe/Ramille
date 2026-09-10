/** Carte d’action du plan — bordée, ou saillante quand elle porte l’engagement. */
/**
 * @startingPoint section="Ramille" subtitle="Action du plan" viewport="360x200"
 */
export interface ActionCardProps {
  titre: string;
  gainKg?: number | null;
  partPercent?: number | null;
  detail?: string | null;
  /** « le mardi et le jeudi » — affichée seulement si engagée. */
  intention?: string | null;
  engagee?: boolean;
  /** Une autre action porte l'engagement. */
  estompee?: boolean;
  /** Étiquette d'en-tête quand engagée (lot 3 : « TON ENGAGEMENT »). */
  etiquette?: string;
  children?: React.ReactNode;
}
export declare function ActionCard(props: ActionCardProps): JSX.Element;
