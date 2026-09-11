import React from 'react';
import { CheckinCard } from 'ramille-design-system';

/**
 * La question posée, sur le poste dominant : teinte « selected », deux réponses fermées.
 * Non vient avant Oui — on ne met pas la réponse attendue sous le pouce.
 */
export const QuestionPosee = () => (
  <CheckinCard
    periodLabel="Point de la semaine · 8 sept."
    question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?"
    emphasize
    reponses={[
      { value: 'non', label: 'Non', variant: 'secondary' },
      { value: 'oui', label: 'Oui', variant: 'primary' },
    ]}
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

/** La boucle mensuelle du poste secondaire : même carte, sans la teinte. */
export const PosteSecondaire = () => (
  <CheckinCard
    periodLabel="Point du mois · août"
    question="Ce mois-ci, as-tu remplacé un trajet de loisir par le train ?"
    emphasize={false}
    reponses={[
      { value: 'non', label: 'Non', variant: 'secondary' },
      { value: 'oui', label: 'Oui', variant: 'primary' },
    ]}
  />
);
