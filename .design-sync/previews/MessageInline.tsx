import React from 'react';
import { Button, MessageInline } from 'ramille-design-system';

/**
 * Un échec technique, au-dessus du bouton : ton neutre, ce qui est attendu plutôt que
 * ce qui est faux. Aucune couleur d'alerte — le produit n'a ni rouge ni orange.
 */
export const SousLAction = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <MessageInline message="L’envoi n’a pas abouti. Vérifie l’adresse et réessaie." />
    <Button title="Recevoir le lien" />
  </div>
);

/** Une validation de saisie : on dit ce qu'on attend, sans affirmer un fait sur la personne. */
export const Validation = () => (
  <MessageInline message="Cette adresse semble incomplète." />
);

/** Une lecture qui a échoué : jamais « tu n'as rien », qui serait une affirmation sur ses données. */
export const LectureEnEchec = () => (
  <MessageInline message="Ton bilan n’a pas pu être affiché. Il n’est pas perdu, réessaie dans un instant." />
);
