import React from 'react';
import { TextField } from 'ramille-design-system';

/**
 * Une adresse email, en pratique le seul champ texte du produit : il n'y a pas de mot de
 * passe, le seul accès à un compte existant étant un code à huit chiffres reçu par email.
 */
export const Email = () => (
  <TextField label="Email" value="camille@exemple.fr" keyboardType="email-address" placeholder="camille@exemple.fr" />
);

/** Vide, avec son placeholder. */
export const Vide = () => (
  <TextField label="Email" value="" keyboardType="email-address" placeholder="camille@exemple.fr" />
);

/**
 * En validation : ton neutre, ce qui est attendu plutôt que ce qui est faux, et jamais une
 * affirmation sur ce que la personne a tapé.
 */
export const AvecAide = () => (
  <TextField
    label="Email"
    value="camille@exemple"
    keyboardType="email-address"
    placeholder="camille@exemple.fr"
    helperText="Cette adresse semble incomplète."
  />
);

/** Avec une action à droite dans le champ. */
export const AvecActionADroite = () => (
  <TextField label="Email" value="camille@exemple.fr" keyboardType="email-address" rightActionLabel="Modifier" />
);
