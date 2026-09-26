import React from 'react';
import { CheckinCard } from 'ramille-design-system';

/**
 * La question posée, sur le poste dominant : teinte « selected », trois réponses fixes — la
 * carte les pose elle-même, Non avant Oui (on ne met pas la réponse attendue sous le pouce), puis
 * le troisième choix nommé sur la période interrogée. Le libellé de période est celui que la base
 * fige à la génération (« Semaine du 14/09 »), et la question celle du gabarit de l'action engagée.
 */
export const QuestionPosee = () => (
  <CheckinCard
    periodLabel="Semaine du 14/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    emphasize
  />
);

/** Répondu oui : Ramille répond, sans jamais citer un nombre ; le pied, du produit, porte les dates. */
export const ReponduOui = () => (
  <CheckinCard
    periodLabel="Semaine du 07/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    answered="oui"
    retour={{ mood: 'happy', ligne: 'Bien joué — chaque changement compte.' }}
    pied="Répondu lundi. Prochain point : lundi 21 septembre."
  />
);

/**
 * Le deuxième « oui » de suite : sous la réplique, une phrase du produit — pas de Ramille, qui ne
 * compte jamais. Elle ne vient qu'une fois : à la cinquième semaine, elle serait fausse.
 */
export const SecondRenforcement = () => (
  <CheckinCard
    periodLabel="Semaine du 07/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    answered="oui"
    retour={{ mood: 'happy', ligne: 'Bien joué — chaque changement compte.' }}
    renforcement="Deuxième semaine de suite que tu fais ce trajet autrement."
    pied="Répondu lundi. Prochain point : lundi 21 septembre."
  />
);

/**
 * Répondu non, et c'est un fait, pas une faute : pas de mécanique d'échec, pas de série
 * cassée. La réplique dit seulement que la question reviendra.
 */
export const ReponduNon = () => (
  <CheckinCard
    periodLabel="Semaine du 07/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    answered="non"
    retour={{
      mood: 'encouraging',
      ligne: 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.',
    }}
  />
);

/**
 * La question a été figée sur une action qu'on a quittée depuis : elle ne se réécrit pas — elle
 * doit rester celle de la notification — et la carte dit sur quoi elle porte.
 */
export const ActionQuittee = () => (
  <CheckinCard
    periodLabel="Semaine du 14/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    actionQuittee="Faire un trajet sur cinq à vélo"
    emphasize
  />
);

/** Le point n'attend plus de réponse : la question reste lisible, la phrase remplace les boutons. */
export const PointClos = () => (
  <CheckinCard
    periodLabel="Semaine du 14/09"
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    refus="Ce point de suivi n’attend plus de réponse. La question revient à la prochaine période."
    emphasize
  />
);

/**
 * La boucle mensuelle du poste secondaire : même carte, sans la teinte. La question nomme le mois
 * **écoulé** — jamais « ce mois-ci », qui ne serait pas encore joué —, et le troisième choix le
 * nomme aussi.
 */
export const PosteSecondaire = () => (
  <CheckinCard
    periodLabel="août 2026"
    question="En août, as-tu fait une sortie à vélo ?"
    sansObjet="Pas de sortie en août"
    emphasize={false}
  />
);
