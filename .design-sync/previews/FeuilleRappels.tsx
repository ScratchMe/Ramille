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
 * Une action de sorties choisie pour « Le mois prochain » : le point du mois suivant ne l'interroge
 * pas, c'est celui d'après — Ramille nomme donc son mois (`v1-33` D14, 02/10/2026).
 */
export const LeMoisProchain = () => (
  <FeuilleRappels boucle="mensuel" moisNomme="décembre" permission="accordee" canal="push" />
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

/**
 * La seconde étape (C4.2), une fois la notification choisie et reçue sur une action de trajet :
 * Ramille demande pour la veille, la ligne du produit porte la date. Deux réponses, et chacune
 * s'enregistre — « Non merci » est un refus qui ne se repropose pas. C'est aussi l'étape qui
 * s'ouvre seule, une fois, au premier engagement de trajet où elle peut être posée, chez qui a vu
 * la feuille sans elle.
 */
export const MotDeLaVeille = () => (
  <FeuilleRappels etape="veille" detailVeille="Par notification, jusqu’au 15 novembre." />
);
