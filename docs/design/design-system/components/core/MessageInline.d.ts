/** Message d’échec sous l’action — small, textSecondary, role alert. Aucune couleur d’alerte. */
export interface MessageInlineProps {
  /** null ne rend rien. */
  message: string | null;
  style?: React.CSSProperties;
}
export declare function MessageInline(props: MessageInlineProps): JSX.Element;
