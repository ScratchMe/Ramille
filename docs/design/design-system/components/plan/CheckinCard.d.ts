/** Le point de suivi — une question fermée, ses trois réponses, puis le mot de Ramille. */
/**
 * @startingPoint section="Ramille" subtitle="Point de suivi" viewport="360x220"
 */
export interface CheckinCardProps {
  /** Le libellé que la base fige à la génération : « Semaine du 14/09 », « août 2026 ». */
  periodLabel: string;
  question: string;
  /**
   * Le point à regarder d'abord : teinte `backgroundSelected` et étiquette accent, tant qu'il n'est pas répondu. Quand deux
   * points sont ouverts, celui qui porte la question de l'action engagée ; sinon, celui du poste dominant (01/10/2026,
   * `v1-33` §6 — `accentDesPoints`, src/types/checkin.ts).
   */
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
  /** Retour de Ramille à afficher une fois répondu ; par défaut celui de la réponse. Quand la boucle du point ne tourne plus, une réplique qui ne donne pas rendez-vous (ni « À lundi. », ni « On se retrouve… »). */
  retour?: { mood: 'calm' | 'happy' | 'encouraging'; ligne: string };
  /** Le second renforcement, sous la réplique — voix du produit : « Deuxième semaine de suite que tu fais ce trajet autrement. » Une seule fois. */
  renforcement?: string | null;
  /**
   * Ce que le « oui » a évité, au moins, sous la réplique — voix du produit : « Au moins 2,2 kg CO₂e évités. » (24/10/2026,
   * `v1-35` étape 6a). Seulement après un « oui » sur un point qui porte une action ; le dépôt le dit au plancher du gain figé.
   */
  kilos?: string | null;
  /** Le pied de la carte répondue, du produit et non de Ramille : « Répondu lundi. Prochain point : lundi 21 septembre. » — « Répondu lundi. » seul quand la boucle du point ne tourne plus (30/09/2026). */
  pied?: string | null;
  /**
   * « Modifier ma réponse » touché (02/10/2026, `v1-33` §6) : la carte répondue rouvre les trois réponses, la question au-dessus,
   * et « Annuler » dessous. Dans le dépôt, le focus va à la question, puis revient au lien après « Annuler ».
   */
  correction?: boolean;
  /** La réponse en place, dite au-dessus des réponses rouvertes : « Ta réponse : oui. », « Ta réponse : pas de trajet la semaine dernière. » */
  reponseEnPlace?: string | null;
  onModify?: () => void;
  onCancel?: () => void;
  /**
   * La réponse choisie dans l'e-mail, à confirmer — « Tu as choisi : oui. » (24/10/2026, `v1-35` étape 6b) : la page
   * `/point`, que les trois liens de l'e-mail ouvrent. Elle remplace les trois réponses par « Envoyer ma réponse » (`onSend`)
   * et « Choisir une autre réponse » (`onOtherAnswer`), qui les rouvre. Sur un point déjà répondu autrement — le second lien,
   * touché pour se corriger —, `reponseEnPlace` vient d'abord (« Ta réponse : oui. »), et « Garder ma réponse » (`onKeep`)
   * referme sur la carte répondue. Le dépôt ne la passe pas quand elle est déjà la réponse du point.
   */
  reponseChoisie?: string | null;
  onSend?: () => void;
  onOtherAnswer?: () => void;
  onKeep?: () => void;
}
export declare function CheckinCard(props: CheckinCardProps): JSX.Element;
