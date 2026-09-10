/** Réglage du canal de rappel sur « Toi » — visible pour tous, compte ou non. */
export interface ChoixDeRappelProps {
  lignes?: { canal: string; titre: string; detail: string; choisissable?: boolean }[];
  canal: string;
  onChoisir?: (canal: string) => void;
}
export declare function ChoixDeRappel(props: ChoixDeRappelProps): JSX.Element;
