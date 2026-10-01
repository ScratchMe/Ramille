/** Message d’échec sous l’action — small 500, encre `text` (celle du corps, pas celle de l’aide au-dessus), role alert. Aucune couleur d’alerte. */
export interface MessageInlineProps {
  /** null ne rend rien. */
  message: string | null;
  style?: React.CSSProperties;
}
export declare function MessageInline(props: MessageInlineProps): JSX.Element;
