import React from 'react';
import { FeuilleRappels } from 'ramille-design-system';

const SurScrim = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ background: 'var(--color-scrim)', borderRadius: 18, paddingTop: 24 }}>{children}</div>
);

/**
 * La feuille après « C'est noté » : Ramille explique, puis le choix du canal. Elle ne s'ouvre
 * qu'une fois par appareil. Le scrim est l'une des deux seules transparences du produit.
 */
export const BoucleHebdo = () => (
  <SurScrim><FeuilleRappels boucle="hebdo" canal="push" style={{ paddingBottom: 24 }} /></SurScrim>
);

/** La boucle mensuelle du poste secondaire : même feuille, l'autre rythme. */
export const BoucleMensuelle = () => (
  <SurScrim><FeuilleRappels boucle="mensuel" canal="email" style={{ paddingBottom: 24 }} /></SurScrim>
);

/**
 * Les notifications fermées dans les réglages du téléphone : la ligne le dit, et c'est la
 * seule situation où on l'affirme — une absence de jeton, à elle seule, n'accuse personne.
 */
export const NotificationsFermees = () => (
  <SurScrim>
    <FeuilleRappels
      boucle="hebdo"
      canal="email"
      lignes={[
        { canal: 'push', titre: 'Une notification', detail: 'Les notifications sont coupées dans les réglages du téléphone.', choisissable: false },
        { canal: 'email', titre: 'Un email', detail: 'À l’adresse de ton compte.' },
        { canal: 'aucun', titre: 'Rien', detail: 'On se retrouve ici lundi.' },
      ]}
      style={{ paddingBottom: 24 }}
    />
  </SurScrim>
);

/** Un échec à l'enregistrement du choix, dans la feuille. */
export const AvecEchec = () => (
  <SurScrim>
    <FeuilleRappels
      boucle="hebdo"
      canal="push"
      erreur="Ton choix n’a pas pu être enregistré. Réessaie dans un instant."
      style={{ paddingBottom: 24 }}
    />
  </SurScrim>
);
