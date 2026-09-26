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

/**
 * La boucle mensuelle du poste secondaire : même feuille, l'autre rythme — ici avec les
 * notifications déjà accordées, d'où « C'est bon » au lieu d'« Autoriser les notifications ».
 * Pas d'email coché : sans compte rattaché, la ligne n'est pas choisissable, et une option
 * désactivée ne paraît jamais choisie.
 */
export const BoucleMensuelle = () => (
  <SurScrim><FeuilleRappels boucle="mensuel" permission="accordee" canal="push" style={{ paddingBottom: 24 }} /></SurScrim>
);

/**
 * Les notifications fermées dans les réglages du téléphone : la ligne le dit et porte le lien vers
 * les réglages, et c'est la seule situation où on l'affirme — une absence de jeton, à elle seule,
 * n'accuse personne. Les lignes sont celles que la feuille dérive elle-même : ne pas les réécrire
 * dans un aperçu, elles porteraient un vocabulaire que le produit n'emploie plus.
 */
export const NotificationsFermees = () => (
  <SurScrim><FeuilleRappels boucle="hebdo" permission="fermee" canal="none" style={{ paddingBottom: 24 }} /></SurScrim>
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
