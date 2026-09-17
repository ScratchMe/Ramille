import { SORTIE_COMPRIS, type ContenuDOuverture, type SortieDouverture } from '@/types/saison';

/**
 * Où en est le **premier parcours** sur cet appareil (C5.7, canvas `v1-17`, planches F1 à F3).
 *
 * Le produit proposait deux lieux — Plan et Suivi — dès la dernière page du questionnaire, c'est-à-dire
 * avant qu'il y ait quoi que ce soit à suivre. La règle du canvas est qu'**un lieu n'apparaît que
 * quand il a quelque chose à montrer** : la barre d'onglets est masquée de la soumission du premier
 * questionnaire à la fermeture de la carte « Ton premier plan », puis elle arrive, nommée une fois.
 *
 * **Une valeur à trois états plutôt que deux marques booléennes, et ce n'est pas du raffinement.**
 * Le canvas décrit « une marque posée à la soumission et **effacée** à la fermeture de la carte »,
 * plus une seconde pour la carte des deux lieux. Effacée, la première ne dit plus rien : la question
 * que la carte des deux lieux pose est « la barre vient-elle d'arriver **sur cet appareil** ? », et
 * une marque absente ne distingue pas « le parcours vient de finir ici » de « il n'y a jamais eu de
 * parcours ici ». Avec deux booléens, la carte se serait donc rendue à **tout le monde** — chaque
 * installation existante, chaque appareil neuf d'un compte existant —, c'est-à-dire précisément la
 * réexplication que « trois cartes d'ouverture, chacune une seule fois » interdit.
 *
 * L'absence, elle, garde tout son sens et c'est le cas à ne pas rater : **sans marque, la barre est
 * là**. Un appareil neuf d'un compte existant, une session retrouvée par lien, une installation
 * d'avant ce chantier — la marque autorise une absence de barre, elle ne la présume jamais.
 */
export type EtapeDuPremierParcours =
  /** Le questionnaire vient d'être soumis pour la première fois ici : pas de barre. */
  | 'questionnaire'
  /** La carte du premier plan s'est refermée : la barre arrive, et se nomme. */
  | 'barre'
  /** La carte des deux lieux a été lue. Plus rien ne se réexplique. */
  | 'fait';

export type EtatDuPremierParcours = {
  barreVisible: boolean;
  /** La carte « Plan et Suivi », qui prend la place de la carte d'attente le temps d'un « Compris ». */
  carteDesDeuxLieux: boolean;
};

/**
 * Ce que l'étape lue sur cet appareil dit de l'écran.
 *
 * `null` recouvre deux situations qui appellent la même réponse — la marque n'a pas encore été lue,
 * et il n'y a jamais eu de premier parcours ici — et c'est **la barre visible** dans les deux cas.
 * Ce n'est pas un repli commode : c'est le seul état de chargement qui n'affirme rien. L'autre
 * ferait disparaître la barre une fraction de seconde à chaque ouverture, pour tout le monde, et sur
 * web à chaque chargement de page (la règle d'hydratation d'`EXPO.md` §2.2 : l'état de départ est
 * celui du rendu statique).
 */
export function etatDuPremierParcours(etape: EtapeDuPremierParcours | null): EtatDuPremierParcours {
  return {
    barreVisible: etape !== 'questionnaire',
    carteDesDeuxLieux: etape === 'barre',
  };
}

/**
 * « Deux endroits, pas plus. » — la carte qui nomme la barre au moment où elle arrive.
 *
 * Elle ne se rend qu'une fois, à la place de la carte d'attente, et elle dit **ce qu'on trouve où**
 * plutôt que ce qu'il faut faire : les deux lieux existent déjà, il n'y a rien à décider ici.
 *
 * Aucun chiffre, aucun poste : comme celle du premier plan, elle décrit le produit et non ce
 * plan-ci — un total ou un nom de poste en ferait une seconde description des cartes posées dessous.
 */
export const OUVERTURE_DES_DEUX_LIEUX: ContenuDOuverture = {
  etiquette: 'PLAN ET SUIVI',
  titre: 'Deux endroits, pas plus.',
  corps:
    'Ici, ton plan : l’action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison.',
};

/** La même sortie que la carte du premier plan : il n'y a qu'à refermer. */
export const SORTIE_DES_DEUX_LIEUX: SortieDouverture[] = SORTIE_COMPRIS;
