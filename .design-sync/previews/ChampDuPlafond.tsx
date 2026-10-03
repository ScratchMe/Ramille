import React from 'react';
import { ChampDuPlafond } from 'ramille-design-system';

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ children }: { children?: React.ReactNode }) => <div style={{ maxWidth: 342 }}>{children}</div>;

/** « 10+ » touché : le champ s'ouvre sous les puces, vide, et l'étape le réclame. */
export const Vide = () => (
  <Etape>
    <ChampDuPlafond valeur={null} unite="vols" label="Nombre de vols sur une année" />
  </Etape>
);

/** « Il manque encore le nombre de vols » : l'intitulé passe à l'encre de ce qui manque. */
export const Reclame = () => (
  <Etape>
    <ChampDuPlafond marque valeur={null} unite="vols" label="Nombre de vols sur une année" />
  </Etape>
);

/** Au-delà de cinquante : une ligne de relecture, jamais un blocage. */
export const ARelire = () => (
  <Etape>
    <ChampDuPlafond valeur={250} unite="trajets" label="Nombre de trajets en voiture sur une année" />
  </Etape>
);
