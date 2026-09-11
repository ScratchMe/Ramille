import React from 'react';
import { MonCompte } from 'ramille-design-system';

/**
 * « Mes données » : exporter et supprimer, sans retenue — un chemin de suppression dans
 * l'app est un bloqueur Google Play, et Ramille crée un compte dès l'ouverture.
 */
export const MesDonnees = () => <MonCompte />;

/** La confirmation : elle dit ce qui part, elle ne cherche pas à retenir. */
export const Confirmation = () => <MonCompte confirmation />;

/** Un échec, ton neutre : la demande n'a pas abouti, les données sont intactes. */
export const AvecEchec = () => (
  <MonCompte message="Ta demande n’a pas abouti. Réessaie dans un instant." />
);
