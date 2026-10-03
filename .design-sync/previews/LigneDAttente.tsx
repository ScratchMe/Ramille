import React from 'react';
import { LigneDAttente } from 'ramille-design-system';

/** Le délai passé : la ligne d'un onglet qui se charge, au centre de l'écran, en gris secondaire. */
export const Dite = () => <LigneDAttente>Chargement de ton plan…</LigneDAttente>;

/**
 * Les 300 premières millisecondes : rien. En dessous du délai, le contenu arrive seul, au lieu d'une
 * phrase qui clignote une image (`v1-30` §5.8).
 */
export const PendantLeDelai = () => (
  <div style={{ minHeight: 24 }}>
    <LigneDAttente visible={false}>Chargement de ton plan…</LigneDAttente>
  </div>
);
