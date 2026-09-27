/** Un bloc d'une section légale — la forme du dépôt (`LegalBlock`). */
export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'definitions'; items: { term: string; text: string }[] };
export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}
/** Le gabarit des pages légales — date, titre, introduction, sections ; mesure de lecture de 480, pied vers l'éditeur. */
export interface LegalPageProps {
  title: string;
  /** « 25 septembre 2026 ». */
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
  onRetour?: () => void;
}
export declare function LegalPage(props: LegalPageProps): JSX.Element;
