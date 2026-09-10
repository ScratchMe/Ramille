/** Le point de suivi — une question fermée, ses réponses, puis le mot de Ramille. */
/**
 * @startingPoint section="Ramille" subtitle="Point de suivi" viewport="360x220"
 */
export interface CheckinCardProps {
  /** « Point de la semaine · 8 sept. » */
  periodLabel: string;
  question: string;
  /** Teinte selected (poste dominant) ou élément. */
  emphasize?: boolean;
  /** null = question posée ; sinon la réponse donnée, Ramille répond. */
  answered?: boolean | string | null;
  /** Réponses possibles ; par défaut Non (secondaire) / Oui (primaire). */
  reponses?: { value: boolean | string; label: string; variant?: 'primary' | 'secondary' }[];
  onAnswer?: (value: boolean | string) => void;
  /** Retour de Ramille à afficher une fois répondu. */
  retour?: { mood: 'calm' | 'happy' | 'encouraging' | 'resting'; ligne: string };
}
export declare function CheckinCard(props: CheckinCardProps): JSX.Element;
