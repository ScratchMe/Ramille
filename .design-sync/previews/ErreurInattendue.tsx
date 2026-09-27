import React from 'react';
import { ErreurInattendue } from 'ramille-design-system';

/** Le dernier filet : le fait, la cause à recopier en chasse fixe, et toujours « Réessayer ». */
export const Erreur = () => (
  <ErreurInattendue erreur={new TypeError("Cannot read properties of undefined (reading 'poste')")} />
);
