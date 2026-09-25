/** Le point de suivi — une question fermée, ses trois réponses, puis le mot de Ramille. */
/**
 * @startingPoint section="Ramille" subtitle="Point de suivi" viewport="360x220"
 */
export interface CheckinCardProps {
  /** « Point de la semaine · 8 sept. » */
  periodLabel: string;
  question: string;
  /** Le point du poste dominant : teinte `backgroundSelected` et étiquette accent, tant qu'il n'est pas répondu. */
  emphasize?: boolean;
  /** `null` = question posée ; sinon la réponse donnée, et Ramille répond. `true` / `false` valent `oui` / `non`. */
  answered?: 'oui' | 'non' | 'sans_objet' | boolean | null;
  onAnswer?: (reponse: 'oui' | 'non' | 'sans_objet') => void;
  /** Le troisième choix, nommé sur la période interrogée : « Pas de trajet la semaine dernière », « Pas de voyage en septembre ». */
  sansObjet?: string;
  /** Retour de Ramille à afficher une fois répondu ; par défaut celui de la réponse. */
  retour?: { mood: 'calm' | 'happy' | 'encouraging'; ligne: string };
  /** Le pied de la carte répondue, du produit et non de Ramille : « Répondu lundi. Prochain point : lundi 21 septembre. » */
  pied?: string | null;
}
export declare function CheckinCard(props: CheckinCardProps): JSX.Element;
