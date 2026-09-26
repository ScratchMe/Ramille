import React from 'react';
import { CheckinCard } from 'ramille-design-system';

/**
 * La question posée, sur le poste dominant : teinte « selected », trois réponses fixes — la
 * carte les pose elle-même, Non avant Oui (on ne met pas la réponse attendue sous le pouce), puis
 * le troisième choix nommé sur la période interrogée.
 */
export const QuestionPosee = () => (
  <CheckinCard
    periodLabel="Point de la semaine · 8 sept."
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    emphasize
  />
);

/** Répondu oui : Ramille répond, sans jamais citer un nombre. */
export const ReponduOui = () => (
  <CheckinCard
    periodLabel="Point de la semaine · 8 sept."
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    answered="oui"
    retour={{ mood: 'happy', ligne: 'Bien joué — chaque changement compte.' }}
  />
);

/**
 * Répondu non, et c'est un fait, pas une faute : pas de mécanique d'échec, pas de série
 * cassée. La réplique dit seulement que la question reviendra.
 */
export const ReponduNon = () => (
  <CheckinCard
    periodLabel="Point de la semaine · 1 sept."
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    answered="non"
    retour={{
      mood: 'encouraging',
      ligne: 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.',
    }}
  />
);

/**
 * La boucle mensuelle du poste secondaire : même carte, sans la teinte. La question nomme le mois
 * **écoulé** — jamais « ce mois-ci », qui ne serait pas encore joué —, et le troisième choix le
 * nomme aussi.
 */
export const PosteSecondaire = () => (
  <CheckinCard
    periodLabel="Point du mois · août"
    question="En août, as-tu remplacé une sortie en voiture par le train ?"
    sansObjet="Pas de sortie en août"
    emphasize={false}
  />
);
