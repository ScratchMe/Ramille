/** Réglage du canal de rappel sur « Toi » — visible pour tous, compte ou non. */
export interface ChoixDeRappelProps {
  /** Les lignes de `lignesDeReglage` ; par défaut, un appareil sans compte. */
  lignes?: { canal: 'push' | 'email' | 'none'; titre: string; detail: string; choisissable?: boolean; lienVersLesReglages?: boolean }[];
  /** La préférence enregistrée. Une ligne qui n'est pas choisissable ne paraît jamais choisie, même si c'est elle. */
  canal: 'push' | 'email' | 'none';
  /** La permission système de l'appareil, qui écrit le détail de la ligne « notification ». */
  permission?: 'demandable' | 'accordee' | 'fermee';
  onChoisir?: (canal: 'push' | 'email' | 'none') => void;
  /**
   * Le mot de la veille (C4.2), rendu sous « Par notification » ; absent, rien ne se rend. `detail` est la
   * ligne d'`affichageDeLaVeille` : « Par notification, jusqu’au 15 novembre. », « En pause sur ce téléphone : … ».
   */
  veille?: { coche: boolean; detail: string };
  onBasculerLaVeille?: (cocheAvant: boolean) => void;
}
export declare function ChoixDeRappel(props: ChoixDeRappelProps): JSX.Element;
