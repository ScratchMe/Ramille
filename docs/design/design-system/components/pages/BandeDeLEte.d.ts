/** L'été 2026, un trait par jour du 1er juin au 31 août, pleins les 53 jours de vague de chaleur (Météo-France). */
export interface BandeDeLEteProps {
  /** Les traits plus hauts et plus espacés, au-delà de 720 de large. */
  grande?: boolean;
}
export declare function BandeDeLEte(props: BandeDeLEteProps): JSX.Element;
/** Aujourd'hui, +2,7 °C, +4 °C : la trajectoire de réchauffement de référence, et ce qu'un été comme 2026 y devient. */
export declare function EchelleDesEtes(props: { reperes?: { libelle: string; detail: string }[] }): JSX.Element;
/** L'empreinte moyenne, poste par poste, en une barre ; le transport en tête et dans l'accent (SDES 2017). */
export declare function PartDuTransport(): JSX.Element;
