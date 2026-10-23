/** Le film de présentation de la page d'accueil du web — une vidéo du navigateur qui ne se lance jamais seule. */
export interface FilmDePresentationProps {
  /** Le 4:5 sous 600 de large, le 16:9 au-delà ; choisi une fois, à l'arrivée. */
  format?: '16x9' | '4x5';
  /** L'affiche : une image tirée du film (`public/film/le-fil-de-ramille-<format>.jpg`). */
  affiche?: string;
  /** La vidéo (`public/film/le-fil-de-ramille-<format>.mp4`). */
  video?: string;
  /** Le nom annoncé au lecteur d'écran, le titre visible au-dessus du film. */
  titre?: string;
}
export declare function FilmDePresentation(props: FilmDePresentationProps): JSX.Element;
