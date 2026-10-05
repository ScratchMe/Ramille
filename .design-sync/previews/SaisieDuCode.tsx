import React from 'react';
import { SaisieDuCode } from 'ramille-design-system';

/**
 * Rattacher une adresse : l'envoi est certain (sauf plafond de rattachement atteint, muet), et la
 * phrase conditionnelle dit, avant la saisie,
 * ce que le code fera si un compte existait déjà — sans jamais le révéler.
 */
export const Rattachement = () => (
  <SaisieDuCode voix="parti" adresse="camille@exemple.fr" libelleBouton="Valider mon code" />
);

/** Retrouver un compte : tout au conditionnel, et la carte qui dit que le code ne crée jamais de compte. */
export const RetrouverUnCompte = () => (
  <SaisieDuCode voix="peut_etre" adresse="camille@exemple.fr" libelleBouton="Retrouver mon compte" />
);

/** Un code refusé : un seul message pour faux et expiré, et le champ garde les chiffres pour les comparer. */
export const CodeRefuse = () => (
  <SaisieDuCode
    voix="parti"
    adresse="camille@exemple.fr"
    libelleBouton="Valider mon code"
    codeInitial="48172093"
    message="Ce code ne marche pas : il a expiré, ou ce n’est pas le plus récent. Demande-en un nouveau."
  />
);

/** La vérification en cours. */
export const Verification = () => (
  <SaisieDuCode voix="peut_etre" adresse="camille@exemple.fr" libelleBouton="Ouvrir ma session" codeInitial="48172093" occupe />
);
