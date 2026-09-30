import { RAMILLE } from '@/constants/mascotte';
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
 * Le questionnaire qui vient d'être soumis ouvre-t-il un premier parcours sur cet appareil ?
 *
 * **Deux conditions, et la seconde est venue avec le retrait d'un bilan** (C4.7, décision du
 * 27/09/2026 : le premier parcours ne recommence pas après le retrait du seul bilan). La première — aucun bilan déjà vu ici — suffisait tant que la marque de
 * bilan ne pouvait que se poser. Retirer son seul bilan l'efface (`effacerLaMarqueDeBilan`, pour
 * qu'une réouverture hors ligne n'envoie pas au plan), et le bilan suivant passait alors pour un
 * premier : la barre disparaissait jusqu'au plan, puis « Deux endroits, pas plus. » revenait expliquer
 * les deux lieux à quelqu'un qui les connaît. **Un parcours déjà commencé ici ne recommence pas** :
 * l'étape notée, quelle qu'elle soit, dit que cet appareil l'a vu.
 *
 * `null` pour l'étape recouvre « jamais commencé » et « pas pu lire » ; les deux ouvrent un premier
 * parcours si aucun bilan n'a été vu, ce qui est le comportement d'avant cette règle.
 */
export function ouvreUnPremierParcours(
  aDejaVuUnBilan: boolean,
  etapeLue: EtapeDuPremierParcours | null
): boolean {
  return !aDejaVuUnBilan && etapeLue === null;
}

/**
 * « Deux endroits, pas plus. » — la carte qui nomme la barre au moment où elle arrive.
 *
 * Elle ne se rend qu'une fois, à la place de la carte d'attente, et elle dit **ce qu'on trouve où**
 * plutôt que ce qu'il faut faire : les deux lieux existent déjà, il n'y a rien à décider ici.
 *
 * Aucun chiffre, aucun poste : comme celle du premier plan, elle décrit le produit et non ce
 * plan-ci — un total ou un nom de poste en ferait une seconde description des cartes posées dessous.
 *
 * **Mais elle ne décrit que ce que ce plan porte** (décision du 30/09/2026, `v1-27` §12.23). Elle
 * disait à tout le monde « l'action en cours, le point régulier, ton cap » et « tes bilans et tes
 * réponses » : au cycliste, dont le plan n'a aucune action, juste au-dessus de « Aucun changement de
 * mode ne te ferait gagner assez » ; et à qui n'a ni trajet, ni sorties régulières, ni voyage, trois
 * promesses sur trois, suivies d'une carte d'attente qui lui dit « reviens quand tu veux ». Le corps
 * s'énumère donc à partir de deux faits, **indépendants** — le plan a-t-il des actions, une boucle
 * tourne-t-elle. **Le dernier élément suit les actions** : un plan sans action ne chiffre pas son
 * cap (`cadreDuPlan`), et sa carte du cap ne montre que la saison et sa fin — d'où « ta saison »
 * là où le plan à actions dit « ton cap » (décision du même soir : le premier texte validé disait
 * « ton cap » partout, sur une prémisse fausse). La ligne de Ramille suit la boucle, parce qu'elle
 * parle des réponses.
 *
 * Aucune combinaison n'est traitée à part, pas même celle qu'on ne rencontre pas — des actions sans
 * boucle : sans trajet et sans base déclarée, `estimate_action_savings` n'en propose aucune (mesuré
 * le 30/09/2026 sur un profil sans boucle, et vrai du seul compte de production dans ce cas). La
 * composition la couvre sans qu'on ait à le croire.
 */
export function ouvertureDesDeuxLieux({
  actions,
  boucle,
}: {
  /** Le plan porte au moins une action. */
  actions: boolean;
  /** Au moins une boucle de points tourne (`mes_boucles_a_venir`). */
  boucle: boolean;
}): { ouverture: ContenuDOuverture; ligne: string } {
  const dansLePlan = [
    ...(actions ? ['l’action en cours'] : []),
    ...(boucle ? ['le point régulier'] : []),
    actions ? 'ton cap' : 'ta saison',
  ];
  // Trois éléments se séparent par des virgules, comme la carte d'origine ; deux se lient par « et ».
  const plan =
    dansLePlan.length === 3
      ? dansLePlan.join(', ')
      : dansLePlan.length === 2
        ? dansLePlan.join(' et ')
        : dansLePlan[0];
  const suivi = boucle ? 'tes bilans et tes réponses' : 'tes bilans';
  return {
    ouverture: {
      etiquette: 'PLAN ET SUIVI',
      titre: 'Deux endroits, pas plus.',
      corps: `Ici, ton plan : ${plan}. En bas, ton suivi : ${suivi}, saison après saison.`,
    },
    ligne: boucle ? RAMILLE.planEtSuivi : RAMILLE.planEtSuiviSansPoint,
  };
}

/** La même sortie que la carte du premier plan : il n'y a qu'à refermer. */
export const SORTIE_DES_DEUX_LIEUX: SortieDouverture[] = SORTIE_COMPRIS;
