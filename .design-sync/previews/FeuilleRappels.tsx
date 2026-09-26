import React from 'react';
import { FeuilleRappels } from 'ramille-design-system';

/**
 * La feuille après « C'est noté » : Ramille explique, puis le choix du canal. Elle ne s'ouvre
 * qu'une fois par appareil. Le cadre est `FeuilleDuBas`, voile compris — le voile est l'une des
 * deux seules transparences du produit.
 */
export const BoucleHebdo = () => (
  <FeuilleRappels boucle="hebdo" canal="push" />
);

/**
 * La boucle mensuelle du poste secondaire : même feuille, l'autre rythme — ici avec les
 * notifications déjà accordées, d'où « C'est bon » au lieu d'« Autoriser les notifications ».
 * Pas d'email coché : sans compte rattaché, la ligne n'est pas choisissable, et une option
 * désactivée ne paraît jamais choisie.
 */
export const BoucleMensuelle = () => (
  <FeuilleRappels boucle="mensuel" permission="accordee" canal="push" />
);

/**
 * Les notifications fermées dans les réglages du téléphone : la ligne le dit et porte le lien vers
 * les réglages, et c'est la seule situation où on l'affirme — une absence de jeton, à elle seule,
 * n'accuse personne. Les lignes sont celles que la feuille dérive elle-même : ne pas les réécrire
 * dans un aperçu, elles porteraient un vocabulaire que le produit n'emploie plus.
 */
export const NotificationsFermees = () => (
  <FeuilleRappels boucle="hebdo" permission="fermee" canal="none" />
);

/** Un échec à l'enregistrement du choix, dans la feuille. */
export const AvecEchec = () => (
  <FeuilleRappels
    boucle="hebdo"
    canal="push"
    erreur="Ton choix n’a pas pu être enregistré. Réessaie dans un instant."
  />
);
