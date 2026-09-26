/** Cadre d'une feuille du bas — voile, poignée, titre facultatif ; le titre nomme toujours le dialogue. */
export interface FeuilleDuBasProps {
  /** Nom du dialogue, et en-tête affiché (niveau 2) sauf `enTete={false}`. */
  titre: string;
  /** Afficher le titre en tête de la feuille. `false` quand le canvas n'en dessine pas. */
  enTete?: boolean;
  /** Le geste de retour — Échap sur web. Une feuille qu'on ne peut pas fermer n'est plus une proposition. */
  onFerme?: () => void;
  /** Rendre la feuille dans son voile (`--color-scrim`), vrai par défaut ; `false` rend la feuille seule. */
  voile?: boolean;
  /** Style du voile, ou de la feuille quand `voile={false}`. */
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function FeuilleDuBas(props: FeuilleDuBasProps): JSX.Element;
