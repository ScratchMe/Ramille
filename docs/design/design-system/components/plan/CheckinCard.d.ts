/** Le point de suivi — une question fermée, ses trois réponses, puis le mot de Ramille. */
/**
 * @startingPoint section="Ramille" subtitle="Point de suivi" viewport="360x220"
 */
export interface CheckinCardProps {
  /** Le libellé que la base fige à la génération : « Semaine du 14/09 », « août 2026 ». */
  periodLabel: string;
  question: string;
  /** Le point du poste dominant : teinte `backgroundSelected` et étiquette accent, tant qu'il n'est pas répondu. */
  emphasize?: boolean;
  /** `null` = question posée ; sinon la réponse donnée, et Ramille répond. `true` / `false` valent `oui` / `non`. */
  answered?: 'oui' | 'non' | 'sans_objet' | boolean | null;
  onAnswer?: (reponse: 'oui' | 'non' | 'sans_objet') => void;
  /** Le troisième choix, nommé sur la période interrogée : « Pas de trajet la semaine dernière », « Pas de voyage en septembre ». */
  sansObjet?: string;
  /** L'action que suivait la personne quand la question a été figée, si elle en a changé depuis : la carte le dit sous la question. */
  actionQuittee?: string | null;
  /** Le point n'accepte plus de réponse (clos, ou détaché du compte) : la phrase remplace les boutons. */
  refus?: string | null;
  /** La réponse n'est pas partie : la phrase s'ajoute sous les boutons, qui restent. */
  erreur?: string | null;
  /** Retour de Ramille à afficher une fois répondu ; par défaut celui de la réponse. */
  retour?: { mood: 'calm' | 'happy' | 'encouraging'; ligne: string };
  /** Le second renforcement, sous la réplique — voix du produit : « Deuxième semaine de suite que tu fais ce trajet autrement. » Une seule fois. */
  renforcement?: string | null;
  /** Le pied de la carte répondue, du produit et non de Ramille : « Répondu lundi. Prochain point : lundi 21 septembre. » */
  pied?: string | null;
}
export declare function CheckinCard(props: CheckinCardProps): JSX.Element;
