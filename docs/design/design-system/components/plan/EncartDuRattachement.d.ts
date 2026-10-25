/** Le compte vient d'être rattaché — dit une fois, sur cet appareil. */
export interface EncartDuRattachementProps {
  /** L'adresse rattachée, ou la chaîne vide quand Google ne la remonte pas. */
  adresse: string;
}
export declare function EncartDuRattachement(props: EncartDuRattachementProps): JSX.Element;

/** Ce qu'un recalcul (nouveau bilan, contexte corrigé) a emporté, dit une fois. */
export interface EncartDeLOrphelinProps {
  /** `phraseDeLOrphelin` : « Ton plan a changé avec ton nouveau bilan. « … » n’y est plus ; elle reste dans ton suivi. » */
  phrase: string;
  /** Écrit la marque locale et retire l'encart. */
  onCompris: () => void;
}
export declare function EncartDeLOrphelin(props: EncartDeLOrphelinProps): JSX.Element;

/** La saison a tourné, le plan suivant n'est pas encore là. */
export interface EncartDuCycleRevoluProps {
  /** `basculeDeSaison` : « L’automne a commencé pendant que tu étais là. » */
  bascule: string;
  relectureDemandee: boolean;
  onRelire: () => void;
}
export declare function EncartDuCycleRevolu(props: EncartDuCycleRevoluProps): JSX.Element;
